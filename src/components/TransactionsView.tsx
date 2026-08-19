import React, { useState, useMemo } from 'react';
import { Expense, Income, FinancialAccount, BudgetCategory } from '../types';
import { formatZAR, formatDateNice } from '../utils/southAfricaHolidays';
import { FigmaIcon } from './ui/FigmaIcon';
import { Search, Filter, ArrowUpRight, ArrowDownLeft, Calendar, Tag, CreditCard, ExternalLink, Trash2, History } from 'lucide-react';

interface TransactionsViewProps {
  expenses: Expense[];
  incomes: Income[];
  accounts: FinancialAccount[];
  categories: BudgetCategory[];
  onDeleteExpense: (id: string) => void;
  onDeleteIncome: (id: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  expenses,
  incomes,
  accounts,
  categories,
  onDeleteExpense,
  onDeleteIncome,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'last_week'>('all');

  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  // Spending metrics calculation
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
    let cycleSpending = 0;

    expenses.forEach(exp => {
      const expDate = new Date(exp.date);
      const expDateStr = exp.date?.split('T')[0];
      
      cycleSpending += exp.amount;
      
      if (expDateStr === todayStr) {
        todaySpending += exp.amount;
      }
      if (expDateStr === yesterdayStr) {
        yesterdaySpending += exp.amount;
      }
      if (expDate >= startOfWeek) {
        weekSpending += exp.amount;
      }
    });

    return {
      today: todaySpending,
      yesterday: yesterdaySpending,
      week: weekSpending,
      cycle: cycleSpending,
      boundaries: {
        todayStr,
        yesterdayStr,
        startOfWeek,
        startOfLastWeek,
        endOfLastWeek
      }
    };
  }, [expenses]);

  const allTransactions = useMemo(() => {
    const combined: (any & { txType: 'income' | 'expense' })[] = [
      ...incomes.map(inc => ({ ...inc, txType: 'income' as const })),
      ...expenses.map(exp => ({ ...exp, txType: 'expense' as const })),
    ];

    return combined.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });
  }, [incomes, expenses]);

  const filteredTransactions = useMemo(() => {
    const { boundaries } = metrics;

    return allTransactions.filter(tx => {
      // 1. Search filter
      const matchesSearch = 
        (tx.merchant || tx.source || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Type filter
      const matchesType = filterType === 'all' || tx.txType === filterType;

      // 3. Time filter
      let matchesTime = true;
      const txDate = new Date(tx.date);
      const txDateStr = tx.date?.split('T')[0];

      if (timeFilter === 'today') {
        matchesTime = txDateStr === boundaries.todayStr;
      } else if (timeFilter === 'yesterday') {
        matchesTime = txDateStr === boundaries.yesterdayStr;
      } else if (timeFilter === 'week') {
        matchesTime = txDate >= boundaries.startOfWeek;
      } else if (timeFilter === 'last_week') {
        matchesTime = txDate >= boundaries.startOfLastWeek && txDate <= boundaries.endOfLastWeek;
      }
      
      return matchesSearch && matchesType && matchesTime;
    });
  }, [allTransactions, searchTerm, filterType, timeFilter, metrics]);

  // Category breakdown for current filtered view
  const categoryBreakdown = useMemo(() => {
    const breakdown = new Map<string, number>();
    filteredTransactions.forEach(tx => {
      if (tx.txType === 'expense' && tx.categoryId) {
        const current = breakdown.get(tx.categoryId) || 0;
        breakdown.set(tx.categoryId, current + tx.amount);
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
      {/* Spending Metrics Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-4 shadow-sm hover:border-[#30D158]/30 transition group">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 group-hover:text-slate-400 transition">Today's Spending</p>
          <p className="text-xl font-bold font-mono text-[#FF453A]">{formatZAR(metrics.today)}</p>
        </div>
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-4 shadow-sm hover:border-[#30D158]/30 transition group">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 group-hover:text-slate-400 transition">Yesterday</p>
          <p className="text-xl font-bold font-mono text-[#FF9F0A]">{formatZAR(metrics.yesterday)}</p>
        </div>
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-4 shadow-sm hover:border-[#30D158]/30 transition group">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 group-hover:text-slate-400 transition">This Week</p>
          <p className="text-xl font-bold font-mono text-[#30D158]">{formatZAR(metrics.week)}</p>
        </div>
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-4 shadow-sm hover:border-[#30D158]/30 transition group">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 group-hover:text-slate-400 transition">Cycle Total</p>
          <p className="text-xl font-bold font-mono text-white">{formatZAR(metrics.cycle)}</p>
        </div>
      </div>

      {/* Category Spending Matrix (for current filter) */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Spending by Category</h3>
            <span className="text-[10px] text-slate-500 font-medium">Filtered View</span>
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
          <p className="text-sm text-slate-400">Complete history of all income and expenses</p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          {/* Time Filter Tabs */}
          <div className="flex bg-[#1C1C1E] border border-white/10 rounded-xl p-1 overflow-x-auto">
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${timeFilter === 'all' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              All Cycle
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
              Week
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#1C1C1E] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#30D158] w-full sm:w-48"
            />
          </div>

          <div className="flex bg-[#1C1C1E] border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${filterType === 'all' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${filterType === 'expense' ? 'bg-red-500/20 text-red-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Out
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${filterType === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              In
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
                <th className="py-4 px-6 text-right">Amount</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredTransactions.map((tx) => {
                const acc = tx.accountId ? accountMap.get(tx.accountId) : null;
                const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : null;
                const isExpense = tx.txType === 'expense';

                return (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isExpense ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {isExpense ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{formatDateNice(tx.date)}</p>
                          <p className="text-[10px] text-slate-500 font-mono">#{tx.id.split('_').pop()?.slice(-4)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="text-sm font-bold text-slate-200">{tx.merchant || tx.source || 'General Transaction'}</p>
                        {tx.notes && <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{tx.notes}</p>}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        {cat && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                            <Tag className="w-3 h-3 text-slate-500" />
                            <span>{cat.name}</span>
                          </div>
                        )}
                        {acc && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <CreditCard className="w-3 h-3 text-slate-600" />
                            <span>{acc.name}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className={`text-sm font-mono font-bold ${isExpense ? 'text-[#FF453A]' : 'text-[#30D158]'}`}>
                        {isExpense ? '-' : '+'}{formatZAR(tx.amount)}
                      </span>
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
                  <td colSpan={5} className="py-12 text-center text-slate-500">
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
