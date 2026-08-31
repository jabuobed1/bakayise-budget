import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase/config';
import { calculateDebtReduction } from '../utils/debtCalculations';
import {
  BudgetPeriod,
  Income,
  BudgetCategory,
  Expense,
  Debt,
  DebtCategory,
  BabyStepsState,
  EmergencyFundLog,
  FinancialAccount,
  ArchivedWorksheet,
  UserProfile,
  Workspace,
} from '../types';
import {
  DEFAULT_SOUTH_AFRICAN_CATEGORIES,
  DEFAULT_STARTER_ACCOUNTS,
} from '../utils/budgetConstants';
import { generatePayPeriodInfo } from '../utils/southAfricaHolidays';
import { getAuditFields, getFamilyMemberByEmail, isAllowedFamilyEmail } from '../utils/authConstants';

/**
 * Deeply sanitizes an object before writing to Firestore by removing any keys
 * with `undefined` values, preventing "Unsupported field value: undefined" errors.
 */
export function cleanFirestoreObject<T extends Record<string, any>>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'object' && item !== null ? cleanFirestoreObject(item) : item
    ) as unknown as T;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        result[key] = cleanFirestoreObject(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result as T;
}

/**
 * Helper to sync credit card, loan, or vehicle finance accounts into the Baby Step 2 Debt Snowball.
 * Excludes home loans (bonds) as per Dave Ramsey Baby Step 6 guidelines.
 * Always populates householdId, workspaceId, and audit fields so debts appear in the active workspace.
 */
async function syncAccountDebt(account: FinancialAccount): Promise<void> {
  const debtId = `debt_${account.id}`;
  const debtRef = doc(db, 'debts', debtId);

  // Only credit_card, loan, and vehicle_loan accounts are placed in Baby Step 2 Debt Snowball
  // Home Loan / Mortgage is Baby Step 6 and is excluded!
  if (account.type !== 'credit_card' && account.type !== 'loan' && account.type !== 'vehicle_loan') {
    // If it was previously a debt and its type changed (e.g. to cheque, savings, or home_loan), remove it from Debt Snowball
    try {
      const existingDebtSnap = await getDoc(debtRef);
      if (existingDebtSnap.exists()) {
        await deleteDoc(debtRef);
      }
    } catch {
      // Ignore if no debt document
    }
    return;
  }

  const wsId = account.householdId || account.workspaceId;
  const audit = getAuditFields(wsId);

  const balance =
    account.balanceOwed !== undefined
      ? account.balanceOwed
      : Math.abs(account.openingBalance || 0);

  // Determine monthly minimum / installment
  let minPayment = 0;
  if (account.manualMonthlyInstallment !== undefined && account.manualMonthlyInstallment > 0) {
    minPayment = account.manualMonthlyInstallment;
  } else if (account.monthlyInstallment !== undefined && account.monthlyInstallment > 0) {
    minPayment = account.monthlyInstallment;
  } else if (account.minimumPaymentAmount !== undefined && account.minimumPaymentAmount > 0) {
    minPayment = account.minimumPaymentAmount;
  } else if (account.type === 'credit_card') {
    const fee = account.monthlyFee !== undefined ? account.monthlyFee : 0;
    minPayment = Math.round(Math.max(100, balance * 0.03 + fee));
  } else {
    // Standard loan or vehicle amortized installment estimation (60 or 72 months)
    const rate = account.interestRate !== undefined ? account.interestRate : 12.5;
    const term = account.totalTermMonths || 60;
    const balloon = account.balloonAmount || 0;
    const monthlyRate = rate / 100 / 12;
    if (monthlyRate > 0 && balance > 0) {
      const compound = Math.pow(1 + monthlyRate, term);
      const amortized = ((balance * compound - balloon) * monthlyRate) / (compound - 1);
      const fee = account.monthlyFee !== undefined ? account.monthlyFee : 0;
      const cli = account.creditLifeInsurance || 0;
      minPayment = Math.round(amortized + fee + cli);
    } else {
      minPayment = Math.round(balance / Math.max(1, term));
    }
  }

  const rate =
    account.interestRate !== undefined
      ? account.interestRate
      : account.type === 'credit_card'
      ? 21.75
      : account.type === 'vehicle_loan'
      ? 12.75
      : 18.5;

  const originalBalance =
    account.purchasePrice && account.purchasePrice > 0
      ? account.purchasePrice
      : account.originalLoanAmount && account.originalLoanAmount > 0
      ? account.originalLoanAmount
      : account.creditLimit && account.creditLimit > 0
      ? account.creditLimit
      : balance > 0
      ? balance
      : 5000;

  const category: DebtCategory =
    account.type === 'credit_card'
      ? 'credit_card'
      : account.type === 'vehicle_loan'
      ? 'car_finance'
      : 'personal_loan';

  const debtData: Debt = {
    id: debtId,
    name: account.name,
    lender: account.institution || account.name,
    category: category,
    balance: balance,
    originalBalance: originalBalance,
    minimumPayment: minPayment,
    interestRate: rate,
    linkedAccountId: account.id,
    status: balance <= 0 ? 'paid_off' : 'active',
    notes: account.notes ? `Linked to account: ${account.name}` : undefined,
    householdId: wsId || undefined,
    workspaceId: wsId || undefined,
    lastEditedBy: account.lastEditedBy || audit.lastEditedBy,
    lastEditedByEmail: account.lastEditedByEmail || audit.lastEditedByEmail,
    lastEditedAt: audit.lastEditedAt,
    createdAt: account.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(debtRef, cleanFirestoreObject(debtData));
  } catch (err) {
    console.error('Error syncing account to debt snowball:', err);
  }
}

// ----------------------------------------------------
// Financial Accounts (Cheque, Savings, TFSA, Credit, Cash)
// ----------------------------------------------------
export function subscribeToAccounts(
  householdId: string,
  onData: (accounts: FinancialAccount[]) => void,
  onError?: (err: Error) => void
) {
  if (!householdId) {
    onData([]);
    return () => {};
  }
  const colRef = collection(db, 'financial_accounts');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const accounts: FinancialAccount[] = [];
      const seenIds = new Set<string>();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as FinancialAccount;
        const wsId = data.householdId || data.workspaceId;
        if (wsId === householdId || !wsId || wsId === 'shared_family_workspace' || wsId === 'main') {
          if (!seenIds.has(docSnap.id)) {
            seenIds.add(docSnap.id);
            accounts.push({ ...(data as FinancialAccount), id: docSnap.id });
          }
        }
      });
      // Sort default account first, then by name
      accounts.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return a.name.localeCompare(b.name);
      });
      onData(accounts);
    },
    (error) => {
      if (onError) onError(error);
      console.warn('Firestore onSnapshot error [financial_accounts]:', error.message);
    }
  );
}

export async function saveAccount(account: FinancialAccount): Promise<void> {
  const wsId = account.householdId || account.workspaceId;
  if (!wsId) {
    throw new Error('Cannot save financial account: No workspace selected.');
  }
  const path = `financial_accounts/${account.id}`;
  try {
    const audit = getAuditFields(wsId);
    const openingBal =
      account.openingBalance !== undefined ? account.openingBalance : 0;
    const currentBal =
      account.currentBalance !== undefined ? account.currentBalance : openingBal;

    const cleaned = cleanFirestoreObject({
      ...account,
      openingBalance: openingBal,
      currentBalance: currentBal,
      householdId: wsId,
      workspaceId: wsId,
      lastEditedBy: account.lastEditedBy || audit.lastEditedBy,
      lastEditedByEmail: account.lastEditedByEmail || audit.lastEditedByEmail,
      lastEditedAt: audit.lastEditedAt,
    });
    await setDoc(doc(db, 'financial_accounts', account.id), cleaned);
    // Automatically populate / sync debt into Debt Snowball if credit card, loan, or vehicle finance
    await syncAccountDebt(cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateAccount(
  accountId: string,
  updates: Partial<FinancialAccount>
): Promise<void> {
  const path = `financial_accounts/${accountId}`;
  try {
    const existingSnap = await getDoc(doc(db, 'financial_accounts', accountId));
    const existingData = existingSnap.exists() ? (existingSnap.data() as FinancialAccount) : null;
    const wsId = updates.householdId || updates.workspaceId || existingData?.householdId || existingData?.workspaceId;
    const audit = getAuditFields(wsId);
    const cleaned = cleanFirestoreObject({
      ...updates,
      householdId: wsId || undefined,
      workspaceId: wsId || undefined,
      ...audit,
      updatedAt: new Date().toISOString(),
    });
    await updateDoc(doc(db, 'financial_accounts', accountId), cleaned);
    // If full or partial account fields are updated, resync debt if needed
    const fullAccount: FinancialAccount = {
      ...(existingData || {}),
      ...updates,
      id: accountId,
      householdId: wsId,
      workspaceId: wsId,
    } as FinancialAccount;
    await syncAccountDebt(fullAccount);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAccount(accountId: string): Promise<void> {
  const path = `financial_accounts/${accountId}`;
  try {
    await deleteDoc(doc(db, 'financial_accounts', accountId));
    // Also remove any linked debt from Baby Step 2
    try {
      await deleteDoc(doc(db, 'debts', `debt_${accountId}`));
    } catch {
      // Ignore if no debt existed
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// Reordering helpers for Categories and Incomes
// ----------------------------------------------------
export async function batchUpdateCategoryOrders(
  orderedList: { id: string; order: number }[]
): Promise<void> {
  try {
    const audit = getAuditFields();
    const batch = writeBatch(db);
    for (const item of orderedList) {
      const ref = doc(db, 'budget_categories', item.id);
      batch.update(ref, { order: item.order, ...audit, updatedAt: new Date().toISOString() });
    }
    await batch.commit();
  } catch (error) {
    console.error('Error batch updating category orders:', error);
  }
}

export async function batchUpdateIncomeOrders(
  orderedList: { id: string; order: number }[]
): Promise<void> {
  try {
    const audit = getAuditFields();
    const batch = writeBatch(db);
    for (const item of orderedList) {
      const ref = doc(db, 'incomes', item.id);
      batch.update(ref, { order: item.order, ...audit, updatedAt: new Date().toISOString() });
    }
    await batch.commit();
  } catch (error) {
    console.error('Error batch updating income orders:', error);
  }
}

// ----------------------------------------------------
// Budget Periods
// ----------------------------------------------------
export function subscribeToBudgetPeriods(
  householdId: string,
  onData: (periods: BudgetPeriod[]) => void,
  onError?: (err: Error) => void
) {
  if (!householdId) {
    onData([]);
    return () => {};
  }
  const colRef = collection(db, 'budget_periods');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const periods: BudgetPeriod[] = [];
      const seenIds = new Set<string>();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as BudgetPeriod;
        const wsId = data.householdId || data.workspaceId;
        if (wsId === householdId || !wsId || wsId === 'shared_family_workspace' || wsId === 'main') {
          if (!seenIds.has(docSnap.id)) {
            seenIds.add(docSnap.id);
            periods.push({ ...(data as BudgetPeriod), id: docSnap.id });
          }
        }
      });
      // Sort by startDate descending (latest first)
      periods.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
      onData(periods);
    },
    (error) => {
      if (onError) onError(error);
      console.warn('Firestore onSnapshot error [budget_periods]:', error.message);
    }
  );
}

export async function saveBudgetPeriod(period: BudgetPeriod): Promise<void> {
  const wsId = period.householdId || period.workspaceId;
  if (!wsId) {
    throw new Error('Cannot save budget period: No workspace selected.');
  }
  const path = `budget_periods/${period.id}`;
  try {
    const audit = getAuditFields(wsId);
    await setDoc(
      doc(db, 'budget_periods', period.id),
      cleanFirestoreObject({
        openingFloatingBalance: 0,
        autoCarryoverFromPrevious: true,
        ...period,
        householdId: wsId,
        workspaceId: wsId,
        lastEditedBy: period.lastEditedBy || audit.lastEditedBy,
        lastEditedByEmail: period.lastEditedByEmail || audit.lastEditedByEmail,
        lastEditedAt: audit.lastEditedAt,
      })
    );
    await recalculateAndSyncPeriodCarryovers();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Automatically calculates opening and closing floating balances for all pay periods
 * chronologically, rolling over leftover unspent cash from Period A to Period B.
 */
export async function recalculateAndSyncPeriodCarryovers(): Promise<void> {
  try {
    const periodsSnap = await getDocs(collection(db, 'budget_periods'));
    if (periodsSnap.empty) return;

    const periods: BudgetPeriod[] = periodsSnap.docs.map((d) => ({
      ...(d.data() as BudgetPeriod),
      id: d.id,
    }));

    // Sort periods chronologically ascending (oldest first)
    periods.sort((a, b) => a.startDate.localeCompare(b.startDate));

    const incomesSnap = await getDocs(collection(db, 'incomes'));
    const incomes: Income[] = incomesSnap.docs.map((d) => ({ ...(d.data() as Income), id: d.id }));

    const expensesSnap = await getDocs(collection(db, 'expenses'));
    const expenses: Expense[] = expensesSnap.docs.map((d) => ({ ...(d.data() as Expense), id: d.id }));

    const categoriesSnap = await getDocs(collection(db, 'budget_categories'));
    const categories: BudgetCategory[] = categoriesSnap.docs.map((d) => ({ ...(d.data() as BudgetCategory), id: d.id }));

    const batch = writeBatch(db);
    let previousClosingBalance = 0;
    let hasChanges = false;

    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      const periodIncomes = incomes.filter((inc) => inc.periodId === period.id);
      const periodExpenses = expenses.filter((exp) => exp.periodId === period.id);

      const totalIncome = periodIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
      const totalSpent = periodExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const totalPlannedExpenses = categories
        .filter((c) => c.periodId === period.id)
        .reduce((sum, c) => sum + (c.allocatedAmount || 0), 0);

      let openingBalance = 0;
      if (i === 0) {
        openingBalance = period.openingFloatingBalance || 0;
      } else {
        if (period.autoCarryoverFromPrevious !== false) {
          openingBalance = Math.max(0, previousClosingBalance);
        } else {
          openingBalance = period.openingFloatingBalance || 0;
        }
      }

      // Net closing floating cash at cycle end
      const closingBalance = openingBalance + totalIncome - totalSpent;
      previousClosingBalance = closingBalance;

      // Update period document if values changed
      if (
        period.openingFloatingBalance !== openingBalance ||
        period.closingFloatingBalance !== closingBalance ||
        period.totalPlannedIncome !== totalIncome ||
        period.totalPlannedExpenses !== totalPlannedExpenses
      ) {
        hasChanges = true;
        const periodRef = doc(db, 'budget_periods', period.id);
        batch.update(periodRef, {
          openingFloatingBalance: openingBalance,
          closingFloatingBalance: closingBalance,
          totalPlannedIncome: totalIncome,
          totalPlannedExpenses: totalPlannedExpenses,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (hasChanges) {
      await batch.commit();
    }
  } catch (err) {
    console.warn('Error recalculating period carryover balances:', err);
  }
}

export async function deleteBudgetPeriod(periodId: string): Promise<void> {
  const path = `budget_periods/${periodId}`;
  try {
    await deleteDoc(doc(db, 'budget_periods', periodId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// Incomes
// ----------------------------------------------------
export function subscribeToIncomes(
  periodId: string,
  householdId?: string,
  onData?: (incomes: Income[]) => void,
  onError?: (err: Error) => void
) {
  // Overload support if called as (periodId, onData, onError)
  let callback = onData;
  let errorCallback = onError;
  if (typeof householdId === 'function') {
    callback = householdId as (incomes: Income[]) => void;
    errorCallback = onData as any;
  }

  if (!periodId) {
    if (callback) callback([]);
    return () => {};
  }
  const colRef = collection(db, 'incomes');
  const q = query(
    colRef, 
    where('periodId', '==', periodId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const incomes: Income[] = [];
      snapshot.forEach((docSnap) => {
        incomes.push({ ...(docSnap.data() as Income), id: docSnap.id });
      });
      // Sort by order if set, or fallback to createdAt
      incomes.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
      if (callback) callback(incomes);
    },
    (error) => {
      if (errorCallback) errorCallback(error);
      console.warn('Firestore onSnapshot error [incomes]:', error.message);
    }
  );
}

export function subscribeToAllWorkspaceIncomes(
  householdId: string,
  onData: (incomes: Income[]) => void,
  onError?: (err: Error) => void
) {
  if (!householdId) {
    onData([]);
    return () => {};
  }
  const colRef = collection(db, 'incomes');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const incomes: Income[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Income;
        const wsId = data.householdId || data.workspaceId;
        if (wsId === householdId || !wsId || wsId === 'shared_family_workspace' || wsId === 'main') {
          incomes.push({ ...(data as Income), id: docSnap.id });
        }
      });
      incomes.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
      onData(incomes);
    },
    (error) => {
      if (onError) onError(error);
      console.warn('Firestore onSnapshot error [all_incomes]:', error.message);
    }
  );
}

async function resolveHouseholdIdForPeriod(periodId: string, providedWsId?: string): Promise<string> {
  if (providedWsId) return providedWsId;
  if (!periodId) return '';
  try {
    const pSnap = await getDoc(doc(db, 'budget_periods', periodId));
    if (pSnap.exists()) {
      const pData = pSnap.data() as BudgetPeriod;
      return pData.householdId || pData.workspaceId || '';
    }
  } catch (err) {
    console.warn('Could not resolve workspace from periodId:', err);
  }
  return '';
}

export async function saveIncome(income: Income): Promise<void> {
  const saveIncomeStartTime = performance.now();
  console.log('[DEBUG LOG][firestoreService] saveIncome START:', {
    incomeId: income.id,
    incomeTitle: income.title,
    status: income.status,
    amount: income.amount,
    accountId: income.accountId,
    periodId: income.periodId,
    householdId: income.householdId,
    workspaceId: income.workspaceId,
    receivedDate: income.receivedDate,
    timestamp: new Date().toISOString(),
  });

  if (!income.periodId) {
    console.error('[DEBUG LOG][firestoreService] saveIncome ABORT: No pay period selected on income:', income);
    throw new Error('Cannot save income: No pay period selected.');
  }
  let wsId = income.householdId || income.workspaceId;
  if (!wsId) {
    console.log('[DEBUG LOG][firestoreService] Resolving workspaceId for period:', income.periodId);
    wsId = await resolveHouseholdIdForPeriod(income.periodId);
    console.log('[DEBUG LOG][firestoreService] Resolved workspaceId:', wsId);
  }
  const path = `incomes/${income.id}`;
  try {
    const audit = getAuditFields(wsId);
    console.log('[DEBUG LOG][firestoreService] Generated audit fields:', audit);

    let balanceBefore: number | undefined = income.balanceBefore;
    let balanceAfter: number | undefined = income.balanceAfter;
    let accBalanceAtTime: number | undefined = income.accountBalanceAtTransactionTime;

    if (income.accountId) {
      console.log('[DEBUG LOG][firestoreService] Fetching financial account doc for accountId:', income.accountId);
      const accRef = doc(db, 'financial_accounts', income.accountId);
      const accSnap = await getDoc(accRef);

      if (accSnap.exists()) {
        const accData = accSnap.data() as FinancialAccount;
        console.log('[DEBUG LOG][firestoreService] Found financial account data:', {
          id: accSnap.id,
          name: accData.name,
          currentBalance: accData.currentBalance,
          openingBalance: accData.openingBalance,
          type: accData.type,
        });

        const currentAccBalance =
          accData.currentBalance !== undefined
            ? accData.currentBalance
            : accData.openingBalance || 0;

        console.log('[DEBUG LOG][firestoreService] Fetching existing income doc to check previous state:', income.id);
        const existingIncSnap = await getDoc(doc(db, 'incomes', income.id));
        const prevData = existingIncSnap.exists() ? (existingIncSnap.data() as Income) : null;
        const prevWasReceived = prevData?.status === 'received';
        const prevAmount = prevWasReceived ? prevData?.amount || 0 : 0;

        console.log('[DEBUG LOG][firestoreService] Existing income previous state:', {
          docExists: existingIncSnap.exists(),
          prevStatus: prevData?.status,
          prevWasReceived,
          prevAmount,
          incomingStatus: income.status,
          incomingAmount: income.amount,
          currentAccBalance,
        });

        if (income.status === 'received') {
          balanceBefore = currentAccBalance - prevAmount;
          balanceAfter = balanceBefore + income.amount;
          accBalanceAtTime = balanceAfter;

          console.log('[DEBUG LOG][firestoreService] Updating account to received balance:', {
            accountId: income.accountId,
            accountName: accData.name,
            currentAccBalance,
            prevAmount,
            balanceBefore,
            balanceAfter,
          });

          await updateDoc(accRef, {
            currentBalance: balanceAfter,
            ...audit,
            updatedAt: new Date().toISOString(),
          });
          console.log('[DEBUG LOG][firestoreService] Account doc updated successfully in Firestore!');
        } else if (prevWasReceived) {
          // Changed from received to expected -> deduct previously added income
          const newAccBal = currentAccBalance - prevAmount;
          balanceBefore = undefined;
          balanceAfter = undefined;
          accBalanceAtTime = undefined;

          console.log('[DEBUG LOG][firestoreService] Reverting account from received back to expected:', {
            accountId: income.accountId,
            accountName: accData.name,
            currentAccBalance,
            prevAmount,
            newAccBal,
          });

          await updateDoc(accRef, {
            currentBalance: newAccBal,
            ...audit,
            updatedAt: new Date().toISOString(),
          });
          console.log('[DEBUG LOG][firestoreService] Account doc reverted successfully in Firestore!');
        } else {
          console.log('[DEBUG LOG][firestoreService] Income status is expected and was not previously received; no account balance adjustment needed.');
        }
      } else {
        console.warn('[DEBUG LOG][firestoreService] Financial account doc NOT FOUND in Firestore for ID:', income.accountId);
      }
    } else {
      console.warn('[DEBUG LOG][firestoreService] income.accountId is missing on income:', income.id);
    }

    const cleanedPayload = cleanFirestoreObject({
      ...income,
      balanceBefore,
      balanceAfter,
      accountBalanceAtTransactionTime: accBalanceAtTime,
      householdId: wsId || undefined,
      workspaceId: wsId || undefined,
      lastEditedBy: income.lastEditedBy || audit.lastEditedBy,
      lastEditedByEmail: income.lastEditedByEmail || audit.lastEditedByEmail,
      lastEditedAt: audit.lastEditedAt,
    });

    console.log('[DEBUG LOG][firestoreService] Writing income doc to Firestore (incomes/' + income.id + '):', cleanedPayload);

    await setDoc(
      doc(db, 'incomes', income.id),
      cleanedPayload
    );

    const elapsed = (performance.now() - saveIncomeStartTime).toFixed(2);
    console.log(`[DEBUG LOG][firestoreService] saveIncome COMPLETED in ${elapsed}ms for income:`, income.id);
  } catch (error) {
    const elapsed = (performance.now() - saveIncomeStartTime).toFixed(2);
    console.error(`[DEBUG LOG][firestoreService] saveIncome ERROR after ${elapsed}ms on path ${path}:`, error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveIncomesBulk(incomes: Income[]): Promise<void> {
  if (!incomes || incomes.length === 0) return;
  for (const inc of incomes) {
    await saveIncome(inc);
  }
}

export async function deleteIncome(incomeId: string, transferId?: string): Promise<void> {
  const path = `incomes/${incomeId}`;
  try {
    const incRef = doc(db, 'incomes', incomeId);
    const incSnap = await getDoc(incRef);

    if (incSnap.exists()) {
      const incData = incSnap.data() as Income;
      const linkedExpenseId = incData.linkedExpenseId;
      const actualTransferId = transferId || incData.transferId;

      // Check if this income is paired with an expense (Internal Transfer / Debt Payment)
      let pairedExpense: Expense | null = null;
      let pairedExpDocRef = null;

      if (linkedExpenseId) {
        const pRef = doc(db, 'expenses', linkedExpenseId);
        const pSnap = await getDoc(pRef);
        if (pSnap.exists()) {
          pairedExpense = pSnap.data() as Expense;
          pairedExpDocRef = pRef;
        }
      } else if (actualTransferId) {
        const qExp = query(collection(db, 'expenses'), where('transferId', '==', actualTransferId));
        const snapExp = await getDocs(qExp);
        if (!snapExp.empty) {
          pairedExpense = snapExp.docs[0].data() as Expense;
          pairedExpDocRef = snapExp.docs[0].ref;
        }
      }

      if (!pairedExpense && incomeId.startsWith('inc_')) {
        const correspondingExpId = incomeId.replace(/^inc_/, 'exp_');
        const pRef = doc(db, 'expenses', correspondingExpId);
        const pSnap = await getDoc(pRef);
        if (pSnap.exists()) {
          pairedExpense = pSnap.data() as Expense;
          pairedExpDocRef = pRef;
        }
      }

      if (pairedExpense) {
        // 1. Refund the source account where the money came from (e.g., Standard Bank)
        if (pairedExpense.accountId) {
          const sourceAccRef = doc(db, 'financial_accounts', pairedExpense.accountId);
          const sourceAccSnap = await getDoc(sourceAccRef);
          if (sourceAccSnap.exists()) {
            const sData = sourceAccSnap.data() as FinancialAccount;
            const curSource =
              sData.currentBalance !== undefined ? sData.currentBalance : sData.openingBalance || 0;
            await updateDoc(sourceAccRef, {
              currentBalance: curSource + pairedExpense.amount,
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // 2. Revert the destination account where the money was deposited (e.g., Home Loan)
        const destAccountId = pairedExpense.targetAccountId || incData.accountId;
        if (destAccountId) {
          const targetAccRef = doc(db, 'financial_accounts', destAccountId);
          const targetAccSnap = await getDoc(targetAccRef);
          if (targetAccSnap.exists()) {
            const tData = targetAccSnap.data() as FinancialAccount;
            const cur =
              tData.currentBalance !== undefined ? tData.currentBalance : tData.openingBalance || 0;

            const isLiabilityAccount = [
              'credit_card',
              'home_loan',
              'vehicle_loan',
              'loan',
            ].includes(tData.type);

            let revertedBalance: number;
            if (isLiabilityAccount) {
              // Restoring debt increases the outstanding balance by the principal reduction
              const reductionToRevert =
                pairedExpense.principalReduction !== undefined
                  ? pairedExpense.principalReduction
                  : incData.principalReduction !== undefined
                  ? incData.principalReduction
                  : pairedExpense.amount;
              revertedBalance = cur + reductionToRevert;
            } else {
              // Asset/Cash bank account: deduct the deposited money
              revertedBalance = cur - pairedExpense.amount;
            }

            await updateDoc(targetAccRef, {
              currentBalance: revertedBalance,
              ...(isLiabilityAccount ? { balanceOwed: revertedBalance } : {}),
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // 3. Refund debt snowball if linked
        if (pairedExpense.linkedDebtId) {
          const debtRef = doc(db, 'debts', pairedExpense.linkedDebtId);
          const debtSnap = await getDoc(debtRef);
          if (debtSnap.exists()) {
            const debtData = debtSnap.data() as Debt;
            const curDebt = debtData.balance !== undefined ? debtData.balance : 0;
            const debtReductionToRevert =
              pairedExpense.principalReduction !== undefined
                ? pairedExpense.principalReduction
                : pairedExpense.amount;
            await updateDoc(debtRef, {
              balance: curDebt + debtReductionToRevert,
              status: 'active',
              updatedAt: new Date().toISOString(),
            });
          }
        }
      } else {
        // Standard non-transfer income: revert the account where it was deposited
        if (incData.status === 'received' && incData.accountId) {
          const accRef = doc(db, 'financial_accounts', incData.accountId);
          const accSnap = await getDoc(accRef);
          if (accSnap.exists()) {
            const aData = accSnap.data() as FinancialAccount;
            const cur =
              aData.currentBalance !== undefined ? aData.currentBalance : aData.openingBalance || 0;
            const isLiabilityAccount = [
              'credit_card',
              'home_loan',
              'vehicle_loan',
              'loan',
            ].includes(aData.type);

            let revertedBalance: number;
            if (isLiabilityAccount) {
              const reductionToRevert =
                incData.principalReduction !== undefined
                  ? incData.principalReduction
                  : incData.amount;
              revertedBalance = cur + reductionToRevert;
            } else {
              revertedBalance = cur - incData.amount;
            }

            await updateDoc(accRef, {
              currentBalance: revertedBalance,
              ...(isLiabilityAccount ? { balanceOwed: revertedBalance } : {}),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      // Batch delete both records
      const batch = writeBatch(db);
      batch.delete(incRef);

      if (pairedExpDocRef) {
        batch.delete(pairedExpDocRef);
      }

      if (actualTransferId) {
        const q = query(collection(db, 'expenses'), where('transferId', '==', actualTransferId));
        const snap = await getDocs(q);
        snap.forEach((d) => {
          batch.delete(d.ref);
        });
      }

      await batch.commit();
      return;
    }

    const batch = writeBatch(db);
    batch.delete(incRef);
    if (transferId) {
      const q = query(collection(db, 'expenses'), where('transferId', '==', transferId));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        batch.delete(d.ref);
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateIncome(incomeId: string, updates: Partial<Income>): Promise<void> {
  const path = `incomes/${incomeId}`;
  try {
    const audit = getAuditFields();
    await updateDoc(
      doc(db, 'incomes', incomeId),
      cleanFirestoreObject({
        ...updates,
        ...audit,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ----------------------------------------------------
// Budget Categories
// ----------------------------------------------------
export function subscribeToCategories(
  periodId: string,
  householdId?: string,
  onData?: (categories: BudgetCategory[]) => void,
  onError?: (err: Error) => void
) {
  let callback = onData;
  let errorCallback = onError;
  if (typeof householdId === 'function') {
    callback = householdId as (categories: BudgetCategory[]) => void;
    errorCallback = onData as any;
  }

  if (!periodId) {
    if (callback) callback([]);
    return () => {};
  }
  const colRef = collection(db, 'budget_categories');
  const q = query(
    colRef, 
    where('periodId', '==', periodId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const categories: BudgetCategory[] = [];
      snapshot.forEach((docSnap) => {
        categories.push({ ...(docSnap.data() as BudgetCategory), id: docSnap.id });
      });
      // Sort by order if set, or fallback to createdAt
      categories.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
      if (callback) callback(categories);
    },
    (error) => {
      if (errorCallback) errorCallback(error);
      console.warn('Firestore onSnapshot error [budget_categories]:', error.message);
    }
  );
}

export function subscribeToAllWorkspaceCategories(
  householdId: string,
  onData: (categories: BudgetCategory[]) => void,
  onError?: (err: Error) => void
) {
  if (!householdId) {
    onData([]);
    return () => {};
  }
  const colRef = collection(db, 'budget_categories');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const categories: BudgetCategory[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as BudgetCategory;
        const wsId = data.householdId || data.workspaceId;
        if (wsId === householdId || !wsId || wsId === 'shared_family_workspace' || wsId === 'main') {
          categories.push({ ...(data as BudgetCategory), id: docSnap.id });
        }
      });
      categories.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
      onData(categories);
    },
    (error) => {
      if (onError) onError(error);
      console.warn('Firestore onSnapshot error [all_categories]:', error.message);
    }
  );
}

export async function saveCategory(category: BudgetCategory): Promise<void> {
  if (!category.periodId) {
    throw new Error('Cannot save category: No pay period selected.');
  }
  let wsId = category.householdId || category.workspaceId;
  if (!wsId) {
    wsId = await resolveHouseholdIdForPeriod(category.periodId);
  }
  const path = `budget_categories/${category.id}`;
  try {
    const audit = getAuditFields(wsId);
    await setDoc(
      doc(db, 'budget_categories', category.id),
      cleanFirestoreObject({
        ...category,
        householdId: wsId || undefined,
        workspaceId: wsId || undefined,
        lastEditedBy: category.lastEditedBy || audit.lastEditedBy,
        lastEditedByEmail: category.lastEditedByEmail || audit.lastEditedByEmail,
        lastEditedAt: audit.lastEditedAt,
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveCategoriesBulk(categories: BudgetCategory[]): Promise<void> {
  if (!categories || categories.length === 0) return;
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  for (const cat of categories) {
    let wsId = cat.householdId || cat.workspaceId;
    if (!wsId) {
      wsId = await resolveHouseholdIdForPeriod(cat.periodId);
    }
    const audit = getAuditFields(wsId);
    const ref = doc(db, 'budget_categories', cat.id);
    batch.set(
      ref,
      cleanFirestoreObject({
        ...cat,
        householdId: wsId || undefined,
        workspaceId: wsId || undefined,
        lastEditedBy: cat.lastEditedBy || audit.lastEditedBy,
        lastEditedByEmail: cat.lastEditedByEmail || audit.lastEditedByEmail,
        lastEditedAt: audit.lastEditedAt,
        createdAt: cat.createdAt || now,
        updatedAt: now,
      })
    );
  }
  await batch.commit();
}

export async function updateCategory(categoryId: string, updates: Partial<BudgetCategory>): Promise<void> {
  const path = `budget_categories/${categoryId}`;
  try {
    const audit = getAuditFields(updates.householdId);
    await updateDoc(
      doc(db, 'budget_categories', categoryId),
      cleanFirestoreObject({
        ...updates,
        ...audit,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const path = `budget_categories/${categoryId}`;
  try {
    await deleteDoc(doc(db, 'budget_categories', categoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// Expenses
// ----------------------------------------------------
export function subscribeToExpenses(
  periodId: string,
  householdId?: string,
  onData?: (expenses: Expense[]) => void,
  onError?: (err: Error) => void
) {
  let callback = onData;
  let errorCallback = onError;
  if (typeof householdId === 'function') {
    callback = householdId as (expenses: Expense[]) => void;
    errorCallback = onData as any;
  }

  if (!periodId) {
    if (callback) callback([]);
    return () => {};
  }
  const colRef = collection(db, 'expenses');
  const q = query(
    colRef, 
    where('periodId', '==', periodId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const expenses: Expense[] = [];
      snapshot.forEach((docSnap) => {
        expenses.push({ ...(docSnap.data() as Expense), id: docSnap.id });
      });
      // Sort newest expense first
      expenses.sort((a, b) => b.date.localeCompare(a.date));
      if (callback) callback(expenses);
    },
    (error) => {
      if (errorCallback) errorCallback(error);
      console.warn('Firestore onSnapshot error [expenses]:', error.message);
    }
  );
}

export function subscribeToAllWorkspaceExpenses(
  householdId: string,
  onData: (expenses: Expense[]) => void,
  onError?: (err: Error) => void
) {
  if (!householdId) {
    onData([]);
    return () => {};
  }
  const colRef = collection(db, 'expenses');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const expenses: Expense[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Expense;
        const wsId = data.householdId || data.workspaceId;
        if (wsId === householdId || !wsId || wsId === 'shared_family_workspace' || wsId === 'main') {
          expenses.push({ ...(data as Expense), id: docSnap.id });
        }
      });
      expenses.sort((a, b) => b.date.localeCompare(a.date));
      onData(expenses);
    },
    (error) => {
      if (onError) onError(error);
      console.warn('Firestore onSnapshot error [all_expenses]:', error.message);
    }
  );
}

export async function saveExpense(expense: Expense): Promise<void> {
  if (!expense.periodId) {
    throw new Error('Cannot save expense: No pay period selected.');
  }
  let wsId = expense.householdId || expense.workspaceId;
  if (!wsId) {
    wsId = await resolveHouseholdIdForPeriod(expense.periodId);
  }
  const path = `expenses/${expense.id}`;
  try {
    const audit = getAuditFields(wsId);
    let balanceBefore: number | undefined = expense.balanceBefore;
    let balanceAfter: number | undefined = expense.balanceAfter;
    let accBalanceAtTime: number | undefined = expense.accountBalanceAtTransactionTime;

    // Direct Balance Ledger mutation on source financial account
    if (expense.accountId) {
      const accRef = doc(db, 'financial_accounts', expense.accountId);
      const accSnap = await getDoc(accRef);
      if (accSnap.exists()) {
        const accData = accSnap.data() as FinancialAccount;
        const currentAccBalance =
          accData.currentBalance !== undefined
            ? accData.currentBalance
            : accData.openingBalance || 0;

        const existingExpSnap = await getDoc(doc(db, 'expenses', expense.id));
        const prevAmount = existingExpSnap.exists()
          ? ((existingExpSnap.data() as Expense).amount || 0)
          : 0;

        // Account balance before this transaction was deducted
        balanceBefore = currentAccBalance + prevAmount;
        // Account balance immediately after deducting this transaction
        balanceAfter = balanceBefore - expense.amount;
        accBalanceAtTime = balanceAfter;

        // Directly update Firestore account balance
        await updateDoc(accRef, {
          currentBalance: balanceAfter,
          ...audit,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    let principalReduction: number | undefined;
    let interestCharged: number | undefined;
    let feesCharged: number | undefined;

    // Direct deduction from Debt Snowball or Linked Liability Account
    if (expense.linkedDebtId) {
      const debtRef = doc(db, 'debts', expense.linkedDebtId);
      const debtSnap = await getDoc(debtRef);
      if (debtSnap.exists()) {
        const debtData = debtSnap.data() as Debt;
        const existingExpSnap = await getDoc(doc(db, 'expenses', expense.id));
        const prevAmount = existingExpSnap.exists()
          ? ((existingExpSnap.data() as Expense).amount || 0)
          : 0;
        const currentDebtBal = debtData.balance !== undefined ? debtData.balance : 0;
        const restoredDebtBal = currentDebtBal + prevAmount;

        // Perform calculation strategy based on payment type (installment vs direct deposit)
        const calc = calculateDebtReduction({
          currentBalance: restoredDebtBal,
          paymentAmount: expense.amount,
          paymentType: expense.debtPaymentType || 'installment',
          annualInterestRate: debtData.interestRate,
          monthlyFee: debtData.monthlyFee,
          debtCategory: debtData.category,
        });

        principalReduction = calc.principalReduction;
        interestCharged = calc.interestCharged;
        feesCharged = calc.feesCharged;

        await updateDoc(debtRef, {
          balance: calc.newBalance,
          status: calc.newBalance <= 0 ? 'paid_off' : 'active',
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Destination / Target account update (e.g. card payoff, bond, vehicle loan, or internal transfer)
    let autoFoundDebtId = expense.linkedDebtId;
    if (expense.targetAccountId) {
      const targetAccRef = doc(db, 'financial_accounts', expense.targetAccountId);
      const targetAccSnap = await getDoc(targetAccRef);
      if (targetAccSnap.exists()) {
        const tData = targetAccSnap.data() as FinancialAccount;
        const existingExpSnap = await getDoc(doc(db, 'expenses', expense.id));
        const prevAmount = existingExpSnap.exists()
          ? ((existingExpSnap.data() as Expense).amount || 0)
          : 0;
        const currentTBal =
          tData.currentBalance !== undefined ? tData.currentBalance : tData.openingBalance || 0;

        // Check if target account is a liability/debt account (e.g., credit card, home loan, vehicle loan, loan)
        const isLiabilityAccount = ['credit_card', 'home_loan', 'vehicle_loan', 'loan'].includes(tData.type);

        let newTBalance: number;
        if (isLiabilityAccount) {
          // In liability accounts, a positive currentBalance / balanceOwed represents debt owed.
          const restoredDebt = currentTBal + prevAmount;
          const calc = calculateDebtReduction({
            currentBalance: restoredDebt,
            paymentAmount: expense.amount,
            paymentType: expense.debtPaymentType || 'installment',
            accountType: tData.type,
            annualInterestRate: tData.interestRate,
            monthlyFee: tData.monthlyFee,
          });
          newTBalance = calc.newBalance;
          principalReduction = calc.principalReduction;
          interestCharged = calc.interestCharged;
          feesCharged = calc.feesCharged;

          // LIVE SYNC: Find and update the corresponding Debt document in the debts collection (Baby Step 2 Snowball)
          try {
            // Check by explicit linkedAccountId or matching id/name
            const qDebts = query(
              collection(db, 'debts'),
              where('linkedAccountId', '==', expense.targetAccountId)
            );
            const debtsSnap = await getDocs(qDebts);
            let targetDebtDoc = !debtsSnap.empty ? debtsSnap.docs[0] : null;

            if (!targetDebtDoc) {
              const directDebtRef = doc(db, 'debts', expense.targetAccountId);
              const directDebtSnap = await getDoc(directDebtRef);
              if (directDebtSnap.exists()) {
                targetDebtDoc = directDebtSnap as any;
              }
            }

            if (!targetDebtDoc && tData.name) {
              const allDebtsSnap = await getDocs(collection(db, 'debts'));
              const matching = allDebtsSnap.docs.find(
                (d) =>
                  d.data().name?.trim().toLowerCase() === tData.name?.trim().toLowerCase()
              );
              if (matching) targetDebtDoc = matching;
            }

            if (targetDebtDoc) {
              autoFoundDebtId = targetDebtDoc.id;
              const debtData = targetDebtDoc.data() as Debt;
              const curDebtBal = debtData.balance !== undefined ? debtData.balance : 0;
              const restoredDebtBal = curDebtBal + (prevAmount > 0 ? (calc.principalReduction || prevAmount) : 0);
              const updatedDebtBal = Math.max(0, restoredDebtBal - calc.principalReduction);

              await updateDoc(targetDebtDoc.ref, {
                balance: updatedDebtBal,
                status: updatedDebtBal <= 0 ? 'paid_off' : 'active',
                paidOffDate: updatedDebtBal <= 0 ? (debtData.paidOffDate || new Date().toISOString()) : undefined,
                updatedAt: new Date().toISOString(),
              });
            }
          } catch (syncErr) {
            console.warn('Auto debt sync notice:', syncErr);
          }
        } else {
          // Standard Asset / Cash account transfer deposit
          newTBalance = currentTBal - prevAmount + expense.amount;
        }

        await updateDoc(targetAccRef, {
          currentBalance: newTBalance,
          ...(isLiabilityAccount ? { balanceOwed: newTBalance } : {}),
          ...audit,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Pair Income creation for inter-account / debt transfer representation
    if (expense.targetAccountId && expense.transferType === 'internal_transfer') {
      const pairedIncId = `inc_${expense.transferId || expense.id}`;
      let sourceName = 'Source Account';
      if (expense.accountId) {
        try {
          const sAccSnap = await getDoc(doc(db, 'financial_accounts', expense.accountId));
          if (sAccSnap.exists()) {
            sourceName = (sAccSnap.data() as FinancialAccount).name || sourceName;
          }
        } catch {
          // ignore
        }
      }

      // Check whether target account is a fixed debt/liability account vs credit card vs normal asset account
      let targetAccType = '';
      if (expense.targetAccountId) {
        try {
          const tAccSnap = await getDoc(doc(db, 'financial_accounts', expense.targetAccountId));
          if (tAccSnap.exists()) {
            const tData = tAccSnap.data() as FinancialAccount;
            targetAccType = tData.type || '';
          }
        } catch {
          // ignore
        }
      }

      const isCreditCard = targetAccType === 'credit_card';
      const isFixedLiability = ['home_loan', 'vehicle_loan', 'loan', 'store_card'].includes(targetAccType);
      const isDebtPayoff = isFixedLiability || (!isCreditCard && Boolean(expense.linkedDebtId));

      const classification: 'external_income' | 'internal_transfer' | 'debt_payment_deposit' = isDebtPayoff
        ? 'debt_payment_deposit'
        : 'internal_transfer';

      const incomeTitle = isDebtPayoff
        ? `Debt Payment from ${sourceName}: ${expense.title}`
        : `Transfer from ${sourceName}${expense.title ? `: ${expense.title}` : ''}`;

      const sourceTag = isDebtPayoff ? 'Debt Payoff' : 'Internal Transfer';

      // For credit cards, if it's a monthly installment payment with interest/fees deduction,
      // the income amount equals the net principal offset so income stream & transactions match!
      // For direct deposits or standard bank transfers, use the full transferred amount.
      const effectiveIncomeAmount = (isCreditCard && expense.debtPaymentType === 'installment' && principalReduction !== undefined)
        ? principalReduction
        : expense.amount;

      await setDoc(
        doc(db, 'incomes', pairedIncId),
        cleanFirestoreObject({
          id: pairedIncId,
          periodId: expense.periodId,
          title: incomeTitle,
          amount: effectiveIncomeAmount,
          type: 'other',
          incomeClassification: classification,
          isTransfer: true,
          sourceTag,
          status: 'received',
          receivedDate: expense.date,
          accountId: expense.targetAccountId,
          notes: expense.notes,
          transferId: expense.transferId || expense.id,
          linkedExpenseId: expense.id,
          linkedDebtId: autoFoundDebtId,
          debtPaymentType: expense.debtPaymentType,
          principalReduction,
          interestCharged,
          feesCharged,
          householdId: wsId || undefined,
          workspaceId: wsId || undefined,
          ...audit,
          createdAt: expense.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );
    }

    await setDoc(
      doc(db, 'expenses', expense.id),
      cleanFirestoreObject({
        ...expense,
        linkedDebtId: autoFoundDebtId,
        principalReduction,
        interestCharged,
        feesCharged,
        balanceBefore,
        balanceAfter,
        accountBalanceAtTransactionTime: accBalanceAtTime,
        householdId: wsId || undefined,
        workspaceId: wsId || undefined,
        lastEditedBy: expense.lastEditedBy || audit.lastEditedBy,
        lastEditedByEmail: expense.lastEditedByEmail || audit.lastEditedByEmail,
        lastEditedAt: audit.lastEditedAt,
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function batchSaveExpenses(expensesList: Expense[]): Promise<void> {
  if (!expensesList || expensesList.length === 0) return;
  const path = 'expenses/batch';
  try {
    const batch = writeBatch(db);
    for (const exp of expensesList) {
      const audit = getAuditFields(exp.householdId);
      const ref = doc(db, 'expenses', exp.id);
      batch.set(
        ref,
        cleanFirestoreObject({
          ...exp,
          lastEditedBy: exp.lastEditedBy || audit.lastEditedBy,
          lastEditedByEmail: exp.lastEditedByEmail || audit.lastEditedByEmail,
          lastEditedAt: audit.lastEditedAt,
        })
      );
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateExpense(expenseId: string, updates: Partial<Expense>): Promise<void> {
  const path = `expenses/${expenseId}`;
  try {
    const audit = getAuditFields();
    await updateDoc(
      doc(db, 'expenses', expenseId),
      cleanFirestoreObject({
        ...updates,
        ...audit,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteExpense(expenseId: string, transferId?: string): Promise<void> {
  const path = `expenses/${expenseId}`;
  try {
    const expRef = doc(db, 'expenses', expenseId);
    const expSnap = await getDoc(expRef);
    if (expSnap.exists()) {
      const expData = expSnap.data() as Expense;
      // 1. Refund source account
      if (expData.accountId) {
        const accRef = doc(db, 'financial_accounts', expData.accountId);
        const accSnap = await getDoc(accRef);
        if (accSnap.exists()) {
          const accData = accSnap.data() as FinancialAccount;
          const cur =
            accData.currentBalance !== undefined
              ? accData.currentBalance
              : accData.openingBalance || 0;
          const refundedBalance = cur + expData.amount;
          await updateDoc(accRef, {
            currentBalance: refundedBalance,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 2. Revert destination account if transfer or card/loan payment
      let destAccId = expData.targetAccountId;
      let pairedIncomeForExp: Income | null = null;
      let pairedIncDocRef = null;

      // Look up paired income document if targetAccountId is not directly present on expData
      const effectiveTransferId = transferId || expData.transferId;
      if (effectiveTransferId) {
        const qInc = query(collection(db, 'incomes'), where('transferId', '==', effectiveTransferId));
        const snapInc = await getDocs(qInc);
        if (!snapInc.empty) {
          pairedIncomeForExp = snapInc.docs[0].data() as Income;
          pairedIncDocRef = snapInc.docs[0].ref;
          if (!destAccId) {
            destAccId = pairedIncomeForExp.accountId || pairedIncomeForExp.targetAccountId;
          }
        }
      }

      if (!destAccId) {
        const directIncRef = doc(db, 'incomes', `inc_${expenseId}`);
        const directIncSnap = await getDoc(directIncRef);
        if (directIncSnap.exists()) {
          pairedIncomeForExp = directIncSnap.data() as Income;
          pairedIncDocRef = directIncRef;
          destAccId = pairedIncomeForExp.accountId || pairedIncomeForExp.targetAccountId;
        }
      }

      if (destAccId) {
        const targetAccRef = doc(db, 'financial_accounts', destAccId);
        const targetAccSnap = await getDoc(targetAccRef);
        if (targetAccSnap.exists()) {
          const tData = targetAccSnap.data() as FinancialAccount;
          const cur =
            tData.currentBalance !== undefined ? tData.currentBalance : tData.openingBalance || 0;
          
          const isLiabilityAccount = ['credit_card', 'home_loan', 'vehicle_loan', 'loan'].includes(tData.type);
          let revertedBalance: number;
          if (isLiabilityAccount) {
            // For liability/debts: restoring debt increases the balance owed by the paid/principal reduction amount
            const reductionToRevert = expData.principalReduction !== undefined ? expData.principalReduction : expData.amount;
            revertedBalance = cur + reductionToRevert;
          } else {
            // For asset/cash bank account: deduct the deposited money
            revertedBalance = cur - expData.amount;
          }

          await updateDoc(targetAccRef, {
            currentBalance: revertedBalance,
            ...(isLiabilityAccount ? { balanceOwed: revertedBalance } : {}),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 3. Refund debt snowball if linked
      if (expData.linkedDebtId) {
        const debtRef = doc(db, 'debts', expData.linkedDebtId);
        const debtSnap = await getDoc(debtRef);
        if (debtSnap.exists()) {
          const debtData = debtSnap.data() as Debt;
          const curDebt = debtData.balance !== undefined ? debtData.balance : 0;
          const debtReductionToRevert = expData.principalReduction !== undefined ? expData.principalReduction : expData.amount;
          await updateDoc(debtRef, {
            balance: curDebt + debtReductionToRevert,
            status: 'active',
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    const batch = writeBatch(db);
    batch.delete(expRef);

    // Delete paired incoming record if linked via transferId or linkedExpenseId
    if (transferId) {
      const q = query(collection(db, 'incomes'), where('transferId', '==', transferId));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        batch.delete(d.ref);
      });
    }

    // Also check for income linked specifically by linkedExpenseId or direct ID
    const qExp = query(collection(db, 'incomes'), where('linkedExpenseId', '==', expenseId));
    const snapExp = await getDocs(qExp);
    snapExp.forEach((d) => {
      batch.delete(d.ref);
    });

    const directPairedRef = doc(db, 'incomes', `inc_${expenseId}`);
    const directPairedSnap = await getDoc(directPairedRef);
    if (directPairedSnap.exists()) {
      batch.delete(directPairedRef);
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function executeTransfer(expense: Expense, income: Income): Promise<void> {
  const path = 'transfers/execute';
  try {
    const wsId = expense.householdId || income.householdId;
    // Calling saveExpense with targetAccountId and transferType: 'internal_transfer'
    // accurately handles debiting source account, crediting destination account,
    // saving the expense record, and generating the corresponding paired received income document.
    await saveExpense({
      ...expense,
      targetAccountId: expense.targetAccountId || income.accountId,
      transferType: 'internal_transfer',
      householdId: wsId,
      workspaceId: wsId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------------------------------------------
// Debts (Baby Step 2)
// ----------------------------------------------------
export function subscribeToDebts(
  householdId: string,
  onData: (debts: Debt[]) => void,
  onError?: (err: Error) => void
) {
  if (!householdId) {
    onData([]);
    return () => {};
  }
  const colRef = collection(db, 'debts');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const debts: Debt[] = [];
      const seenIds = new Set<string>();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Debt;
        const wsId = data.householdId || data.workspaceId;
        if (wsId === householdId || !wsId || wsId === 'shared_family_workspace' || wsId === 'main') {
          if (!seenIds.has(docSnap.id)) {
            seenIds.add(docSnap.id);
            debts.push({ ...(data as Debt), id: docSnap.id });
          }
        }
      });
      // Sort smallest balance to largest for the Debt Snowball method
      debts.sort((a, b) => {
        if (a.status === 'paid_off' && b.status !== 'paid_off') return 1;
        if (a.status !== 'paid_off' && b.status === 'paid_off') return -1;
        return a.balance - b.balance;
      });
      onData(debts);
    },
    (error) => {
      if (onError) onError(error);
      console.warn('Firestore onSnapshot error [debts]:', error.message);
    }
  );
}

export async function saveDebt(debt: Debt): Promise<void> {
  const wsId = debt.householdId || debt.workspaceId;
  if (!wsId) {
    throw new Error('Cannot save debt: No workspace selected.');
  }
  const path = `debts/${debt.id}`;
  try {
    const audit = getAuditFields(wsId);
    await setDoc(
      doc(db, 'debts', debt.id),
      cleanFirestoreObject({
        ...debt,
        householdId: wsId,
        workspaceId: wsId,
        lastEditedBy: debt.lastEditedBy || audit.lastEditedBy,
        lastEditedByEmail: debt.lastEditedByEmail || audit.lastEditedByEmail,
        lastEditedAt: audit.lastEditedAt,
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateDebt(debtId: string, updates: Partial<Debt>): Promise<void> {
  const path = `debts/${debtId}`;
  try {
    const existingSnap = await getDoc(doc(db, 'debts', debtId));
    const existingData = existingSnap.exists() ? (existingSnap.data() as Debt) : null;
    const wsId = updates.householdId || updates.workspaceId || existingData?.householdId || existingData?.workspaceId;
    const audit = getAuditFields(wsId);
    await updateDoc(
      doc(db, 'debts', debtId),
      cleanFirestoreObject({
        ...updates,
        householdId: wsId || undefined,
        workspaceId: wsId || undefined,
        ...audit,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteDebt(debtId: string): Promise<void> {
  const path = `debts/${debtId}`;
  try {
    await deleteDoc(doc(db, 'debts', debtId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// Baby Steps State
// ----------------------------------------------------
export function subscribeToBabyStepsState(
  householdId: string,
  onData: (state: BabyStepsState | null) => void,
  onError?: (err: Error) => void
) {
  if (!householdId) {
    onData(null);
    return () => {};
  }
  const docRef = doc(db, 'baby_steps_state', householdId);
  return onSnapshot(
    docRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as BabyStepsState);
      } else {
        // Look for existing state from fallback document (e.g. shared_family_workspace or main)
        try {
          const fallbackSnap = await getDoc(doc(db, 'baby_steps_state', 'shared_family_workspace'));
          const mainSnap = !fallbackSnap.exists() ? await getDoc(doc(db, 'baby_steps_state', 'main')) : null;
          const fallbackData = fallbackSnap.exists()
            ? (fallbackSnap.data() as BabyStepsState)
            : mainSnap?.exists()
            ? (mainSnap.data() as BabyStepsState)
            : null;

          if (fallbackData) {
            onData({
              ...fallbackData,
              id: householdId,
              householdId,
              workspaceId: householdId,
            });
            return;
          }
        } catch {
          // ignore fallback error
        }

        // Return a fresh workspace baby steps state
        onData({
          id: householdId,
          householdId,
          workspaceId: householdId,
          currentStep: 1,
          step1EmergencyFundTarget: 20000,
          step1CurrentBalance: 0,
          step3MonthsTarget: 3,
          step3CurrentBalance: 0,
          step4MonthlyInvestment: 0,
          step5CollegeFundBalance: 0,
          step6BondBalance: 0,
          step6MonthlyExtra: 0,
          step7GivingMonthly: 0,
          notes: 'Dave Ramsey Baby Steps plan. Step 1: R20,000 Starter Emergency Fund.',
          updatedAt: new Date().toISOString(),
        });
      }
    },
    (error) => {
      if (onError) onError(error);
      console.warn(`Firestore onSnapshot error [baby_steps_state/${householdId}]:`, error.message);
    }
  );
}

export async function saveBabyStepsState(state: BabyStepsState): Promise<void> {
  const householdId = state.householdId || state.workspaceId;
  if (!householdId) {
    throw new Error('Cannot save baby steps state: No workspace selected.');
  }
  const path = `baby_steps_state/${householdId}`;
  try {
    const audit = getAuditFields(householdId);
    await setDoc(doc(db, 'baby_steps_state', householdId), cleanFirestoreObject({
      ...state,
      householdId,
      workspaceId: householdId,
      ...audit,
      updatedAt: new Date().toISOString()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------------------------------------------
// Emergency Fund Logs
// ----------------------------------------------------
export function subscribeToEmergencyFundLogs(
  householdId: string,
  onData: (logs: EmergencyFundLog[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, 'emergency_fund_logs');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const logs: EmergencyFundLog[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as EmergencyFundLog;
        if (
          !data.householdId ||
          data.householdId === householdId ||
          data.workspaceId === householdId ||
          data.householdId === 'shared_family_workspace' ||
          data.householdId === 'main'
        ) {
          logs.push({ ...(data as EmergencyFundLog), id: docSnap.id });
        }
      });
      logs.sort((a, b) => b.date.localeCompare(a.date));
      onData(logs);
    },
    (error) => {
      if (onError) onError(error);
      console.warn('Firestore onSnapshot error [emergency_fund_logs]:', error.message);
    }
  );
}

export async function addEmergencyFundLog(log: EmergencyFundLog): Promise<void> {
  const path = `emergency_fund_logs/${log.id}`;
  try {
    const audit = getAuditFields();
    await setDoc(
      doc(db, 'emergency_fund_logs', log.id),
      cleanFirestoreObject({
        ...log,
        lastEditedBy: log.lastEditedBy || audit.lastEditedBy,
        lastEditedByEmail: log.lastEditedByEmail || audit.lastEditedByEmail,
        lastEditedAt: audit.lastEditedAt,
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteEmergencyFundLog(logId: string): Promise<void> {
  const path = `emergency_fund_logs/${logId}`;
  try {
    await deleteDoc(doc(db, 'emergency_fund_logs', logId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// Database Initialization & Starter Data Seeder
// ----------------------------------------------------
export async function checkAndSeedInitialData(): Promise<void> {
  const path = 'budget_periods';
  try {
    const periodsSnapshot = await getDocs(collection(db, 'budget_periods'));
    if (!periodsSnapshot.empty) {
      return; // Already initialized
    }
    // Always initialize with clean empty worksheet as requested
    await seedEmptyWorksheet();
  } catch (error) {
    console.error('Error checking or seeding database:', error);
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Creates a clean, empty budget worksheet with no preloaded or sample transactions
 */
export async function seedEmptyWorksheet(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const periodInfo = generatePayPeriodInfo(year, month);
  const periodId = `period_${year}_${month + 1}`;

  const batch = writeBatch(db);

  // 1. Initial Financial Accounts with clean zero balances
  const initialAccounts: FinancialAccount[] = DEFAULT_STARTER_ACCOUNTS.map((acc, index) => ({
    ...acc,
    id: `acc_init_${index + 1}`,
    openingBalance: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  for (const acc of initialAccounts) {
    batch.set(doc(db, 'financial_accounts', acc.id), acc);
  }

  // 2. Clean Active Period
  const initialPeriod: BudgetPeriod = {
    id: periodId,
    name: periodInfo.periodName,
    startDate: periodInfo.startDate,
    endDate: periodInfo.endDate,
    setupDueDate: periodInfo.setupDueDate,
    status: 'active',
    totalPlannedIncome: 0,
    totalPlannedExpenses: 0,
    notes: 'Clean zero-based budget worksheet.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  batch.set(doc(db, 'budget_periods', periodId), initialPeriod);

  // 3. Baby Steps State
  const babyState: BabyStepsState = {
    id: 'main',
    currentStep: 1,
    step1EmergencyFundTarget: 20000,
    step1CurrentBalance: 0,
    step3MonthsTarget: 3,
    step3CurrentBalance: 0,
    step4MonthlyInvestment: 0,
    step5CollegeFundBalance: 0,
    step6BondBalance: 0,
    step6MonthlyExtra: 0,
    step7GivingMonthly: 0,
    notes: 'Dave Ramsey Baby Steps plan. Step 1: R20,000 Starter Emergency Fund.',
    updatedAt: new Date().toISOString(),
  };
  batch.set(doc(db, 'baby_steps_state', 'main'), babyState);

  await batch.commit();
  return periodId;
}

export async function seedFamilyData(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const periodInfo = generatePayPeriodInfo(year, month);
  const periodId = `period_${year}_${month + 1}`;

  const batch = writeBatch(db);

  // 0. Initial Financial Accounts (Cheque, Savings, TFSA, Credit, Cash)
  const initialAccounts: FinancialAccount[] = DEFAULT_STARTER_ACCOUNTS.map((acc, index) => ({
    ...acc,
    id: `acc_init_${index + 1}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  for (const acc of initialAccounts) {
    batch.set(doc(db, 'financial_accounts', acc.id), acc);
  }

  const chequeAccId = initialAccounts[0].id;
  const savingsAccId = initialAccounts[1].id;
  const creditCardAccId = initialAccounts[3].id;
  const cashAccId = initialAccounts[4].id;

  // 1. Initial Period
  const initialPeriod: BudgetPeriod = {
    id: periodId,
    name: periodInfo.periodName,
    startDate: periodInfo.startDate,
    endDate: periodInfo.endDate,
    setupDueDate: periodInfo.setupDueDate,
    status: 'active',
    totalPlannedIncome: 74000,
    totalPlannedExpenses: 74000,
    notes: 'Family monthly budget cycle. Plan finalized before salary arrival on the 25th!',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  batch.set(doc(db, 'budget_periods', periodId), initialPeriod);

  // 2. Incomes
  const initialIncomes: Income[] = [
    {
      id: `inc_${periodId}_1`,
      periodId,
      title: 'Hubby Primary Salary',
      amount: 38000,
      type: 'primary_salary',
      sourceTag: 'Corporate / Main Job',
      accountId: chequeAccId,
      receivedDate: periodInfo.startDate,
      status: 'received',
      order: 1,
      notes: 'Net salary deposited into cheque account',
      lastEditedBy: 'Hubby',
      lastEditedByEmail: 'jabuobed1@gmail.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `inc_${periodId}_2`,
      periodId,
      title: 'Wifey Primary Salary',
      amount: 30000,
      type: 'spouse_salary',
      sourceTag: 'Main Job',
      accountId: chequeAccId,
      receivedDate: periodInfo.startDate,
      status: 'received',
      order: 2,
      notes: 'Net salary deposited into cheque account',
      lastEditedBy: 'Wifey',
      lastEditedByEmail: 'lumzayopa@gmail.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `inc_${periodId}_3`,
      periodId,
      title: 'Consulting & Freelance Work',
      amount: 6000,
      type: 'freelance',
      sourceTag: 'Client Projects',
      accountId: chequeAccId,
      receivedDate: periodInfo.startDate,
      status: 'expected',
      order: 3,
      notes: 'Side income project invoice',
      lastEditedBy: 'Hubby',
      lastEditedByEmail: 'jabuobed1@gmail.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const inc of initialIncomes) {
    batch.set(doc(db, 'incomes', inc.id), inc);
  }

  // 3. Categories
  const categoryIds: { [name: string]: string } = {};
  DEFAULT_SOUTH_AFRICAN_CATEGORIES.forEach((cat, idx) => {
    const catId = `cat_${periodId}_${idx + 1}`;
    categoryIds[cat.name] = catId;
    const catData: BudgetCategory = {
      id: catId,
      periodId,
      name: cat.name,
      group: cat.group,
      tag: cat.tag || 'other',
      allocatedAmount: cat.defaultAmount,
      defaultAccountId:
        cat.group === 'savings_goals'
          ? savingsAccId
          : cat.tag === 'debt'
          ? creditCardAccId
          : cat.group === 'personal'
          ? cashAccId
          : chequeAccId,
      color: cat.color,
      icon: cat.icon,
      order: idx + 1,
      isEssential: cat.isEssential,
      lastEditedBy: idx % 2 === 0 ? 'Hubby' : 'Wifey',
      lastEditedByEmail: idx % 2 === 0 ? 'jabuobed1@gmail.com' : 'lumzayopa@gmail.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    batch.set(doc(db, 'budget_categories', catId), catData);
  });

  // 4. Starter Sample Expenses
  const starterExpenses: Expense[] = [
    {
      id: `exp_${periodId}_1`,
      periodId,
      categoryId: categoryIds['Supermarket Groceries (Checkers/PnP/Spar)'] || `cat_${periodId}_6`,
      amount: 2450.8,
      title: 'Checkers Hyper Monthly Pantry Stockup',
      date: periodInfo.startDate,
      loggedBy: 'Wifey',
      lastEditedBy: 'Wifey',
      lastEditedByEmail: 'lumzayopa@gmail.com',
      accountId: chequeAccId,
      paymentMethod: 'Debit Card',
      notes: 'Bulk meat, pantry dry goods, cleaning supplies',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `exp_${periodId}_2`,
      periodId,
      categoryId: categoryIds['Electricity & Water (Prepaid/Mun)'] || `cat_${periodId}_3`,
      amount: 1500.0,
      title: 'City Power Prepaid Electricity Tokens',
      date: periodInfo.startDate,
      loggedBy: 'Hubby',
      lastEditedBy: 'Hubby',
      lastEditedByEmail: 'jabuobed1@gmail.com',
      accountId: chequeAccId,
      paymentMethod: 'EFT / Bank Transfer',
      notes: 'Electricity recharge',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `exp_${periodId}_3`,
      periodId,
      categoryId: categoryIds['Petrol & Fuel (Shell/Sasol/Engen)'] || `cat_${periodId}_8`,
      amount: 1250.0,
      title: 'Engen QuickShop Full Tank Petrol',
      date: periodInfo.startDate,
      loggedBy: 'Husband',
      accountId: creditCardAccId,
      paymentMethod: 'Credit Card',
      notes: '95 Unleaded commuter tank',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `exp_${periodId}_4`,
      periodId,
      categoryId: categoryIds['Medical Aid (Discovery / Bonitas)'] || `cat_${periodId}_10`,
      amount: 6200.0,
      title: 'Discovery Health Classic Saver Debit Order',
      date: periodInfo.startDate,
      loggedBy: 'Shared',
      accountId: chequeAccId,
      paymentMethod: 'Direct Debit',
      notes: 'Family Medical Aid cover',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `exp_${periodId}_5`,
      periodId,
      categoryId: categoryIds['Family Dining Out & Takeaways'] || `cat_${periodId}_14`,
      amount: 480.0,
      title: 'Spur Family Dinner',
      date: periodInfo.startDate,
      loggedBy: 'Husband',
      accountId: chequeAccId,
      paymentMethod: 'SnapScan / Zapper',
      notes: 'Friday night family dinner',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const exp of starterExpenses) {
    batch.set(doc(db, 'expenses', exp.id), exp);
  }

  // 5. Dave Ramsey Baby Step 2 Debts (sorted smallest to largest balance)
  const initialDebts: Debt[] = [
    {
      id: 'debt_1_woolies',
      name: 'Woolworths Store Card',
      lender: 'Woolworths Financial Services',
      category: 'store_card',
      balance: 3800,
      originalBalance: 6500,
      minimumPayment: 450,
      interestRate: 24.5,
      order: 1,
      status: 'active',
      notes: 'Smallest debt — Top priority for Debt Snowball attack!',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'debt_2_edgars',
      name: 'Edgars / RCS Clothing Account',
      lender: 'RCS Cards',
      category: 'store_card',
      balance: 5400,
      originalBalance: 8000,
      minimumPayment: 600,
      interestRate: 22.0,
      order: 2,
      status: 'active',
      notes: 'Next debt to knock out after Woolies',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'debt_3_capitec',
      name: 'Capitec Personal Loan',
      lender: 'Capitec Bank',
      category: 'personal_loan',
      balance: 18500,
      originalBalance: 35000,
      minimumPayment: 1350,
      interestRate: 19.5,
      order: 3,
      status: 'active',
      notes: 'Fixed monthly personal loan repayment',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'debt_4_fnb_cc',
      name: 'FNB Platinum Credit Card',
      lender: 'First National Bank',
      category: 'credit_card',
      balance: 29000,
      originalBalance: 40000,
      minimumPayment: 1900,
      interestRate: 20.75,
      order: 4,
      status: 'active',
      notes: 'Credit card facility to close upon full payoff',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'debt_5_car',
      name: 'WesBank Vehicle Finance',
      lender: 'WesBank / FirstRand',
      category: 'car_finance',
      balance: 142000,
      originalBalance: 210000,
      minimumPayment: 4850,
      interestRate: 12.75,
      order: 5,
      status: 'active',
      notes: 'Family SUV instalment',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const d of initialDebts) {
    batch.set(doc(db, 'debts', d.id), d);
  }

  // 6. Baby Steps State (Currently on Step 1: Starter Emergency Fund in South Africa = R20,000)
  const babyState: BabyStepsState = {
    id: 'main',
    currentStep: 1, // User is on Step 1 as stated in the prompt: "Currently we are on number one"
    step1EmergencyFundTarget: 20000, // R20,000
    step1CurrentBalance: 14500, // R14,500 saved (72.5% towards R20k target)
    step3MonthsTarget: 3, // 3 to 6 months
    step3CurrentBalance: 0,
    step4MonthlyInvestment: 0,
    step5CollegeFundBalance: 0,
    step6BondBalance: 850000,
    step6MonthlyExtra: 0,
    step7GivingMonthly: 1000,
    notes: 'Dave Ramsey Baby Steps plan tailored for our family in South Africa. Working on Step 1 (R20,000 starter emergency fund) while staying current on minimum payments.',
    updatedAt: new Date().toISOString(),
  };
  batch.set(doc(db, 'baby_steps_state', 'main'), babyState);

  // 7. Initial Emergency Fund Logs
  const initialLogs: EmergencyFundLog[] = [
    {
      id: 'log_ef_1',
      step: 1,
      type: 'deposit',
      amount: 5000,
      date: `${year}-06-25`,
      description: 'Initial starter fund seed from June salary',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'log_ef_2',
      step: 1,
      type: 'deposit',
      amount: 5000,
      date: `${year}-07-25`,
      description: 'July payday savings transfer',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'log_ef_3',
      step: 1,
      type: 'deposit',
      amount: 4500,
      date: periodInfo.startDate,
      description: 'August budget allocation transfer',
      createdAt: new Date().toISOString(),
    },
  ];

  for (const log of initialLogs) {
    batch.set(doc(db, 'emergency_fund_logs', log.id), log);
  }

  await batch.commit();
  return periodId;
}

// ----------------------------------------------------
// Reset Worksheet Functions (Start From Scratch)
// ----------------------------------------------------

/**
 * Resets the entire budgeting worksheet so the user can start from scratch.
 * Wipes out all expense categories, incomes, and expenses.
 * Keeps banking accounts ready so that when the user adds incomes and categories, they can immediately link them to accounts.
 */
export async function resetWorksheetToScratch(
  householdId: string,
  options?: {
    resetAccountsToCleanDefaults?: boolean;
    clearDebts?: boolean;
    clearEmergencyLogs?: boolean;
  }
): Promise<string> {
  const batch = writeBatch(db);
  const audit = getAuditFields(householdId);

  // 1. Delete expenses in this workspace
  const expensesSnap = await getDocs(query(collection(db, 'expenses'), where('householdId', '==', householdId)));
  expensesSnap.forEach((docSnap) => {
    batch.delete(doc(db, 'expenses', docSnap.id));
  });

  // 2. Delete categories in this workspace
  const catSnap = await getDocs(query(collection(db, 'budget_categories'), where('householdId', '==', householdId)));
  catSnap.forEach((docSnap) => {
    batch.delete(doc(db, 'budget_categories', docSnap.id));
  });

  // 3. Delete incomes in this workspace
  const incSnap = await getDocs(query(collection(db, 'incomes'), where('householdId', '==', householdId)));
  incSnap.forEach((docSnap) => {
    batch.delete(doc(db, 'incomes', docSnap.id));
  });

  // 4. Reset debts if requested
  if (options?.clearDebts) {
    const debtSnap = await getDocs(query(collection(db, 'debts'), where('householdId', '==', householdId)));
    debtSnap.forEach((docSnap) => {
      batch.delete(doc(db, 'debts', docSnap.id));
    });
  }

  // 5. Reset emergency fund logs if requested
  if (options?.clearEmergencyLogs) {
    const efSnap = await getDocs(query(collection(db, 'emergency_fund_logs'), where('householdId', '==', householdId)));
    efSnap.forEach((docSnap) => {
      batch.delete(doc(db, 'emergency_fund_logs', docSnap.id));
    });
  }

  // 6. Reset baby steps state for this workspace
  const babyStateDoc = doc(db, 'baby_steps_state', householdId);
  batch.set(babyStateDoc, {
    ...audit,
    id: householdId,
    currentStep: 1,
    step1EmergencyFundTarget: 20000,
    step1CurrentBalance: 0,
    step3MonthsTarget: 3,
    step3CurrentBalance: 0,
    step4MonthlyInvestment: 0,
    step5CollegeFundBalance: 0,
    step6BondBalance: 0,
    step6MonthlyExtra: 0,
    step7GivingMonthly: 0,
    notes: 'Dave Ramsey Baby Steps plan. Start with Step 1 (R20,000 Starter Emergency Fund).',
    updatedAt: new Date().toISOString(),
  });

  // 7. Reset accounts if requested
  if (options?.resetAccountsToCleanDefaults) {
    const accSnap = await getDocs(query(collection(db, 'financial_accounts'), where('householdId', '==', householdId)));
    accSnap.forEach((docSnap) => {
      batch.delete(doc(db, 'financial_accounts', docSnap.id));
    });
    
    const cleanAccounts: FinancialAccount[] = DEFAULT_STARTER_ACCOUNTS.map((acc, index) => ({
      ...acc,
      ...audit,
      id: `acc_${householdId}_${index + 1}`,
      openingBalance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    for (const acc of cleanAccounts) {
      batch.set(doc(db, 'financial_accounts', acc.id), acc);
    }
  }

  // 8. Ensure active period exists for this workspace
  const now = new Date();
  const year = now.getFullYear();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[now.getMonth()];
  const periodId = `period_${householdId}_${year}_${now.getMonth() + 1}`;
  
  const startStr = new Date(year, now.getMonth(), 25).toISOString().split('T')[0];
  const endStr = new Date(year, now.getMonth() + 1, 24).toISOString().split('T')[0];

  const initialPeriod: BudgetPeriod = {
    ...audit,
    id: periodId,
    name: `${monthName} ${year} Cycle`,
    startDate: startStr,
    endDate: endStr,
    setupDueDate: startStr,
    status: 'active',
    totalPlannedIncome: 0,
    totalPlannedExpenses: 0,
    notes: 'Initial starting period for new worksheet.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  batch.set(doc(db, 'budget_periods', periodId), initialPeriod);
  await batch.commit();

  return periodId;
}

/**
 * Resets only the current selected period's entries (incomes, categories, expenses for that period)
 */
export async function resetPeriodWorksheetOnly(periodId: string): Promise<void> {
  const batch = writeBatch(db);

  const expensesSnap = await getDocs(
    query(collection(db, 'expenses'), where('periodId', '==', periodId))
  );
  expensesSnap.forEach((d) => batch.delete(doc(db, 'expenses', d.id)));

  const catSnap = await getDocs(
    query(collection(db, 'budget_categories'), where('periodId', '==', periodId))
  );
  catSnap.forEach((d) => batch.delete(doc(db, 'budget_categories', d.id)));

  const incSnap = await getDocs(
    query(collection(db, 'incomes'), where('periodId', '==', periodId))
  );
  incSnap.forEach((d) => batch.delete(doc(db, 'incomes', d.id)));

  const periodRef = doc(db, 'budget_periods', periodId);
  batch.update(periodRef, {
    totalPlannedIncome: 0,
    totalPlannedExpenses: 0,
    updatedAt: new Date().toISOString(),
  });

  await batch.commit();
}

// ----------------------------------------------------
// Multi-User Profile Sync & Shared Household Workspace
// ----------------------------------------------------
export async function syncUserProfile(): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) return;

    const email = currentUser.email.trim().toLowerCase();
    const member = getFamilyMemberByEmail(email);
    if (!member) return;

    const profileRef = doc(db, 'user_profiles', currentUser.uid);
    const audit = getAuditFields();

    const existingSnap = await getDoc(profileRef);
    const existingData = existingSnap.exists() ? (existingSnap.data() as Partial<UserProfile>) : {};

    const profileData: Partial<UserProfile> = {
      uid: currentUser.uid,
      email: email,
      displayName: member.displayName || currentUser.displayName || member.role,
      role: member.role,
      householdId: existingData.householdId || existingData.activeWorkspaceId || 'shared_family_workspace',
      linkedUserIds: ['jabuobed1_uid', 'lumzayopa_uid'],
      avatarColor: member.avatarColor,
      updatedAt: new Date().toISOString(),
      ...audit,
    };

    if (!existingSnap.exists()) {
      profileData.createdAt = new Date().toISOString();
    }

    await setDoc(profileRef, cleanFirestoreObject(profileData), { merge: true });
  } catch (error) {
    console.warn('Error syncing user profile:', error);
  }
}

// ----------------------------------------------------
// Archived Worksheets (Safe Backup & Restoration)
// ----------------------------------------------------

/**
 * Archives current live worksheet data into Firestore collection `archived_worksheets`
 * before resetting, ensuring all historical data is saved safely and can be restored.
 */
export async function archiveCurrentWorksheet(customTitle?: string, notes?: string): Promise<string> {
  const audit = getAuditFields();

  // Fetch snapshot of current collections
  const periodsSnap = await getDocs(collection(db, 'budget_periods'));
  const periods: BudgetPeriod[] = periodsSnap.docs.map((d) => ({ ...(d.data() as BudgetPeriod), id: d.id }));

  const incomesSnap = await getDocs(collection(db, 'incomes'));
  const incomes: Income[] = incomesSnap.docs.map((d) => ({ ...(d.data() as Income), id: d.id }));

  const catSnap = await getDocs(collection(db, 'budget_categories'));
  const categories: BudgetCategory[] = catSnap.docs.map((d) => ({ ...(d.data() as BudgetCategory), id: d.id }));

  const expSnap = await getDocs(collection(db, 'expenses'));
  const expenses: Expense[] = expSnap.docs.map((d) => ({ ...(d.data() as Expense), id: d.id }));

  const debtSnap = await getDocs(collection(db, 'debts'));
  const debts: Debt[] = debtSnap.docs.map((d) => ({ ...(d.data() as Debt), id: d.id }));

  const accSnap = await getDocs(collection(db, 'financial_accounts'));
  const accounts: FinancialAccount[] = accSnap.docs.map((d) => ({ ...(d.data() as FinancialAccount), id: d.id }));

  const babyStateDoc = await getDocs(collection(db, 'baby_steps_state'));
  const babyState = babyStateDoc.empty ? null : (babyStateDoc.docs[0].data() as BabyStepsState);

  const logsSnap = await getDocs(collection(db, 'emergency_fund_logs'));
  const emergencyLogs: EmergencyFundLog[] = logsSnap.docs.map((d) => ({ ...(d.data() as EmergencyFundLog), id: d.id }));

  const archiveId = `archive_${Date.now()}`;
  const nowStr = new Date().toISOString();
  const dateFormatted = new Date().toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const activePeriod = periods.find((p) => p.status === 'active') || periods[0];
  const title =
    customTitle && customTitle.trim()
      ? customTitle.trim()
      : `Worksheet Backup (${activePeriod?.name || 'Pay Period'} - ${dateFormatted})`;

  const archiveRecord: ArchivedWorksheet = {
    id: archiveId,
    title,
    archivedAt: nowStr,
    archivedBy: audit.lastEditedBy || 'User',
    archivedByEmail: audit.lastEditedByEmail || '',
    periodName: activePeriod?.name || 'Pay Period',
    householdId: 'shared_family_workspace',
    notes:
      notes ||
      `Saved snapshot prior to worksheet reset. Contains ${incomes.length} incomes, ${categories.length} envelopes, and ${expenses.length} logged expenses.`,
    dataSnapshot: {
      periods,
      incomes,
      categories,
      expenses,
      debts,
      accounts,
      babyStepsState: babyState,
      emergencyLogs,
    },
    ...audit,
  };

  await setDoc(doc(db, 'archived_worksheets', archiveId), cleanFirestoreObject(archiveRecord));
  return archiveId;
}

/**
 * Subscribes to saved worksheet archives in Firestore
 */
export function subscribeToArchivedWorksheets(
  householdId: string,
  onData: (archives: ArchivedWorksheet[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, 'archived_worksheets');
  const q = query(colRef, where('householdId', '==', householdId));
  return onSnapshot(
    q,
    (snapshot) => {
      const archives: ArchivedWorksheet[] = [];
      snapshot.forEach((docSnap) => {
        archives.push({ ...(docSnap.data() as ArchivedWorksheet), id: docSnap.id });
      });
      archives.sort((a, b) => b.archivedAt.localeCompare(a.archivedAt));
      onData(archives);
    },
    (error) => {
      if (onError) onError(error);
      console.warn('Firestore onSnapshot error [archived_worksheets]:', error.message);
    }
  );
}

/**
 * Restores an archived worksheet snapshot back into live Firestore collections
 */
export async function restoreArchivedWorksheet(archive: ArchivedWorksheet): Promise<void> {
  const batch = writeBatch(db);
  const snapshot = archive.dataSnapshot;

  if (snapshot.periods && snapshot.periods.length > 0) {
    for (const p of snapshot.periods) {
      batch.set(doc(db, 'budget_periods', p.id), cleanFirestoreObject(p));
    }
  }

  if (snapshot.incomes && snapshot.incomes.length > 0) {
    for (const inc of snapshot.incomes) {
      batch.set(doc(db, 'incomes', inc.id), cleanFirestoreObject(inc));
    }
  }

  if (snapshot.categories && snapshot.categories.length > 0) {
    for (const cat of snapshot.categories) {
      batch.set(doc(db, 'budget_categories', cat.id), cleanFirestoreObject(cat));
    }
  }

  if (snapshot.expenses && snapshot.expenses.length > 0) {
    for (const exp of snapshot.expenses) {
      batch.set(doc(db, 'expenses', exp.id), cleanFirestoreObject(exp));
    }
  }

  if (snapshot.debts && snapshot.debts.length > 0) {
    for (const d of snapshot.debts) {
      batch.set(doc(db, 'debts', d.id), cleanFirestoreObject(d));
    }
  }

  if (snapshot.accounts && snapshot.accounts.length > 0) {
    for (const acc of snapshot.accounts) {
      batch.set(doc(db, 'financial_accounts', acc.id), cleanFirestoreObject(acc));
    }
  }

  if (snapshot.babyStepsState) {
    const babyId = snapshot.babyStepsState.householdId || 'shared_family_workspace';
    batch.set(doc(db, 'baby_steps_state', babyId), cleanFirestoreObject(snapshot.babyStepsState));
  }

  await batch.commit();
}

/**
 * Deletes an archived worksheet record from Firestore
 */
export async function deleteArchivedWorksheet(archiveId: string): Promise<void> {
  await deleteDoc(doc(db, 'archived_worksheets', archiveId));
}

// ----------------------------------------------------
// Workspaces & Multi-User Collaboration
// ----------------------------------------------------

export interface UserWorkspacesResult {
  joined: Workspace[];
  availablePublic: Workspace[];
  allWorkspaces: Workspace[];
}

/**
 * Checks if a workspace belongs to the user based on uid, owner, memberIds, email, profile ids,
 * or if it is a family-shared workspace where all family members have access.
 */
export function isUserWorkspace(
  ws: Workspace,
  userId: string,
  userEmail?: string,
  profileWorkspaceIds?: string[]
): boolean {
  if (!ws) return false;
  const emailLower = userEmail?.trim().toLowerCase();
  
  if (ws.ownerId === userId || ws.userId === userId) return true;
  if (Array.isArray(ws.memberIds) && ws.memberIds.includes(userId)) return true;
  if (
    emailLower &&
    (ws.lastEditedByEmail?.trim().toLowerCase() === emailLower ||
      (ws as any).ownerEmail?.trim().toLowerCase() === emailLower)
  ) {
    return true;
  }
  if (profileWorkspaceIds && Array.isArray(profileWorkspaceIds) && profileWorkspaceIds.includes(ws.id)) {
    return true;
  }
  // Any public/shared workspace is automatically accessible / joined by family members
  if (ws.isPrivate !== true) {
    return true;
  }
  // Check if owner or last editor is an authorized family email
  if (ws.lastEditedByEmail && isAllowedFamilyEmail(ws.lastEditedByEmail)) {
    return true;
  }
  return false;
}

/**
 * Automatically consolidates and links all family data across workspaces so Hubby and Wifey
 * always see each other's accounts, debts, and pay periods without data getting isolated.
 */
export async function autoConsolidateFamilyWorkspaceData(
  targetWorkspaceId: string,
  user: { uid: string; displayName?: string | null; email?: string | null }
): Promise<{ consolidatedCount: number }> {
  if (!targetWorkspaceId) return { consolidatedCount: 0 };
  let count = 0;
  const now = new Date().toISOString();

  try {
    // 1. Ensure user is in target workspace memberIds
    const wsRef = doc(db, 'workspaces', targetWorkspaceId);
    const wsSnap = await getDoc(wsRef);
    if (wsSnap.exists()) {
      const wsData = wsSnap.data() as Workspace;
      const members = Array.isArray(wsData.memberIds) ? wsData.memberIds : [];
      if (!members.includes(user.uid)) {
        await updateDoc(wsRef, {
          memberIds: [...members, user.uid],
          updatedAt: now,
        });
      }
    }

    const batch = writeBatch(db);
    let batchUpdates = 0;

    // 2. Budget Periods - reconcile any orphaned periods
    const periodsSnap = await getDocs(collection(db, 'budget_periods'));
    periodsSnap.forEach((d) => {
      const p = d.data() as BudgetPeriod;
      if (
        !p.householdId ||
        p.householdId === 'shared_family_workspace' ||
        p.householdId === 'main'
      ) {
        batch.update(d.ref, {
          householdId: targetWorkspaceId,
          workspaceId: targetWorkspaceId,
          updatedAt: now,
        });
        batchUpdates++;
        count++;
      }
    });

    // 3. Financial Accounts
    const accSnap = await getDocs(collection(db, 'financial_accounts'));
    accSnap.forEach((d) => {
      const a = d.data() as FinancialAccount;
      if (
        !a.householdId ||
        a.householdId === 'shared_family_workspace' ||
        a.householdId === 'main'
      ) {
        batch.update(d.ref, {
          householdId: targetWorkspaceId,
          workspaceId: targetWorkspaceId,
          updatedAt: now,
        });
        batchUpdates++;
        count++;
      }
    });

    // 4. Debts
    const debtsSnap = await getDocs(collection(db, 'debts'));
    debtsSnap.forEach((d) => {
      const debt = d.data() as Debt;
      if (
        !debt.householdId ||
        debt.householdId === 'shared_family_workspace' ||
        debt.householdId === 'main'
      ) {
        batch.update(d.ref, {
          householdId: targetWorkspaceId,
          workspaceId: targetWorkspaceId,
          updatedAt: now,
        });
        batchUpdates++;
        count++;
      }
    });

    // 5. Baby steps state
    const babySnap = await getDoc(doc(db, 'baby_steps_state', targetWorkspaceId));
    if (!babySnap.exists()) {
      // Look for fallback state from shared_family_workspace or main
      const fallbackSnap = await getDoc(doc(db, 'baby_steps_state', 'shared_family_workspace'));
      const mainSnap = !fallbackSnap.exists() ? await getDoc(doc(db, 'baby_steps_state', 'main')) : null;
      const sourceData = fallbackSnap.exists()
        ? fallbackSnap.data()
        : mainSnap?.exists()
        ? mainSnap.data()
        : null;

      if (sourceData) {
        batch.set(
          doc(db, 'baby_steps_state', targetWorkspaceId),
          cleanFirestoreObject({
            ...sourceData,
            id: targetWorkspaceId,
            householdId: targetWorkspaceId,
            workspaceId: targetWorkspaceId,
            updatedAt: now,
          })
        );
        batchUpdates++;
        count++;
      }
    }

    // 6. Categories
    const categoriesSnap = await getDocs(collection(db, 'budget_categories'));
    categoriesSnap.forEach((d) => {
      const cat = d.data() as BudgetCategory;
      if (
        !cat.householdId ||
        cat.householdId === 'shared_family_workspace' ||
        cat.householdId === 'main'
      ) {
        batch.update(d.ref, {
          householdId: targetWorkspaceId,
          workspaceId: targetWorkspaceId,
          updatedAt: now,
        });
        batchUpdates++;
        count++;
      }
    });

    // 7. Incomes
    const incomesSnap = await getDocs(collection(db, 'incomes'));
    incomesSnap.forEach((d) => {
      const inc = d.data() as Income;
      if (
        !inc.householdId ||
        inc.householdId === 'shared_family_workspace' ||
        inc.householdId === 'main'
      ) {
        batch.update(d.ref, {
          householdId: targetWorkspaceId,
          workspaceId: targetWorkspaceId,
          updatedAt: now,
        });
        batchUpdates++;
        count++;
      }
    });

    // 8. Expenses
    const expensesSnap = await getDocs(collection(db, 'expenses'));
    expensesSnap.forEach((d) => {
      const exp = d.data() as Expense;
      if (
        !exp.householdId ||
        exp.householdId === 'shared_family_workspace' ||
        exp.householdId === 'main'
      ) {
        batch.update(d.ref, {
          householdId: targetWorkspaceId,
          workspaceId: targetWorkspaceId,
          updatedAt: now,
        });
        batchUpdates++;
        count++;
      }
    });

    // 9. Emergency fund logs
    const logsSnap = await getDocs(collection(db, 'emergency_fund_logs'));
    logsSnap.forEach((d) => {
      const log = d.data() as EmergencyFundLog;
      if (
        !log.householdId ||
        log.householdId === 'shared_family_workspace' ||
        log.householdId === 'main'
      ) {
        batch.update(d.ref, {
          householdId: targetWorkspaceId,
          workspaceId: targetWorkspaceId,
          updatedAt: now,
        });
        batchUpdates++;
        count++;
      }
    });

    if (batchUpdates > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.warn('Error during auto-consolidation of workspace data:', err);
  }

  return { consolidatedCount: count };
}

/**
 * Real-time subscription to all workspaces in Firestore.
 * Segregates into:
 * - joined: Workspaces belonging to the user
 * - availablePublic: All other workspaces existing in Firestore
 * - allWorkspaces: All raw workspaces from Firestore
 */
export function subscribeToAllWorkspaces(
  userId: string,
  userEmail?: string,
  profileWorkspaceIds?: string[],
  onData?: (result: UserWorkspacesResult) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, 'workspaces');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const allWorkspaces: Workspace[] = [];
      const joined: Workspace[] = [];
      const availablePublic: Workspace[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Workspace;
        const ws: Workspace = { ...data, id: docSnap.id };
        allWorkspaces.push(ws);

        if (isUserWorkspace(ws, userId, userEmail, profileWorkspaceIds)) {
          joined.push(ws);
        } else {
          availablePublic.push(ws);
        }
      });

      // Sort newest updated/created first
      joined.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
      availablePublic.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
      allWorkspaces.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      );

      if (onData) {
        onData({ joined, availablePublic, allWorkspaces });
      }
    },
    (error) => {
      if (onError) onError(error);
      console.warn('Firestore onSnapshot error [workspaces]:', error.message);
    }
  );
}

/**
 * Fetches all workspaces for a user:
 * - joined: Workspaces belonging to the user
 * - availablePublic: All other workspaces in Firestore
 */
export async function fetchAllUserWorkspaces(
  userId: string,
  userEmail?: string,
  profileWorkspaceIds?: string[]
): Promise<UserWorkspacesResult> {
  try {
    const snap = await getDocs(collection(db, 'workspaces'));
    const allWorkspaces: Workspace[] = [];
    const joined: Workspace[] = [];
    const availablePublic: Workspace[] = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data() as Workspace;
      const ws: Workspace = { ...data, id: docSnap.id };
      allWorkspaces.push(ws);

      if (isUserWorkspace(ws, userId, userEmail, profileWorkspaceIds)) {
        joined.push(ws);
      } else {
        availablePublic.push(ws);
      }
    });

    joined.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime()
    );
    availablePublic.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime()
    );
    allWorkspaces.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime()
    );

    return { joined, availablePublic, allWorkspaces };
  } catch (err) {
    console.error('Error fetching all user workspaces:', err);
    return { joined: [], availablePublic: [], allWorkspaces: [] };
  }
}

/**
 * Joins a public / family workspace by adding the user to memberIds
 */
export async function joinWorkspaceById(workspaceId: string, user: { uid: string; displayName?: string | null; email?: string | null }): Promise<void> {
  const wsRef = doc(db, 'workspaces', workspaceId);
  const snap = await getDoc(wsRef);
  if (!snap.exists()) {
    throw new Error('Workspace not found.');
  }

  const data = snap.data() as Workspace;
  const currentMembers = Array.isArray(data.memberIds) ? data.memberIds : [];
  if (!currentMembers.includes(user.uid)) {
    await updateDoc(wsRef, {
      memberIds: [...currentMembers, user.uid],
      updatedAt: new Date().toISOString(),
      lastEditedBy: user.displayName || 'User',
      lastEditedByEmail: user.email || '',
      lastEditedAt: new Date().toISOString(),
    });
  }
}

/**
 * Toggles a workspace between Private and Public
 */
export async function toggleWorkspacePrivacy(
  workspaceId: string,
  isPrivate: boolean,
  user: { displayName?: string | null; email?: string | null }
): Promise<void> {
  const wsRef = doc(db, 'workspaces', workspaceId);
  await updateDoc(wsRef, {
    isPrivate,
    updatedAt: new Date().toISOString(),
    lastEditedBy: user.displayName || 'User',
    lastEditedByEmail: user.email || '',
    lastEditedAt: new Date().toISOString(),
  });
}

// ----------------------------------------------------
// Unassigned Data Discovery & Wizard Linking
// ----------------------------------------------------

export interface BabyStepOption extends BabyStepsState {
  docId: string;
  isUnassigned?: boolean;
}

export interface BudgetPeriodOption extends BudgetPeriod {
  isUnassigned?: boolean;
  associatedIncomesCount?: number;
  associatedExpensesCount?: number;
  associatedCategoriesCount?: number;
  originSource?: 'live_collection' | 'discovered_transactions' | 'archived_backup';
  sourceArchiveId?: string;
  sourceArchiveTitle?: string;
  archivedIncomes?: Income[];
  archivedCategories?: BudgetCategory[];
  archivedExpenses?: Expense[];
}

export interface FinancialAccountOption extends FinancialAccount {
  isUnassigned?: boolean;
}

export interface UnassignedDataDiscoveryResult {
  babySteps: BabyStepOption[];
  budgetPeriods: BudgetPeriodOption[];
  accounts: FinancialAccountOption[];
}

/**
 * Queries all Baby Steps, Budget Periods, and Financial Accounts from Firestore
 * (including live collections, unassigned records, discovered transaction period IDs, and archived backups)
 * and highlights their details so the user can easily review, select, and assign all data to a workspace.
 */
export async function fetchAllMigrationData(): Promise<UnassignedDataDiscoveryResult> {
  const [
    babySnap,
    periodsSnap,
    accountsSnap,
    incomesSnap,
    expensesSnap,
    categoriesSnap,
    debtsSnap,
    logsSnap,
    archivesSnap,
  ] = await Promise.all([
    getDocs(collection(db, 'baby_steps_state')),
    getDocs(collection(db, 'budget_periods')),
    getDocs(collection(db, 'financial_accounts')),
    getDocs(collection(db, 'incomes')),
    getDocs(collection(db, 'expenses')),
    getDocs(collection(db, 'budget_categories')),
    getDocs(collection(db, 'debts')),
    getDocs(collection(db, 'emergency_fund_logs')),
    getDocs(collection(db, 'archived_worksheets')),
  ]);

  // 1. Process Baby Steps
  const babySteps: BabyStepOption[] = [];
  babySnap.forEach((docSnap) => {
    const data = docSnap.data() as BabyStepsState;
    const docId = docSnap.id;
    const isUnassigned =
      !data.householdId ||
      data.householdId === 'main' ||
      data.householdId === 'shared_family_workspace' ||
      !data.workspaceId;
    babySteps.push({
      ...data,
      id: docId,
      docId,
      isUnassigned,
    });
  });

  // Calculate totals and counts for periods from live transactions
  const incomesByPeriod: Record<string, { count: number; total: number; earliestDate?: string; latestDate?: string }> = {};
  incomesSnap.forEach((d) => {
    const inc = d.data() as Income;
    if (inc.periodId) {
      if (!incomesByPeriod[inc.periodId]) {
        incomesByPeriod[inc.periodId] = { count: 0, total: 0 };
      }
      incomesByPeriod[inc.periodId].count += 1;
      incomesByPeriod[inc.periodId].total += Number(inc.amount || 0);
      if (inc.receivedDate) {
        if (!incomesByPeriod[inc.periodId].earliestDate || inc.receivedDate < incomesByPeriod[inc.periodId].earliestDate!) {
          incomesByPeriod[inc.periodId].earliestDate = inc.receivedDate;
        }
      }
    }
  });

  const expensesByPeriod: Record<string, { count: number; total: number }> = {};
  expensesSnap.forEach((d) => {
    const exp = d.data() as Expense;
    if (exp.periodId) {
      if (!expensesByPeriod[exp.periodId]) {
        expensesByPeriod[exp.periodId] = { count: 0, total: 0 };
      }
      expensesByPeriod[exp.periodId].count += 1;
      expensesByPeriod[exp.periodId].total += Number(exp.amount || 0);
    }
  });

  const categoriesByPeriod: Record<string, { count: number; totalAllocated: number }> = {};
  categoriesSnap.forEach((d) => {
    const cat = d.data() as BudgetCategory;
    if (cat.periodId) {
      if (!categoriesByPeriod[cat.periodId]) {
        categoriesByPeriod[cat.periodId] = { count: 0, totalAllocated: 0 };
      }
      categoriesByPeriod[cat.periodId].count += 1;
      categoriesByPeriod[cat.periodId].totalAllocated += Number(cat.allocatedAmount || 0);
    }
  });

  // 2. Process Budget Periods
  const budgetPeriods: BudgetPeriodOption[] = [];
  const processedPeriodIds = new Set<string>();

  // A. Explicit documents from budget_periods collection
  periodsSnap.forEach((docSnap) => {
    const data = docSnap.data() as BudgetPeriod;
    const pId = docSnap.id;
    processedPeriodIds.add(pId);

    const incInfo = incomesByPeriod[pId] || { count: 0, total: 0 };
    const expInfo = expensesByPeriod[pId] || { count: 0, total: 0 };
    const catInfo = categoriesByPeriod[pId] || { count: 0, totalAllocated: 0 };

    const isUnassigned =
      !data.householdId ||
      data.householdId === 'shared_family_workspace' ||
      data.householdId === 'main' ||
      !data.workspaceId;

    budgetPeriods.push({
      ...data,
      id: pId,
      name: data.name || `Pay Cycle (${pId})`,
      startDate: data.startDate || incInfo.earliestDate || '2026-01-25',
      endDate: data.endDate || '2026-02-24',
      setupDueDate: data.setupDueDate || data.startDate || incInfo.earliestDate || '2026-01-25',
      status: data.status || 'active',
      totalPlannedIncome: data.totalPlannedIncome || incInfo.total || 0,
      totalPlannedExpenses: data.totalPlannedExpenses || catInfo.totalAllocated || expInfo.total || 0,
      isUnassigned,
      associatedIncomesCount: incInfo.count,
      associatedExpensesCount: expInfo.count,
      associatedCategoriesCount: catInfo.count,
      originSource: 'live_collection',
    });
  });

  // B. Discovered periods from incomes, expenses, or categories that may not have a dedicated budget_periods document
  const allDiscoveredPeriodIds = new Set([
    ...Object.keys(incomesByPeriod),
    ...Object.keys(expensesByPeriod),
    ...Object.keys(categoriesByPeriod),
  ]);

  allDiscoveredPeriodIds.forEach((pId) => {
    if (!processedPeriodIds.has(pId) && pId.trim()) {
      const incInfo = incomesByPeriod[pId] || { count: 0, total: 0 };
      const expInfo = expensesByPeriod[pId] || { count: 0, total: 0 };
      const catInfo = categoriesByPeriod[pId] || { count: 0, totalAllocated: 0 };

      // Format a clean readable name from the period ID
      let readableName = `Pay Cycle (${pId})`;
      if (pId.includes('period_') || pId.includes('_')) {
        const parts = pId.split('_');
        const lastPart = parts[parts.length - 1];
        const secondLast = parts[parts.length - 2];
        if (!isNaN(Number(lastPart))) {
          const monthNum = parseInt(lastPart, 10);
          const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ];
          const mName = monthNames[monthNum - 1] || `Month ${monthNum}`;
          const year = !isNaN(Number(secondLast)) ? secondLast : '2026';
          readableName = `${mName} ${year} Pay Cycle (${pId})`;
        }
      }

      budgetPeriods.push({
        id: pId,
        name: readableName,
        startDate: incInfo.earliestDate || '2026-01-25',
        endDate: '2026-02-24',
        setupDueDate: incInfo.earliestDate || '2026-01-25',
        status: 'active',
        totalPlannedIncome: incInfo.total,
        totalPlannedExpenses: catInfo.totalAllocated || expInfo.total,
        householdId: 'shared_family_workspace',
        isUnassigned: true,
        associatedIncomesCount: incInfo.count,
        associatedExpensesCount: expInfo.count,
        associatedCategoriesCount: catInfo.count,
        originSource: 'discovered_transactions',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      processedPeriodIds.add(pId);
    }
  });

  // C. Discovered periods and transactions from archived_worksheets
  archivesSnap.forEach((docSnap) => {
    const archive = docSnap.data() as ArchivedWorksheet;
    const snap = archive.dataSnapshot;
    if (snap && snap.periods && Array.isArray(snap.periods)) {
      snap.periods.forEach((archPeriod) => {
        const pId = archPeriod.id;
        const archIncomes = (snap.incomes || []).filter((i) => i.periodId === pId);
        const archCategories = (snap.categories || []).filter((c) => c.periodId === pId);
        const archExpenses = (snap.expenses || []).filter((e) => e.periodId === pId);

        const totalInc = archIncomes.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
        const totalCat = archCategories.reduce((acc, c) => acc + (Number(c.allocatedAmount) || 0), 0);
        const totalExp = archExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

        if (!processedPeriodIds.has(pId)) {
          budgetPeriods.push({
            ...archPeriod,
            id: pId,
            name: archPeriod.name || `Archived Period (${pId})`,
            startDate: archPeriod.startDate || '2026-01-25',
            endDate: archPeriod.endDate || '2026-02-24',
            setupDueDate: archPeriod.setupDueDate || archPeriod.startDate || '2026-01-25',
            status: archPeriod.status || 'archived',
            totalPlannedIncome: archPeriod.totalPlannedIncome || totalInc,
            totalPlannedExpenses: archPeriod.totalPlannedExpenses || totalCat || totalExp,
            isUnassigned: true,
            associatedIncomesCount: archIncomes.length,
            associatedExpensesCount: archExpenses.length,
            associatedCategoriesCount: archCategories.length,
            originSource: 'archived_backup',
            sourceArchiveId: docSnap.id,
            sourceArchiveTitle: archive.title,
            archivedIncomes: archIncomes,
            archivedCategories: archCategories,
            archivedExpenses: archExpenses,
          });
          processedPeriodIds.add(pId);
        } else {
          // If already in list but missing child counts, attach the archived records for restoration
          const existing = budgetPeriods.find((p) => p.id === pId);
          if (existing && (!existing.associatedIncomesCount || existing.associatedIncomesCount === 0)) {
            existing.associatedIncomesCount = archIncomes.length;
            existing.associatedCategoriesCount = archCategories.length;
            existing.associatedExpensesCount = archExpenses.length;
            existing.totalPlannedIncome = existing.totalPlannedIncome || totalInc;
            existing.totalPlannedExpenses = existing.totalPlannedExpenses || totalCat || totalExp;
            existing.sourceArchiveId = docSnap.id;
            existing.sourceArchiveTitle = archive.title;
            existing.archivedIncomes = archIncomes;
            existing.archivedCategories = archCategories;
            existing.archivedExpenses = archExpenses;
          }
        }
      });
    }
  });

  // Sort periods by start date descending so latest appears first
  budgetPeriods.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));

  // 3. Process Financial Accounts
  const accounts: FinancialAccountOption[] = [];
  accountsSnap.forEach((docSnap) => {
    const data = docSnap.data() as FinancialAccount;
    const isUnassigned =
      !data.householdId ||
      data.householdId === 'shared_family_workspace' ||
      data.householdId === 'main' ||
      !data.workspaceId;
    accounts.push({
      ...data,
      id: docSnap.id,
      isUnassigned,
    });
  });
  accounts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return { babySteps, budgetPeriods, accounts };
}

export interface CreateAndLinkWorkspaceParams {
  workspace: {
    name: string;
    description?: string;
    isPrivate: boolean;
    ownerId: string;
    ownerEmail: string;
    ownerName: string;
  };
  selectedBabyStepDocId?: string | null;
  createNewBabyStep?: boolean;
  selectedPeriodIds: string[];
  selectedAccountIds: string[];
  discoveredPeriods?: BudgetPeriodOption[];
}

/**
 * Creates a new Workspace and links the selected Baby Step, Budget Periods, child records, and Accounts
 */
export async function createWorkspaceAndLinkData(params: CreateAndLinkWorkspaceParams): Promise<Workspace> {
  const newWorkspaceId = `ws_${Date.now()}`;
  const now = new Date().toISOString();

  // 1. Create Workspace Document
  const newWs: Workspace = {
    id: newWorkspaceId,
    name: params.workspace.name.trim(),
    description: params.workspace.description?.trim() || '',
    isPrivate: params.workspace.isPrivate,
    ownerId: params.workspace.ownerId,
    memberIds: [params.workspace.ownerId],
    householdId: newWorkspaceId,
    workspaceId: newWorkspaceId,
    userId: params.workspace.ownerId,
    createdAt: now,
    updatedAt: now,
    lastEditedBy: params.workspace.ownerName,
    lastEditedByEmail: params.workspace.ownerEmail,
    lastEditedAt: now,
  };

  const batch = writeBatch(db);
  batch.set(doc(db, 'workspaces', newWorkspaceId), newWs);

  // 2. Baby Step setup
  if (params.selectedBabyStepDocId) {
    const sourceSnap = await getDoc(doc(db, 'baby_steps_state', params.selectedBabyStepDocId));
    if (sourceSnap.exists()) {
      const sourceData = sourceSnap.data() as BabyStepsState;
      batch.set(doc(db, 'baby_steps_state', newWorkspaceId), cleanFirestoreObject({
        ...sourceData,
        id: newWorkspaceId,
        householdId: newWorkspaceId,
        workspaceId: newWorkspaceId,
        updatedAt: now,
        lastEditedBy: params.workspace.ownerName,
        lastEditedByEmail: params.workspace.ownerEmail,
        lastEditedAt: now,
      }));
    }
  } else if (params.createNewBabyStep || !params.selectedBabyStepDocId) {
    // Create clean default Baby Step 1 state
    const cleanBabyState: BabyStepsState = {
      id: newWorkspaceId,
      householdId: newWorkspaceId,
      workspaceId: newWorkspaceId,
      currentStep: 1,
      step1EmergencyFundTarget: 20000,
      step1CurrentBalance: 0,
      step3MonthsTarget: 3,
      step3CurrentBalance: 0,
      step4MonthlyInvestment: 0,
      step5CollegeFundBalance: 0,
      step6BondBalance: 0,
      step6MonthlyExtra: 0,
      step7GivingMonthly: 0,
      notes: `Baby Steps plan for ${params.workspace.name}`,
      updatedAt: now,
      lastEditedBy: params.workspace.ownerName,
      lastEditedByEmail: params.workspace.ownerEmail,
      lastEditedAt: now,
    };
    batch.set(doc(db, 'baby_steps_state', newWorkspaceId), cleanBabyState);
  }

  // 3. Link selected Accounts
  for (const accId of params.selectedAccountIds) {
    batch.set(
      doc(db, 'financial_accounts', accId),
      {
        householdId: newWorkspaceId,
        workspaceId: newWorkspaceId,
        updatedAt: now,
        lastEditedBy: params.workspace.ownerName,
        lastEditedByEmail: params.workspace.ownerEmail,
        lastEditedAt: now,
      },
      { merge: true }
    );
  }

  // 4. Link selected Budget Periods (and write full doc if period was discovered or archived)
  for (const periodId of params.selectedPeriodIds) {
    const periodMeta = params.discoveredPeriods?.find((p) => p.id === periodId);
    if (periodMeta) {
      batch.set(
        doc(db, 'budget_periods', periodId),
        cleanFirestoreObject({
          ...periodMeta,
          id: periodId,
          householdId: newWorkspaceId,
          workspaceId: newWorkspaceId,
          updatedAt: now,
          lastEditedBy: params.workspace.ownerName,
          lastEditedByEmail: params.workspace.ownerEmail,
          lastEditedAt: now,
        }),
        { merge: true }
      );
    } else {
      batch.set(
        doc(db, 'budget_periods', periodId),
        {
          householdId: newWorkspaceId,
          workspaceId: newWorkspaceId,
          updatedAt: now,
          lastEditedBy: params.workspace.ownerName,
          lastEditedByEmail: params.workspace.ownerEmail,
          lastEditedAt: now,
        },
        { merge: true }
      );
    }
  }

  await batch.commit();

  // 5. Also link/restore all child items (incomes, categories, expenses, debts, emergency logs)
  const childBatch = writeBatch(db);
  let childUpdates = 0;

  if (params.selectedPeriodIds.length > 0) {
    for (const periodId of params.selectedPeriodIds) {
      const periodMeta = params.discoveredPeriods?.find((p) => p.id === periodId);

      // Incomes
      const incSnap = await getDocs(query(collection(db, 'incomes'), where('periodId', '==', periodId)));
      incSnap.forEach((d) => {
        childBatch.update(d.ref, {
          householdId: newWorkspaceId,
          workspaceId: newWorkspaceId,
          updatedAt: now,
        });
        childUpdates++;
      });

      // If incomes were only in archive, restore them
      if (incSnap.empty && periodMeta?.archivedIncomes && periodMeta.archivedIncomes.length > 0) {
        for (const inc of periodMeta.archivedIncomes) {
          childBatch.set(doc(db, 'incomes', inc.id), cleanFirestoreObject({
            ...inc,
            householdId: newWorkspaceId,
            workspaceId: newWorkspaceId,
            updatedAt: now,
          }));
          childUpdates++;
        }
      }

      // Categories
      const catSnap = await getDocs(query(collection(db, 'budget_categories'), where('periodId', '==', periodId)));
      catSnap.forEach((d) => {
        childBatch.update(d.ref, {
          householdId: newWorkspaceId,
          workspaceId: newWorkspaceId,
          updatedAt: now,
        });
        childUpdates++;
      });

      // If categories were only in archive, restore them
      if (catSnap.empty && periodMeta?.archivedCategories && periodMeta.archivedCategories.length > 0) {
        for (const cat of periodMeta.archivedCategories) {
          childBatch.set(doc(db, 'budget_categories', cat.id), cleanFirestoreObject({
            ...cat,
            householdId: newWorkspaceId,
            workspaceId: newWorkspaceId,
            updatedAt: now,
          }));
          childUpdates++;
        }
      }

      // Expenses
      const expSnap = await getDocs(query(collection(db, 'expenses'), where('periodId', '==', periodId)));
      expSnap.forEach((d) => {
        childBatch.update(d.ref, {
          householdId: newWorkspaceId,
          workspaceId: newWorkspaceId,
          updatedAt: now,
        });
        childUpdates++;
      });

      // If expenses were only in archive, restore them
      if (expSnap.empty && periodMeta?.archivedExpenses && periodMeta.archivedExpenses.length > 0) {
        for (const exp of periodMeta.archivedExpenses) {
          childBatch.set(doc(db, 'expenses', exp.id), cleanFirestoreObject({
            ...exp,
            householdId: newWorkspaceId,
            workspaceId: newWorkspaceId,
            updatedAt: now,
          }));
          childUpdates++;
        }
      }
    }
  }

  // Also link debts associated with selected accounts or unassigned debts
  const debtsSnap = await getDocs(collection(db, 'debts'));
  debtsSnap.forEach((d) => {
    const data = d.data() as Debt;
    if (
      !data.householdId ||
      data.householdId === 'shared_family_workspace' ||
      data.householdId === 'main' ||
      (data.linkedAccountId && params.selectedAccountIds.includes(data.linkedAccountId))
    ) {
      childBatch.update(d.ref, {
        householdId: newWorkspaceId,
        workspaceId: newWorkspaceId,
        updatedAt: now,
      });
      childUpdates++;
    }
  });

  // Also link emergency logs
  const logsSnap = await getDocs(collection(db, 'emergency_fund_logs'));
  logsSnap.forEach((d) => {
    const data = d.data() as EmergencyFundLog;
    if (!data.householdId || data.householdId === 'shared_family_workspace' || data.householdId === 'main') {
      childBatch.update(d.ref, {
        householdId: newWorkspaceId,
        workspaceId: newWorkspaceId,
        updatedAt: now,
      });
      childUpdates++;
    }
  });

  if (childUpdates > 0) {
    await childBatch.commit();
  }

  // 6. Update user profile active & list of workspaces
  try {
    const profileRef = doc(db, 'user_profiles', params.workspace.ownerId);
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      const pData = profileSnap.data() as UserProfile;
      const currentList = Array.isArray(pData.workspaceIds) ? pData.workspaceIds : [];
      await updateDoc(profileRef, {
        activeWorkspaceId: newWorkspaceId,
        defaultWorkspaceId: newWorkspaceId,
        workspaceIds: Array.from(new Set([...currentList, newWorkspaceId])),
        updatedAt: now,
      });
    }
  } catch (e) {
    console.error('Error updating user profile with new workspace:', e);
  }

  return newWs;
}

export interface LinkToExistingWorkspaceParams {
  workspaceId: string;
  userName: string;
  userEmail: string;
  selectedBabyStepDocId?: string | null;
  selectedPeriodIds: string[];
  selectedAccountIds: string[];
  discoveredPeriods?: BudgetPeriodOption[];
}

/**
 * Allows linking existing unassigned data or discovered archive periods to an existing workspace
 */
export async function linkDataToExistingWorkspace(params: LinkToExistingWorkspaceParams): Promise<void> {
  const now = new Date().toISOString();
  const batch = writeBatch(db);

  // Baby Step
  if (params.selectedBabyStepDocId) {
    const sourceSnap = await getDoc(doc(db, 'baby_steps_state', params.selectedBabyStepDocId));
    if (sourceSnap.exists()) {
      const sourceData = sourceSnap.data() as BabyStepsState;
      batch.set(doc(db, 'baby_steps_state', params.workspaceId), cleanFirestoreObject({
        ...sourceData,
        id: params.workspaceId,
        householdId: params.workspaceId,
        workspaceId: params.workspaceId,
        updatedAt: now,
        lastEditedBy: params.userName,
        lastEditedByEmail: params.userEmail,
        lastEditedAt: now,
      }));
    }
  }

  // Accounts
  for (const accId of params.selectedAccountIds) {
    batch.set(
      doc(db, 'financial_accounts', accId),
      {
        householdId: params.workspaceId,
        workspaceId: params.workspaceId,
        updatedAt: now,
        lastEditedBy: params.userName,
        lastEditedByEmail: params.userEmail,
        lastEditedAt: now,
      },
      { merge: true }
    );
  }

  // Periods
  for (const periodId of params.selectedPeriodIds) {
    const periodMeta = params.discoveredPeriods?.find((p) => p.id === periodId);
    if (periodMeta) {
      batch.set(
        doc(db, 'budget_periods', periodId),
        cleanFirestoreObject({
          ...periodMeta,
          id: periodId,
          householdId: params.workspaceId,
          workspaceId: params.workspaceId,
          updatedAt: now,
          lastEditedBy: params.userName,
          lastEditedByEmail: params.userEmail,
          lastEditedAt: now,
        }),
        { merge: true }
      );
    } else {
      batch.set(
        doc(db, 'budget_periods', periodId),
        {
          householdId: params.workspaceId,
          workspaceId: params.workspaceId,
          updatedAt: now,
          lastEditedBy: params.userName,
          lastEditedByEmail: params.userEmail,
          lastEditedAt: now,
        },
        { merge: true }
      );
    }
  }

  await batch.commit();

  // Child items
  const childBatch = writeBatch(db);
  let childUpdates = 0;

  if (params.selectedPeriodIds.length > 0) {
    for (const periodId of params.selectedPeriodIds) {
      const periodMeta = params.discoveredPeriods?.find((p) => p.id === periodId);

      const incSnap = await getDocs(query(collection(db, 'incomes'), where('periodId', '==', periodId)));
      incSnap.forEach((d) => {
        childBatch.update(d.ref, {
          householdId: params.workspaceId,
          workspaceId: params.workspaceId,
          updatedAt: now,
        });
        childUpdates++;
      });

      if (incSnap.empty && periodMeta?.archivedIncomes && periodMeta.archivedIncomes.length > 0) {
        for (const inc of periodMeta.archivedIncomes) {
          childBatch.set(doc(db, 'incomes', inc.id), cleanFirestoreObject({
            ...inc,
            householdId: params.workspaceId,
            workspaceId: params.workspaceId,
            updatedAt: now,
          }));
          childUpdates++;
        }
      }

      const catSnap = await getDocs(query(collection(db, 'budget_categories'), where('periodId', '==', periodId)));
      catSnap.forEach((d) => {
        childBatch.update(d.ref, {
          householdId: params.workspaceId,
          workspaceId: params.workspaceId,
          updatedAt: now,
        });
        childUpdates++;
      });

      if (catSnap.empty && periodMeta?.archivedCategories && periodMeta.archivedCategories.length > 0) {
        for (const cat of periodMeta.archivedCategories) {
          childBatch.set(doc(db, 'budget_categories', cat.id), cleanFirestoreObject({
            ...cat,
            householdId: params.workspaceId,
            workspaceId: params.workspaceId,
            updatedAt: now,
          }));
          childUpdates++;
        }
      }

      const expSnap = await getDocs(query(collection(db, 'expenses'), where('periodId', '==', periodId)));
      expSnap.forEach((d) => {
        childBatch.update(d.ref, {
          householdId: params.workspaceId,
          workspaceId: params.workspaceId,
          updatedAt: now,
        });
        childUpdates++;
      });

      if (expSnap.empty && periodMeta?.archivedExpenses && periodMeta.archivedExpenses.length > 0) {
        for (const exp of periodMeta.archivedExpenses) {
          childBatch.set(doc(db, 'expenses', exp.id), cleanFirestoreObject({
            ...exp,
            householdId: params.workspaceId,
            workspaceId: params.workspaceId,
            updatedAt: now,
          }));
          childUpdates++;
        }
      }
    }
  }

  // Also link debts associated with selected accounts or unassigned debts
  const debtsSnap = await getDocs(collection(db, 'debts'));
  debtsSnap.forEach((d) => {
    const data = d.data() as Debt;
    if (
      !data.householdId ||
      data.householdId === 'shared_family_workspace' ||
      data.householdId === 'main' ||
      (data.linkedAccountId && params.selectedAccountIds.includes(data.linkedAccountId))
    ) {
      childBatch.update(d.ref, {
        householdId: params.workspaceId,
        workspaceId: params.workspaceId,
        updatedAt: now,
      });
      childUpdates++;
    }
  });

  // Also link emergency logs
  const logsSnap = await getDocs(collection(db, 'emergency_fund_logs'));
  logsSnap.forEach((d) => {
    const data = d.data() as EmergencyFundLog;
    if (!data.householdId || data.householdId === 'shared_family_workspace' || data.householdId === 'main') {
      childBatch.update(d.ref, {
        householdId: params.workspaceId,
        workspaceId: params.workspaceId,
        updatedAt: now,
      });
      childUpdates++;
    }
  });

  if (childUpdates > 0) {
    await childBatch.commit();
  }
}



