import { CategoryGroup, DebtCategory, IncomeType, AccountType, FinancialAccount } from '../types';

export interface DefaultCategoryTemplate {
  name: string;
  group: CategoryGroup;
  tag: string;
  defaultAmount: number;
  icon: string;
  color: string;
  isEssential: boolean;
}

export interface AccountTypeConfig {
  id: AccountType;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  bgColor: string;
  icon: string;
  isLiability?: boolean;
}

export const ACCOUNT_TYPES: AccountTypeConfig[] = [
  {
    id: 'cash',
    label: 'Cash / Physical Wallet',
    shortLabel: 'Cash',
    description: 'Physical cash on hand for envelope spending or petty cash',
    color: '#64D2FF',
    bgColor: 'rgba(100, 210, 255, 0.15)',
    icon: 'Banknote',
  },
  {
    id: 'cheque',
    label: 'Cheque / Current Account',
    shortLabel: 'Cheque',
    description: 'Day-to-day transactional bank account for salary deposits & daily expenses',
    color: '#30D158',
    bgColor: 'rgba(48, 209, 88, 0.15)',
    icon: 'CreditCard',
  },
  {
    id: 'savings',
    label: 'Savings / Notice Deposit',
    shortLabel: 'Savings',
    description: 'High-yield savings, emergency fund, or 32-day notice account',
    color: '#0A84FF',
    bgColor: 'rgba(10, 132, 255, 0.15)',
    icon: 'PiggyBank',
  },
  {
    id: 'tax_free',
    label: 'Tax-Free Savings (TFSA)',
    shortLabel: 'TFSA',
    description: 'Tax-Free Investment Account (SARS R36k/yr annual allowance)',
    color: '#BF5AF2',
    bgColor: 'rgba(191, 90, 242, 0.15)',
    icon: 'Sparkles',
  },
  {
    id: 'investment',
    label: 'Investment / Share Portfolio',
    shortLabel: 'Investment',
    description: 'Unit trusts, index funds, retirement annuities, ETFs & shares',
    color: '#FF9F0A',
    bgColor: 'rgba(255, 159, 10, 0.15)',
    icon: 'TrendingUp',
  },
  {
    id: 'credit_card',
    label: 'Credit Card (Revolving Facility)',
    shortLabel: 'Credit Card',
    description: 'Revolving credit facility with interest rate, admin fee, & debt snowball link',
    color: '#FF453A',
    bgColor: 'rgba(255, 69, 58, 0.15)',
    icon: 'CreditCard',
    isLiability: true,
  },
  {
    id: 'loan',
    label: 'Personal Loan / Overdraft / Store Card',
    shortLabel: 'Loan / Debt',
    description: 'Personal loan, revolving store card, or overdraft (added to Baby Step 2 Debt Snowball)',
    color: '#FF375F',
    bgColor: 'rgba(255, 55, 95, 0.15)',
    icon: 'Wallet',
    isLiability: true,
  },
  {
    id: 'vehicle_loan',
    label: 'Vehicle Finance / Car Loan',
    shortLabel: 'Vehicle Loan',
    description: 'Vehicle asset finance (WesBank, MFC, ABSA, etc.) with balloon, equity & snowball tracking',
    color: '#FF6482',
    bgColor: 'rgba(255, 100, 130, 0.15)',
    icon: 'Car',
    isLiability: true,
  },
  {
    id: 'home_loan',
    label: 'Home Loan / Mortgage Bond',
    shortLabel: 'Bond / Home',
    description: 'Primary residential mortgage bond (Baby Step 6, excluded from Step 2 Snowball)',
    color: '#D4BBFF',
    bgColor: 'rgba(212, 187, 255, 0.15)',
    icon: 'Home',
    isLiability: true,
  },
  {
    id: 'other',
    label: 'Other Digital / Custom Account',
    shortLabel: 'Other',
    description: 'Stokvel, electronic voucher, or custom fund',
    color: '#94A3B8',
    bgColor: 'rgba(148, 163, 184, 0.15)',
    icon: 'Wallet',
  },
];

export const SOUTH_AFRICAN_INSTITUTIONS: {
  name: string;
  shortName: string;
  badgeColor: string;
  iconLetter: string;
}[] = [
  { name: 'Capitec Bank', shortName: 'Capitec', badgeColor: '#005EA6', iconLetter: 'C' },
  { name: 'First National Bank (FNB)', shortName: 'FNB', badgeColor: '#009999', iconLetter: 'F' },
  { name: 'Standard Bank', shortName: 'Standard Bank', badgeColor: '#0033A0', iconLetter: 'S' },
  { name: 'Nedbank', shortName: 'Nedbank', badgeColor: '#005A36', iconLetter: 'N' },
  { name: 'Discovery Bank', shortName: 'Discovery', badgeColor: '#5E2750', iconLetter: 'D' },
  { name: 'Investec', shortName: 'Investec', badgeColor: '#2B2B2A', iconLetter: 'I' },
  { name: 'TymeBank', shortName: 'TymeBank', badgeColor: '#F76400', iconLetter: 'T' },
  { name: 'Absa Bank', shortName: 'Absa', badgeColor: '#BA0C2F', iconLetter: 'A' },
  { name: 'WesBank (Vehicle Finance)', shortName: 'WesBank', badgeColor: '#004B87', iconLetter: 'W' },
  { name: 'MFC (Nedbank Vehicle)', shortName: 'MFC', badgeColor: '#005A36', iconLetter: 'M' },
  { name: 'Toyota Financial Services', shortName: 'Toyota FS', badgeColor: '#EB0A1E', iconLetter: 'T' },
  { name: 'SA Home Loans', shortName: 'SA Home Loans', badgeColor: '#8E288E', iconLetter: 'H' },
  { name: 'EasyEquities', shortName: 'EasyEquities', badgeColor: '#0A84FF', iconLetter: 'E' },
  { name: 'Sygnia', shortName: 'Sygnia', badgeColor: '#5E5CE6', iconLetter: 'S' },
  { name: 'Old Mutual', shortName: 'Old Mutual', badgeColor: '#007A3D', iconLetter: 'O' },
  { name: 'Sanlam', shortName: 'Sanlam', badgeColor: '#00508B', iconLetter: 'S' },
  { name: 'Cash / Wallet', shortName: 'Cash', badgeColor: '#30D158', iconLetter: 'R' },
  { name: 'Other / Custom', shortName: 'Other', badgeColor: '#64748B', iconLetter: '•' },
];

export const DEFAULT_STARTER_ACCOUNTS: Omit<FinancialAccount, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Transactional Cheque Account',
    type: 'cheque',
    institution: 'Capitec Bank',
    accountNumberMask: '••• 8492',
    openingBalance: 12500,
    color: '#30D158',
    isDefault: true,
    notes: 'Main salary deposit and monthly expense debit orders',
  },
  {
    name: 'Emergency Savings Account',
    type: 'savings',
    institution: 'First National Bank (FNB)',
    accountNumberMask: '••• 3109',
    openingBalance: 20000,
    color: '#0A84FF',
    notes: 'Baby Step 1 Emergency Fund reserve deposit',
  },
  {
    name: 'Tax-Free Investment (TFSA)',
    type: 'tax_free',
    institution: 'EasyEquities',
    accountNumberMask: '••• 9921',
    openingBalance: 36000,
    expectedAnnualReturn: 11.5,
    managementFeePercentage: 0.45,
    monthlyContribution: 3000,
    ytdContribution: 15000,
    lifetimeContribution: 120000,
    color: '#BF5AF2',
    notes: 'Tax-Free Investment Account (annual SARS R36,000 cap)',
  },
  {
    name: 'Rewards Credit Card',
    type: 'credit_card',
    institution: 'Discovery Bank',
    accountNumberMask: '••• 5514',
    openingBalance: 4500,
    creditLimit: 25000,
    balanceOwed: 4500,
    availableCredit: 20500,
    interestRate: 21.75,
    monthlyFee: 69,
    minimumPaymentPercentage: 3.0,
    minimumPaymentAmount: 204,
    color: '#FF453A',
    notes: 'Credit facility for fuel & groceries (tracked in Debt Snowball)',
  },
  {
    name: 'Cash in Wallet',
    type: 'cash',
    institution: 'Physical Cash',
    accountNumberMask: 'Cash',
    openingBalance: 1500,
    color: '#64D2FF',
    notes: 'Physical cash for small groceries and personal cash envelopes',
  },
];

export const COMMON_CATEGORY_TAGS = [
  { id: 'bond', label: 'Bond & Rent', color: '#0A84FF', bg: 'rgba(10,132,255,0.15)' },
  { id: 'debt', label: 'Debt Snowball', color: '#FF453A', bg: 'rgba(255,69,58,0.15)' },
  { id: 'food', label: 'Food & Groceries', color: '#FF9F0A', bg: 'rgba(255,159,10,0.15)' },
  { id: 'transport', label: 'Transport & Fuel', color: '#FFD60A', bg: 'rgba(255,214,10,0.15)' },
  { id: 'entertainment', label: 'Entertainment & Dining', color: '#BF5AF2', bg: 'rgba(191,90,242,0.15)' },
  { id: 'utilities', label: 'Utilities & WiFi', color: '#64D2FF', bg: 'rgba(100,210,255,0.15)' },
  { id: 'housing', label: 'Housing & Levies', color: '#30D158', bg: 'rgba(48,209,88,0.15)' },
  { id: 'health', label: 'Health & Medical', color: '#FF375F', bg: 'rgba(255,55,95,0.15)' },
  { id: 'insurance', label: 'Insurance Cover', color: '#5E5CE6', bg: 'rgba(94,92,230,0.15)' },
  { id: 'kids', label: 'Kids & School', color: '#38BDF8', bg: 'rgba(56,189,248,0.15)' },
  { id: 'savings', label: 'Emergency Fund', color: '#34D399', bg: 'rgba(52,211,153,0.15)' },
  { id: 'personal', label: 'Personal Pocket', color: '#F472B6', bg: 'rgba(244,114,182,0.15)' },
  { id: 'giving', label: 'Tithe & Giving', color: '#A78BFA', bg: 'rgba(167,139,250,0.15)' },
  { id: 'lifestyle', label: 'Lifestyle & Misc', color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' },
  { id: 'other', label: 'Other Type', color: '#A1A1AA', bg: 'rgba(161,161,170,0.15)' },
];

export const CATEGORY_GROUPS: {
  id: CategoryGroup;
  label: string;
  description: string;
  color: string;
}[] = [
  { id: 'giving', label: 'Giving & Tithing', description: 'Charity, community & tithe', color: '#10b981' },
  { id: 'savings_goals', label: 'Savings & Baby Steps', description: 'Emergency funds & investments', color: '#059669' },
  { id: 'housing', label: 'Housing & Shelter', description: 'Bond/Rent, rates, levies', color: '#3b82f6' },
  { id: 'utilities', label: 'Utilities & Services', description: 'Electricity (Eskom/Prepaid), Water, WiFi', color: '#06b6d4' },
  { id: 'food', label: 'Food & Groceries', description: 'Supermarket groceries, household essentials', color: '#f59e0b' },
  { id: 'transport', label: 'Transport & Fuel', description: 'Petrol, car service, Gautrain, toll fees', color: '#d97706' },
  { id: 'health_insurance', label: 'Health & Insurance', description: 'Medical Aid, Gap cover, Car/Life insurance', color: '#8b5cf6' },
  { id: 'debt_snowball', label: 'Debt Snowball', description: 'Minimum payments & snowball payoff boost', color: '#ef4444' },
  { id: 'personal', label: 'Personal Allowances', description: 'Husband & Wife personal cash/spend', color: '#ec4899' },
  { id: 'lifestyle', label: 'Kids & Lifestyle', description: 'School fees, dining out, entertainment', color: '#6366f1' },
];

export const DEFAULT_SOUTH_AFRICAN_CATEGORIES: DefaultCategoryTemplate[] = [
  // Housing & Bond
  { name: 'Home Bond / Rent', group: 'housing', tag: 'bond', defaultAmount: 18500, icon: 'Home', color: '#3b82f6', isEssential: true },
  { name: 'Rates, Taxes & Levies', group: 'housing', tag: 'housing', defaultAmount: 2200, icon: 'Building2', color: '#3b82f6', isEssential: true },
  
  // Utilities
  { name: 'Electricity & Water (Prepaid/Mun)', group: 'utilities', tag: 'utilities', defaultAmount: 3200, icon: 'Zap', color: '#06b6d4', isEssential: true },
  { name: 'Fibre Home Internet / WiFi', group: 'utilities', tag: 'utilities', defaultAmount: 899, icon: 'Wifi', color: '#06b6d4', isEssential: false },
  { name: 'Cellphones / Airtime', group: 'utilities', tag: 'utilities', defaultAmount: 950, icon: 'Smartphone', color: '#06b6d4', isEssential: true },

  // Food
  { name: 'Supermarket Groceries (Checkers/PnP/Spar)', group: 'food', tag: 'food', defaultAmount: 9000, icon: 'ShoppingCart', color: '#f59e0b', isEssential: true },
  { name: 'Butchery & Fresh Produce', group: 'food', tag: 'food', defaultAmount: 2000, icon: 'Beef', color: '#f59e0b', isEssential: true },

  // Transport
  { name: 'Petrol & Fuel (Shell/Sasol/Engen)', group: 'transport', tag: 'transport', defaultAmount: 5500, icon: 'Fuel', color: '#d97706', isEssential: true },
  { name: 'Vehicle Maintenance & Tyres', group: 'transport', tag: 'transport', defaultAmount: 1200, icon: 'Wrench', color: '#d97706', isEssential: true },

  // Health & Insurance
  { name: 'Medical Aid (Discovery / Bonitas)', group: 'health_insurance', tag: 'health', defaultAmount: 6200, icon: 'HeartPulse', color: '#8b5cf6', isEssential: true },
  { name: 'Comprehensive Car & Home Insurance', group: 'health_insurance', tag: 'insurance', defaultAmount: 2100, icon: 'ShieldCheck', color: '#8b5cf6', isEssential: true },
  { name: 'Pharmacy & Over-the-counter', group: 'health_insurance', tag: 'health', defaultAmount: 650, icon: 'Pill', color: '#8b5cf6', isEssential: true },

  // Kids & Lifestyle
  { name: 'School Fees & Aftercare', group: 'lifestyle', tag: 'kids', defaultAmount: 4500, icon: 'GraduationCap', color: '#6366f1', isEssential: true },
  { name: 'Family Dining Out & Takeaways', group: 'lifestyle', tag: 'entertainment', defaultAmount: 2000, icon: 'UtensilsCrossed', color: '#6366f1', isEssential: false },
  { name: 'Entertainment & Subscriptions (DSTV/Netflix)', group: 'lifestyle', tag: 'entertainment', defaultAmount: 450, icon: 'Tv', color: '#6366f1', isEssential: false },

  // Personal
  { name: 'Husband Pocket Money / Personal', group: 'personal', tag: 'personal', defaultAmount: 1500, icon: 'User', color: '#ec4899', isEssential: false },
  { name: 'Wife Pocket Money / Personal', group: 'personal', tag: 'personal', defaultAmount: 1500, icon: 'UserCheck', color: '#ec4899', isEssential: false },

  // Debt Snowball (Step 2)
  { name: 'Debt Snowball Monthly Attack Fund', group: 'debt_snowball', tag: 'debt', defaultAmount: 8000, icon: 'Flame', color: '#ef4444', isEssential: true },

  // Savings / Baby Step 1
  { name: 'Baby Step 1 Starter Emergency Fund', group: 'savings_goals', tag: 'savings', defaultAmount: 4000, icon: 'PiggyBank', color: '#059669', isEssential: false },

  // Miscellaneous / Buffer
  { name: 'Buffer / Miscellaneous', group: 'lifestyle', tag: 'lifestyle', defaultAmount: 1000, icon: 'HelpCircle', color: '#64748b', isEssential: false },
];

export const INCOME_TYPES: { id: IncomeType; label: string; defaultTag: string }[] = [
  { id: 'primary_salary', label: 'Husband Primary Salary', defaultTag: 'Main Job' },
  { id: 'spouse_salary', label: 'Wife Primary Salary', defaultTag: 'Main Job' },
  { id: 'side_hustle', label: 'Side Hustle / Business', defaultTag: 'Side Business' },
  { id: 'freelance', label: 'Freelance / Consulting', defaultTag: 'Consulting' },
  { id: 'bonus', label: 'Bonus / 13th Cheque', defaultTag: 'Bonus' },
  { id: 'rental', label: 'Rental Property Income', defaultTag: 'Rental' },
  { id: 'other', label: 'Other Income', defaultTag: 'Other' },
];

export const DEBT_CATEGORIES: { id: DebtCategory; label: string; icon: string }[] = [
  { id: 'store_card', label: 'Store & Clothing Card (Woolies, Edgars, etc.)', icon: 'ShoppingBag' },
  { id: 'credit_card', label: 'Credit Card (FNB, Standard Bank, etc.)', icon: 'CreditCard' },
  { id: 'personal_loan', label: 'Personal Loan / Overdraft (Capitec, ABSA)', icon: 'Banknote' },
  { id: 'car_finance', label: 'Vehicle Finance (Wesbank, MFC, etc.)', icon: 'Car' },
  { id: 'student_loan', label: 'Student Loan', icon: 'GraduationCap' },
  { id: 'other', label: 'Other Debt', icon: 'FileText' },
];

export const PAYMENT_METHODS = [
  'Debit Card',
  'Credit Card',
  'EFT / Bank Transfer',
  'Cash',
  'SnapScan / Zapper',
  'Direct Debit',
];

export const DAVE_RAMSEY_STEPS = [
  {
    step: 1,
    title: 'Starter Emergency Fund',
    subtitle: 'Save R20,000 in a separate accessible account',
    saDescription:
      'Save R20,000 as fast as possible to prevent going into debt when minor emergencies happen (car tyre blowout, appliance repair, urgent medical co-payment). In South Africa, R20,000 gives peace of mind while staying current on all debt minimums.',
    target: 20000,
    accent: '#059669',
    badge: 'Foundation',
  },
  {
    step: 2,
    title: 'Pay Off All Debt (Snowball)',
    subtitle: 'Pay off all non-mortgage debt from smallest to largest balance',
    saDescription:
      'List all debts (store cards, clothing accounts, credit cards, personal loans, car finance) in order from smallest balance to largest. Pay minimums on everything, and throw every extra Rand (snowball) at the smallest debt until destroyed!',
    target: 0,
    accent: '#ef4444',
    badge: 'Debt Free',
  },
  {
    step: 3,
    title: 'Fully Funded Emergency Fund',
    subtitle: 'Save 3 to 6 months of essential living expenses',
    saDescription:
      'Once consumer debt is gone, build a fortress: 3 to 6 months of real household living expenses in a high-yield South African savings account (Capitec, TymeBank, 32-day notice, etc.).',
    target: 0, // dynamic
    accent: '#3b82f6',
    badge: 'Security',
  },
  {
    step: 4,
    title: 'Invest 15% in Retirement',
    subtitle: 'Invest 15% of household income for the future',
    saDescription:
      'Contribute 15% of gross family income into Retirement Annuities (RAs), Pension/Provident Funds, and Tax-Free Savings Accounts (TFSA) up to the R36,000 annual limit in South Africa.',
    target: 0,
    accent: '#8b5cf6',
    badge: 'Wealth Engine',
  },
  {
    step: 5,
    title: "Children's Education Fund",
    subtitle: 'Save for school and university fees',
    saDescription:
      "Set up dedicated university / tertiary education funding for your children (e.g. Unit trusts, TFSA, education endowments) so they graduate debt-free.",
    target: 0,
    accent: '#f59e0b',
    badge: 'Family Legacy',
  },
  {
    step: 6,
    title: 'Pay Off Home Bond Early',
    subtitle: 'Pay off your home mortgage / bond ahead of schedule',
    saDescription:
      'Make extra principal payments into your home loan facility. Shaving 10 to 15 years off your bond saves hundreds of thousands of Rands in South African prime interest rates!',
    target: 0,
    accent: '#06b6d4',
    badge: '100% Freedom',
  },
  {
    step: 7,
    title: 'Build Wealth and Give Generously',
    subtitle: 'Live and give like no one else',
    saDescription:
      'With zero debt and a paid-for home, grow your investments, build generational family wealth, and give generously to uplift your family and South African community.',
    target: 0,
    accent: '#10b981',
    badge: 'Abundance',
  },
];
