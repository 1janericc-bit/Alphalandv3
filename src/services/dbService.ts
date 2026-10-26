import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  User,
  InvestmentPlan,
  UserInvestment,
  Deposit,
  Withdrawal,
  Coupon,
  AppSettings,
  Commission,
} from '../types';
import { MISSIONS, COMMISSION_RATES } from '../constants/plans';

const DEFAULT_DEPOSIT_QR =
  'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=usdt-trc20-deposit-alphaland-official';
const DEFAULT_COMMUNITY_QR =
  'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://t.me/alphaland_investment_vip';
const DEFAULT_COMMUNITY_CHAT = 'https://t.me/alphaland_investment_vip';

/**
 * Global App Settings
 */
export async function getAppSettings(): Promise<AppSettings> {
  const path = 'settings/appConfig';
  try {
    const docRef = doc(db, 'settings', 'appConfig');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as AppSettings;
      return {
        activeDepositQrUrl: data.activeDepositQrUrl || DEFAULT_DEPOSIT_QR,
        communityChatLink: data.communityChatLink || DEFAULT_COMMUNITY_CHAT,
        communityQrUrl: data.communityQrUrl || DEFAULT_COMMUNITY_QR,
        updatedAt: data.updatedAt,
      };
    } else {
      const defaults: AppSettings = {
        activeDepositQrUrl: DEFAULT_DEPOSIT_QR,
        communityChatLink: DEFAULT_COMMUNITY_CHAT,
        communityQrUrl: DEFAULT_COMMUNITY_QR,
        updatedAt: serverTimestamp(),
      };
      await setDoc(docRef, defaults);
      return defaults;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateAppSettings(updates: Partial<AppSettings>): Promise<void> {
  const path = 'settings/appConfig';
  try {
    const docRef = doc(db, 'settings', 'appConfig');
    await setDoc(
      docRef,
      {
        ...updates,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Authentication and User Management
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'AL';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function signUpUser(
  mobileNumber: string,
  password: string,
  referralInputCode?: string
): Promise<User> {
  const cleanMobile = mobileNumber.trim();
  const cleanPass = password.trim();

  // Check if mobile already exists
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('mobileNumber', '==', cleanMobile));
  const existingDocs = await getDocs(q);
  if (!existingDocs.empty) {
    throw new Error('This mobile number is already registered. Please login.');
  }

  // Handle referral code check
  let referredByUserId: string | null = null;
  let initialBalance = 0;

  if (referralInputCode && referralInputCode.trim()) {
    const refCode = referralInputCode.trim().toUpperCase();
    const refQ = query(usersRef, where('referralCode', '==', refCode));
    const refSnapshot = await getDocs(refQ);
    if (!refSnapshot.empty) {
      referredByUserId = refSnapshot.docs[0].id;
      initialBalance = 30; // Referral signup bonus
    }
  }

  const newDocRef = doc(collection(db, 'users'));
  const referralCode = generateReferralCode();

  const newUser: Omit<User, 'id'> = {
    mobileNumber: cleanMobile,
    password: cleanPass,
    balance: initialBalance,
    referralCode,
    referredBy: referredByUserId,
    claimedMissions: [],
    createdAt: serverTimestamp(),
  };

  await setDoc(newDocRef, newUser);

  return {
    id: newDocRef.id,
    ...newUser,
  };
}

export async function loginUser(mobileNumber: string, password: string): Promise<User> {
  const cleanMobile = mobileNumber.trim();
  const cleanPass = password.trim();

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('mobileNumber', '==', cleanMobile));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error('Account not found with this mobile number.');
  }

  const userDoc = snapshot.docs[0];
  const userData = userDoc.data() as Omit<User, 'id'>;

  if (userData.password !== cleanPass) {
    throw new Error('Incorrect password. Please try again.');
  }

  return {
    id: userDoc.id,
    ...userData,
  };
}

export async function getUserById(userId: string): Promise<User | null> {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  const data = snap.data() as Omit<User, 'id'>;
  return { id: snap.id, ...data };
}

/**
 * Investments
 */
export async function purchaseInvestmentPlan(
  userId: string,
  plan: InvestmentPlan
): Promise<UserInvestment> {
  const userRef = doc(db, 'users', userId);
  const newInvestRef = doc(collection(db, 'investments'));

  // First verify if this is the user's very first plan purchase
  const pastInvestmentsQuery = query(
    collection(db, 'investments'),
    where('userId', '==', userId)
  );
  const pastInvestmentsSnap = await getDocs(pastInvestmentsQuery);
  const isFirstPlanEver = pastInvestmentsSnap.empty;

  let createdInvestment: UserInvestment;

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) {
      throw new Error('User account not found.');
    }

    const userData = userDoc.data() as User;
    if (userData.balance < plan.cost) {
      throw new Error(
        `Insufficient wallet balance ($${userData.balance.toFixed(2)}). Plan cost is $${plan.cost}. Please deposit funds first.`
      );
    }

    // Deduct cost from balance
    transaction.update(userRef, {
      balance: userData.balance - plan.cost,
    });

    const investmentData = {
      userId,
      planName: plan.name,
      cost: plan.cost,
      dailyReturn: plan.dailyReturn,
      daysRemaining: plan.totalDays,
      daysCollectedCount: 0,
      lastCollectedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    };

    transaction.set(newInvestRef, investmentData);

    createdInvestment = {
      id: newInvestRef.id,
      ...investmentData,
    };
  });

  // Distribute MLM Commissions ONLY IF this is their first investment plan
  if (isFirstPlanEver) {
    try {
      await distributeMlmCommissions(userId, plan.cost, plan.name);
    } catch (err) {
      console.error('Error distributing MLM commissions:', err);
    }
  }

  return createdInvestment!;
}

/**
 * Distributes Level 1 (30%), Level 2 (3%), Level 3 (2%) commission
 * only on the user's very first plan purchase.
 */
async function distributeMlmCommissions(
  buyerId: string,
  planCost: number,
  planName: string
) {
  const buyerDoc = await getDoc(doc(db, 'users', buyerId));
  if (!buyerDoc.exists()) return;
  const buyer = buyerDoc.data() as User;

  // Level 1 Upline
  if (!buyer.referredBy) return;
  const l1Id = buyer.referredBy;
  const l1Doc = await getDoc(doc(db, 'users', l1Id));
  if (!l1Doc.exists()) return;
  const l1User = l1Doc.data() as User;

  const l1Amount = Math.round(planCost * COMMISSION_RATES.LEVEL_1 * 100) / 100;
  await updateDoc(doc(db, 'users', l1Id), {
    balance: (l1User.balance || 0) + l1Amount,
  });
  await setDoc(doc(collection(db, 'commissions')), {
    uplineUserId: l1Id,
    fromUserId: buyerId,
    fromUserMobile: buyer.mobileNumber,
    level: 1,
    percentage: 30,
    amount: l1Amount,
    planName,
    createdAt: serverTimestamp(),
  });

  // Level 2 Upline
  if (!l1User.referredBy) return;
  const l2Id = l1User.referredBy;
  const l2Doc = await getDoc(doc(db, 'users', l2Id));
  if (!l2Doc.exists()) return;
  const l2User = l2Doc.data() as User;

  const l2Amount = Math.round(planCost * COMMISSION_RATES.LEVEL_2 * 100) / 100;
  await updateDoc(doc(db, 'users', l2Id), {
    balance: (l2User.balance || 0) + l2Amount,
  });
  await setDoc(doc(collection(db, 'commissions')), {
    uplineUserId: l2Id,
    fromUserId: buyerId,
    fromUserMobile: buyer.mobileNumber,
    level: 2,
    percentage: 3,
    amount: l2Amount,
    planName,
    createdAt: serverTimestamp(),
  });

  // Level 3 Upline
  if (!l2User.referredBy) return;
  const l3Id = l2User.referredBy;
  const l3Doc = await getDoc(doc(db, 'users', l3Id));
  if (!l3Doc.exists()) return;
  const l3User = l3Doc.data() as User;

  const l3Amount = Math.round(planCost * COMMISSION_RATES.LEVEL_3 * 100) / 100;
  await updateDoc(doc(db, 'users', l3Id), {
    balance: (l3User.balance || 0) + l3Amount,
  });
  await setDoc(doc(collection(db, 'commissions')), {
    uplineUserId: l3Id,
    fromUserId: buyerId,
    fromUserMobile: buyer.mobileNumber,
    level: 3,
    percentage: 2,
    amount: l3Amount,
    planName,
    createdAt: serverTimestamp(),
  });
}

/**
 * Auto-Credits daily returns for elapsed 24-hour cycles to the user's balance
 * and enforces strict 24-hour cooldowns.
 */
export async function autoCreditInvestmentReturns(userId: string): Promise<{
  creditedCycles: number;
  totalEarnings: number;
}> {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const investQuery = query(
    collection(db, 'investments'),
    where('userId', '==', userId)
  );
  const snap = await getDocs(investQuery);

  let totalCreditedCycles = 0;
  let totalEarnings = 0;

  for (const docSnap of snap.docs) {
    const inv = docSnap.data() as UserInvestment;
    if (inv.daysRemaining <= 0) continue;

    const lastTime =
      inv.lastCollectedAt?.toMillis?.() ||
      inv.lastCollectedAt?.seconds * 1000 ||
      inv.createdAt?.toMillis?.() ||
      inv.createdAt?.seconds * 1000 ||
      now;

    const elapsed = now - lastTime;
    const eligibleCycles = Math.min(inv.daysRemaining, Math.floor(elapsed / DAY_MS));

    if (eligibleCycles > 0) {
      const earnings = eligibleCycles * inv.dailyReturn;
      const newDaysRemaining = inv.daysRemaining - eligibleCycles;
      const newCollectedCount = (inv.daysCollectedCount || 0) + eligibleCycles;
      // New lastCollectedAt timestamp shifts forward by the credited cycle duration
      const newLastCollectedTimestamp = new Timestamp(
        Math.floor((lastTime + eligibleCycles * DAY_MS) / 1000),
        0
      );

      await runTransaction(db, async (txn) => {
        const uRef = doc(db, 'users', userId);
        const uDoc = await txn.get(uRef);
        if (!uDoc.exists()) return;
        const currentBalance = (uDoc.data() as User).balance || 0;

        txn.update(uRef, {
          balance: currentBalance + earnings,
        });

        txn.update(docSnap.ref, {
          daysRemaining: newDaysRemaining,
          daysCollectedCount: newCollectedCount,
          lastCollectedAt: newLastCollectedTimestamp,
        });
      });

      totalCreditedCycles += eligibleCycles;
      totalEarnings += earnings;
    }
  }

  return { creditedCycles: totalCreditedCycles, totalEarnings };
}

/**
 * Deposits
 */
export async function submitDeposit(
  userId: string,
  userMobile: string,
  amount: number,
  proofImageUrl: string
): Promise<Deposit> {
  const depositRef = doc(collection(db, 'deposits'));
  const depositData = {
    userId,
    userMobile,
    amount: Number(amount),
    proofImageUrl,
    status: 'pending' as const,
    createdAt: serverTimestamp(),
  };

  await setDoc(depositRef, depositData);
  return { id: depositRef.id, ...depositData };
}

export async function approveDeposit(depositId: string): Promise<void> {
  const depositRef = doc(db, 'deposits', depositId);

  await runTransaction(db, async (txn) => {
    const depDoc = await txn.get(depositRef);
    if (!depDoc.exists()) throw new Error('Deposit not found.');
    const depData = depDoc.data() as Deposit;
    if (depData.status !== 'pending') {
      throw new Error(`Deposit has already been ${depData.status}.`);
    }

    const userRef = doc(db, 'users', depData.userId);
    const userDoc = await txn.get(userRef);
    if (!userDoc.exists()) throw new Error('Target user does not exist.');
    const userData = userDoc.data() as User;

    txn.update(depositRef, { status: 'approved' });
    txn.update(userRef, { balance: (userData.balance || 0) + depData.amount });
  });
}

export async function rejectDeposit(depositId: string): Promise<void> {
  const depositRef = doc(db, 'deposits', depositId);
  await updateDoc(depositRef, { status: 'rejected' });
}

/**
 * Withdrawals
 */
export async function requestWithdrawal(
  userId: string,
  userMobile: string,
  amount: number,
  accountDetails: string
): Promise<Withdrawal> {
  if (amount < 100) {
    throw new Error('Minimum withdrawal amount is $100.');
  }

  // Check condition: User must have at least 1 active investment
  const activeInvestmentsQ = query(
    collection(db, 'investments'),
    where('userId', '==', userId)
  );
  const activeSnap = await getDocs(activeInvestmentsQ);
  const hasActiveInvestment = activeSnap.docs.some(
    (d) => (d.data() as UserInvestment).daysRemaining > 0
  );

  if (!hasActiveInvestment) {
    throw new Error(
      'Withdrawal requires at least 1 active investment contract. Please purchase a plan first.'
    );
  }

  const userRef = doc(db, 'users', userId);
  const withRef = doc(collection(db, 'withdrawals'));

  let createdWithdrawal: Withdrawal;

  await runTransaction(db, async (txn) => {
    const userDoc = await txn.get(userRef);
    if (!userDoc.exists()) throw new Error('User not found.');
    const userData = userDoc.data() as User;

    if (userData.balance < amount) {
      throw new Error(
        `Insufficient balance. You have $${userData.balance.toFixed(2)}, cannot withdraw $${amount}.`
      );
    }

    txn.update(userRef, {
      balance: userData.balance - amount,
    });

    const withData = {
      userId,
      userMobile,
      amount,
      accountDetails,
      status: 'pending' as const,
      createdAt: Timestamp.now(),
    };

    txn.set(withRef, withData);
    createdWithdrawal = { id: withRef.id, ...withData };
  });

  return createdWithdrawal!;
}

export async function updateWithdrawalStatus(
  withdrawalId: string,
  status: 'approved' | 'paid' | 'rejected'
): Promise<void> {
  const withRef = doc(db, 'withdrawals', withdrawalId);

  if (status === 'rejected') {
    // Refund balance if rejected
    await runTransaction(db, async (txn) => {
      const wDoc = await txn.get(withRef);
      if (!wDoc.exists()) return;
      const wData = wDoc.data() as Withdrawal;
      if (wData.status === 'rejected') return;

      const userRef = doc(db, 'users', wData.userId);
      const uDoc = await txn.get(userRef);
      if (uDoc.exists()) {
        const u = uDoc.data() as User;
        txn.update(userRef, { balance: (u.balance || 0) + wData.amount });
      }

      txn.update(withRef, { status: 'rejected' });
    });
  } else {
    await updateDoc(withRef, { status });
  }
}

/**
 * Coupons
 */
export async function redeemCoupon(code: string, userId: string): Promise<number> {
  const cleanCode = code.trim().toUpperCase();
  const couponRef = doc(db, 'coupons', cleanCode);
  const userRef = doc(db, 'users', userId);

  let redeemedAmount = 0;

  await runTransaction(db, async (txn) => {
    const cDoc = await txn.get(couponRef);
    if (!cDoc.exists()) {
      throw new Error('Coupon code does not exist. Please check your spelling.');
    }
    const cData = cDoc.data() as Coupon;
    if (cData.isUsed) {
      throw new Error('This coupon has already been redeemed.');
    }

    const uDoc = await txn.get(userRef);
    if (!uDoc.exists()) throw new Error('User not found.');
    const uData = uDoc.data() as User;

    redeemedAmount = cData.amount;

    txn.update(couponRef, {
      isUsed: true,
      usedBy: userId,
      usedAt: Timestamp.now(),
    });

    txn.update(userRef, {
      balance: (uData.balance || 0) + redeemedAmount,
    });
  });

  return redeemedAmount;
}

export async function createCoupon(code: string, amount: number): Promise<void> {
  const cleanCode = code.trim().toUpperCase();
  const couponRef = doc(db, 'coupons', cleanCode);
  await setDoc(couponRef, {
    code: cleanCode,
    amount: Number(amount),
    isUsed: false,
    usedBy: null,
    usedAt: null,
    createdAt: serverTimestamp(),
  });
}

/**
 * Missions
 */
export async function getDirectActiveReferralsCount(userId: string): Promise<number> {
  // Query all users where referredBy == userId
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('referredBy', '==', userId));
  const snap = await getDocs(q);

  let activeCount = 0;
  for (const refDoc of snap.docs) {
    const invQ = query(
      collection(db, 'investments'),
      where('userId', '==', refDoc.id)
    );
    const invSnap = await getDocs(invQ);
    if (!invSnap.empty) {
      activeCount++;
    }
  }
  return activeCount;
}

export async function claimMission(
  userId: string,
  missionId: string,
  activeReferralCount: number
): Promise<number> {
  const mission = MISSIONS.find((m) => m.id === missionId);
  if (!mission) throw new Error('Mission not found.');

  if (activeReferralCount < mission.requiredInvites) {
    throw new Error(
      `Mission requires ${mission.requiredInvites} active referrals with purchased plans. Current: ${activeReferralCount}`
    );
  }

  const userRef = doc(db, 'users', userId);

  await runTransaction(db, async (txn) => {
    const uDoc = await txn.get(userRef);
    if (!uDoc.exists()) throw new Error('User account not found.');
    const u = uDoc.data() as User;
    const claimed = u.claimedMissions || [];
    if (claimed.includes(missionId)) {
      throw new Error('Reward for this mission has already been claimed.');
    }

    txn.update(userRef, {
      balance: (u.balance || 0) + mission.reward,
      claimedMissions: [...claimed, missionId],
    });
  });

  return mission.reward;
}
