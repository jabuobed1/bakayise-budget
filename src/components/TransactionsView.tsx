import React, { useState, useMemo } from 'react';
import { Expense, Income, FinancialAccount, BudgetCategory } from '../types';
import { formatZAR, formatDateNice } from '../utils/southAfricaHolidays';
import { FigmaIcon } from './ui/FigmaIcon';
import { Search, Filter, ArrowUpRight, ArrowDownLeft, Calendar, Tag, CreditCard, ExternalLink, Trash2 } from 'lucide-react';

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

  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  const allTransactions = useMemo(() => {
    const combined: (any & { txType: 'income' | 'expense' })[] = [
      ...incomes.map(inc => ({ ...inc, txType: 'income' as const })),
      ...expenses.map(exp => ({ ...exp, txType: 'expense' as const })),
    ];

    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [incomes, expenses]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      const matchesSearch = 
        (tx.merchant || tx.source || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || tx.txType === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [allTransactions, searchTerm, filterType]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Transactions Ledger</h2>
          <p className="text-sm text-slate-400">Complete history of all income and expenses</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search merchant, source or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#1C1C1E] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#30D158] w-full sm:w-64"
            />
          </div>

          <div className="flex bg-[#1C1C1E] border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${filterType === 'all' ? 'bg-[#30D158] text-black' : 'text-slate-400 hover:text-white'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${filterType === 'expense' ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:text-white'}`}
            >
              Expenses
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${filterType === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}
            >
              Income
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
