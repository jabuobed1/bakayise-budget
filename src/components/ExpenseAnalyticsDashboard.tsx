import React, { useState, useMemo } from 'react';
import { Expense, BudgetCategory, FinancialAccount } from '../types';
import { formatZAR, formatDateNice } from '../utils/southAfricaHolidays';
import { isExternalExpense } from '../utils/budgetConstants';
import { FigmaIcon } from './ui/FigmaIcon';
import {
  TrendingUp,
  Calendar,
  CreditCard,
  User,
  Users,
  PieChart as PieIcon,
  BarChart3,
  Flame,
  ShoppingBag,
  Clock,
  Filter,
  ArrowUpRight,
  Sparkles,
  ChevronDown,
  Layers,
  Award,
  Wallet,
  Building2,
  X,
  Tag,
  Receipt,
  CalendarDays
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend
} from 'recharts';

interface ExpenseAnalyticsDashboardProps {
  expenses: Expense[];
  categories: BudgetCategory[];
  accounts?: FinancialAccount[];
  onOpenEditExpenseModal?: (expense: Expense) => void;
  onOpenAddExpenseModal?: () => void;
}

const SPENDER_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  hubby: { bg: 'bg-[#30D158]/15', text: 'text-[#30D158]', hex: '#30D158' },
  wifey: { bg: 'bg-[#FF375F]/15', text: 'text-[#FF375F]', hex: '#FF375F' },
  shared: { bg: 'bg-[#64D2FF]/15', text: 'text-[#64D2FF]', hex: '#64D2FF' },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ExpenseAnalyticsDashboard: React.FC<ExpenseAnalyticsDashboardProps> = ({
  expenses,
  categories,
  accounts = [],
  onOpenEditExpenseModal,
  onOpenAddExpenseModal,
}) => {
  // Quick filters inside Analytics view
  const [timeScope, setTimeScope] = useState<'all' | '7days' | '14days' | '30days'>('all');
  const [selectedSpender, setSelectedSpender] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Category & Account Maps for fast lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, BudgetCategory>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const accountMap = useMemo(() => {
    const map = new Map<string, FinancialAccount>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  // 1. Filter out internal transfers etc. (External true expenses only!)
  const externalExpenses = useMemo(() => {
    return expenses.filter(isExternalExpense);
  }, [expenses]);

  // 2. Apply analytical filters (time scope, spender, category, account)
  const filteredAnalyticsExpenses = useMemo(() => {
    const now = new Date();

    return externalExpenses.filter((exp) => {
      // Time scope filter
      if (timeScope !== 'all' && exp.date) {
        const expDate = new Date(exp.date);
        const diffDays = (now.getTime() - expDate.getTime()) / (1000 * 3600 * 24);
        if (timeScope === '7days' && diffDays > 7) return false;
        if (timeScope === '14days' && diffDays > 14) return false;
        if (timeScope === '30days' && diffDays > 30) return false;
      }

      // Spender filter
      if (selectedSpender !== 'all') {
        const s = (exp.loggedBy || '').toLowerCase();
        const target = selectedSpender.toLowerCase();
        if (target === 'hubby' && !(s.includes('hubby') || s.includes('husband'))) return false;
        if (target === 'wifey' && !(s.includes('wifey') || s.includes('wife'))) return false;
        if (target === 'shared' && !s.includes('shared')) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && exp.categoryId !== selectedCategory) {
        return false;
      }

      // Account filter
      if (selectedAccount !== 'all') {
        if (selectedAccount === 'unassigned' && exp.accountId) return false;
        if (selectedAccount !== 'unassigned' && exp.accountId !== selectedAccount) return false;
      }

      return true;
    });
  }, [externalExpenses, timeScope, selectedSpender, selectedCategory, selectedAccount]);

  // 3. Core KPI calculations
  const kpis = useMemo(() => {
    let totalSpent = 0;
    let count = 0;
    const dateSpendMap = new Map<string, number>();
    const spenderMap: Record<'hubby' | 'wifey' | 'shared', number> = { hubby: 0, wifey: 0, shared: 0 };
    const catMap = new Map<string, number>();
    const merchantMap = new Map<string, { total: number; count: number }>();

    for (const exp of filteredAnalyticsExpenses) {
      const amt = exp.amount || 0;
      totalSpent += amt;
      count += 1;

      // Date spend map
      if (exp.date) {
        dateSpendMap.set(exp.date, (dateSpendMap.get(exp.date) || 0) + amt);
      }

      // Spender
      const s = (exp.loggedBy || '').toLowerCase();
      if (s.includes('hubby') || s.includes('husband')) {
        spenderMap.hubby += amt;
      } else if (s.includes('wifey') || s.includes('wife')) {
        spenderMap.wifey += amt;
      } else {
        spenderMap.shared += amt;
      }

      // Category
      catMap.set(exp.categoryId, (catMap.get(exp.categoryId) || 0) + amt);

      // Merchant
      const merchantKey = (exp.title || 'Other').trim();
      const existingM = merchantMap.get(merchantKey) || { total: 0, count: 0 };
      existingM.total += amt;
      existingM.count += 1;
      merchantMap.set(merchantKey, existingM);
    }

    // Peak spend date
    let peakDate = '—';
    let peakDateAmount = 0;
    dateSpendMap.forEach((amt, d) => {
      if (amt > peakDateAmount) {
        peakDateAmount = amt;
        peakDate = d;
      }
    });

    // Top Category
    let topCatId = '';
    let topCatAmount = 0;
    catMap.forEach((amt, id) => {
      if (amt > topCatAmount) {
        topCatAmount = amt;
        topCatId = id;
      }
    });
    const topCategoryObj = categoryMap.get(topCatId);

    // Top Merchant
    let topMerchantName = '—';
    let topMerchantTotal = 0;
    let topMerchantCount = 0;
    merchantMap.forEach((val, name) => {
      if (val.total > topMerchantTotal) {
        topMerchantTotal = val.total;
        topMerchantCount = val.count;
        topMerchantName = name;
      }
    });

    const activeDaysCount = dateSpendMap.size || 1;
    const averageDailyBurn = totalSpent / activeDaysCount;
    const avgTransactionSize = count > 0 ? totalSpent / count : 0;

    return {
      totalSpent,
      count,
      activeDaysCount,
      averageDailyBurn,
      peakDate,
      peakDateAmount,
      avgTransactionSize,
      topCategoryName: topCategoryObj?.name || 'None',
      topCategoryColor: topCategoryObj?.color || '#30D158',
      topCategoryAmount: topCatAmount,
      topCategoryPct: totalSpent > 0 ? (topCatAmount / totalSpent) * 100 : 0,
      topMerchantName,
      topMerchantTotal,
      topMerchantCount,
      hubbyTotal: spenderMap.hubby,
      wifeyTotal: spenderMap.wifey,
      sharedTotal: spenderMap.shared,
      hubbyPct: totalSpent > 0 ? (spenderMap.hubby / totalSpent) * 100 : 0,
      wifeyPct: totalSpent > 0 ? (spenderMap.wifey / totalSpent) * 100 : 0,
      sharedPct: totalSpent > 0 ? (spenderMap.shared / totalSpent) * 100 : 0,
    };
  }, [filteredAnalyticsExpenses, categoryMap]);

  // 4. Daily Spending Timeline & Trend Series
  const dailySpendData = useMemo(() => {
    const map = new Map<string, { total: number; count: number; items: Expense[] }>();

    filteredAnalyticsExpenses.forEach((exp) => {
      const d = exp.date || 'Unknown';
      const entry = map.get(d) || { total: 0, count: 0, items: [] };
      entry.total += exp.amount || 0;
      entry.count += 1;
      entry.items.push(exp);
      map.set(d, entry);
    });

    const sortedDates = Array.from(map.keys()).sort();
    let cumulative = 0;

    return sortedDates.map((d) => {
      const entry = map.get(d)!;
      cumulative += entry.total;
      let dateLabel = d;
      let dayOfWeek = '';
      try {
        const parsed = new Date(d);
        dateLabel = `${parsed.getDate()} ${parsed.toLocaleDateString('en-ZA', { month: 'short' })}`;
        dayOfWeek = DAY_NAMES[parsed.getDay()];
      } catch {
        dateLabel = d;
      }

      return {
        rawDate: d,
        dateLabel,
        fullDateLabel: `${dayOfWeek}, ${dateLabel}`,
        amount: entry.total,
        cumulative,
        count: entry.count,
        items: entry.items,
        isPeak: d === kpis.peakDate,
      };
    });
  }, [filteredAnalyticsExpenses, kpis.peakDate]);

  // 5. Category Envelopes Breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { amount: number; count: number; category: BudgetCategory | null }>();

    filteredAnalyticsExpenses.forEach((exp) => {
      const cat = categoryMap.get(exp.categoryId) || null;
      const key = exp.categoryId || 'uncategorized';
      const entry = map.get(key) || { amount: 0, count: 0, category: cat };
      entry.amount += exp.amount || 0;
      entry.count += 1;
      map.set(key, entry);
    });

    return Array.from(map.entries())
      .map(([id, val]) => ({
        id,
        name: val.category?.name || 'Uncategorized',
        color: val.category?.color || '#94A3B8',
        amount: val.amount,
        count: val.count,
        percentage: kpis.totalSpent > 0 ? (val.amount / kpis.totalSpent) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredAnalyticsExpenses, categoryMap, kpis.totalSpent]);

  // 6. Top Merchants Leaderboard
  const topMerchants = useMemo(() => {
    const map = new Map<string, { total: number; count: number; lastDate: string; categoryName: string; categoryColor: string }>();

    filteredAnalyticsExpenses.forEach((exp) => {
      const name = (exp.title || 'Other Payee').trim();
      const cat = categoryMap.get(exp.categoryId);
      const existing = map.get(name) || {
        total: 0,
        count: 0,
        lastDate: exp.date,
        categoryName: cat?.name || 'General',
        categoryColor: cat?.color || '#30D158',
      };
      existing.total += exp.amount || 0;
      existing.count += 1;
      if (exp.date && exp.date > existing.lastDate) {
        existing.lastDate = exp.date;
      }
      map.set(name, existing);
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
        avgPerSpend: data.count > 0 ? data.total / data.count : 0,
        lastDate: data.lastDate,
        categoryName: data.categoryName,
        categoryColor: data.categoryColor,
        pct: kpis.totalSpent > 0 ? (data.total / kpis.totalSpent) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filteredAnalyticsExpenses, categoryMap, kpis.totalSpent]);

  // 7. Day of Week Spending Analysis
  const dayOfWeekAnalysis = useMemo(() => {
    const daysData = Array.from({ length: 7 }, (_, i) => ({
      dayIndex: i,
      dayName: DAY_NAMES[i],
      fullDayName: FULL_DAY_NAMES[i],
      amount: 0,
      count: 0,
    }));

    filteredAnalyticsExpenses.forEach((exp) => {
      if (exp.date) {
        const d = new Date(exp.date);
        const dayIdx = d.getDay();
        if (!isNaN(dayIdx) && dayIdx >= 0 && dayIdx < 7) {
          daysData[dayIdx].amount += exp.amount || 0;
          daysData[dayIdx].count += 1;
        }
      }
    });

    // Sort starting from Monday (1, 2, 3, 4, 5, 6, 0)
    const sortedFromMonday = [
      daysData[1],
      daysData[2],
      daysData[3],
      daysData[4],
      daysData[5],
      daysData[6],
      daysData[0],
    ];

    const maxDaySpend = Math.max(...sortedFromMonday.map((d) => d.amount), 1);

    return sortedFromMonday.map((d) => ({
      ...d,
      pctOfTotal: kpis.totalSpent > 0 ? (d.amount / kpis.totalSpent) * 100 : 0,
      barHeightPct: (d.amount / maxDaySpend) * 100,
    }));
  }, [filteredAnalyticsExpenses, kpis.totalSpent]);

  // 8. Payment Method & Account Breakdown
  const paymentMethodBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();

    filteredAnalyticsExpenses.forEach((exp) => {
      const method = exp.paymentMethod || 'Debit Card';
      const existing = map.get(method) || { total: 0, count: 0 };
      existing.total += exp.amount || 0;
      existing.count += 1;
      map.set(method, existing);
    });

    return Array.from(map.entries())
      .map(([method, data]) => ({
        method,
        total: data.total,
        count: data.count,
        pct: kpis.totalSpent > 0 ? (data.total / kpis.totalSpent) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredAnalyticsExpenses, kpis.totalSpent]);

  const accountBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; count: number; accountName: string; type: string }>();

    filteredAnalyticsExpenses.forEach((exp) => {
      const accId = exp.accountId || 'unassigned';
      const acc = exp.accountId ? accountMap.get(exp.accountId) : null;
      const accName = acc ? acc.name : 'Unassigned Account';
      const accType = acc ? acc.type : 'cash';

      const existing = map.get(accId) || { total: 0, count: 0, accountName: accName, type: accType };
      existing.total += exp.amount || 0;
      existing.count += 1;
      map.set(accId, existing);
    });

    return Array.from(map.entries())
      .map(([id, data]) => ({
        id,
        name: data.accountName,
        type: data.type,
        total: data.total,
        count: data.count,
        pct: kpis.totalSpent > 0 ? (data.total / kpis.totalSpent) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredAnalyticsExpenses, accountMap, kpis.totalSpent]);

  // 9. Transaction Size Tier Distribution
  const sizeTierData = useMemo(() => {
    const tiers = [
      { label: 'Micro (< R100)', min: 0, max: 100, count: 0, total: 0, color: '#38BDF8' },
      { label: 'Small (R100–R500)', min: 100, max: 500, count: 0, total: 0, color: '#30D158' },
      { label: 'Medium (R500–R2k)', min: 500, max: 2000, count: 0, total: 0, color: '#FF9F0A' },
      { label: 'Major (> R2k)', min: 2000, max: Infinity, count: 0, total: 0, color: '#FF375F' },
    ];

    filteredAnalyticsExpenses.forEach((exp) => {
      const amt = exp.amount || 0;
      for (const t of tiers) {
        if (amt >= t.min && amt < t.max) {
          t.count += 1;
          t.total += amt;
          break;
        }
      }
    });

    return tiers;
  }, [filteredAnalyticsExpenses]);

  // 10. Selected Date Details (drilldown)
  const selectedDateExpenses = useMemo(() => {
    if (!selectedDate) return [];
    return filteredAnalyticsExpenses
      .filter((exp) => exp.date === selectedDate)
      .sort((a, b) => (b.amount || 0) - (a.amount || 0));
  }, [filteredAnalyticsExpenses, selectedDate]);

  const selectedDateTotal = useMemo(() => {
    return selectedDateExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [selectedDateExpenses]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Analytics Sub-Filter Bar */}
      <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[22px] p-3.5 shadow-md flex flex-wrap items-center justify-between gap-3">
        
        {/* Left Filter Tags */}
        <div className="flex flex-wrap items-center gap-2">
          
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mr-1">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Analytics Scope:</span>
          </div>

          {/* Time Scope Pills */}
          <div className="flex items-center bg-[#2C2C2E] p-0.5 rounded-[12px] border border-white/[0.06]">
            {(['all', '7days', '14days', '30days'] as const).map((scope) => (
              <button
                key={scope}
                onClick={() => setTimeScope(scope)}
                className={`px-2.5 py-1 rounded-[10px] text-[11px] font-bold transition-all cursor-pointer ${
                  timeScope === scope
                    ? 'bg-[#30D158] text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {scope === 'all' ? 'All Days' : scope === '7days' ? 'Last 7d' : scope === '14days' ? 'Last 14d' : 'Last 30d'}
              </button>
            ))}
          </div>

          {/* Spender Dropdown */}
          <select
            value={selectedSpender}
            onChange={(e) => setSelectedSpender(e.target.value)}
            className="bg-[#2C2C2E] border border-white/[0.06] text-slate-200 px-2.5 py-1.5 rounded-[12px] text-xs focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
          >
            <option value="all">All Spenders</option>
            <option value="hubby">Hubby Only</option>
            <option value="wifey">Wifey Only</option>
            <option value="shared">Shared Only</option>
          </select>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#2C2C2E] border border-white/[0.06] text-slate-200 px-2.5 py-1.5 rounded-[12px] text-xs focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer max-w-[150px] truncate"
          >
            <option value="all">All Envelopes</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Account Dropdown */}
          {accounts.length > 0 && (
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="bg-[#2C2C2E] border border-white/[0.06] text-slate-200 px-2.5 py-1.5 rounded-[12px] text-xs focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer max-w-[150px] truncate"
            >
              <option value="all">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
              <option value="unassigned">Unassigned</option>
            </select>
          )}

        </div>

        {/* Filter Reset & Info Tag */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[11px] font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-[10px] border border-white/5">
            {filteredAnalyticsExpenses.length} external expenses analyzed
          </span>
          {(timeScope !== 'all' || selectedSpender !== 'all' || selectedCategory !== 'all' || selectedAccount !== 'all') && (
            <button
              onClick={() => {
                setTimeScope('all');
                setSelectedSpender('all');
                setSelectedCategory('all');
                setSelectedAccount('all');
              }}
              className="text-[11px] text-amber-400 hover:text-amber-300 underline underline-offset-2 cursor-pointer font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>

      </div>

      {/* KPI METRIC CARDS (Apple Inset Bento Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Total External Expenses */}
        <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[22px] p-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Expenditure</span>
            <div className="w-7 h-7 rounded-[10px] bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mt-2 tracking-tight">
            {formatZAR(kpis.totalSpent)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
            <span>{kpis.count} total purchases</span>
            <span>•</span>
            <span className="text-emerald-400">Excludes transfers</span>
          </div>
        </div>

        {/* Daily Burn Rate */}
        <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[22px] p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Daily Burn Rate</span>
            <div className="w-7 h-7 rounded-[10px] bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Flame className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-400 mt-2 tracking-tight">
            {formatZAR(kpis.averageDailyBurn)}
            <span className="text-xs font-normal text-slate-400 ml-1">/ active day</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {kpis.activeDaysCount} spending dates
          </div>
        </div>

        {/* Peak Spending Day */}
        <div 
          onClick={() => kpis.peakDate !== '—' && setSelectedDate(kpis.peakDate)}
          className={`bg-[#1C1C1E] border border-white/[0.08] rounded-[22px] p-4 shadow-sm relative overflow-hidden transition ${
            kpis.peakDate !== '—' ? 'hover:border-rose-500/40 cursor-pointer' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Peak Spending Day</span>
            <div className="w-7 h-7 rounded-[10px] bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-400 mt-2 tracking-tight">
            {formatZAR(kpis.peakDateAmount)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 truncate">
            <span>{kpis.peakDate !== '—' ? formatDateNice(kpis.peakDate) : 'No spend yet'}</span>
            {kpis.peakDate !== '—' && <span className="text-rose-400 text-[10px] font-bold">(Tap to view)</span>}
          </div>
        </div>

        {/* Top Category Envelope */}
        <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[22px] p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Top Category</span>
            <div 
              className="w-7 h-7 rounded-[10px] flex items-center justify-center"
              style={{ backgroundColor: `${kpis.topCategoryColor}25`, color: kpis.topCategoryColor }}
            >
              <PieIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-white mt-2 tracking-tight truncate" title={kpis.topCategoryName}>
            {kpis.topCategoryName}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>{formatZAR(kpis.topCategoryAmount)}</span>
            <span className="font-bold text-emerald-400">{kpis.topCategoryPct.toFixed(0)}% of spend</span>
          </div>
        </div>

      </div>

      {/* DAILY EXPENSE TIMELINE & INTERACTIVE DATE TRACKER */}
      <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] p-4 sm:p-5 shadow-xl">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-400" />
              <span>Daily Expenditure Timeline</span>
            </h3>
            <p className="text-xs text-slate-400">
              Interactive date-by-date spending tracker. Click any bar or date badge to view transactions for that day.
            </p>
          </div>

          {selectedDate && (
            <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-[12px] self-start sm:self-auto">
              <span className="text-xs font-bold text-emerald-300">
                Viewing: {formatDateNice(selectedDate)} ({formatZAR(selectedDateTotal)})
              </span>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-slate-400 hover:text-white p-0.5 rounded-full cursor-pointer"
                title="Clear date filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {dailySpendData.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
            <Receipt className="w-8 h-8 opacity-40" />
            <span>No expenditure data found for the selected scope.</span>
          </div>
        ) : (
          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dailySpendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const rawDate = e.activePayload[0].payload.rawDate;
                    setSelectedDate(selectedDate === rawDate ? null : rawDate);
                  }
                }}
              >
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#30D158" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#30D158" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2E" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#2C2C2E' }}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#2C2C2E' }}
                  tickFormatter={(val) => `R${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#2C2C2E] border border-white/15 p-3 rounded-[16px] shadow-2xl text-xs text-white max-w-xs backdrop-blur-md">
                          <div className="font-bold text-emerald-400 flex items-center justify-between gap-3">
                            <span>{data.fullDateLabel}</span>
                            <span className="font-mono text-white text-sm">{formatZAR(data.amount)}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            {data.count} transaction{data.count !== 1 ? 's' : ''} logged
                          </div>
                          {data.items && data.items.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                              {data.items.slice(0, 3).map((it: Expense) => (
                                <div key={it.id} className="flex items-center justify-between gap-2 text-[11px] text-slate-300">
                                  <span className="truncate">{it.title}</span>
                                  <span className="font-mono text-emerald-300 shrink-0">{formatZAR(it.amount)}</span>
                                </div>
                              ))}
                              {data.items.length > 3 && (
                                <div className="text-[10px] text-slate-400 text-right">
                                  +{data.items.length - 3} more...
                                </div>
                              )}
                            </div>
                          )}
                          <div className="mt-2 text-[9px] text-slate-400 italic">Click point to view day details</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#30D158"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#spendGradient)"
                  activeDot={{ r: 6, fill: '#30D158', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Quick Date Pills for Direct Selection */}
        {dailySpendData.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] text-slate-500 shrink-0 font-medium">Dates:</span>
            {dailySpendData.map((d) => {
              const isSelected = selectedDate === d.rawDate;
              return (
                <button
                  key={d.rawDate}
                  onClick={() => setSelectedDate(isSelected ? null : d.rawDate)}
                  className={`px-2.5 py-1 rounded-[10px] text-[11px] font-mono shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-[#30D158] text-black border-[#30D158] font-bold shadow-md'
                      : d.isPeak
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                      : 'bg-[#2C2C2E] text-slate-300 border-white/[0.06] hover:bg-[#3A3A3C]'
                  }`}
                >
                  <span>{d.dateLabel}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-black/80 font-bold' : 'text-slate-400'}`}>
                    {formatZAR(d.amount)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* DRILLDOWN: EXPENSES ON SELECTED DATE */}
        {selectedDate && selectedDateExpenses.length > 0 && (
          <div className="mt-4 pt-4 border-t border-emerald-500/20 bg-emerald-950/20 rounded-[18px] p-3.5 border border-emerald-500/30 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[8px] bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-white">
                  Expenses on {formatDateNice(selectedDate)}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  Total: {formatZAR(selectedDateTotal)}
                </span>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-slate-400 hover:text-white text-xs font-medium cursor-pointer"
              >
                Close Day Drilldown ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {selectedDateExpenses.map((exp) => {
                const cat = categoryMap.get(exp.categoryId);
                const acc = exp.accountId ? accountMap.get(exp.accountId) : null;
                const isHubby = (exp.loggedBy || '').toLowerCase().includes('hubby') || (exp.loggedBy || '').toLowerCase().includes('husband');
                const isWifey = (exp.loggedBy || '').toLowerCase().includes('wifey') || (exp.loggedBy || '').toLowerCase().includes('wife');
                const spenderColor = isHubby ? SPENDER_COLORS.hubby : isWifey ? SPENDER_COLORS.wifey : SPENDER_COLORS.shared;

                return (
                  <div
                    key={exp.id}
                    className="bg-[#1C1C1E]/90 border border-white/10 rounded-[14px] p-2.5 flex items-center justify-between gap-2 hover:bg-[#2C2C2E] transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${cat?.color || '#30D158'}20`, color: cat?.color || '#30D158' }}
                      >
                        <FigmaIcon name="receipt" size="sm" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{exp.title}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span style={{ color: cat?.color || '#30D158' }}>{cat?.name || 'General'}</span>
                          {acc && <span>• {acc.name}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-white">{formatZAR(exp.amount)}</div>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${spenderColor.bg} ${spenderColor.text}`}>
                          {isHubby ? 'Hubby' : isWifey ? 'Wifey' : 'Shared'}
                        </span>
                      </div>
                      {onOpenEditExpenseModal && (
                        <button
                          onClick={() => onOpenEditExpenseModal(exp)}
                          className="p-1 text-slate-400 hover:text-white rounded-[6px] hover:bg-white/10 cursor-pointer"
                          title="Edit transaction"
                        >
                          <FigmaIcon name="edit" size="sm" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* 2-COLUMN SECTION: CATEGORY ENVELOPE BREAKDOWN & FAMILY SPENDER SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Category Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] p-4 sm:p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-emerald-400" />
                  <span>Category Envelope Distribution</span>
                </h3>
                <p className="text-xs text-slate-400">Expenditure grouped by budget envelope</p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {categoryBreakdown.length} Envelopes
              </span>
            </div>

            {/* Donut Chart and List */}
            {categoryBreakdown.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">No categorized expenses</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                
                {/* Donut Mini Chart */}
                <div className="sm:col-span-5 h-44 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={65}
                        paddingAngle={3}
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: number) => [formatZAR(val), 'Spent']}
                        contentStyle={{ backgroundColor: '#2C2C2E', borderColor: 'rgba(255,255,255,0.15)', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Ranked Category List */}
                <div className="sm:col-span-7 space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                  {categoryBreakdown.slice(0, 6).map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)}
                      className={`p-2 rounded-[12px] border transition cursor-pointer flex items-center justify-between gap-2 ${
                        selectedCategory === cat.id
                          ? 'bg-[#2C2C2E] border-emerald-400'
                          : 'bg-[#2C2C2E]/40 border-white/[0.04] hover:bg-[#2C2C2E]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-xs font-medium text-slate-200 truncate">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                        <span className="font-bold text-white">{formatZAR(cat.amount)}</span>
                        <span className="text-[10px] text-slate-400 font-normal w-9 text-right">
                          {cat.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>

          {/* Envelope Progress Bars */}
          {categoryBreakdown.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-2">
              <div className="text-[11px] text-slate-400 font-medium">Top Category Volume Split</div>
              <div className="w-full bg-[#2C2C2E] rounded-full h-2 flex overflow-hidden">
                {categoryBreakdown.slice(0, 6).map((cat) => (
                  <div
                    key={cat.id}
                    className="h-full transition-all"
                    style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                    title={`${cat.name}: ${formatZAR(cat.amount)} (${cat.percentage.toFixed(1)}%)`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Family Member Spender Split (5 cols) */}
        <div className="lg:col-span-5 bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] p-4 sm:p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Spender Breakdown</span>
                </h3>
                <p className="text-xs text-slate-400">Hubby vs Wifey vs Shared logs</p>
              </div>
            </div>

            <div className="space-y-3">
              
              {/* Hubby Card */}
              <div 
                onClick={() => setSelectedSpender(selectedSpender === 'hubby' ? 'all' : 'hubby')}
                className={`p-3 rounded-[16px] border transition cursor-pointer ${
                  selectedSpender === 'hubby'
                    ? 'bg-[#30D158]/15 border-[#30D158]'
                    : 'bg-[#2C2C2E]/60 border-white/[0.06] hover:bg-[#2C2C2E]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-[8px] bg-[#30D158]/20 text-[#30D158] flex items-center justify-center font-bold text-[10px]">
                      H
                    </div>
                    <span className="font-bold text-white">Hubby</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-[#30D158]">{formatZAR(kpis.hubbyTotal)}</span>
                    <span className="text-xs font-bold text-[#30D158] bg-[#30D158]/15 px-1.5 py-0.2 rounded-full">
                      {kpis.hubbyPct.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-[#1C1C1E] rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-[#30D158] h-1.5 rounded-full" style={{ width: `${kpis.hubbyPct}%` }} />
                </div>
              </div>

              {/* Wifey Card */}
              <div 
                onClick={() => setSelectedSpender(selectedSpender === 'wifey' ? 'all' : 'wifey')}
                className={`p-3 rounded-[16px] border transition cursor-pointer ${
                  selectedSpender === 'wifey'
                    ? 'bg-[#FF375F]/15 border-[#FF375F]'
                    : 'bg-[#2C2C2E]/60 border-white/[0.06] hover:bg-[#2C2C2E]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-[8px] bg-[#FF375F]/20 text-[#FF375F] flex items-center justify-center font-bold text-[10px]">
                      W
                    </div>
                    <span className="font-bold text-white">Wifey</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-[#FF375F]">{formatZAR(kpis.wifeyTotal)}</span>
                    <span className="text-xs font-bold text-[#FF375F] bg-[#FF375F]/15 px-1.5 py-0.2 rounded-full">
                      {kpis.wifeyPct.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-[#1C1C1E] rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-[#FF375F] h-1.5 rounded-full" style={{ width: `${kpis.wifeyPct}%` }} />
                </div>
              </div>

              {/* Shared Card */}
              <div 
                onClick={() => setSelectedSpender(selectedSpender === 'shared' ? 'all' : 'shared')}
                className={`p-3 rounded-[16px] border transition cursor-pointer ${
                  selectedSpender === 'shared'
                    ? 'bg-[#64D2FF]/15 border-[#64D2FF]'
                    : 'bg-[#2C2C2E]/60 border-white/[0.06] hover:bg-[#2C2C2E]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-[8px] bg-[#64D2FF]/20 text-[#64D2FF] flex items-center justify-center font-bold text-[10px]">
                      S
                    </div>
                    <span className="font-bold text-white">Shared Household</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-[#64D2FF]">{formatZAR(kpis.sharedTotal)}</span>
                    <span className="text-xs font-bold text-[#64D2FF] bg-[#64D2FF]/15 px-1.5 py-0.2 rounded-full">
                      {kpis.sharedPct.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-[#1C1C1E] rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-[#64D2FF] h-1.5 rounded-full" style={{ width: `${kpis.sharedPct}%` }} />
                </div>
              </div>

            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-slate-400">
            Click any member card to filter the entire dashboard by their expenditures.
          </div>
        </div>

      </div>

      {/* 3-COLUMN SECTION: TOP MERCHANTS, DAY OF WEEK, & PAYMENT METHODS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* 1. Top Merchants Leaderboard */}
        <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] p-4 sm:p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Top Merchants / Payees</span>
              </h3>
              <span className="text-[11px] text-slate-500">By Amount</span>
            </div>

            {topMerchants.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">No merchant data</div>
            ) : (
              <div className="space-y-2">
                {topMerchants.map((m, idx) => (
                  <div
                    key={m.name}
                    className="p-2.5 bg-[#2C2C2E]/40 border border-white/[0.04] rounded-[14px] flex items-center justify-between gap-2 hover:bg-[#2C2C2E] transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-5 h-5 rounded-[6px] text-[10px] font-bold flex items-center justify-center shrink-0 ${
                        idx === 0 ? 'bg-amber-500/20 text-amber-300' : idx === 1 ? 'bg-slate-300/20 text-slate-200' : 'bg-white/5 text-slate-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{m.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span style={{ color: m.categoryColor }}>{m.categoryName}</span>
                          <span>•</span>
                          <span>{m.count} visit{m.count !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-white">{formatZAR(m.total)}</div>
                      <div className="text-[10px] text-slate-500">avg {formatZAR(m.avgPerSpend)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Day of Week Spending Heatmap */}
        <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] p-4 sm:p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>Day-of-Week Velocity</span>
              </h3>
              <span className="text-[11px] text-slate-500">Mon – Sun</span>
            </div>

            <div className="space-y-2.5 pt-1">
              {dayOfWeekAnalysis.map((day) => (
                <div key={day.dayIndex} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{day.fullDayName}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-white font-bold">{formatZAR(day.amount)}</span>
                      <span className="text-[10px] text-slate-400 w-7 text-right">{day.count}x</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#2C2C2E] rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        day.amount > 0 ? 'bg-sky-400' : 'bg-transparent'
                      }`}
                      style={{ width: `${day.barHeightPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-slate-400 flex items-center justify-between">
            <span>Peak Spending Period:</span>
            <span className="text-sky-300 font-bold">
              {dayOfWeekAnalysis.reduce((max, d) => (d.amount > max.amount ? d : max), dayOfWeekAnalysis[0])?.fullDayName || '—'}
            </span>
          </div>
        </div>

        {/* 3. Transaction Size Tiers & Accounts */}
        <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] p-4 sm:p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Ticket Size & Accounts</span>
              </h3>
              <span className="text-[11px] text-slate-500">Distribution</span>
            </div>

            {/* Size tiers */}
            <div className="space-y-2">
              <div className="text-[11px] text-slate-400 font-medium">By Purchase Amount</div>
              {sizeTierData.map((tier) => (
                <div key={tier.label} className="p-2 bg-[#2C2C2E]/40 border border-white/[0.04] rounded-[12px] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tier.color }} />
                    <span className="text-slate-300">{tier.label}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-white">{tier.count} items</span>
                    <span className="text-slate-400 text-[10px]">({formatZAR(tier.total)})</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Top Paid Accounts */}
            {accountBreakdown.length > 0 && (
              <div className="mt-3.5 pt-3 border-t border-white/[0.06] space-y-1.5">
                <div className="text-[11px] text-slate-400 font-medium">By Source Account</div>
                {accountBreakdown.slice(0, 3).map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between text-xs text-slate-300">
                    <span className="truncate">{acc.name}</span>
                    <span className="font-mono font-bold text-white">{formatZAR(acc.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
