import { Expense, LoggedBy } from '../types';

export interface DuplicateMatchResult {
  isDuplicate: boolean;
  confidence: 'high' | 'medium' | 'low';
  matchedExpense?: Expense;
  reason?: string;
  matchType?: 'exact' | 'similar_merchant' | 'same_amount_and_date' | 'batch_duplicate';
}

export interface CandidateExpenseInput {
  id?: string;
  amount: number;
  title?: string;
  merchant?: string;
  date?: string;
  categoryId?: string;
  accountId?: string;
  notes?: string;
  loggedBy?: LoggedBy;
  paymentMethod?: string;
}

/**
 * Normalizes a merchant/payee title for fuzzy matching (removes symbols, extra spaces, lowercase)
 */
export function normalizeMerchantTitle(name?: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates day difference between two YYYY-MM-DD date strings
 */
function getDateDifferenceInDays(dateA?: string, dateB?: string): number {
  if (!dateA || !dateB) return 999;
  try {
    const d1 = new Date(dateA);
    const d2 = new Date(dateB);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 999;
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 999;
  }
}

/**
 * Checks if a candidate expense is likely a duplicate of any existing expense.
 * Non-blocking: returns rich match details for visual warnings.
 */
export function checkDuplicateExpense(
  candidate: CandidateExpenseInput,
  existingExpenses: Expense[] = []
): DuplicateMatchResult {
  const candidateAmt = candidate.amount;
  if (!candidateAmt || candidateAmt <= 0 || isNaN(candidateAmt)) {
    return { isDuplicate: false, confidence: 'low' };
  }

  const candidateTitle = normalizeMerchantTitle(candidate.merchant || candidate.title);
  const candidateDate = candidate.date || new Date().toISOString().split('T')[0];

  for (const existing of existingExpenses) {
    // If we are editing an expense, ignore itself
    if (candidate.id && existing.id === candidate.id) {
      continue;
    }

    const existingAmt = existing.amount || 0;
    const amtMatches = Math.abs(existingAmt - candidateAmt) < 0.01;

    if (!amtMatches) {
      continue;
    }

    // Amount matches! Now examine date, title, account, and category
    const existingTitle = normalizeMerchantTitle(existing.title);
    const dateDiffDays = getDateDifferenceInDays(existing.date, candidateDate);
    const isSameDate = dateDiffDays === 0;
    const isCloseDate = dateDiffDays <= 2;

    const isExactTitleMatch = candidateTitle && existingTitle && candidateTitle === existingTitle;
    const isSubTitleMatch =
      candidateTitle &&
      existingTitle &&
      candidateTitle.length >= 3 &&
      existingTitle.length >= 3 &&
      (candidateTitle.includes(existingTitle) || existingTitle.includes(candidateTitle));

    const isSameAccount = candidate.accountId && existing.accountId && candidate.accountId === existing.accountId;
    const isSameCategory = candidate.categoryId && existing.categoryId && candidate.categoryId === existing.categoryId;

    // HIGH CONFIDENCE MATCH: Same amount + same/close date + (exact or subtitle match OR same account)
    if (amtMatches && isSameDate && (isExactTitleMatch || isSubTitleMatch)) {
      return {
        isDuplicate: true,
        confidence: 'high',
        matchedExpense: existing,
        matchType: 'exact',
        reason: `Matches existing expense "${existing.title}" (R${existing.amount.toFixed(2)}) recorded on ${existing.date}${isSameAccount ? ' from the same account' : ''}.`,
      };
    }

    if (amtMatches && isCloseDate && isExactTitleMatch) {
      return {
        isDuplicate: true,
        confidence: 'high',
        matchedExpense: existing,
        matchType: 'exact',
        reason: `Matches existing expense "${existing.title}" (R${existing.amount.toFixed(2)}) on ${existing.date} (${dateDiffDays === 0 ? 'same day' : `${dateDiffDays} day(s) apart`}).`,
      };
    }

    if (amtMatches && isSameDate && isSameAccount) {
      return {
        isDuplicate: true,
        confidence: 'high',
        matchedExpense: existing,
        matchType: 'same_amount_and_date',
        reason: `Same amount (R${candidateAmt.toFixed(2)}) and date (${candidateDate}) on account with existing "${existing.title}".`,
      };
    }

    // MEDIUM CONFIDENCE MATCH: Same amount + same date or same amount + similar merchant within 7 days
    if (amtMatches && isSameDate) {
      return {
        isDuplicate: true,
        confidence: 'medium',
        matchedExpense: existing,
        matchType: 'same_amount_and_date',
        reason: `Existing transaction with identical amount R${existing.amount.toFixed(2)} found on ${existing.date} ("${existing.title}").`,
      };
    }

    if (amtMatches && dateDiffDays <= 7 && (isExactTitleMatch || isSubTitleMatch)) {
      return {
        isDuplicate: true,
        confidence: 'medium',
        matchedExpense: existing,
        matchType: 'similar_merchant',
        reason: `Similar expense "${existing.title}" (R${existing.amount.toFixed(2)}) was recorded ${dateDiffDays} day(s) ago on ${existing.date}.`,
      };
    }
  }

  return { isDuplicate: false, confidence: 'low' };
}

/**
 * Checks a batch of rows against existing expenses and against other rows in the same batch.
 */
export function analyzeBatchRowDuplicates<T extends CandidateExpenseInput>(
  rows: T[],
  existingExpenses: Expense[] = []
): Map<string, DuplicateMatchResult> {
  const resultMap = new Map<string, DuplicateMatchResult>();

  // 1. Check each row against database expenses
  rows.forEach((row, idx) => {
    const rowId = row.id || `row_${idx}`;
    const match = checkDuplicateExpense(row, existingExpenses);
    if (match.isDuplicate) {
      resultMap.set(rowId, match);
    }
  });

  // 2. Check each row against other rows in the current batch
  for (let i = 0; i < rows.length; i++) {
    const rowA = rows[i];
    const idA = rowA.id || `row_${i}`;
    if (resultMap.has(idA)) continue; // Already flagged

    if (!rowA.amount || rowA.amount <= 0) continue;

    for (let j = i + 1; j < rows.length; j++) {
      const rowB = rows[j];
      const idB = rowB.id || `row_${j}`;

      const amtMatches = Math.abs((rowA.amount || 0) - (rowB.amount || 0)) < 0.01;
      const dateMatches = rowA.date === rowB.date;
      const titleA = normalizeMerchantTitle(rowA.merchant || rowA.title);
      const titleB = normalizeMerchantTitle(rowB.merchant || rowB.title);
      const titleMatches = titleA && titleB && (titleA === titleB || titleA.includes(titleB) || titleB.includes(titleA));

      if (amtMatches && dateMatches && titleMatches) {
        const batchReason = `Duplicate line in this statement: Same as Row #${i + 1} (${rowA.merchant || rowA.title}, R${rowA.amount.toFixed(2)}).`;
        resultMap.set(idB, {
          isDuplicate: true,
          confidence: 'high',
          matchType: 'batch_duplicate',
          reason: batchReason,
        });
      }
    }
  }

  return resultMap;
}
