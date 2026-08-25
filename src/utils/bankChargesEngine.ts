// ============================================================================
// SOUTH AFRICAN BANK CHARGES & TRANSACTION FEES ENGINE (2025 / 2026 PRICING)
// Covers: Standard Bank, Capitec, GoTyme (Go Time / TymeBank), Absa, Nedbank, FNB
// ============================================================================

export type SABankCode =
  | 'standard_bank'
  | 'capitec'
  | 'gotyme'
  | 'absa'
  | 'fnb'
  | 'nedbank'
  | 'discovery'
  | 'investec'
  | 'other';

export type TransactionType =
  | 'internal_transfer_same_bank'
  | 'interbank_eft'
  | 'immediate_payment_rtc'
  | 'payshap'
  | 'atm_deposit_own'
  | 'atm_deposit_other'
  | 'retail_cash_deposit'
  | 'atm_withdrawal_own'
  | 'atm_withdrawal_other'
  | 'retail_till_cashout'
  | 'debit_order'
  | 'card_purchase'
  | 'monthly_admin_fee';

export interface BankFeeRule {
  description: string;
  calculateFee: (amount: number) => number;
  fixedFee?: number;
  variablePercent?: number;
  notes?: string;
}

export interface BankProfile {
  id: SABankCode;
  displayName: string;
  brandColor: string;
  tagline: string;
  popularTiers: {
    tierId: string;
    tierName: string;
    monthlyFee: number;
    description: string;
  }[];
  feeRules: Partial<Record<TransactionType, BankFeeRule>>;
}

export const SA_BANK_PROFILES: Record<SABankCode, BankProfile> = {
  standard_bank: {
    id: 'standard_bank',
    displayName: 'Standard Bank',
    brandColor: '#0033A0',
    tagline: 'Private & Professional Banking / Standard Bank',
    popularTiers: [
      {
        tierId: 'private_banking',
        tierName: 'Private Banking / Professional',
        monthlyFee: 230,
        description: 'Dedicated private banker, unlimited free electronic banking, premium travel & lifestyle benefits.',
      },
      {
        tierId: 'credit_card',
        tierName: 'Standard Bank Credit Card',
        monthlyFee: 55,
        description: 'Up to 55 days interest-free, free card swipes & digital payments, personalized credit limits.',
      },
      {
        tierId: 'tax_free',
        tierName: 'Tax-Free Call / Savings',
        monthlyFee: 0,
        description: 'Zero monthly admin fees, 100% tax-free growth up to SARS annual R36,000 allowance.',
      },
      {
        tierId: 'my_mo',
        tierName: 'MyMo Account (Pay-As-You-Transact)',
        monthlyFee: 6.95,
        description: 'Low monthly fee entry-level account with low flat digital fees.',
      },
    ],
    feeRules: {
      internal_transfer_same_bank: {
        description: 'Transfer between own Standard Bank accounts',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free on App / Internet Banking',
      },
      interbank_eft: {
        description: 'Standard EFT to other SA banks (App / Online)',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Included free on Private Banking / Bundled accounts; R1.40 on Pay-as-you-transact',
      },
      immediate_payment_rtc: {
        description: 'Immediate Clearance Payment (RTC)',
        calculateFee: (amount) => (amount <= 1000 ? 10 : amount <= 3000 ? 25 : 45),
        notes: 'R10 for <= R1,000; R25 for R1,001 - R3,000; R45 for > R3,000',
      },
      payshap: {
        description: 'PayShap to cellphone / ShapID',
        calculateFee: (amount) => (amount <= 100 ? 1.5 : amount <= 1000 ? 3.0 : 7.5),
        notes: 'R1.50 <= R100; R3.00 <= R1,000; R7.50 <= R3,000',
      },
      atm_deposit_own: {
        description: 'Cash deposit at Standard Bank Cash Accepting ATM',
        calculateFee: (amount) => {
          // Typically R1.40 per R100 or part thereof (first R1,500 free on bundle)
          return Math.max(1.4, Math.ceil(amount / 100) * 1.4);
        },
        notes: 'R1.40 per R100 or part thereof',
      },
      atm_withdrawal_own: {
        description: 'Cash withdrawal at Standard Bank ATM',
        calculateFee: (amount) => Math.max(9, Math.ceil(amount / 100) * 2.2),
        notes: 'R9.00 + R2.20 per R100 on pay-as-you-transact',
      },
      atm_withdrawal_other: {
        description: 'Cash withdrawal at other SASWITCH bank ATM',
        calculateFee: (amount) => 14.0 + Math.ceil(amount / 100) * 2.5,
        notes: 'R14.00 flat + R2.50 per R100',
      },
      retail_till_cashout: {
        description: 'Cash at Till point (Pick n Pay, Checkers, Shoprite, Boxer)',
        calculateFee: () => 2.0,
        fixedFee: 2.0,
        notes: 'R2.00 flat fee',
      },
      card_purchase: {
        description: 'Card swipe / Tap to Pay (POS)',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Always free',
      },
      debit_order: {
        description: 'Internal & External Debit Orders',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free on Private Banking',
      },
      monthly_admin_fee: {
        description: 'Monthly Private Banking Account Admin Fee',
        calculateFee: () => 230,
        fixedFee: 230,
        notes: 'Includes dedicated private banker & full digital banking suite',
      },
    },
  },

  capitec: {
    id: 'capitec',
    displayName: 'Capitec Bank',
    brandColor: '#009DE0',
    tagline: 'Global One / Savings Account',
    popularTiers: [
      {
        tierId: 'global_one',
        tierName: 'Global One (Savings & Transact)',
        monthlyFee: 7.5,
        description: 'Earn high positive interest on daily balance, flat transparent transaction fees.',
      },
    ],
    feeRules: {
      internal_transfer_same_bank: {
        description: 'Transfer between own Capitec accounts / Capitec to Capitec',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free on Capitec App',
      },
      interbank_eft: {
        description: 'EFT to another SA bank via Capitec App',
        calculateFee: () => 1.0,
        fixedFee: 1.0,
        notes: 'R1.00 flat fee per digital EFT',
      },
      immediate_payment_rtc: {
        description: 'Immediate payment to other banks',
        calculateFee: (amount) => (amount <= 3000 ? 6.0 : 10.0),
        notes: 'R6.00 <= R3,000; R10.00 > R3,000',
      },
      payshap: {
        description: 'PayShap to ShapID / cellphone',
        calculateFee: (amount) => (amount <= 100 ? 0.5 : amount <= 1000 ? 1.5 : 3.0),
        notes: 'R0.50 <= R100; R1.50 <= R1,000; R3.00 <= R3,000',
      },
      atm_deposit_own: {
        description: 'Cash deposit at Capitec ATM',
        calculateFee: (amount) => Math.ceil(amount / 100) * 1.4,
        notes: 'R1.40 per R100 or part thereof',
      },
      retail_cash_deposit: {
        description: 'Cash deposit at till (Pick n Pay, Boxer, Shoprite, Checkers)',
        calculateFee: (amount) => Math.ceil(amount / 100) * 1.4,
        notes: 'R1.40 per R100',
      },
      atm_withdrawal_own: {
        description: 'Cash withdrawal at Capitec ATM',
        calculateFee: (amount) => Math.ceil(amount / 1000) * 10.0,
        notes: 'R10.00 per R1,000 or part thereof',
      },
      atm_withdrawal_other: {
        description: 'Cash withdrawal at other bank ATM',
        calculateFee: (amount) => 10.5 + Math.ceil(amount / 1000) * 10.0,
        notes: 'R10.50 + R10.00 per R1,000',
      },
      retail_till_cashout: {
        description: 'Cash at Till point (Pick n Pay, Shoprite, Boxer)',
        calculateFee: () => 1.75,
        fixedFee: 1.75,
        notes: 'R1.75 flat fee',
      },
      card_purchase: {
        description: 'Card swipe / contactless tap',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free',
      },
      debit_order: {
        description: 'Debit Order processing',
        calculateFee: () => 3.5,
        fixedFee: 3.5,
        notes: 'R3.50 per debit order',
      },
      monthly_admin_fee: {
        description: 'Monthly Global One Admin Fee',
        calculateFee: () => 7.5,
        fixedFee: 7.5,
        notes: 'R7.50 per month',
      },
    },
  },

  gotyme: {
    id: 'gotyme',
    displayName: 'Go Time (TymeBank)',
    brandColor: '#FFB800',
    tagline: 'Go Time Everyday Account / GoalSave',
    popularTiers: [
      {
        tierId: 'everyday',
        tierName: 'Everyday Personal Account',
        monthlyFee: 0,
        description: 'Zero monthly admin fees, free card at kiosks, high interest GoalSave pockets.',
      },
    ],
    feeRules: {
      internal_transfer_same_bank: {
        description: 'Transfer between own Go Time pockets / accounts',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free on App',
      },
      interbank_eft: {
        description: 'Standard EFT to other SA banks',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free digital EFT on Go Time App',
      },
      immediate_payment_rtc: {
        description: 'Immediate Clearance Payment',
        calculateFee: () => 3.0,
        fixedFee: 3.0,
        notes: 'R3.00 flat fee for real-time payments',
      },
      payshap: {
        description: 'PayShap to ShapID / cellphone',
        calculateFee: () => 2.0,
        fixedFee: 2.0,
        notes: 'R2.00 per PayShap transfer',
      },
      retail_cash_deposit: {
        description: 'Cash deposit at Pick n Pay / Boxer till point',
        calculateFee: (amount) => {
          // First deposit per month free or R7.00 per R1,000
          return Math.ceil(amount / 1000) * 7.0;
        },
        notes: 'R7.00 per R1,000 at Pick n Pay & Boxer till points',
      },
      atm_deposit_own: {
        description: 'Deposit at Partner Kiosk / Partner till',
        calculateFee: (amount) => Math.ceil(amount / 1000) * 7.0,
        notes: 'R7.00 per R1,000',
      },
      retail_till_cashout: {
        description: 'Cash withdrawal at Pick n Pay / Boxer till point',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: '100% Free at Pick n Pay and Boxer till counters!',
      },
      atm_withdrawal_own: {
        description: 'Cash withdrawal at ATM',
        calculateFee: (amount) => Math.ceil(amount / 1000) * 10.0,
        notes: 'R10.00 per R1,000 at any SASWITCH ATM',
      },
      atm_withdrawal_other: {
        description: 'Cash withdrawal at other ATM',
        calculateFee: (amount) => Math.ceil(amount / 1000) * 10.0,
        notes: 'R10.00 per R1,000',
      },
      card_purchase: {
        description: 'Card swipe / Tap to Pay',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free',
      },
      monthly_admin_fee: {
        description: 'Monthly Account Fee',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'R0.00 - No monthly fees ever',
      },
    },
  },

  absa: {
    id: 'absa',
    displayName: 'Absa Bank',
    brandColor: '#B60024',
    tagline: 'Absa Transact / Home Loan / Cheque',
    popularTiers: [
      {
        tierId: 'transact',
        tierName: 'Absa Transact',
        monthlyFee: 5.0,
        description: 'Low monthly fee basic transaction account with app banking.',
      },
      {
        tierId: 'home_loan',
        tierName: 'Absa Home Loan Account',
        monthlyFee: 69.0,
        description: 'Monthly service fee for mortgage loan facility and flexi reserve access.',
      },
    ],
    feeRules: {
      internal_transfer_same_bank: {
        description: 'Transfer between Absa accounts',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free on Banking App',
      },
      interbank_eft: {
        description: 'EFT to other banks',
        calculateFee: () => 1.5,
        fixedFee: 1.5,
        notes: 'R1.50 on digital banking',
      },
      immediate_payment_rtc: {
        description: 'Immediate Payment (RTC)',
        calculateFee: () => 10.0,
        fixedFee: 10.0,
        notes: 'R10.00 per immediate clearance',
      },
      payshap: {
        description: 'PayShap payment',
        calculateFee: (amount) => (amount <= 100 ? 1.0 : 3.0),
        notes: 'R1.00 <= R100; R3.00 <= R3,000',
      },
      atm_deposit_own: {
        description: 'Cash deposit at Absa ATM',
        calculateFee: (amount) => Math.ceil(amount / 100) * 1.4,
        notes: 'R1.40 per R100',
      },
      atm_withdrawal_own: {
        description: 'Cash withdrawal at Absa ATM',
        calculateFee: (amount) => 9.0 + Math.ceil(amount / 100) * 2.3,
        notes: 'R9.00 + R2.30 per R100',
      },
      atm_withdrawal_other: {
        description: 'Cash withdrawal at other SASWITCH ATM',
        calculateFee: (amount) => 13.5 + Math.ceil(amount / 100) * 2.5,
        notes: 'R13.50 + R2.50 per R100',
      },
      retail_till_cashout: {
        description: 'Cash at Till Point',
        calculateFee: () => 2.0,
        fixedFee: 2.0,
        notes: 'R2.00 flat fee',
      },
      card_purchase: {
        description: 'Card swipe / POS',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free',
      },
      monthly_admin_fee: {
        description: 'Monthly Admin / Service Fee',
        calculateFee: () => 69.0,
        fixedFee: 69.0,
        notes: 'R69/mo for Home Loan administration; R5/mo for Transact',
      },
    },
  },

  fnb: {
    id: 'fnb',
    displayName: 'FNB (First National Bank)',
    brandColor: '#00A887',
    tagline: 'Aspire & Premier Cheque',
    popularTiers: [
      {
        tierId: 'aspire',
        tierName: 'FNB Aspire',
        monthlyFee: 70.0,
        description: 'Bundled electronic transactions, eBucks rewards.',
      },
    ],
    feeRules: {
      internal_transfer_same_bank: {
        description: 'Transfer between FNB accounts',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free',
      },
      interbank_eft: {
        description: 'EFT to other banks on FNB App',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free on bundled accounts',
      },
      immediate_payment_rtc: {
        description: 'Immediate payment (Pay and Clear now)',
        calculateFee: (amount) => (amount <= 2000 ? 7.0 : 45.0),
        notes: 'R7.00 <= R2,000; R45.00 > R2,000',
      },
      payshap: {
        description: 'PayShap to ShapID',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free under R100; R3.00 up to R3,000',
      },
      atm_deposit_own: {
        description: 'Cash deposit at FNB ATM with card',
        calculateFee: (amount) => Math.ceil(amount / 100) * 1.4,
        notes: 'R1.40 per R100',
      },
      atm_withdrawal_own: {
        description: 'Cash withdrawal at FNB ATM',
        calculateFee: (amount) => Math.ceil(amount / 100) * 2.3,
        notes: 'R2.30 per R100 on pay-as-you-use',
      },
      retail_till_cashout: {
        description: 'Cash at Till point (Shoprite, Checkers, Pick n Pay)',
        calculateFee: () => 1.75,
        fixedFee: 1.75,
        notes: 'R1.75 flat fee',
      },
      card_purchase: {
        description: 'Card swipes and taps',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free',
      },
    },
  },

  nedbank: {
    id: 'nedbank',
    displayName: 'Nedbank',
    brandColor: '#005D30',
    tagline: 'MiGoals & Savvy Plus',
    popularTiers: [
      {
        tierId: 'migoals',
        tierName: 'Nedbank MiGoals',
        monthlyFee: 5.0,
        description: 'Pay-as-you-use digital banking with Greenbacks.',
      },
    ],
    feeRules: {
      internal_transfer_same_bank: {
        description: 'Transfer between Nedbank accounts',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free',
      },
      interbank_eft: {
        description: 'EFT to other banks',
        calculateFee: () => 1.0,
        fixedFee: 1.0,
        notes: 'R1.00 on MoneyApp',
      },
      immediate_payment_rtc: {
        description: 'Instant pay (RTC)',
        calculateFee: () => 10.0,
        fixedFee: 10.0,
        notes: 'R10.00 flat fee',
      },
      atm_deposit_own: {
        description: 'Cash deposit at Nedbank ATM',
        calculateFee: (amount) => Math.ceil(amount / 100) * 1.4,
        notes: 'R1.40 per R100',
      },
      atm_withdrawal_own: {
        description: 'Cash withdrawal at Nedbank ATM',
        calculateFee: (amount) => 9.0 + Math.ceil(amount / 100) * 2.3,
        notes: 'R9.00 + R2.30 per R100',
      },
      retail_till_cashout: {
        description: 'Cash at Till point',
        calculateFee: () => 2.0,
        fixedFee: 2.0,
        notes: 'R2.00 flat fee',
      },
      card_purchase: {
        description: 'Card swipe',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free',
      },
    },
  },

  discovery: {
    id: 'discovery',
    displayName: 'Discovery Bank',
    brandColor: '#5E17EB',
    tagline: 'Vitality Shared-Value Banking',
    popularTiers: [
      {
        tierId: 'gold_suite',
        tierName: 'Discovery Gold Transaction',
        monthlyFee: 90.0,
        description: 'Integrated dynamic interest rates & Vitality discounts.',
      },
    ],
    feeRules: {
      internal_transfer_same_bank: {
        description: 'Transfer between Discovery accounts',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free',
      },
      interbank_eft: {
        description: 'EFT to other banks on App',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free unlimited digital EFTs',
      },
      immediate_payment_rtc: {
        description: 'Real-time clearance',
        calculateFee: () => 5.0,
        fixedFee: 5.0,
        notes: 'R5.00 flat fee',
      },
      card_purchase: {
        description: 'Card swipe',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free',
      },
    },
  },

  investec: {
    id: 'investec',
    displayName: 'Investec',
    brandColor: '#1A1A1A',
    tagline: 'Private Bank Account',
    popularTiers: [
      {
        tierId: 'private_bank',
        tierName: 'Private Bank Account',
        monthlyFee: 625.0,
        description: 'All-inclusive comprehensive private banking package.',
      },
    ],
    feeRules: {
      internal_transfer_same_bank: {
        description: 'All internal transfers',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free included',
      },
      interbank_eft: {
        description: 'All inter-bank EFTs',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free included in monthly bundle',
      },
      immediate_payment_rtc: {
        description: 'Immediate payment',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free included',
      },
      atm_withdrawal_own: {
        description: 'Local ATM withdrawals (any ATM)',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free at any SASWITCH ATM in South Africa',
      },
      atm_withdrawal_other: {
        description: 'Local ATM withdrawals (any ATM)',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free at any SASWITCH ATM in South Africa',
      },
      card_purchase: {
        description: 'Card swipes & online purchases',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Free',
      },
    },
  },

  other: {
    id: 'other',
    displayName: 'Other South African Institution',
    brandColor: '#6B7280',
    tagline: 'General Bank Account',
    popularTiers: [],
    feeRules: {
      internal_transfer_same_bank: {
        description: 'Internal transfer',
        calculateFee: () => 0,
        fixedFee: 0,
        notes: 'Usually free',
      },
      interbank_eft: {
        description: 'Standard EFT',
        calculateFee: () => 1.5,
        fixedFee: 1.5,
        notes: 'Standard electronic transfer',
      },
      immediate_payment_rtc: {
        description: 'Immediate Clearance Payment',
        calculateFee: () => 10.0,
        fixedFee: 10.0,
        notes: 'Typical RTC charge',
      },
      atm_deposit_own: {
        description: 'Cash deposit',
        calculateFee: (amount) => Math.ceil(amount / 100) * 1.4,
        notes: 'Approx R1.40 per R100',
      },
      retail_till_cashout: {
        description: 'Retailer cash withdrawal',
        calculateFee: () => 2.0,
        fixedFee: 2.0,
        notes: 'Approx R2.00 flat fee',
      },
    },
  },
};

/**
 * Detects the SA Bank Code from account name or institution string
 */
export function identifyBankFromText(text?: string): SABankCode {
  if (!text) return 'other';
  const clean = text.toLowerCase();

  if (clean.includes('standard') || clean.includes('stanbic') || clean.includes('sbux') || clean.includes('sbsa')) {
    return 'standard_bank';
  }
  if (clean.includes('capitec')) {
    return 'capitec';
  }
  if (
    clean.includes('tyme') ||
    clean.includes('time') ||
    clean.includes('gotyme') ||
    clean.includes('go time') ||
    clean.includes('tymebank')
  ) {
    return 'gotyme';
  }
  if (clean.includes('absa')) {
    return 'absa';
  }
  if (clean.includes('fnb') || clean.includes('first national') || clean.includes('firstrand')) {
    return 'fnb';
  }
  if (clean.includes('nedbank')) {
    return 'nedbank';
  }
  if (clean.includes('discovery')) {
    return 'discovery';
  }
  if (clean.includes('investec')) {
    return 'investec';
  }

  return 'other';
}

/**
 * Calculates the exact bank charge for a given transaction
 */
export function calculateBankCharge(params: {
  bankCode?: SABankCode;
  accountName?: string;
  transactionType: TransactionType;
  amount: number;
}): { fee: number; rule: BankFeeRule; profile: BankProfile } {
  const bank = params.bankCode || identifyBankFromText(params.accountName);
  const profile = SA_BANK_PROFILES[bank] || SA_BANK_PROFILES.other;
  const rule =
    profile.feeRules[params.transactionType] ||
    SA_BANK_PROFILES.other.feeRules[params.transactionType] || {
      description: 'Standard transaction',
      calculateFee: () => 0,
      notes: 'No fee charged',
    };

  const fee = Math.max(0, rule.calculateFee(params.amount || 0));
  return { fee, rule, profile };
}

/**
 * Smart advice on how to minimize bank fees in South Africa
 */
export function getCostOptimizationTip(params: {
  sourceBank: SABankCode;
  destBank?: SABankCode;
  amount: number;
  transactionType: TransactionType;
}): string | null {
  const { sourceBank, destBank, amount, transactionType } = params;

  if (transactionType === 'atm_withdrawal_own' || transactionType === 'atm_withdrawal_other') {
    if (sourceBank === 'gotyme') {
      return 'Pro Tip: Cash withdrawals at Pick n Pay & Boxer till counters are 100% FREE with Go Time, saving you R10/R1,000 in ATM fees!';
    }
    if (sourceBank === 'capitec' || sourceBank === 'standard_bank') {
      return 'Pro Tip: Drawing cash at a retail till point (Pick n Pay / Shoprite) costs only ~R1.75 vs R10+ at an ATM.';
    }
  }

  if (transactionType === 'immediate_payment_rtc') {
    return 'Pro Tip: Standard electronic transfers (EFT) are free or R1.00. Immediate payments cost R6 - R45 depending on the bank.';
  }

  if (transactionType === 'retail_cash_deposit' && sourceBank === 'capitec') {
    return 'Capitec charges R1.40 per R100 for cash deposits at both Capitec ATMs and retail till counters (Pick n Pay / Boxer / Shoprite).';
  }

  if (sourceBank === 'standard_bank' && destBank === 'standard_bank') {
    return 'Transfers between Standard Bank accounts (Private, Credit Card, Tax-Free) are instantaneous and 100% free.';
  }

  return null;
}
