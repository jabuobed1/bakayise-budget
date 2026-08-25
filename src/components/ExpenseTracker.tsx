import React, { useState, useMemo } from 'react';
import { Expense, BudgetCategory, LoggedBy, FinancialAccount } from '../types';
import { formatZAR, formatDateNice } from '../utils/southAfricaHolidays';
import { isInternalTransferExpense, isExternalExpense } from '../utils/budgetConstants';
import { FigmaIcon } from './ui/FigmaIcon';
import { LastEditTag } from './ui/LastEditTag';
import { Search, Plus, Edit2, Trash2, Calendar, CreditCard, User, Users, Landmark, ArrowRightLeft } from 'lucide-react';

interface ExpenseTrackerProps {
  expenses: Expense[];
  categories: BudgetCategory[];
  accounts?: FinancialAccount[];
  onOpenAddExpenseModal: () => void;
  onOpenEditExpenseModal: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
}

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  expenses,
  categories,
  accounts = [],
  onOpenAddExpenseModal,
  onOpenEditExpenseModal,
  onDeleteExpense,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedSpenderFilter, setSelectedSpenderFilter] = useState<string>('all');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'highest' | 'lowest'>('newest');

  // Category map for fast lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, BudgetCategory>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Account map for fast lookup
  const accountMap = useMemo(() => {
    const map = new Map<string, FinancialAccount>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  // Family member spending breakdown
  const stats = useMemo(() => {
    let total = 0;
    let hubbyTotal = 0;
    let wifeyTotal = 0;
    let sharedTotal = 0;

    for (const exp of expenses) {
      total += exp.amount;
      const spender = (exp.loggedBy || '').toLowerCase();
      if (spender.includes('hubby') || spender.includes('husband')) {
        hubbyTotal += exp.amount;
      } else if (spender.includes('wifey') || spender.includes('wife')) {
        wifeyTotal += exp.amount;
      } else {
        sharedTotal += exp.amount;
      }
    }

    return {
      total,
      hubbyTotal,
      wifeyTotal,
      sharedTotal,
      hubbyPct: total > 0 ? (hubbyTotal / total) * 100 : 0,
      wifeyPct: total > 0 ? (wifeyTotal / total) * 100 : 0,
      sharedPct: total > 0 ? (sharedTotal / total) * 100 : 0,
    };
  }, [expenses]);

  // Filtered and sorted expenses
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        const matchesSearch =
          searchTerm === '' ||
          exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (exp.notes && exp.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (categoryMap.get(exp.categoryId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCat =
          selectedCategoryFilter === 'all' || exp.categoryId === selectedCategoryFilter;

        let matchesSpender = selectedSpenderFilter === 'all';
        if (!matchesSpender) {
          const s = (exp.loggedBy || '').toLowerCase();
          const target = selectedSpenderFilter.toLowerCase();
          if (target === 'hubby' || target === 'husband') {
            matchesSpender = s.includes('hubby') || s.includes('husband');
          } else if (target === 'wifey' || target === 'wife') {
            matchesSpender = s.includes('wifey') || s.includes('wife');
          } else if (target === 'shared') {
            matchesSpender = s.includes('shared');
          }
        }

        const matchesAccount =
          selectedAccountFilter === 'all' ||
          exp.accountId === selectedAccountFilter ||
          (!exp.accountId && selectedAccountFilter === 'unassigned');

        return matchesSearch && matchesCat && matchesSpender && matchesAccount;
      })
      .sort((a, b) => {
        if (sortOrder === 'highest') return b.amount - a.amount;
        if (sortOrder === 'lowest') return a.amount - b.amount;
        return b.date.localeCompare(a.date);
      });
  }, [expenses, searchTerm, selectedCategoryFilter, selectedSpenderFilter, selectedAccountFilter, sortOrder, categoryMap]);

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-[#30D158]/15 border border-[#30D158]/30 flex items-center justify-center text-[#30D158] shrink-0">
            <FigmaIcon name="receipt" size="md" strokeWidth={2.4} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Family Expense Tracker</span>
            </h2>
            <p className="text-xs text-slate-400">
              Transactions logged by Hubby, Wifey, and Shared Household with account tracking
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAddExpenseModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[12px] bg-[#30D158] hover:bg-[#34C759] text-black text-xs sm:text-sm font-bold shadow-md shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" strokeWidth={2.8} />
          <span>Log Expense</span>
        </button>
      </div>

      {/* Family Spender Breakdown Cards (Apple Inset Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        
        <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[20px] p-3.5 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">Total Tracked</div>
          <div className="text-lg sm:text-xl font-bold text-white mt-1">{formatZAR(stats.total)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{expenses.length} logs</div>
        </div>

        <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[20px] p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Hubby</span>
            <span className="text-[#30D158] font-bold">{stats.hubbyPct.toFixed(0)}%</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-[#30D158] mt-1">{formatZAR(stats.hubbyTotal)}</div>
          <div className="w-full bg-[#2C2C2E] rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-[#30D158] h-1.5 rounded-full" style={{ width: `${stats.hubbyPct}%` }} />
          </div>
        </div>

        <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[20px] p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Wifey</span>
            <span className="text-[#FF375F] font-bold">{stats.wifeyPct.toFixed(0)}%</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-[#FF375F] mt-1">{formatZAR(stats.wifeyTotal)}</div>
          <div className="w-full bg-[#2C2C2E] rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-[#FF375F] h-1.5 rounded-full" style={{ width: `${stats.wifeyPct}%` }} />
          </div>
        </div>

        <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[20px] p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Shared</span>
            <span className="text-[#64D2FF] font-bold">{stats.sharedPct.toFixed(0)}%</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-[#64D2FF] mt-1">{formatZAR(stats.sharedTotal)}</div>
          <div className="w-full bg-[#2C2C2E] rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-[#64D2FF] h-1.5 rounded-full" style={{ width: `${stats.sharedPct}%` }} />
          </div>
        </div>

      </div>

      {/* iOS Search & Filter Bar */}
      <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[20px] p-3 flex flex-col md:flex-row items-center gap-2.5 shadow-sm">
        
        {/* iOS style Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search merchant, notes, or envelope..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#2C2C2E] border border-white/[0.06] text-white pl-9 pr-4 py-2 rounded-[14px] text-xs focus:outline-none focus:ring-2 focus:ring-[#30D158] placeholder:text-slate-500"
          />
        </div>

        {/* Account filter */}
        {accounts.length > 0 && (
          <div className="w-full md:w-40 shrink-0">
            <select
              value={selectedAccountFilter}
              onChange={(e) => setSelectedAccountFilter(e.target.value)}
              className="w-full bg-[#2C2C2E] border border-white/[0.06] text-slate-200 px-3 py-2 rounded-[14px] text-xs focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
            >
              <option value="all">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
        )}

        {/* Category filter */}
        <div className="w-full md:w-40 shrink-0">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="w-full bg-[#2C2C2E] border border-white/[0.06] text-slate-200 px-3 py-2 rounded-[14px] text-xs focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
          >
            <option value="all">All Envelopes</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Spender filter */}
        <div className="w-full md:w-32 shrink-0">
          <select
            value={selectedSpenderFilter}
            onChange={(e) => setSelectedSpenderFilter(e.target.value)}
            className="w-full bg-[#2C2C2E] border border-white/[0.06] text-slate-200 px-3 py-2 rounded-[14px] text-xs focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
          >
            <option value="all">All Spenders</option>
            <option value="Hubby">Hubby</option>
            <option value="Wifey">Wifey</option>
            <option value="Shared">Shared</option>
          </select>
        </div>

        {/* Sort order */}
        <div className="w-full md:w-32 shrink-0">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="w-full bg-[#2C2C2E] border border-white/[0.06] text-slate-200 px-3 py-2 rounded-[14px] text-xs focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="highest">Highest Amount</option>
            <option value="lowest">Lowest Amount</option>
          </select>
        </div>

      </div>

      {/* Expenses Apple Inset Grouped List */}
      <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] overflow-hidden shadow-xl">
        {filteredExpenses.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs">
            No expenses found. Tap "Log Expense" to record a receipt.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filteredExpenses.map((exp) => {
              const isTransfer = isInternalTransferExpense(exp);
              const cat = isTransfer ? null : categoryMap.get(exp.categoryId);
              const acc = exp.accountId ? accountMap.get(exp.accountId) : null;
              const isHubby = (exp.loggedBy || '').toLowerCase().includes('hubby') || (exp.loggedBy || '').toLowerCase().includes('husband');
              const isWifey = (exp.loggedBy || '').toLowerCase().includes('wifey') || (exp.loggedBy || '').toLowerCase().includes('wife');
              const displayLoggedBy = isHubby ? 'Hubby' : isWifey ? 'Wifey' : exp.loggedBy || 'Shared';

              return (
                <div
                  key={exp.id}
                  className="p-3.5 sm:p-4 hover:bg-[#2C2C2E]/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 mt-0.5 border border-white/10"
                      style={{
                        backgroundColor: isTransfer ? 'rgba(56, 189, 248, 0.15)' : `${cat?.color || '#30D158'}20`,
                        color: isTransfer ? '#38bdf8' : cat?.color || '#30D158',
                      }}
                    >
                      {isTransfer ? (
                        <ArrowRightLeft className="w-4 h-4 text-sky-400" />
                      ) : (
                        <FigmaIcon name="receipt" size="sm" strokeWidth={2.2} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white tracking-tight">
                          {exp.title}
                        </h4>

                        {isTransfer ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full border whitespace-nowrap bg-sky-500/15 border-sky-500/40 text-sky-300 flex items-center gap-1">
                              <ArrowRightLeft className="w-2.5 h-2.5" />
                              <span>Transfer</span>
                            </span>
                          </div>
                        ) : cat ? (
                          <div className="flex items-center gap-1">
                            <span
                              className="text-[10px] font-semibold px-2 py-0.2 rounded-full border whitespace-nowrap"
                              style={{
                                backgroundColor: `${cat.color || '#3b82f6'}15`,
                                borderColor: `${cat.color || '#3b82f6'}40`,
                                color: cat.color || '#3b82f6',
                              }}
                            >
                              {cat.name}
                            </span>
                            {cat.tag && (
                              <span className="text-[9px] font-semibold text-slate-300 bg-white/10 px-1.5 py-0.2 rounded-[5px] font-mono border border-white/10">
                                #{cat.tag}
                              </span>
                            )}
                          </div>
                        ) : null}

                        {acc && (
                          <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap flex items-center gap-1">
                            <Landmark className="w-2.5 h-2.5" />
                            <span>{acc.name}</span>
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border whitespace-nowrap ${
                            isHubby
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : isWifey
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                          }`}
                        >
                          {displayLoggedBy}
                        </span>

                        <LastEditTag
                          lastEditedBy={exp.lastEditedBy}
                          lastEditedByEmail={exp.lastEditedByEmail}
                          lastEditedAt={exp.lastEditedAt}
                          compact
                        />
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {formatDateNice(exp.date)}
                        </span>
                        {exp.paymentMethod && (
                          <span className="flex items-center gap-1 text-[11px]">
                            <CreditCard className="w-3 h-3 text-slate-500" />
                            {exp.paymentMethod}
                          </span>
                        )}
                        {exp.notes && (
                          <span className="text-slate-400 italic text-[11px]">
                            — "{exp.notes}"
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0 pl-12 sm:pl-0">
                    <div className="text-right">
                      <span className="text-base font-bold text-white tracking-tight block">
                        {formatZAR(exp.amount)}
                      </span>
                      {exp.accountBalanceAtTransactionTime !== undefined && (
                        <span className="text-[10px] font-mono text-slate-400 block">
                          Bal: {formatZAR(exp.accountBalanceAtTransactionTime)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenEditExpenseModal(exp)}
                        className="w-7 h-7 rounded-[8px] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                        title="Edit Expense"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteExpense(exp.id)}
                        className="w-7 h-7 rounded-[8px] flex items-center justify-center text-slate-500 hover:text-[#FF453A] hover:bg-white/10 transition cursor-pointer"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
