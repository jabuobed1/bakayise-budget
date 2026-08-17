export type IncomeType =
  | 'primary_salary'
  | 'spouse_salary'
  | 'freelance'
  | 'side_hustle'
  | 'bonus'
  | 'rental'
  | 'other';

export type CategoryGroup =
  | 'giving'
  | 'housing'
  | 'utilities'
  | 'food'
  | 'transport'
  | 'health_insurance'
  | 'debt_snowball'
  | 'savings_goals'
  | 'lifestyle'
  | 'personal';

export type UserRole = 'Hubby' | 'Wifey';

export type LoggedBy = 'Hubby' | 'Wifey' | 'Shared' | 'Husband' | 'Wife';

export interface EditAuditInfo {
  lastEditedBy?: string; // 'Hubby' | 'Wifey' | custom name
  lastEditedByEmail?: string; // 'jabuobed1@gmail.com' | 'lumzayopa@gmail.com'
  lastEditedAt?: string; // ISO 8601 Timestamp
}

export type PeriodStatus = 'active' | 'planning' | 'completed' | 'archived';

export type AccountType =
  | 'cash'
  | 'cheque'
  | 'savings'
  | 'tax_free'
  | 'investment'
  | 'credit_card'
  | 'loan'
  | 'vehicle_loan'
  | 'home_loan'
  | 'other';

export interface FinancialAccount extends EditAuditInfo {
  id: string;
  name: string; // e.g. "Main Cheque", "Emergency 32-Day", "Discovery Platinum CC", "EasyEquities TFSA"
  type: AccountType;
  institution?: string; // e.g. "Capitec", "FNB", "Standard Bank", "Nedbank", "Discovery", "Investec", "TymeBank", "Absa", "WesBank", "MFC", "EasyEquities", "Allan Gray", "Cash", or custom
  accountNumberMask?: string; // e.g. "••• 4821"
  openingBalance: number; // For cash/cheque/savings/investments: positive capital. For credit cards/loans: opening balance owed.
  currentBalance?: number;
  currency?: string; // Default "ZAR"
  color?: string; // Badge accent color
  icon?: string;
  isDefault?: boolean;
  notes?: string;

  // Baby Step Assignment (Step 1, Step 3, Step 4, Step 5, Step 6, or null)
  babyStepAssignment?: number | null;

  // Credit Card specific fields
  creditLimit?: number; // Total approved credit limit (e.g. R25,000)
  availableCredit?: number; // Credit available to spend (e.g. R7,000)
  balanceOwed?: number; // Outstanding amount borrowed / debt (e.g. R18,000)
  interestRate?: number; // Annual % interest (e.g. 21.75% for credit card, 10.5% for investment)
  monthlyFee?: number; // Monthly card / NCA service fee (can be 0.00)
  minimumPaymentPercentage?: number; // e.g. 3.0%
  minimumPaymentAmount?: number; // Calculated or custom monthly minimum payment (e.g. R624.00)

  // Investment & Tax-Free (TFSA) specific fields
  expectedAnnualReturn?: number; // Expected return / growth % p.a. (e.g. 11.5%)
  managementFeePercentage?: number; // TER / EAC management fee % p.a. (e.g. 0.45%)
  monthlyContribution?: number; // Regular monthly planned investment
  ytdContribution?: number; // For TFSA: contribution so far this tax year towards R36,000 limit
  lifetimeContribution?: number; // For TFSA: contribution towards R500,000 lifetime cap

  // Home Loan / Mortgage Bond specific fields
  purchasePrice?: number; // Original purchase price of the property (ZAR)
  marketValue?: number; // Estimated current market value if sold today (ZAR)
  totalTermYears?: number; // e.g. 20, 25, or 30 years
  remainingTermMonths?: number; // Total months left to payoff
  monthlyInstallment?: number; // Calculated monthly bond repayment
  manualMonthlyInstallment?: number; // Actual monthly debit order amount

  // Personal Loan / Debt specific fields
  originalLoanAmount?: number; // Original principal amount borrowed
  creditLifeInsurance?: number; // Monthly Credit Life Insurance (CLI) premium (ZAR)
  totalTermMonths?: number; // e.g. 36, 48, 60, 72 months

  // Vehicle Finance specific fields
  vehicleMakeModel?: string; // e.g. "2023 VW Polo 1.0 TSI", "Toyota Fortuner 2.8 GD-6"
  balloonPaymentPercentage?: number; // Balloon / residual percentage (e.g. 20% or 35%)
  balloonAmount?: number; // Balloon / residual settlement amount (ZAR)

  createdAt: string;
  updatedAt: string;
}

export interface BudgetPeriod extends EditAuditInfo {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  setupDueDate: string; // YYYY-MM-DD
  status: PeriodStatus;
  totalPlannedIncome: number;
  totalPlannedExpenses: number;
  openingFloatingBalance?: number; // Floating unspent cash carried over from previous pay cycle
  closingFloatingBalance?: number; // Calculated net floating cash remaining at end of cycle
  autoCarryoverFromPrevious?: boolean; // Default true: automatically carry over leftover cash from previous cycle
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Income extends EditAuditInfo {
  id: string;
  periodId: string;
  title: string;
  amount: number;
  type: IncomeType;
  sourceTag?: string;
  accountId?: string; // Destination financial account
  receivedDate?: string;
  status: 'expected' | 'received';
  order?: number; // Position in Excel list
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategory extends EditAuditInfo {
  id: string;
  periodId: string;
  name: string;
  group: CategoryGroup;
  tag?: string; // e.g. 'debt', 'bond', 'entertainment', 'food', 'transport', 'utilities'
  tags?: string[];
  allocatedAmount: number;
  defaultAccountId?: string; // Linked default financial account
  color?: string;
  icon?: string;
  order?: number; // Position in Excel list
  isEssential: boolean; // Essential expenses for 3-6 months emergency fund calculation
  createdAt: string;
  updatedAt: string;
}

export interface Expense extends EditAuditInfo {
  id: string;
  periodId: string;
  categoryId: string;
  amount: number;
  title: string;
  date: string; // YYYY-MM-DD
  loggedBy: LoggedBy;
  accountId?: string; // Source financial account paid from
  paymentMethod?: string;
  notes?: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type DebtCategory =
  | 'store_card'
  | 'credit_card'
  | 'personal_loan'
  | 'car_finance'
  | 'student_loan'
  | 'other';

export interface Debt extends EditAuditInfo {
  id: string;
  name: string;
  lender?: string;
  category: DebtCategory;
  balance: number;
  originalBalance: number;
  minimumPayment: number;
  interestRate: number; // Annual %
  linkedAccountId?: string;
  order?: number;
  status: 'active' | 'paid_off';
  paidOffDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BabyStepsState extends EditAuditInfo {
  id: string;
  currentStep: number; // 1 to 7
  step1EmergencyFundTarget: number; // Default R20,000 for South Africa
  step1CurrentBalance: number;
  step3MonthsTarget: number; // 3 or 6 months
  step3CurrentBalance: number;
  step4MonthlyInvestment: number;
  step5CollegeFundBalance: number;
  step6BondBalance: number;
  step6MonthlyExtra: number;
  step7GivingMonthly: number;
  notes?: string;
  updatedAt: string;
}

export interface EmergencyFundLog extends EditAuditInfo {
  id: string;
  step: 1 | 3;
  type: 'deposit' | 'withdrawal' | 'adjustment';
  amount: number;
  date: string;
  description: string;
  createdAt: string;
}

export interface PublicHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  isObserved?: boolean;
}

export interface ArchivedWorksheet extends EditAuditInfo {
  id: string;
  title: string;
  archivedAt: string;
  archivedBy: string;
  archivedByEmail?: string;
  periodName?: string;
  householdId?: string;
  dataSnapshot: {
    periods: BudgetPeriod[];
    incomes: Income[];
    categories: BudgetCategory[];
    expenses: Expense[];
    debts?: Debt[];
    accounts?: FinancialAccount[];
    babyStepsState?: BabyStepsState | null;
    emergencyLogs?: EmergencyFundLog[];
  };
  notes?: string;
}

export interface UserProfile extends EditAuditInfo {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  householdId: string;
  linkedUserIds?: string[];
  avatarColor?: string;
  createdAt?: string;
  updatedAt?: string;
}
