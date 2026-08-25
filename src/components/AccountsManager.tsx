import React, { useState, useMemo } from 'react';
import { FinancialAccount, Income, Expense, BudgetCategory, AccountType, BudgetPeriod } from '../types';
import { ACCOUNT_TYPES, SOUTH_AFRICAN_INSTITUTIONS } from '../utils/budgetConstants';
import { formatZAR, formatZARCompact, formatDateNice } from '../utils/southAfricaHolidays';
import { SA_BANK_PROFILES, SABankCode, BankFeeRule } from '../utils/bankChargesEngine';
import { FigmaIcon } from './ui/FigmaIcon';
import {
  CreditCard,
  PiggyBank,
  Sparkles,
  TrendingUp,
  Banknote,
  Home,
  Wallet,
  Car,
  Plus,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Search,
  Filter,
  CheckCircle2,
  Building2,
  History,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
  Flame,
  Percent,
  Calculator,
  Trophy,
  ArrowRightLeft,
  Landmark,
  FileSpreadsheet,
  Info,
} from 'lucide-react';

interface AccountsManagerProps {
  accounts: FinancialAccount[];
  incomes: Income[];
  expenses: Expense[];
  categories: BudgetCategory[];
  periods?: BudgetPeriod[];
  onOpenAddAccountModal: () => void;
  onOpenEditAccountModal: (account: FinancialAccount) => void;
  onDeleteAccount: (accountId: string) => void;
  onOpenAddExpenseModal: () => void;
  onOpenAddIncomeModal: () => void;
  onOpenTransferModal?: (sourceAccountId?: string) => void;
  onOpenAtmDepositModal?: (destinationAccountId?: string) => void;
}

export const AccountsManager: React.FC<AccountsManagerProps> = ({
  accounts,
  incomes,
  expenses,
  categories,
  periods = [],
  onOpenAddAccountModal,
  onOpenEditAccountModal,
  onDeleteAccount,
  onOpenAddExpenseModal,
  onOpenAddIncomeModal,
  onOpenTransferModal,
  onOpenAtmDepositModal,
}) => {
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeLedgerAccount, setActiveLedgerAccount] = useState<FinancialAccount | null>(null);
  const [isBankTariffModalOpen, setIsBankTariffModalOpen] = useState<boolean>(false);
  const [selectedTariffBank, setSelectedTariffBank] = useState<SABankCode>('standard_bank');

  // Category map for quick lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, BudgetCategory>();
    for (const cat of categories) {
      map.set(cat.id, cat);
    }
    return map;
  }, [categories]);

  // Compute live inflows, outflows, and net balances per account
  const accountStats = useMemo(() => {
    const stats: Record<
      string,
      {
        inflowsReceived: number;
        inflowsPlanned: number;
        outflowsActual: number;
        outflowsPlanned: number;
        linkedIncomes: Income[];
        linkedExpenses: Expense[];
        currentBalance: number;
        projectedBalance: number;
        currentOwedBalance: number;
        availableCredit: number;
      }
    > = {};

    for (const acc of accounts) {
      const baseOwed =
        acc.type === 'credit_card' ||
        acc.type === 'loan' ||
        acc.type === 'vehicle_loan' ||
        acc.type === 'home_loan'
          ? (acc.balanceOwed !== undefined ? acc.balanceOwed : acc.openingBalance || 0)
          : acc.openingBalance || 0;

      stats[acc.id] = {
        inflowsReceived: 0,
        inflowsPlanned: 0,
        outflowsActual: 0,
        outflowsPlanned: 0,
        linkedIncomes: [],
        linkedExpenses: [],
        currentBalance: acc.openingBalance || 0,
        projectedBalance: acc.openingBalance || 0,
        currentOwedBalance: baseOwed,
        availableCredit: acc.availableCredit || 0,
      };
    }

    // Incomes linked to accounts
    for (const inc of incomes) {
      const accId = inc.accountId || (accounts.find((a) => a.isDefault)?.id || accounts[0]?.id);
      if (accId && stats[accId]) {
        stats[accId].linkedIncomes.push(inc);
        stats[accId].inflowsPlanned += inc.amount || 0;
        if (inc.status === 'received') {
          stats[accId].inflowsReceived += inc.amount || 0;
        }
      }
    }

    // Expenses linked to accounts
    for (const exp of expenses) {
      const accId = exp.accountId || (accounts.find((a) => a.isDefault)?.id || accounts[0]?.id);
      if (accId && stats[accId]) {
        stats[accId].linkedExpenses.push(exp);
        stats[accId].outflowsActual += exp.amount || 0;
      }
    }

    // Planned expenses from categories default accounts
    for (const cat of categories) {
      if (cat.defaultAccountId && stats[cat.defaultAccountId]) {
        stats[cat.defaultAccountId].outflowsPlanned += cat.allocatedAmount || 0;
      }
    }

    // Calculate authoritative live balances
    for (const acc of accounts) {
      const item = stats[acc.id];
      if (item) {
        const isLiability =
          acc.type === 'credit_card' ||
          acc.type === 'loan' ||
          acc.type === 'vehicle_loan' ||
          acc.type === 'home_loan';

        if (isLiability) {
          // acc.currentBalance or acc.balanceOwed is updated directly by firestoreService with full debt amortization (principal/interest/fee rules)
          const liveOwed =
            acc.currentBalance !== undefined
              ? acc.currentBalance
              : acc.balanceOwed !== undefined
              ? acc.balanceOwed
              : acc.openingBalance || 0;

          item.currentOwedBalance = Math.max(0, liveOwed);
          item.currentBalance = item.currentOwedBalance;
          const limit = acc.creditLimit || (liveOwed > 0 ? liveOwed * 1.5 : 25000);
          item.availableCredit = Math.max(0, limit - liveOwed);
          item.projectedBalance = Math.max(0, liveOwed + item.outflowsPlanned - item.inflowsPlanned);
        } else {
          // For positive/liquid assets: use authoritative currentBalance from Firestore if present, else openingBalance
          const authoritativeBalance =
            acc.currentBalance !== undefined ? acc.currentBalance : acc.openingBalance || 0;

          item.currentBalance = authoritativeBalance;
          item.projectedBalance = authoritativeBalance + item.inflowsPlanned - item.outflowsPlanned;
        }
      }
    }

    return stats;
  }, [accounts, incomes, expenses, categories]);

  // Overall Global Liquidity & Asset breakdown
  const globalSummary = useMemo(() => {
    let totalCashAndCheque = 0;
    let totalSavings = 0;
    let totalTaxFree = 0;
    let totalInvestments = 0;
    let totalCreditCardDebt = 0;
    let totalLoanDebt = 0;
    let totalVehicleDebt = 0;
    let totalBondDebt = 0;
    let totalPropertyAssetValue = 0;
    let totalVehicleAssetValue = 0;

    for (const acc of accounts) {
      const st = accountStats[acc.id];
      const bal = st ? st.currentBalance : acc.openingBalance || 0;

      if (acc.type === 'cheque' || acc.type === 'cash' || acc.type === 'other') {
        totalCashAndCheque += bal;
      } else if (acc.type === 'savings') {
        totalSavings += bal;
      } else if (acc.type === 'tax_free') {
        totalTaxFree += bal;
      } else if (acc.type === 'investment') {
        totalInvestments += bal;
      } else if (acc.type === 'credit_card') {
        const owed = st ? st.currentOwedBalance : acc.balanceOwed || acc.openingBalance || 0;
        totalCreditCardDebt += owed;
      } else if (acc.type === 'loan') {
        const owed = st ? st.currentOwedBalance : acc.balanceOwed || acc.openingBalance || 0;
        totalLoanDebt += owed;
      } else if (acc.type === 'vehicle_loan') {
        const owed = st ? st.currentOwedBalance : acc.balanceOwed || acc.openingBalance || 0;
        totalVehicleDebt += owed;
        if (acc.marketValue) totalVehicleAssetValue += acc.marketValue;
      } else if (acc.type === 'home_loan') {
        const owed = st ? st.currentOwedBalance : acc.balanceOwed || acc.openingBalance || 0;
        totalBondDebt += owed;
        if (acc.marketValue) totalPropertyAssetValue += acc.marketValue;
      }
    }

    const liquidCash = totalCashAndCheque + totalSavings;
    const investedAssets = totalTaxFree + totalInvestments;
    const physicalAssets = totalPropertyAssetValue + totalVehicleAssetValue;
    const totalGrossAssets = liquidCash + investedAssets + physicalAssets;
    const totalLiabilities = totalCreditCardDebt + totalLoanDebt + totalVehicleDebt + totalBondDebt;
    const netWorth = totalGrossAssets - totalLiabilities;

    return {
      liquidCash,
      investedAssets,
      totalTaxFree,
      totalInvestments,
      totalSavings,
      totalCreditCardDebt,
      totalLoanDebt,
      totalVehicleDebt,
      totalBondDebt,
      totalGrossAssets,
      totalLiabilities,
      netWorth,
    };
  }, [accounts, accountStats]);

  // Filtered accounts list
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (selectedTypeFilter !== 'all' && acc.type !== selectedTypeFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = acc.name.toLowerCase().includes(query);
        const matchesBank = (acc.institution || '').toLowerCase().includes(query);
        const matchesNotes = (acc.notes || '').toLowerCase().includes(query);
        const matchesMake = (acc.vehicleMakeModel || '').toLowerCase().includes(query);
        if (!matchesName && !matchesBank && !matchesNotes && !matchesMake) return false;
      }
      return true;
    });
  }, [accounts, selectedTypeFilter, searchTerm]);

  // Ledger transactions for the modal
  const ledgerTransactions = useMemo(() => {
    if (!activeLedgerAccount) return [];
    const st = accountStats[activeLedgerAccount.id];
    if (!st) return [];

    const periodMap = new Map<string, BudgetPeriod>((periods || []).map((p) => [p.id, p]));

    const items: {
      id: string;
      date: string;
      title: string;
      subtitle: string;
      type: 'inflow' | 'outflow';
      amount: number;
      paymentMethod?: string;
      isSettled: boolean;
    }[] = [];

    // Add Incomes
    for (const inc of st.linkedIncomes) {
      const p = inc.periodId ? periodMap.get(inc.periodId) : null;
      items.push({
        id: inc.id,
        date: inc.receivedDate || inc.expectedDate || inc.createdAt,
        title: inc.title || 'Income',
        subtitle: `Income · ${inc.sourceTag || 'General'}${p?.name ? ` · ${p.name}` : ''}`,
        type: 'inflow',
        amount: inc.amount || 0,
        isSettled: inc.status === 'received',
      });
    }

    // Add Expenses
    for (const exp of st.linkedExpenses) {
      const cat = categoryMap.get(exp.categoryId);
      const p = exp.periodId ? periodMap.get(exp.periodId) : null;
      items.push({
        id: exp.id,
        date: exp.date || exp.createdAt,
        title: exp.title || exp.description || cat?.name || 'Expense',
        subtitle: `Expense · ${cat?.name || 'Uncategorized'}${exp.paymentMethod ? ` · ${exp.paymentMethod}` : ''}${p?.name ? ` · ${p.name}` : ''}`,
        type: 'outflow',
        amount: exp.amount || 0,
        paymentMethod: exp.paymentMethod,
        isSettled: true,
      });
    }

    // Sort newest date first
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeLedgerAccount, accountStats, categoryMap, periods]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Liquidity Dashboard */}
      <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-[16px] bg-gradient-to-tr from-[#30D158] to-[#0A84FF] text-black flex items-center justify-center shadow-lg shadow-emerald-950/40 border border-white/20 shrink-0">
              <Building2 className="w-6 h-6" strokeWidth={2.4} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400">
                  Multi-Account Ledger
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-white/10 text-white border border-white/10">
                  {accounts.length} Accounts Configured
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
                Financial Accounts & Net Worth
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time multi-account balances, debts, asset equity & Dave Ramsey alignment
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenTransferModal && (
              <button
                onClick={() => onOpenTransferModal()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold transition active:scale-95 cursor-pointer"
                title="Transfer funds between accounts"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
                <span>Transfer Funds</span>
              </button>
            )}

            {onOpenAtmDepositModal && (
              <button
                onClick={() => onOpenAtmDepositModal()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] bg-[#30D158]/15 hover:bg-[#30D158]/25 text-[#30D158] border border-[#30D158]/30 text-xs font-semibold transition active:scale-95 cursor-pointer"
                title="Log ATM cash deposit into bank account"
              >
                <Landmark className="w-3.5 h-3.5 text-[#30D158]" />
                <span>ATM Cash Deposit</span>
              </button>
            )}

            <button
              onClick={() => setIsBankTariffModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition active:scale-95 cursor-pointer"
              title="View SA Bank Fees & Tariffs (Standard Bank, Capitec, Go Time, Absa)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <span>Bank Charges Guide</span>
            </button>

            <button
              onClick={onOpenAddExpenseModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/10 text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
              <span>Log Expense</span>
            </button>

            <button
              onClick={onOpenAddAccountModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] bg-[#30D158] hover:bg-[#34C759] text-black text-xs font-bold shadow-md shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
              <span>Add Account</span>
            </button>
          </div>
        </div>

        {/* Global Key Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/[0.08]">
          {/* Net Worth */}
          <div className="bg-[#252528] border border-white/5 rounded-[16px] p-3 sm:p-4">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1">
              Estimated Net Worth
            </span>
            <span
              className={`text-base sm:text-xl font-black font-mono tracking-tight ${
                globalSummary.netWorth >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatZAR(globalSummary.netWorth)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-1">
              Gross Assets minus Liabilities
            </span>
          </div>

          {/* Liquid Cash & Savings */}
          <div className="bg-[#252528] border border-white/5 rounded-[16px] p-3 sm:p-4">
            <span className="text-[11px] font-semibold text-emerald-300 block mb-1">
              Liquid Cash & Savings
            </span>
            <span className="text-base sm:text-xl font-black font-mono tracking-tight text-white">
              {formatZAR(globalSummary.liquidCash)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">
              Cheque & Emergency funds
            </span>
          </div>

          {/* Investments & TFSA */}
          <div className="bg-[#252528] border border-white/5 rounded-[16px] p-3 sm:p-4">
            <span className="text-[11px] font-semibold text-purple-300 block mb-1">
              Investments & TFSA
            </span>
            <span className="text-base sm:text-xl font-black font-mono tracking-tight text-purple-300">
              {formatZAR(globalSummary.investedAssets)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">
              Equities, Portfolios & Caps
            </span>
          </div>

          {/* Total Liabilities / Debts */}
          <div className="bg-[#252528] border border-white/5 rounded-[16px] p-3 sm:p-4">
            <span className="text-[11px] font-semibold text-rose-400 block mb-1">
              Total Debt Liabilities
            </span>
            <span className="text-base sm:text-xl font-black font-mono tracking-tight text-rose-400">
              {formatZAR(globalSummary.totalLiabilities)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">
              CC, Loans, Vehicle & Bond
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Type Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedTypeFilter('all')}
            className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold transition cursor-pointer ${
              selectedTypeFilter === 'all'
                ? 'bg-white text-black font-bold'
                : 'bg-[#252528] text-slate-400 hover:text-white'
            }`}
          >
            All Accounts ({accounts.length})
          </button>
          {ACCOUNT_TYPES.map((t) => {
            const count = accounts.filter((a) => a.type === t.id).length;
            if (count === 0 && selectedTypeFilter !== t.id) return null;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTypeFilter(t.id)}
                className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  selectedTypeFilter === t.id
                    ? 'bg-white text-black font-bold'
                    : 'bg-[#252528] text-slate-400 hover:text-white'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                <span>
                  {t.shortLabel} ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search accounts & banks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1C1C1E] border border-white/10 text-white pl-9 pr-3 py-1.5 rounded-[12px] text-xs focus:outline-none focus:ring-1 focus:ring-[#30D158]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Account Cards Grid */}
      {filteredAccounts.length === 0 ? (
        <div className="bg-[#1C1C1E] border border-white/5 rounded-[24px] p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Accounts Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            {searchTerm
              ? `No accounts matched your search "${searchTerm}".`
              : 'Add your cheque, savings, TFSA, credit card, or vehicle loan accounts to begin tracking.'}
          </p>
          <button
            onClick={onOpenAddAccountModal}
            className="px-4 py-2 rounded-[12px] bg-[#30D158] hover:bg-[#34C759] text-black text-xs font-bold transition cursor-pointer"
          >
            Create First Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map((acc) => {
            const typeConf = ACCOUNT_TYPES.find((t) => t.id === acc.type) || ACCOUNT_TYPES[0];
            const st = accountStats[acc.id] || {
              currentBalance: acc.openingBalance || 0,
              currentOwedBalance: acc.balanceOwed || acc.openingBalance || 0,
              inflowsReceived: 0,
              outflowsActual: 0,
              availableCredit: acc.availableCredit || 0,
            };

            const isCreditCard = acc.type === 'credit_card';
            const isHomeBond = acc.type === 'home_loan';
            const isVehicleLoan = acc.type === 'vehicle_loan';
            const isLoan = acc.type === 'loan';
            const isLiability = isCreditCard || isHomeBond || isVehicleLoan || isLoan;
            const isTaxFree = acc.type === 'tax_free';
            const isInvestment = acc.type === 'investment';

            const owed = isLiability ? st.currentOwedBalance : 0;
            const limit = acc.creditLimit || (owed > 0 ? owed * 1.5 : 25000);
            const avail = isCreditCard ? Math.max(0, limit - owed) : 0;
            const utilizationPercent = limit > 0 ? Math.min(100, (owed / limit) * 100) : 0;

            const feeAmount = acc.monthlyFee !== undefined ? acc.monthlyFee : 0;
            const minPaymentEst =
              acc.minimumPaymentAmount ||
              (owed > 0
                ? Math.round(
                    Math.max(
                      100,
                      owed * ((acc.minimumPaymentPercentage || 3.0) / 100) + feeAmount
                    )
                  )
                : 0);

            // TFSA calculations
            const tfsaYtd = acc.ytdContribution || 0;
            const tfsaAllowanceRemain = Math.max(0, 36000 - tfsaYtd);

            // Bond calculations
            const bondHomeEquity = Math.max(0, (acc.marketValue || 0) - owed);
            const bondLtv =
              acc.marketValue && acc.marketValue > 0 ? (owed / acc.marketValue) * 100 : 0;

            // Vehicle calculations
            const vehicleEquity = (acc.marketValue || 0) - owed;

            return (
              <div
                key={acc.id}
                className="bg-[#1C1C1E] border border-white/[0.08] hover:border-white/20 rounded-[22px] p-5 flex flex-col justify-between shadow-lg transition-all relative overflow-hidden group"
              >
                {/* Header Strip */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-[14px] flex items-center justify-center text-white shadow-md shrink-0"
                      style={{ backgroundColor: acc.color || typeConf.color }}
                    >
                      {acc.type === 'cash' && <Banknote className="w-5 h-5" />}
                      {acc.type === 'cheque' && <CreditCard className="w-5 h-5" />}
                      {acc.type === 'savings' && <PiggyBank className="w-5 h-5" />}
                      {acc.type === 'tax_free' && <Sparkles className="w-5 h-5" />}
                      {acc.type === 'investment' && <TrendingUp className="w-5 h-5" />}
                      {acc.type === 'credit_card' && <CreditCard className="w-5 h-5" />}
                      {acc.type === 'loan' && <Wallet className="w-5 h-5" />}
                      {acc.type === 'vehicle_loan' && <Car className="w-5 h-5" />}
                      {acc.type === 'home_loan' && <Home className="w-5 h-5" />}
                      {acc.type === 'other' && <Wallet className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-white truncate">{acc.name}</h3>
                        {acc.isDefault && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 shrink-0">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {acc.institution || typeConf.label}
                        {acc.accountNumberMask ? ` · ${acc.accountNumberMask}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Actions Dropdown / Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onOpenEditAccountModal(acc)}
                      className="p-1.5 rounded-[8px] bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                      title="Edit Account"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `Are you sure you want to delete "${acc.name}"? Linked debts will also be unlinked.`
                          )
                        ) {
                          onDeleteAccount(acc.id);
                        }
                      }}
                      className="p-1.5 rounded-[8px] bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition cursor-pointer"
                      title="Delete Account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Main Body */}
                <div className="flex-1">
                  {/* Balance Display */}
                  <div className="mb-3">
                    <span className="text-[10px] font-semibold tracking-wide uppercase text-slate-500 block">
                      {isLiability ? 'Current Balance Owed' : 'Live Liquid Balance'}
                    </span>
                    <div
                      className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                        isLiability
                          ? 'text-rose-400'
                          : st.currentBalance >= 0
                          ? 'text-white'
                          : 'text-rose-400'
                      }`}
                    >
                      {isLiability ? `-${formatZAR(owed)}` : formatZAR(st.currentBalance)}
                    </div>

                    {acc.notes && (
                      <p className="text-[11px] text-slate-400 mt-1 italic line-clamp-1">
                        {acc.notes}
                      </p>
                    )}
                  </div>

                  {/* Baby Step Linked Badge */}
                  {acc.babyStepAssignment && (
                    <div className="mb-3 px-2.5 py-1 rounded-[10px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                        <Trophy className="w-3.5 h-3.5 text-[#FF9F0A]" />
                        <span>
                          {acc.babyStepAssignment === 1 && 'Step 1: Starter Emergency Fund'}
                          {acc.babyStepAssignment === 3 && 'Step 3: 3–6 Mo Emergency Reserve'}
                          {acc.babyStepAssignment === 4 && 'Step 4: 15% Retirement & Investing'}
                          {acc.babyStepAssignment === 5 && 'Step 5: Children’s College Fund'}
                          {acc.babyStepAssignment === 6 && 'Step 6: Pay Off Home Bond Early'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-400">Step {acc.babyStepAssignment}</span>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* CREDIT CARD SPECIFIC DETAILS & AVAILABLE CREDIT BAR                       */}
                  {/* ========================================================================= */}
                  {isCreditCard && (
                    <div className="space-y-2 mb-3 p-2.5 rounded-[12px] bg-black/30 border border-white/5 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Available to spend:</span>
                        <span className="font-bold font-mono text-emerald-400">
                          {formatZAR(avail)} / {formatZARCompact(limit)} Limit
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            utilizationPercent > 80
                              ? 'bg-red-500'
                              : utilizationPercent > 50
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                          style={{ width: `${utilizationPercent}%` }}
                        />
                      </div>

                      {/* Financial rates & fees */}
                      <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] text-slate-400 border-t border-white/5">
                        <div>
                          <span className="block text-slate-500">Interest</span>
                          <span className="font-bold text-white font-mono">
                            {acc.interestRate || 21.75}%
                          </span>
                        </div>
                        <div>
                          <span className="block text-slate-500">Admin Fee</span>
                          <span className="font-bold text-white font-mono">
                            {feeAmount === 0 ? 'R0/mo' : `${formatZAR(feeAmount)}/mo`}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block text-slate-500">Min Est.</span>
                          <span className="font-bold text-rose-400 font-mono">
                            {formatZARCompact(minPaymentEst)}/mo
                          </span>
                        </div>
                      </div>

                      {/* Snowball Badge */}
                      <div className="flex items-center gap-1 text-[10px] text-rose-300 font-semibold pt-1 border-t border-white/5">
                        <Flame className="w-3 h-3 text-red-400" />
                        <span>Synced to Baby Step 2 Debt Snowball</span>
                      </div>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* HOME LOAN / MORTGAGE BOND (BABY STEP 6)                                   */}
                  {/* ========================================================================= */}
                  {isHomeBond && (
                    <div className="space-y-2 mb-3 p-2.5 rounded-[12px] bg-indigo-500/10 border border-indigo-500/20 text-xs">
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Property Market Value</span>
                          <span className="font-bold font-mono text-emerald-400">
                            {acc.marketValue ? formatZAR(acc.marketValue) : 'Not Specified'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block text-[10px]">Home Equity Built</span>
                          <span className="font-bold font-mono text-emerald-300">
                            {formatZAR(bondHomeEquity)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] text-slate-400 border-t border-indigo-500/20">
                        <div>
                          <span className="block text-slate-500">Interest</span>
                          <span className="font-bold text-white font-mono">
                            {acc.interestRate || 11.75}%
                          </span>
                        </div>
                        <div>
                          <span className="block text-slate-500">LTV Ratio</span>
                          <span className="font-bold text-indigo-300 font-mono">
                            {bondLtv > 0 ? `${bondLtv.toFixed(1)}%` : '—'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block text-slate-500">Installment</span>
                          <span className="font-bold text-white font-mono">
                            {acc.manualMonthlyInstallment
                              ? formatZARCompact(acc.manualMonthlyInstallment)
                              : acc.monthlyInstallment
                              ? formatZARCompact(acc.monthlyInstallment)
                              : '—'}
                            /mo
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-indigo-300 font-semibold pt-1 border-t border-indigo-500/20">
                        <Home className="w-3 h-3 text-indigo-400" />
                        <span>Baby Step 6: Home Bond Payoff</span>
                      </div>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* VEHICLE FINANCE / CAR LOAN                                                */}
                  {/* ========================================================================= */}
                  {isVehicleLoan && (
                    <div className="space-y-2 mb-3 p-2.5 rounded-[12px] bg-rose-500/10 border border-rose-500/20 text-xs">
                      {acc.vehicleMakeModel && (
                        <div className="text-xs font-bold text-white truncate">
                          {acc.vehicleMakeModel}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Trade-In / Selling Value</span>
                          <span className="font-bold font-mono text-emerald-400">
                            {acc.marketValue ? formatZAR(acc.marketValue) : 'Not Specified'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block text-[10px]">Vehicle Equity</span>
                          <span
                            className={`font-bold font-mono ${
                              vehicleEquity >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {vehicleEquity >= 0
                              ? `+${formatZAR(vehicleEquity)}`
                              : `-${formatZAR(Math.abs(vehicleEquity))}`}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] text-slate-400 border-t border-rose-500/20">
                        <div>
                          <span className="block text-slate-500">Interest</span>
                          <span className="font-bold text-white font-mono">
                            {acc.interestRate || 12.5}%
                          </span>
                        </div>
                        <div>
                          <span className="block text-slate-500">Balloon Residual</span>
                          <span className="font-bold text-amber-400 font-mono">
                            {acc.balloonAmount ? formatZARCompact(acc.balloonAmount) : 'None'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block text-slate-500">Installment</span>
                          <span className="font-bold text-white font-mono">
                            {acc.manualMonthlyInstallment
                              ? formatZARCompact(acc.manualMonthlyInstallment)
                              : acc.monthlyInstallment
                              ? formatZARCompact(acc.monthlyInstallment)
                              : '—'}
                            /mo
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-rose-300 font-semibold pt-1 border-t border-rose-500/20">
                        <Flame className="w-3 h-3 text-red-400" />
                        <span>Synced to Baby Step 2 Debt Snowball</span>
                      </div>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* PERSONAL LOAN / STORE CARD / OVERDRAFT                                    */}
                  {/* ========================================================================= */}
                  {isLoan && (
                    <div className="space-y-2 mb-3 p-2.5 rounded-[12px] bg-black/30 border border-white/5 text-xs">
                      <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-400">
                        <div>
                          <span className="block text-slate-500">Interest</span>
                          <span className="font-bold text-white font-mono">
                            {acc.interestRate || 18.5}%
                          </span>
                        </div>
                        <div>
                          <span className="block text-slate-500">Admin Fee</span>
                          <span className="font-bold text-white font-mono">
                            {feeAmount === 0 ? 'R0/mo' : `${formatZAR(feeAmount)}/mo`}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block text-slate-500">Installment</span>
                          <span className="font-bold text-white font-mono">
                            {acc.manualMonthlyInstallment
                              ? formatZARCompact(acc.manualMonthlyInstallment)
                              : acc.monthlyInstallment
                              ? formatZARCompact(acc.monthlyInstallment)
                              : '—'}
                            /mo
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-rose-300 font-semibold pt-1 border-t border-white/5">
                        <Flame className="w-3 h-3 text-red-400" />
                        <span>Synced to Baby Step 2 Debt Snowball</span>
                      </div>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* TAX-FREE (TFSA) SPECIFIC STATS                                            */}
                  {/* ========================================================================= */}
                  {isTaxFree && (
                    <div className="space-y-1.5 mb-3 p-2.5 rounded-[12px] bg-purple-500/10 border border-purple-500/20 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-purple-300 font-semibold">SARS R36k Annual Cap:</span>
                        <span className="font-bold font-mono text-white">
                          {formatZARCompact(tfsaYtd)} used
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-purple-400 rounded-full"
                          style={{ width: `${Math.min(100, (tfsaYtd / 36000) * 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-purple-200">
                        <span>Remaining room this tax year:</span>
                        <span className="font-bold font-mono text-emerald-400">
                          {formatZAR(tfsaAllowanceRemain)}
                        </span>
                      </div>
                      {acc.expectedAnnualReturn && (
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-purple-500/20 flex justify-between">
                          <span>Target Growth:</span>
                          <span className="font-bold text-purple-300 font-mono">
                            {acc.expectedAnnualReturn}% p.a.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* INVESTMENT SPECIFIC STATS                                                 */}
                  {/* ========================================================================= */}
                  {isInvestment && acc.expectedAnnualReturn && (
                    <div className="mb-3 p-2.5 rounded-[12px] bg-amber-500/10 border border-amber-500/20 text-[11px] grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Expected Return</span>
                        <span className="font-bold font-mono text-amber-300">
                          {acc.expectedAnnualReturn}% p.a.
                        </span>
                      </div>
                      {acc.monthlyContribution && (
                        <div className="text-right">
                          <span className="text-slate-400 block text-[10px]">Monthly Deposit</span>
                          <span className="font-bold font-mono text-emerald-400">
                            {formatZAR(acc.monthlyContribution)}/mo
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inflow vs Outflow Mini Summary for Accounts */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="bg-black/30 p-2 rounded-[10px] border border-white/5">
                      <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-semibold mb-0.5">
                        <ArrowDownLeft className="w-3 h-3" />
                        <span>Inflows Received</span>
                      </div>
                      <span className="font-mono font-bold text-white text-xs sm:text-sm">
                        {formatZAR(st.inflowsReceived)}
                      </span>
                    </div>

                    <div className="bg-black/30 p-2 rounded-[10px] border border-white/5">
                      <div className="flex items-center gap-1 text-rose-400 text-[10px] font-semibold mb-0.5">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>Outflows Paid</span>
                      </div>
                      <span className="font-mono font-bold text-white text-xs sm:text-sm">
                        {formatZAR(st.outflowsActual)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action to open Ledger */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <button
                    onClick={() => setActiveLedgerAccount(acc)}
                    className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-emerald-400" />
                    <span>View Account Ledger ({st.linkedIncomes.length + st.linkedExpenses.length})</span>
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Account Ledger Modal */}
      {activeLedgerAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-[24px] max-w-2xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[88vh]">
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#252528]">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-[14px] flex items-center justify-center text-white shadow-md shrink-0"
                  style={{ backgroundColor: activeLedgerAccount.color || '#30D158' }}
                >
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                    {activeLedgerAccount.name} Ledger
                  </h2>
                  <p className="text-xs text-slate-400">
                    {activeLedgerAccount.institution || 'Financial Account'} · Statement Entries
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveLedgerAccount(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-3">
              {ledgerTransactions.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-xs text-slate-400">
                    No incomes or expenses linked to this account yet.
                  </p>
                </div>
              ) : (
                ledgerTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-[14px] bg-[#252528] border border-white/5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          tx.type === 'inflow'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {tx.type === 'inflow' ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{tx.title}</div>
                        <div className="text-[10px] text-slate-400">
                          {tx.subtitle} · {formatDateNice(tx.date)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-xs font-bold font-mono ${
                          tx.type === 'inflow' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {tx.type === 'inflow' ? `+${formatZAR(tx.amount)}` : `-${formatZAR(tx.amount)}`}
                      </div>
                      <span className="text-[9px] text-slate-500">
                        {tx.isSettled ? 'Cleared' : 'Planned'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* SA Bank Charges & Tariffs Guide Modal */}
      {isBankTariffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-t-[28px] sm:rounded-[26px] max-w-2xl w-full p-5 sm:p-6 shadow-2xl my-0 sm:my-8 text-white max-h-[90vh] overflow-y-auto">
            
            {/* Grabber */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3 sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[14px] bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    South African Bank Charges & Tariffs (2025/2026)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Transparent fee breakdown for your configured banks and accounts
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsBankTariffModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bank Selector Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-3 border-b border-white/[0.06] scrollbar-none">
              {(['standard_bank', 'capitec', 'gotyme', 'absa', 'fnb', 'nedbank', 'discovery'] as SABankCode[]).map(
                (code) => {
                  const prof = SA_BANK_PROFILES[code];
                  const isSelected = selectedTariffBank === code;
                  return (
                    <button
                      key={code}
                      onClick={() => setSelectedTariffBank(code)}
                      className={`px-3 py-1.5 rounded-[12px] text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'bg-white text-black shadow-md'
                          : 'bg-[#2C2C2E] text-slate-400 hover:text-white border border-white/5'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: prof.brandColor }} />
                      <span>{prof.displayName}</span>
                    </button>
                  );
                }
              )}
            </div>

            {/* Active Bank Profile Details */}
            {(() => {
              const activeProf = SA_BANK_PROFILES[selectedTariffBank] || SA_BANK_PROFILES.standard_bank;
              return (
                <div className="mt-4 space-y-4">
                  {/* Bank Header Card */}
                  <div
                    className="p-4 rounded-[18px] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    style={{ backgroundColor: `${activeProf.brandColor}15` }}
                  >
                    <div>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-white inline-block mb-1"
                        style={{ backgroundColor: activeProf.brandColor }}
                      >
                        {activeProf.displayName}
                      </span>
                      <h4 className="text-base font-bold text-white">{activeProf.tagline}</h4>
                    </div>
                  </div>

                  {/* Popular Account Tiers */}
                  {activeProf.popularTiers.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                        Account Tiers & Monthly Admin Fees
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {activeProf.popularTiers.map((tier) => (
                          <div
                            key={tier.tierId}
                            className="bg-[#2C2C2E]/80 border border-white/10 rounded-[14px] p-3 space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">{tier.tierName}</span>
                              <span className="text-xs font-mono font-bold text-amber-400">
                                {tier.monthlyFee === 0 ? 'R0.00 / mo' : `${formatZAR(tier.monthlyFee)} / mo`}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              {tier.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transaction Fee Schedule */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Transaction Fee Schedule
                    </h5>
                    <div className="bg-[#252528] border border-white/10 rounded-[16px] divide-y divide-white/[0.06] overflow-hidden text-xs">
                      {(Object.entries(activeProf.feeRules) as [string, BankFeeRule | undefined][]).map(([txKey, rule]) => (
                        <div key={txKey} className="p-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-200">{rule?.description}</p>
                            {rule?.notes && (
                              <p className="text-[11px] text-slate-400 mt-0.5">{rule.notes}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0 font-mono font-bold">
                            {rule?.fixedFee !== undefined && rule.fixedFee === 0 ? (
                              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[10px]">
                                FREE (R0.00)
                              </span>
                            ) : rule?.fixedFee !== undefined ? (
                              <span className="text-amber-400">{formatZAR(rule.fixedFee)}</span>
                            ) : (
                              <span className="text-slate-300 text-[11px]">Dynamic Fee</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pro Tip */}
                  <div className="p-3.5 bg-sky-500/10 border border-sky-500/20 rounded-[14px] flex items-start gap-2 text-xs text-sky-200">
                    <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-white">Smart Zero-Based Tip:</span>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                        To eliminate bank charges, use Standard EFT for scheduled envelope transfers, draw cash at retail till points (Pick n Pay / Boxer) instead of SASWITCH ATMs, and keep daily funds in high-interest accounts like Go Time GoalSave or Capitec.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Footer */}
            <div className="mt-5 pt-3 border-t border-white/[0.08] flex justify-end">
              <button
                onClick={() => setIsBankTariffModalOpen(false)}
                className="px-5 py-2 rounded-[12px] bg-white hover:bg-slate-200 text-black font-bold text-xs transition cursor-pointer"
              >
                Close Guide
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
