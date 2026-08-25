import React, { useState, useMemo } from 'react';
import { Expense, Income, FinancialAccount, BudgetCategory, BudgetPeriod, Debt } from '../types';
import { formatZAR, formatDateNice } from '../utils/southAfricaHolidays';
import { isExternalIncome } from '../utils/budgetConstants';
import { Search, Filter, ArrowUpRight, ArrowDownLeft, Calendar, Tag, CreditCard, ExternalLink, Trash2, History, Layers, Target, ArrowRightLeft } from 'lucide-react';

interface TransactionsViewProps {
  expenses: Expense[];
  incomes: Income[];
  accounts: FinancialAccount[];
  categories: BudgetCategory[];
  debts?: Debt[];
  periods?: BudgetPeriod[];
  currentPeriodId?: string;
  onDeleteExpense: (id: string) => void;
  onDeleteIncome: (id: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  expenses,
  incomes,
  accounts,
  categories,
  debts = [],
  periods = [],
  currentPeriodId,
  onDeleteExpense,
  onDeleteIncome,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'debt_payment' | 'transfer'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'last_week'>('all');
  const [selectedCycleId, setSelectedCycleId] = useState<string>('all');

  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const debtMap = useMemo(() => new Map((debts || []).map(d => [d.id, d])), [debts]);
  const periodMap = useMemo(() => new Map(periods.map(p => [p.id, p])), [periods]);

  // Spending & Income metrics calculation
  const metrics = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const startOfWeek = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfWeek);
    endOfLastWeek.setSeconds(-1);

    let todaySpending = 0;
    let yesterdaySpending = 0;
    let weekSpending = 0;
    let filteredTotal = 0;
    let totalSettledIncome = 0;

    expenses.forEach(exp => {
      const expDate = new Date(exp.date);
      const expDateStr = exp.date?.split('T')[0];
      
      // Global metrics (always real-time)
      if (expDateStr === todayStr) {
        todaySpending += exp.amount || 0;
      }
      if (expDateStr === yesterdayStr) {
        yesterdaySpending += exp.amount || 0;
      }
      if (expDate >= startOfWeek) {
        weekSpending += exp.amount || 0;
      }

      // Check if this expense matches selected cycle filter
      const matchesCycle = selectedCycleId === 'all' || exp.periodId === selectedCycleId;
      if (matchesCycle) {
        filteredTotal += exp.amount || 0;
      }
    });

    incomes.filter(i => i.status === 'received' && isExternalIncome(i)).forEach(inc => {
      const matchesCycle = selectedCycleId === 'all' || inc.periodId === selectedCycleId;
      if (matchesCycle) {
        totalSettledIncome += inc.amount || 0;
      }
    });

    return {
      today: todaySpending,
      yesterday: yesterdaySpending,
      week: weekSpending,
      total: filteredTotal,
      totalIncome: totalSettledIncome,
      boundaries: {
        todayStr,
        yesterdayStr,
        startOfWeek,
        startOfLastWeek,
        endOfLastWeek
      }
    };
  }, [expenses, incomes, selectedCycleId]);

  const allTransactions = useMemo(() => {
    // Only incomes with status === 'received' are settled ledger transactions
    const settledIncomes = incomes.filter(inc => inc.status === 'received');
    const combined: (any & { txType: 'income' | 'expense' })[] = [
      ...settledIncomes.map(inc => ({ ...inc, txType: 'income' as const })),
      ...expenses.map(exp => ({ ...exp, txType: 'expense' as const })),
    ];

    return combined.sort((a, b) => {
      const dateA = new Date(a.date || a.receivedDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.date || b.receivedDate || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [incomes, expenses]);

  const filteredTransactions = useMemo(() => {
    const { boundaries } = metrics;

    return allTransactions.filter(tx => {
      // 1. Cycle filter
      if (selectedCycleId !== 'all' && tx.periodId !== selectedCycleId) {
        return false;
      }

      // 2. Search filter
      const titleText = tx.title || tx.merchant || tx.source || tx.sourceTag || '';
      const notesText = tx.notes || '';
      const accText = accountMap.get(tx.accountId)?.name || '';
      const catText = categoryMap.get(tx.categoryId)?.name || '';
      const searchTarget = `${titleText} ${notesText} ${accText} ${catText}`.toLowerCase();
      if (searchTerm.trim() && !searchTarget.includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // 3. Type filter
      if (filterType === 'expense' && tx.txType !== 'expense') return false;
      if (filterType === 'income' && tx.txType !== 'income') return false;
      if (filterType === 'debt_payment' && !tx.linkedDebtId) return false;
      if (filterType === 'transfer' && !tx.transferId && !tx.targetAccountId && tx.sourceTag !== 'Internal Transfer') return false;

      // 4. Time filter
      const txDateStr = (tx.date || tx.receivedDate || tx.createdAt || '').split('T')[0];
      const txDate = new Date(txDateStr || 0);

      if (timeFilter === 'today') {
        return txDateStr === boundaries.todayStr;
      } else if (timeFilter === 'yesterday') {
        return txDateStr === boundaries.yesterdayStr;
      } else if (timeFilter === 'week') {
        return txDate >= boundaries.startOfWeek;
      } else if (timeFilter === 'last_week') {
        return txDate >= boundaries.startOfLastWeek && txDate <= boundaries.endOfLastWeek;
      }
      
      return true;
    });
  }, [allTransactions, searchTerm, filterType, timeFilter, selectedCycleId, metrics, accountMap, categoryMap]);

  // Category breakdown for current filtered view
  const categoryBreakdown = useMemo(() => {
    const breakdown = new Map<string, number>();
    filteredTransactions.forEach(tx => {
      if (tx.txType === 'expense' && tx.categoryId) {
        const current = breakdown.get(tx.categoryId) || 0;
        breakdown.set(tx.categoryId, current + (tx.amount || 0));
      }
    });

    return Array.from(breakdown.entries())
      .map(([id, amount]) => ({
        id,
        name: categoryMap.get(id)?.name || 'Uncategorized',
        amount
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, categoryMap]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Spending & Income Metrics Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-4 shadow-sm hover:border-[#FF453A]/40 transition group">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 group-hover:text-slate-400 transition">Today's Spending</p>
          <p className="text-xl font-bold font-mono text-[#FF453A]">{formatZAR(metrics.today)}</p>
        </div>
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-4 shadow-sm hover:border-[#30D158]/40 transition group">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 group-hover:text-slate-400 transition">This Week Spent</p>
          <p className="text-xl font-bold font-mono text-[#30D158]">{formatZAR(metrics.week)}</p>
        </div>
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-4 shadow-sm hover:border-emerald-500/40 transition group">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 group-hover:text-slate-400 transition">
            {selectedCycleId === 'all' ? 'All Received Income' : 'Cycle Received Income'}
          </p>
          <p className="text-xl font-bold font-mono text-[#30D158]">+{formatZAR(metrics.totalIncome)}</p>
        </div>
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-4 shadow-sm hover:border-sky-500/40 transition group">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 group-hover:text-slate-400 transition">
            {selectedCycleId === 'all' ? 'All-Time Spending' : 'Cycle Spending'}
          </p>
          <p className="text-xl font-bold font-mono text-white">{formatZAR(metrics.total)}</p>
        </div>
      </div>

      {/* Category Spending Matrix (for current filter) */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Spending by Category</h3>
            <span className="text-[10px] text-slate-500 font-medium">Filtered View ({categoryBreakdown.length} categories)</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {categoryBreakdown.map((item) => (
              <div key={item.id} className="shrink-0 px-3 py-2 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{item.name}</span>
                <span className="text-sm font-bold font-mono text-white">{formatZAR(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Transactions Ledger</h2>
          <p className="text-sm text-slate-400">Complete history of all income and expenses across accounts and pay cycles</p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          {/* Cycle Selector Dropdown */}
          {periods.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#1C1C1E] border border-white/10 rounded-xl px-2.5 py-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedCycleId}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#1C1C1E] text-white">All Pay Cycles</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#1C1C1E] text-white">
                    {p.name} {p.id === currentPeriodId ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Time Filter Tabs */}
          <div className="flex bg-[#1C1C1E] border border-white/10 rounded-xl p-1 overflow-x-auto">
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${timeFilter === 'all' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              All Dates
            </button>
            <button
              onClick={() => setTimeFilter('today')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${timeFilter === 'today' ? 'bg-[#FF453A]/20 text-[#FF453A]' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeFilter('yesterday')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${timeFilter === 'yesterday' ? 'bg-[#FF9F0A]/20 text-[#FF9F0A]' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setTimeFilter('week')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${timeFilter === 'week' ? 'bg-[#30D158]/20 text-[#30D158]' : 'text-slate-500 hover:text-slate-300'}`}
            >
              This Week
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#1C1C1E] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#30D158] w-full sm:w-48"
            />
          </div>

          {/* Type Filter */}
          <div className="flex bg-[#1C1C1E] border border-white/10 rounded-xl p-1 overflow-x-auto flex-wrap gap-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${filterType === 'all' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${filterType === 'expense' ? 'bg-red-500/20 text-red-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Expenses
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${filterType === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Incomes
            </button>
            <button
              onClick={() => setFilterType('debt_payment')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap flex items-center gap-1 cursor-pointer ${filterType === 'debt_payment' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Target className="w-3 h-3 text-amber-400" />
              <span>Debt Payments</span>
            </button>
            <button
              onClick={() => setFilterType('transfer')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap flex items-center gap-1 cursor-pointer ${filterType === 'transfer' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <ArrowRightLeft className="w-3 h-3 text-sky-400" />
              <span>Transfers</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-[#1C1C1E] border border-white/10 rounded-[24px] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-white/10">
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">Transaction</th>
                <th className="py-4 px-6">Category / Account</th>
                <th className="py-4 px-6">Pay Cycle</th>
                <th className="py-4 px-6 text-right">Amount</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredTransactions.map((tx) => {
                const acc = tx.accountId ? accountMap.get(tx.accountId) : null;
                const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : null;
                const period = tx.periodId ? periodMap.get(tx.periodId) : null;
                const linkedDebt = tx.linkedDebtId ? debtMap.get(tx.linkedDebtId) : null;
                const isExpense = tx.txType === 'expense';
                const isDebtPayoff =
                  tx.incomeClassification === 'debt_payment_deposit' ||
                  Boolean(tx.linkedDebtId) ||
                  Boolean(tx.debtPaymentType) ||
                  tx.sourceTag === 'Debt Payoff';
                const isTransfer =
                  tx.incomeClassification === 'internal_transfer' ||
                  (!isDebtPayoff && (Boolean(tx.transferId) || Boolean(tx.targetAccountId) || tx.isTransfer || tx.sourceTag === 'Internal Transfer'));
                const txDate = tx.date || tx.receivedDate || tx.createdAt;

                return (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          linkedDebt || isDebtPayoff
                            ? 'bg-amber-500/10 text-amber-400'
                            : isTransfer
                            ? 'bg-sky-500/10 text-sky-400'
                            : isExpense
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {linkedDebt || isDebtPayoff ? (
                            <Target className="w-4 h-4" />
                          ) : isTransfer ? (
                            <ArrowRightLeft className="w-4 h-4" />
                          ) : isExpense ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{formatDateNice(txDate)}</p>
                          <p className="text-[10px] text-slate-500 font-mono">#{tx.id.split('_').pop()?.slice(-4)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-200">
                            {tx.title || tx.merchant || tx.source || tx.sourceTag || (isExpense ? 'Expense' : 'Income')}
                          </p>
                          {(linkedDebt || isDebtPayoff) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                              <Target className="w-2.5 h-2.5" />
                              <span>{linkedDebt ? `Debt: ${linkedDebt.name}` : 'Debt Payment Deposit'}</span>
                            </span>
                          )}
                          {isTransfer && !linkedDebt && !isDebtPayoff && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                              <ArrowRightLeft className="w-2.5 h-2.5" />
                              <span>{isExpense ? 'Transfer Out (Expense)' : 'Transfer In (Deposit)'}</span>
                            </span>
                          )}
                        </div>
                        {tx.principalReduction !== undefined && tx.principalReduction > 0 && (
                          <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
                            Principal Reduced: {formatZAR(tx.principalReduction)}
                            {tx.interestCharged ? ` · Interest: ${formatZAR(tx.interestCharged)}` : ''}
                            {tx.feesCharged ? ` · Fee: ${formatZAR(tx.feesCharged)}` : ''}
                          </p>
                        )}
                        {tx.notes && <p className="text-[11px] text-slate-500 truncate max-w-[220px] mt-0.5">{tx.notes}</p>}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        {isTransfer ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-sky-300">
                            <ArrowRightLeft className="w-3 h-3 text-sky-400" />
                            <span className="font-semibold">Transfer</span>
                          </div>
                        ) : cat ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                            <Tag className="w-3 h-3 text-slate-500" />
                            <span>{cat.name}</span>
                          </div>
                        ) : null}
                        {acc && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <CreditCard className="w-3 h-3 text-slate-600" />
                            <span>{acc.name}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[11px] text-slate-400 font-medium px-2 py-0.5 bg-white/5 rounded-md border border-white/5">
                        {period?.name || 'Pay Cycle'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className={`text-sm font-mono font-bold ${isExpense ? 'text-[#FF453A]' : 'text-[#30D158]'}`}>
                        {isExpense ? '-' : '+'}{formatZAR(tx.amount || 0)}
                      </span>
                      {tx.accountBalanceAtTransactionTime !== undefined && (
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          Bal: {formatZAR(tx.accountBalanceAtTransactionTime)}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => isExpense ? onDeleteExpense(tx.id) : onDeleteIncome(tx.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-semibold">No transactions found matching your criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

