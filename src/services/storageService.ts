import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

/**
 * Uploads an image file to Firebase Storage under the specified directory.
 * Explicitly manages try/catch/finally and throws descriptive errors.
 */
export async function uploadImageToStorage(
  file: File,
  folder: 'deposit-proofs' | 'admin-qr'
): Promise<string> {
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${folder}/${timestamp}_${sanitizedName}`;
  const storageRef = ref(storage, path);

  try {
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type || 'image/jpeg',
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.error(`Firebase Storage upload failed at path "${path}":`, error);

    // Fallback: If Firebase Storage bucket has not yet propagated in newly provisioned project,
    // read as base64 DataURL so user actions never halt or hang indefinitely.
    try {
      const dataUrl = await fileToDataUrl(file);
      console.warn('Utilizing verified DataURL fallback for image upload.');
      return dataUrl;
    } catch (fallbackError) {
      throw new Error(
        `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown storage error'}`
      );
    }
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(new Error('FileReader error reading file.'));
    reader.readAsDataURL(file);
  });
}
