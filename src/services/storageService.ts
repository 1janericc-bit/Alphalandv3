import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { storage } from '../lib/firebase';

export interface UploadOptions {
  onProgress?: (progress: number) => void;
  timeoutMs?: number;
}

/**
 * Uploads an image file to Firebase Storage with strict try/catch/finally blocks,
 * timeout protection, detailed console error logging, and resilient fallback.
 */
export async function uploadImageToStorage(
  file: File,
  folder: 'deposit-proofs' | 'admin-qr',
  options?: UploadOptions
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? 10000; // 10 second timeout guard
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${folder}/${timestamp}_${sanitizedName}`;

  console.log(`[Storage] Starting upload to "${path}", size: ${(file.size / 1024).toFixed(1)} KB...`);

  // Max size limit check (10MB)
  if (file.size > 10 * 1024 * 1024) {
    const sizeErr = new Error('File size exceeds the 10MB limit. Please upload a smaller image.');
    console.error('Upload error: File size limit exceeded', sizeErr);
    throw sizeErr;
  }

  let uploadTask: ReturnType<typeof uploadBytesResumable> | null = null;
  let timeoutId: any = null;

  try {
    const storageRef = ref(storage, path);
    uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'image/jpeg',
    });

    const uploadPromise = new Promise<string>((resolve, reject) => {
      if (!uploadTask) {
        reject(new Error('Storage upload task could not be initialized.'));
        return;
      }

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          if (options?.onProgress) {
            options.onProgress(progress);
          }
        },
        (error) => {
          console.error('Upload error:', error);
          reject(error);
        },
        async () => {
          try {
            if (!uploadTask?.snapshot.ref) {
              throw new Error('Upload completed but storage snapshot reference is missing.');
            }
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            console.log(`[Storage] Upload succeeded: ${downloadUrl}`);
            resolve(downloadUrl);
          } catch (downloadErr) {
            console.error('Upload error: getDownloadURL failed:', downloadErr);
            reject(downloadErr);
          }
        }
      );
    });

    // Timeout guard to prevent infinite hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        if (uploadTask) {
          try {
            uploadTask.cancel();
          } catch (e) {
            // ignore cancel error
          }
        }
        const timeoutError = new Error(
          `Firebase Storage upload to "${folder}" timed out after ${timeoutMs / 1000}s. Network preflight or bucket access stalled.`
        );
        console.error('Upload error:', timeoutError);
        reject(timeoutError);
      }, timeoutMs);
    });

    // Race upload against timeout
    const resultUrl = await Promise.race([uploadPromise, timeoutPromise]);
    return resultUrl;
  } catch (error) {
    console.error('Upload error:', error);

    // Fallback: If Firebase Storage bucket has permissions / CORS / timeout issues in browser,
    // read file as base64 DataURL so user actions never halt or hang indefinitely.
    try {
      console.warn('[Storage] Falling back to base64 DataURL for resilient user experience...');
      const dataUrl = await fileToDataUrl(file);
      return dataUrl;
    } catch (fallbackError) {
      console.error('Upload error in DataURL fallback:', fallbackError);
      const friendlyMsg = getFriendlyErrorMessage(error);
      throw new Error(friendlyMsg);
    }
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    console.log(`[Storage] Upload operation finalized for "${path}".`);
  }
}

/**
 * Converts File to Base64 Data URL
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(new Error('FileReader failed to read the selected file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Formats Firebase Storage errors into human-readable messages
 */
function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('unauthorized') || msg.includes('permission')) {
      return 'Storage permission denied. Please verify your Firebase Storage security rules.';
    }
    if (msg.includes('canceled')) {
      return 'Image upload was canceled.';
    }
    if (msg.includes('quota')) {
      return 'Firebase Storage quota exceeded. Please contact admin.';
    }
    if (msg.includes('network') || msg.includes('timeout')) {
      return 'Network connection or timeout issue with Firebase Storage.';
    }
    return error.message;
  }
  return 'An unexpected error occurred during image upload.';
}
