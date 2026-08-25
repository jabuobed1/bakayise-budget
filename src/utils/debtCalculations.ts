import { FinancialAccount, Debt, Expense } from '../types';

export interface DebtPaymentCalculationResult {
  paidAmount: number;
  principalReduction: number;
  interestCharged: number;
  feesCharged: number;
  newBalance: number;
  previousBalance: number;
  breakdownSummary: string;
}

/**
 * Calculates debt balance reduction based on account type, debt category, and payment type (monthly installment vs direct deposit).
 * 
 * Rules:
 * 1. Direct Deposit / Capital Pre-payment / Extra Snowball:
 *    - 100% of payment goes directly to reducing principal (no interest/fees deduction).
 *    - New Balance = Previous Balance - Paid Amount.
 * 
 * 2. Monthly Installment (Contractual Repayment):
 *    - Mortgage / Bond:
 *        Monthly Interest = Principal * (annualRate / 12)
 *        Monthly Admin/Service Fee = account.monthlyFee || 69 (standard SA fee if bond)
 *        Principal Reduction = Payment - (Monthly Interest + Fees)
 *        New Balance = Principal - Principal Reduction = Principal + Monthly Interest + Fees - Payment
 * 
 *    - Vehicle Finance:
 *        Monthly Interest = Principal * (annualRate / 12)
 *        Monthly Admin/Service Fee = account.monthlyFee || 69
 *        Principal Reduction = Payment - (Monthly Interest + Fees)
 *        New Balance = Principal + Monthly Interest + Fees - Payment
 * 
 *    - Credit Card:
 *        Monthly Interest = Principal * (annualRate / 12)
 *        Monthly Service Fee = account.monthlyFee || 0
 *        Principal Reduction = Payment - (Monthly Interest + Fees)
 *        New Balance = Principal + Monthly Interest + Fees - Payment
 * 
 *    - General Debts & Loans (both linked to account or standalone Debt Snowball item):
 *        Monthly Interest = Principal * (annualRate / 12)
 *        Monthly Service Fee = account?.monthlyFee || debt?.monthlyFee || 0
 *        Principal Reduction = Payment - (Monthly Interest + Fees)
 *        New Balance = Principal + Monthly Interest + Fees - Payment
 */
export function calculateDebtReduction({
  currentBalance,
  paymentAmount,
  paymentType = 'installment', // 'installment' | 'direct_deposit'
  accountType,
  annualInterestRate = 0,
  monthlyFee = 0,
  debtCategory,
}: {
  currentBalance: number;
  paymentAmount: number;
  paymentType?: 'installment' | 'direct_deposit';
  accountType?: string;
  annualInterestRate?: number;
  monthlyFee?: number;
  debtCategory?: string;
}): DebtPaymentCalculationResult {
  const principal = Math.max(0, currentBalance);
  const paid = Math.max(0, paymentAmount);

  // Scenario 1: Direct deposit / Extra capital payment / Snowball lump sum
  if (paymentType === 'direct_deposit' || paid <= 0) {
    const newBal = Math.max(0, principal - paid);
    return {
      paidAmount: paid,
      principalReduction: paid,
      interestCharged: 0,
      feesCharged: 0,
      newBalance: Number(newBal.toFixed(2)),
      previousBalance: principal,
      breakdownSummary: `100% Capital Reduction (Direct Deposit): -R${paid.toFixed(2)} directly off principal.`,
    };
  }

  // Scenario 2: Monthly Installment / Contractual Minimum Repayment
  const rate = Math.max(0, annualInterestRate || 0) / 100;
  const monthlyInterestRate = rate / 12;

  // Monthly interest accrued on current outstanding principal
  const interestCharged = Number((principal * monthlyInterestRate).toFixed(2));

  // Determine standard monthly administrative/service fee
  let fees = monthlyFee;
  if (fees === undefined || fees === null || fees <= 0) {
    if (accountType === 'home_loan') {
      fees = 69.0; // Standard SA home loan monthly service fee
    } else if (accountType === 'vehicle_loan' || debtCategory === 'car_finance') {
      fees = 69.0; // Standard SA vehicle finance service fee
    } else {
      fees = 0.0;
    }
  }

  // Total finance charges for the month
  const totalFinanceCharges = Number((interestCharged + fees).toFixed(2));

  // Principal reduction = payment minus non-principal charges (interest + fees)
  // If payment exceeds charges, remaining brings down the principal. If payment is lower than charges, balance increases.
  const principalReduction = Number((paid - totalFinanceCharges).toFixed(2));
  const newBal = Math.max(0, Number((principal - principalReduction).toFixed(2)));

  return {
    paidAmount: paid,
    principalReduction,
    interestCharged,
    feesCharged: fees,
    newBalance: newBal,
    previousBalance: principal,
    breakdownSummary: `Installment Breakdown: R${paid.toFixed(2)} paid (Interest: R${interestCharged.toFixed(2)}, Fees: R${fees.toFixed(2)}, Principal Reduced: R${principalReduction.toFixed(2)}).`,
  };
}
