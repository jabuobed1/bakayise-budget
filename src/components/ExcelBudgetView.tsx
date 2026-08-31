import React, { useState, useMemo } from 'react';
import { BudgetCategory, Expense, Income, CategoryGroup, FinancialAccount, AccountType, BudgetPeriod } from '../types';
import { CATEGORY_GROUPS, COMMON_CATEGORY_TAGS, ACCOUNT_TYPES, isExternalIncome, isExternalExpense } from '../utils/budgetConstants';
import { formatZAR, formatZARCompact, formatDateNice } from '../utils/southAfricaHolidays';
import { evaluateMathExpression, formatMathLivePreview, isMathExpression } from '../utils/mathEvaluator';
import { FigmaIcon, FigmaIconName } from './ui/FigmaIcon';
import { LastEditTag } from './ui/LastEditTag';
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  Clock,
  Tag,
  Download,
  Search,
  PieChart,
  ChevronDown,
  ChevronUp,
  Calculator,
  ArrowUp,
  ArrowDown,
  Copy,
  PlusCircle,
  CreditCard,
  Building2,
  Filter,
  CheckCircle2,
  MoreVertical,
  CornerDownRight,
  Sparkles,
  X,
  ChevronRight,
  ArrowRightLeft,
} from 'lucide-react';

interface ExcelBudgetViewProps {
  categories: BudgetCategory[];
  incomes: Income[];
  expenses: Expense[];
  accounts?: FinancialAccount[];
  accountBalances?: Record<string, number>;
  periods?: BudgetPeriod[]; // Added to allow copying to other cycles
  currentPeriod?: BudgetPeriod;
  onOpenAddCategoryModal: () => void;
  onOpenEditCategoryModal: (cat: BudgetCategory) => void;
  onDeleteCategory: (catId: string) => void;
  onUpdateCategory?: (catId: string, updates: Partial<BudgetCategory>) => void;
  onUpdateCategoryAllocation: (catId: string, amount: number) => void;
  onQuickAddCategoryRow: (name: string, tag: string, group: CategoryGroup, amount: number, isEssential: boolean, accountId?: string) => void;
  onInsertCategoryAt?: (targetIndex: number, newCat: Partial<BudgetCategory>) => void;
  onDuplicateCategory?: (cat: BudgetCategory, targetIndex: number) => void;
  onReorderCategories?: (reorderedCategories: BudgetCategory[]) => void;
  onOpenAddIncomeModal: () => void;
  onOpenEditIncomeModal: (inc: Income) => void;
  onUpdateIncome?: (incId: string, updates: Partial<Income>) => void;
  onDeleteIncome: (incId: string) => void;
  onInsertIncomeAt?: (targetIndex: number, newInc: Partial<Income>) => void;
  onDuplicateIncome?: (inc: Income, targetIndex: number) => void;
  onReorderIncomes?: (reorderedIncomes: Income[]) => void;
  onToggleIncomeStatus: (inc: Income) => void;
  onQuickLogExpense: (categoryId: string) => void;
  onOpenTagAnalysis: () => void;
  onOpenAddAccountModal?: () => void;
  onOpenEditPeriodModal?: () => void;
  onCopyToCycle?: (item: BudgetCategory | Income, targetPeriodId: string) => Promise<void>;
  onCopyWholeCycle?: (targetPeriodId: string) => Promise<void>;
}

export const ExcelBudgetView: React.FC<ExcelBudgetViewProps> = ({
  categories,
  incomes,
  expenses,
  accounts = [],
  accountBalances,
  periods = [],
  currentPeriod,
  onOpenAddCategoryModal,
  onOpenEditCategoryModal,
  onDeleteCategory,
  onUpdateCategory,
  onUpdateCategoryAllocation,
  onQuickAddCategoryRow,
  onInsertCategoryAt,
  onDuplicateCategory,
  onReorderCategories,
  onOpenAddIncomeModal,
  onOpenEditIncomeModal,
  onUpdateIncome,
  onDeleteIncome,
  onInsertIncomeAt,
  onDuplicateIncome,
  onReorderIncomes,
  onToggleIncomeStatus,
  onQuickLogExpense,
  onOpenTagAnalysis,
  onOpenAddAccountModal,
  onOpenEditPeriodModal,
  onCopyToCycle,
  onCopyWholeCycle,
}) => {
  // Search and Account Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('all');
  
  // Inline category editing state (name, tag, amount, accountId)
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatField, setEditingCatField] = useState<'name' | 'tag' | 'amount' | 'accountId' | null>(null);
  const [editingCatValue, setEditingCatValue] = useState<string>('');

  // Inline income editing state (title, sourceTag, amount, accountId)
  const [editingIncId, setEditingIncId] = useState<string | null>(null);
  const [editingIncField, setEditingIncField] = useState<'title' | 'sourceTag' | 'amount' | 'accountId' | null>(null);
  const [editingIncValue, setEditingIncValue] = useState<string>('');

  // Quick insert row state at the bottom of the table
  const [isInsertingRow, setIsInsertingRow] = useState<boolean>(false);
  const [newRowName, setNewRowName] = useState<string>('');
  const [newRowTag, setNewRowTag] = useState<string>('food');
  const [newRowAmount, setNewRowAmount] = useState<string>('');
  const [newRowAccountId, setNewRowAccountId] = useState<string>('');
  const [newRowIsEssential, setNewRowIsEssential] = useState<boolean>(true);

  // Inserting row between specific index
  const [insertingBetweenCatIndex, setInsertingBetweenCatIndex] = useState<number | null>(null);
  const [betweenRowName, setBetweenRowName] = useState<string>('');
  const [betweenRowAmount, setBetweenRowAmount] = useState<string>('');
  const [betweenRowTag, setBetweenRowTag] = useState<string>('food');
  const [betweenRowAccountId, setBetweenRowAccountId] = useState<string>('');

  // Inserting income between specific index
  const [insertingBetweenIncIndex, setInsertingBetweenIncIndex] = useState<number | null>(null);
  const [betweenIncTitle, setBetweenIncTitle] = useState<string>('');
  const [betweenIncAmount, setBetweenIncAmount] = useState<string>('');
  const [betweenIncTag, setBetweenIncTag] = useState<string>('salary');
  const [betweenIncAccountId, setBetweenIncAccountId] = useState<string>('');

  // Incomes table collapse state
  const [isIncomesCollapsed, setIsIncomesCollapsed] = useState<boolean>(false);

  // Top section (Incomes & Grand Totals) collapse state
  const [isTopSectionCollapsed, setIsTopSectionCollapsed] = useState<boolean>(true);

  // Copy to cycle modal state
  const [copyTargetItem, setCopyTargetItem] = useState<BudgetCategory | Income | 'whole_cycle' | null>(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  // Quick Account Map for lookup
  const accountMap = useMemo(() => {
    const map = new Map<string, FinancialAccount>();
    for (const acc of accounts) {
      map.set(acc.id, acc);
    }
    return map;
  }, [accounts]);

  const defaultAccountId = useMemo(
    () => accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || '',
    [accounts]
  );

  // Filter true eligible incomes (external incomes + eligible inter-account transfers)
  const externalIncomes = useMemo(() => {
    return incomes.filter((inc) => isExternalIncome(inc, accountMap));
  }, [incomes, accountMap]);

  // Dynamic budget capacity ledger per bank account
  const accountCapacityMap = useMemo(() => {
    const map: Record<
      string,
      {
        account: FinancialAccount;
        baseLiveBalance: number;
        expectedIncomes: number;
        totalIncomesInCycle: number;
        totalCapacity: number;
        totalBudgeted: number;
        remaining: number;
      }
    > = {};

    for (const acc of accounts) {
      const isCreditCard = acc.type === 'credit_card';
      const isFixedLiability =
        acc.type === 'loan' || acc.type === 'vehicle_loan' || acc.type === 'home_loan' || acc.type === 'store_card';

      const baseLiveBalance =
        acc.currentBalance !== undefined
          ? acc.currentBalance
          : acc.openingBalance || 0;

      // Incomes assigned to this account in the current pay cycle (both expected and received)
      const cycleIncomes = externalIncomes.filter(
        (inc) => (inc.accountId || defaultAccountId) === acc.id
      );
      const expectedIncomes = cycleIncomes
        .filter((inc) => inc.status === 'expected')
        .reduce((sum, inc) => sum + (inc.amount || 0), 0);
      const totalIncomesInCycle = cycleIncomes.reduce(
        (sum, inc) => sum + (inc.amount || 0),
        0
      );

      // Single-source budget capacity rule:
      // 1. Credit Card: Available spending limit (Credit Limit - Owed)
      // 2. Fixed Loans: Disallowed from spending capacity (0)
      // 3. Regular Bank & Tax Free Accounts: Total planned incomes assigned to this account for the budget cycle
      let totalCapacity = 0;
      if (isCreditCard) {
        const limit = acc.creditLimit || 0;
        const owed = acc.currentBalance ?? acc.balanceOwed ?? 0;
        totalCapacity = Math.max(0, limit - owed);
      } else if (isFixedLiability) {
        totalCapacity = 0;
      } else {
        // Standard bank / cash / tax-free accounts: total incomes in this cycle
        totalCapacity = totalIncomesInCycle;
      }

      // Sum all budgeted amounts for categories assigned to this account
      const totalBudgeted = categories
        .filter((cat) => {
          if (editingCatId === cat.id && editingCatField === 'accountId') {
            return (editingCatValue || defaultAccountId) === acc.id;
          }
          return (cat.defaultAccountId || defaultAccountId) === acc.id;
        })
        .reduce((sum, cat) => {
          if (editingCatId === cat.id && editingCatField === 'amount') {
            const parsed = evaluateMathExpression(editingCatValue);
            return sum + (parsed !== null && parsed >= 0 ? parsed : cat.allocatedAmount || 0);
          }
          return sum + (cat.allocatedAmount || 0);
        }, 0);

      const remaining = totalCapacity - totalBudgeted;

      map[acc.id] = {
        account: acc,
        baseLiveBalance,
        expectedIncomes,
        totalIncomesInCycle,
        totalCapacity,
        totalBudgeted,
        remaining,
      };
    }

    return map;
  }, [
    accounts,
    externalIncomes,
    categories,
    defaultAccountId,
    editingCatId,
    editingCatField,
    editingCatValue,
  ]);

  const getAccountCapacity = (accId?: string) => {
    const targetId = accId || defaultAccountId;
    return accountCapacityMap[targetId] || null;
  };

  // Filter true external expenses (exclude internal transfers between accounts)
  const externalExpenses = useMemo(() => {
    return expenses.filter(isExternalExpense);
  }, [expenses]);

  // Compute spent amount per category
  const spentByCategoryId = useMemo(() => {
    const map: Record<string, number> = {};
    const countMap: Record<string, number> = {};
    for (const exp of externalExpenses) {
      map[exp.categoryId] = (map[exp.categoryId] || 0) + exp.amount;
      countMap[exp.categoryId] = (countMap[exp.categoryId] || 0) + 1;
    }
    return { map, countMap };
  }, [externalExpenses]);

  // Total Planned & Received Incomes (True external income only)
  const totalPlannedIncome = useMemo(() => {
    return externalIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
  }, [externalIncomes]);

  const totalReceivedIncome = useMemo(() => {
    return externalIncomes
      .filter((inc) => inc.status === 'received')
      .reduce((sum, inc) => sum + (inc.amount || 0), 0);
  }, [externalIncomes]);

  // Total Budgeted & Actual Expenses (True external spending only)
  const totalBudgetedExpenses = useMemo(() => {
    return categories.reduce((sum, cat) => sum + (cat.allocatedAmount || 0), 0);
  }, [categories]);

  const totalActualSpent = useMemo(() => {
    return externalExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  }, [externalExpenses]);

  const unassignedZeroBased = totalPlannedIncome - totalBudgetedExpenses;
  const netBankBalance = totalReceivedIncome - totalActualSpent;

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesSearch =
        searchTerm === '' ||
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cat.tag && cat.tag.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesAccount =
        selectedAccountFilter === 'all' ||
        cat.defaultAccountId === selectedAccountFilter ||
        (!cat.defaultAccountId && selectedAccountFilter === 'unassigned');

      return matchesSearch && matchesAccount;
    });
  }, [categories, searchTerm, selectedAccountFilter]);

  // Filtered Incomes (True external incomes only)
  const filteredIncomes = useMemo(() => {
    return externalIncomes.filter((inc) => {
      const matchesSearch =
        searchTerm === '' ||
        inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inc.sourceTag && inc.sourceTag.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesAccount =
        selectedAccountFilter === 'all' ||
        inc.accountId === selectedAccountFilter ||
        (!inc.accountId && selectedAccountFilter === 'unassigned');

      return matchesSearch && matchesAccount;
    });
  }, [externalIncomes, searchTerm, selectedAccountFilter]);

  // Handle start inline edit of category fields
  const handleStartEditCategory = (cat: BudgetCategory, field: 'name' | 'tag' | 'amount' | 'accountId') => {
    setEditingCatId(cat.id);
    setEditingCatField(field);
    if (field === 'amount') setEditingCatValue(cat.allocatedAmount.toString());
    else if (field === 'name') setEditingCatValue(cat.name);
    else if (field === 'tag') setEditingCatValue(cat.tag || 'food');
    else if (field === 'accountId') setEditingCatValue(cat.defaultAccountId || '');
  };

  // Handle save inline edit of category fields
  const handleSaveCategoryField = (cat: BudgetCategory) => {
    if (!editingCatId || !editingCatField) return;

    if (editingCatField === 'amount') {
      const num = evaluateMathExpression(editingCatValue);
      if (num !== null && num >= 0) {
        if (onUpdateCategory) {
          onUpdateCategory(cat.id, { allocatedAmount: num });
        } else {
          onUpdateCategoryAllocation(cat.id, num);
        }
      }
    } else if (editingCatField === 'name') {
      const trimmed = editingCatValue.trim();
      if (trimmed && trimmed !== cat.name) {
        if (onUpdateCategory) {
          onUpdateCategory(cat.id, { name: trimmed });
        }
      }
    } else if (editingCatField === 'tag') {
      const trimmed = editingCatValue.trim().toLowerCase().replace(/^#/, '');
      if (trimmed && trimmed !== cat.tag) {
        let newGroup = cat.group;
        let newColor = cat.color;
        const tagMeta = COMMON_CATEGORY_TAGS.find((m) => m.id === trimmed);
        if (tagMeta) newColor = tagMeta.color;
        if (trimmed === 'bond' || trimmed === 'housing') newGroup = 'housing';
        else if (trimmed === 'debt') newGroup = 'debt_snowball';
        else if (trimmed === 'food') newGroup = 'food';
        else if (trimmed === 'transport') newGroup = 'transport';
        else if (trimmed === 'utilities') newGroup = 'utilities';
        else if (trimmed === 'health' || trimmed === 'insurance') newGroup = 'health_insurance';
        else if (trimmed === 'savings') newGroup = 'savings_goals';
        else if (trimmed === 'personal') newGroup = 'personal';
        else if (trimmed === 'entertainment' || trimmed === 'kids' || trimmed === 'lifestyle') newGroup = 'lifestyle';
        else if (trimmed === 'giving') newGroup = 'giving';

        if (onUpdateCategory) {
          onUpdateCategory(cat.id, { tag: trimmed, group: newGroup, color: newColor });
        }
      }
    } else if (editingCatField === 'accountId') {
      if (onUpdateCategory) {
        onUpdateCategory(cat.id, { defaultAccountId: editingCatValue || undefined });
      }
    }

    setEditingCatId(null);
    setEditingCatField(null);
    setEditingCatValue('');
  };

  // Handle start inline edit of income fields
  const handleStartEditIncome = (inc: Income, field: 'title' | 'sourceTag' | 'amount' | 'accountId') => {
    setEditingIncId(inc.id);
    setEditingIncField(field);
    if (field === 'amount') setEditingIncValue(inc.amount.toString());
    else if (field === 'title') setEditingIncValue(inc.title);
    else if (field === 'sourceTag') setEditingIncValue(inc.sourceTag || 'salary');
    else if (field === 'accountId') setEditingIncValue(inc.accountId || '');
  };

  // Handle save inline edit of income fields
  const handleSaveIncomeField = (inc: Income) => {
    if (!editingIncId || !editingIncField) return;

    if (editingIncField === 'amount') {
      const num = evaluateMathExpression(editingIncValue);
      if (num !== null && num >= 0) {
        if (onUpdateIncome) {
          onUpdateIncome(inc.id, { amount: num });
        }
      }
    } else if (editingIncField === 'title') {
      const trimmed = editingIncValue.trim();
      if (trimmed && trimmed !== inc.title) {
        if (onUpdateIncome) {
          onUpdateIncome(inc.id, { title: trimmed });
        }
      }
    } else if (editingIncField === 'sourceTag') {
      const trimmed = editingIncValue.trim().toLowerCase().replace(/^#/, '');
      if (trimmed && trimmed !== inc.sourceTag) {
        if (onUpdateIncome) {
          onUpdateIncome(inc.id, { sourceTag: trimmed });
        }
      }
    } else if (editingIncField === 'accountId') {
      if (onUpdateIncome) {
        onUpdateIncome(inc.id, { accountId: editingIncValue || undefined });
      }
    }

    setEditingIncId(null);
    setEditingIncField(null);
    setEditingIncValue('');
  };

  // Move Category Up / Down
  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const list = [...categories];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);

    if (onReorderCategories) {
      onReorderCategories(list);
    }
  };

  // Move Income Up / Down
  const handleMoveIncome = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= incomes.length) return;

    const list = [...incomes];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);

    if (onReorderIncomes) {
      onReorderIncomes(list);
    }
  };

  // Duplicate Category
  const handleDuplicateCat = (cat: BudgetCategory, index: number) => {
    if (onDuplicateCategory) {
      onDuplicateCategory(cat, index + 1);
    } else if (onQuickAddCategoryRow) {
      onQuickAddCategoryRow(
        `${cat.name} (Copy)`,
        cat.tag || 'food',
        cat.group,
        cat.allocatedAmount,
        cat.isEssential,
        cat.defaultAccountId
      );
    }
  };

  // Duplicate Income
  const handleDuplicateInc = (inc: Income, index: number) => {
    if (onDuplicateIncome) {
      onDuplicateIncome(inc, index + 1);
    }
  };

  // Save row inserted between categories
  const handleSaveInsertBetweenCat = (targetIndex: number) => {
    const num = evaluateMathExpression(betweenRowAmount);
    if (!betweenRowName.trim() || num === null || num < 0) return;

    let group: CategoryGroup = 'food';
    if (betweenRowTag === 'bond' || betweenRowTag === 'housing') group = 'housing';
    else if (betweenRowTag === 'debt') group = 'debt_snowball';
    else if (betweenRowTag === 'food') group = 'food';
    else if (betweenRowTag === 'transport') group = 'transport';
    else if (betweenRowTag === 'utilities') group = 'utilities';
    else if (betweenRowTag === 'health' || betweenRowTag === 'insurance') group = 'health_insurance';
    else if (betweenRowTag === 'savings') group = 'savings_goals';
    else if (betweenRowTag === 'personal') group = 'personal';
    else if (betweenRowTag === 'entertainment' || betweenRowTag === 'kids' || betweenRowTag === 'lifestyle') group = 'lifestyle';
    else if (betweenRowTag === 'giving') group = 'giving';

    const fallbackAcc = accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || '';
    const finalAccountId = betweenRowAccountId || fallbackAcc || undefined;

    if (onInsertCategoryAt) {
      onInsertCategoryAt(targetIndex, {
        name: betweenRowName.trim(),
        tag: betweenRowTag,
        group,
        allocatedAmount: num,
        defaultAccountId: finalAccountId,
        isEssential: true,
      });
    } else {
      onQuickAddCategoryRow(
        betweenRowName.trim(),
        betweenRowTag,
        group,
        num,
        true,
        finalAccountId
      );
    }

    setInsertingBetweenCatIndex(null);
    setBetweenRowName('');
    setBetweenRowAmount('');
    setBetweenRowAccountId('');
  };

  // Save row inserted between incomes
  const handleSaveInsertBetweenInc = (targetIndex: number) => {
    const num = evaluateMathExpression(betweenIncAmount);
    if (!betweenIncTitle.trim() || num === null || num < 0) return;

    const fallbackAcc = accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || '';
    const finalAccountId = betweenIncAccountId || fallbackAcc || undefined;

    if (onInsertIncomeAt) {
      onInsertIncomeAt(targetIndex, {
        title: betweenIncTitle.trim(),
        sourceTag: betweenIncTag,
        amount: num,
        accountId: finalAccountId,
        status: 'expected',
        type: 'primary_salary',
      });
    }

    setInsertingBetweenIncIndex(null);
    setBetweenIncTitle('');
    setBetweenIncAmount('');
    setBetweenIncAccountId('');
  };

  // Handle inline quick add category at the bottom
  const handleQuickAddRow = (e: React.FormEvent) => {
    e.preventDefault();
    const num = evaluateMathExpression(newRowAmount);
    if (!newRowName.trim() || num === null || num < 0) return;

    let group: CategoryGroup = 'food';
    if (newRowTag === 'bond' || newRowTag === 'housing') group = 'housing';
    else if (newRowTag === 'debt') group = 'debt_snowball';
    else if (newRowTag === 'food') group = 'food';
    else if (newRowTag === 'transport') group = 'transport';
    else if (newRowTag === 'utilities') group = 'utilities';
    else if (newRowTag === 'health' || newRowTag === 'insurance') group = 'health_insurance';
    else if (newRowTag === 'savings') group = 'savings_goals';
    else if (newRowTag === 'personal') group = 'personal';
    else if (newRowTag === 'entertainment' || newRowTag === 'kids' || newRowTag === 'lifestyle') group = 'lifestyle';
    else if (newRowTag === 'giving') group = 'giving';

    const fallbackAcc = accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || '';
    const finalAccountId = newRowAccountId || fallbackAcc || undefined;

    onQuickAddCategoryRow(
      newRowName.trim(),
      newRowTag,
      group,
      num,
      newRowIsEssential,
      finalAccountId
    );
    setNewRowName('');
    setNewRowAmount('');
    setNewRowAccountId('');
    setIsInsertingRow(false);
  };

  // Export spreadsheet as clean CSV
  const handleExportCSV = () => {
    const headers = [
      'Type of Transaction (Category)',
      'Tag',
      'Group',
      'Account',
      'Amount Budgeted (ZAR)',
      'Actual Spent (ZAR)',
      'Balance (ZAR)',
      'Status / % Spent',
    ];

    const rows = categories.map((cat) => {
      const spent = spentByCategoryId.map[cat.id] || 0;
      const balance = (cat.allocatedAmount || 0) - spent;
      const pct = cat.allocatedAmount > 0 ? ((spent / cat.allocatedAmount) * 100).toFixed(1) : '0';
      const acc = cat.defaultAccountId ? accountMap.get(cat.defaultAccountId)?.name || '' : '';
      return [
        `"${cat.name.replace(/"/g, '""')}"`,
        `"${cat.tag || ''}"`,
        `"${cat.group}"`,
        `"${acc}"`,
        cat.allocatedAmount.toFixed(2),
        spent.toFixed(2),
        balance.toFixed(2),
        `"${pct}%"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bakayise_budget_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. TOP SUMMARY: Zero-Based Bar & Account Filter */}
      <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] overflow-hidden shadow-2xl">
        
        {/* Header Ribbon */}
        <div className="px-4 py-3.5 bg-[#252528] border-b border-white/[0.08] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-[#107c41]/30 border border-[#107c41]/50 text-[#30D158] flex items-center justify-center font-black text-xs font-mono shrink-0">
              XL
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white tracking-tight truncate hidden sm:block">
                  Ledger Spreadsheet
                </span>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-tight">Income:</span>
                  <span className="text-[11px] text-emerald-300 font-mono font-bold">
                    {formatZAR(totalPlannedIncome)}
                  </span>
                </div>
                
                <button
                  onClick={() => {
                    setCopyTargetItem('whole_cycle');
                    setIsCopyModalOpen(true);
                  }}
                  className="flex items-center justify-center w-7 h-7 rounded-[8px] bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition active:scale-95 cursor-pointer shrink-0"
                  title="Copy this entire worksheet's budget data to another pay cycle"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsTopSectionCollapsed(!isTopSectionCollapsed)}
              className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-200 border border-white/10 transition active:scale-95 cursor-pointer"
              title={isTopSectionCollapsed ? 'Show Incomes & Overview' : 'Hide Summary'}
            >
              {isTopSectionCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Incomes & Balances Section */}
        {!isTopSectionCollapsed && (
          <>
            {/* Totals Quick Pill Grid */}
            <div className="p-4 sm:p-5 border-b border-white/[0.06] bg-[#18181A] grid grid-cols-2 lg:grid-cols-5 gap-2.5">
              {/* Opening Rollover Cash */}
              <div className="bg-[#242426] p-3 rounded-[16px] border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400 block">Opening Rollover Cash</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                    Prev Cycle
                  </span>
                </div>
                <span className="text-base font-bold font-mono text-emerald-400 block mt-0.5">
                  {formatZAR(currentPeriod?.openingFloatingBalance || 0)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5 truncate">Carried from last cycle</span>
              </div>

              {/* Total Planned Income */}
              <div className="bg-[#242426] p-3 rounded-[16px] border border-white/[0.06]">
                <span className="text-[10px] font-semibold text-slate-400 block">Cycle Planned Income</span>
                <span className="text-base font-bold font-mono text-[#30D158] block mt-0.5">
                  {formatZAR(totalPlannedIncome)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{incomes.length} Income Streams</span>
              </div>

              {/* Total Budgeted Expenses */}
              <div className="bg-[#242426] p-3 rounded-[16px] border border-white/[0.06]">
                <span className="text-[10px] font-semibold text-slate-400 block">Total Budget Envelopes</span>
                <span className="text-base font-bold font-mono text-[#0A84FF] block mt-0.5">
                  {formatZAR(totalBudgetedExpenses)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{categories.length} Envelopes</span>
              </div>

              <div className="bg-[#242426] p-3 rounded-[16px] border border-white/[0.06]">
                <span className="text-[10px] font-semibold text-slate-400 block">Unassigned Balance</span>
                <span
                  className={`text-base font-bold font-mono block mt-0.5 ${
                    Math.abs(unassignedZeroBased) < 0.01
                      ? 'text-[#30D158]'
                      : unassignedZeroBased > 0
                      ? 'text-[#FF9F0A]'
                      : 'text-[#FF453A]'
                  }`}
                >
                  {formatZAR(unassignedZeroBased)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {Math.abs(unassignedZeroBased) < 0.01 ? 'Every Rand assigned' : 'Plan all funds'}
                </span>
              </div>

              {/* Closing Floating Cash */}
              <div className="bg-[#242426] p-3 rounded-[16px] border border-sky-500/20 col-span-2 lg:col-span-1">
                <span className="text-[10px] font-semibold text-slate-400 block">Closing Floating Balance</span>
                <span
                  className={`text-base font-bold font-mono block mt-0.5 ${
                    (currentPeriod?.closingFloatingBalance || 0) >= 0 ? 'text-sky-400' : 'text-[#FF453A]'
                  }`}
                >
                  {formatZAR(currentPeriod?.closingFloatingBalance ?? (currentPeriod?.openingFloatingBalance || 0) + totalReceivedIncome - totalActualSpent)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Rolled to next cycle
                </span>
              </div>
            </div>

            {/* Incomes Spreadsheet Table */}
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                    Income Streams
                  </span>
                </div>
                
                <button
                  onClick={onOpenAddIncomeModal}
                  className="flex items-center justify-center p-2 sm:px-3 sm:py-1.5 rounded-[10px] bg-[#30D158]/20 hover:bg-[#30D158]/30 text-[#30D158] text-xs font-bold border border-[#30D158]/40 transition active:scale-95 cursor-pointer"
                  title="Add Income"
                >
                  <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5 stroke-[2.6]" />
                  <span className="hidden sm:inline ml-1">Add Income</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-[16px] border border-white/[0.08]">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-[#242426] text-slate-400 font-mono text-[11px] border-b border-white/[0.08]">
                      <th className="py-2.5 px-2 w-14 text-center font-normal border-r border-white/[0.08]">Order</th>
                      <th className="py-2.5 px-3 font-semibold text-slate-200 border-r border-white/[0.08] min-w-[180px]">Income Stream / Source</th>
                      <th className="py-2.5 px-3 font-semibold text-slate-300 border-r border-white/[0.08] w-28">Tag</th>
                      <th className="py-2.5 px-3 font-semibold text-slate-300 border-r border-white/[0.08] min-w-[140px]">Deposit Account</th>
                      <th className="py-2.5 px-3 font-semibold text-slate-300 border-r border-white/[0.08] text-right w-32">Budgeted (R)</th>
                      <th className="py-2.5 px-3 font-semibold text-slate-300 border-r border-white/[0.08] text-right w-32">Actual Received</th>
                      <th className="py-2.5 px-3 font-semibold text-slate-300 border-r border-white/[0.08] text-center w-28">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-slate-300 text-center w-36">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] bg-[#1C1C1E]">
                    {filteredIncomes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <p className="text-slate-300 font-semibold">No income streams logged yet</p>
                            <p className="text-slate-500 text-[11px]">
                              Add your salary, side hustle, or funds and link to your Capitec / bank account.
                            </p>
                        <button
                          onClick={onOpenAddIncomeModal}
                          className="mt-1 flex items-center justify-center p-2.5 rounded-[10px] bg-[#30D158] hover:bg-[#34C759] text-black font-bold text-xs transition active:scale-95 cursor-pointer shadow-md"
                          title="Add Salary / Income Stream"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="hidden sm:inline ml-1.5">Add Salary / Income Stream</span>
                        </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredIncomes.map((inc, index) => {
                        const isReceived = inc.status === 'received';
                        const isTransfer =
                          inc.isTransfer === true ||
                          inc.incomeClassification === 'internal_transfer' ||
                          Boolean(inc.transferId) ||
                          inc.sourceTag === 'Internal Transfer' ||
                          (inc.title && (inc.title.startsWith('Transfer from ') || inc.title.startsWith('ATM Cash Deposit')));
                        const isEditingTitle = editingIncId === inc.id && editingIncField === 'title';
                        const isEditingTag = editingIncId === inc.id && editingIncField === 'sourceTag';
                        const isEditingAmount = editingIncId === inc.id && editingIncField === 'amount';
                        const isEditingAccount = editingIncId === inc.id && editingIncField === 'accountId';
                        const linkedAcc = inc.accountId ? accountMap.get(inc.accountId) : null;

                        return (
                          <React.Fragment key={inc.id}>
                            <tr className="hover:bg-white/[0.03] transition-colors group">
                              {/* Reorder Up/Down & Index */}
                              <td className="py-2 px-1.5 text-center text-slate-500 font-mono text-[11px] border-r border-white/[0.06] bg-black/10">
                                <div className="flex items-center justify-center gap-0.5">
                                  <span className="w-3 text-center">{index + 1}</span>
                                  <div className="flex flex-col">
                                    <button
                                      onClick={() => handleMoveIncome(index, 'up')}
                                      disabled={index === 0}
                                      title="Move Up"
                                      className="p-0.5 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer"
                                    >
                                      <ArrowUp className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      onClick={() => handleMoveIncome(index, 'down')}
                                      disabled={index === filteredIncomes.length - 1}
                                      title="Move Down"
                                      className="p-0.5 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer"
                                    >
                                      <ArrowDown className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                </div>
                              </td>

                              {/* Income Stream Title (Inline Editable) */}
                              <td
                                className="py-2 px-3 font-bold text-white border-r border-white/[0.06] cursor-pointer hover:bg-white/[0.02]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isEditingTitle) handleStartEditIncome(inc, 'title');
                                }}
                                title="Click to edit income title"
                              >
                                {isEditingTitle ? (
                                  <input
                                    type="text"
                                    value={editingIncValue}
                                    onChange={(e) => setEditingIncValue(e.target.value)}
                                    onBlur={() => handleSaveIncomeField(inc)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveIncomeField(inc);
                                      if (e.key === 'Escape') {
                                        setEditingIncId(null);
                                        setEditingIncField(null);
                                      }
                                    }}
                                    autoFocus
                                    className="w-full bg-[#1C1C1E] border-2 border-[#30D158] text-white px-2 py-0.5 rounded-[6px] font-bold text-xs focus:outline-none shadow-lg"
                                  />
                                ) : (
                                  <div className="flex items-center justify-between gap-2 group/title">
                                    <div className="flex items-center gap-2 truncate">
                                      {isTransfer && (
                                        <div className="w-5 h-5 rounded-[6px] bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
                                          <ArrowRightLeft className="w-3 h-3" />
                                        </div>
                                      )}
                                      <span className={`truncate group-hover/title:underline decoration-dashed decoration-slate-500 underline-offset-4 transition ${isTransfer ? 'group-hover/title:text-sky-300' : 'group-hover/title:text-emerald-400'}`}>
                                        {inc.title}
                                      </span>
                                      {inc.notes && <span className="text-[10px] text-slate-400 italic font-normal shrink-0">({inc.notes})</span>}
                                      <LastEditTag
                                        lastEditedBy={inc.lastEditedBy}
                                        lastEditedByEmail={inc.lastEditedByEmail}
                                        lastEditedAt={inc.lastEditedAt}
                                        compact
                                      />
                                    </div>
                                    <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover/title:opacity-100 transition shrink-0" />
                                  </div>
                                )}
                              </td>

                              {/* Income Tag (Inline Editable) */}
                              <td
                                className="py-2 px-3 border-r border-white/[0.06] cursor-pointer hover:bg-white/[0.02]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isEditingTag) handleStartEditIncome(inc, 'sourceTag');
                                }}
                                title="Click to edit tag"
                              >
                                {isEditingTag ? (
                                  <input
                                    type="text"
                                    value={editingIncValue}
                                    onChange={(e) => setEditingIncValue(e.target.value)}
                                    onBlur={() => handleSaveIncomeField(inc)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveIncomeField(inc);
                                      if (e.key === 'Escape') {
                                        setEditingIncId(null);
                                        setEditingIncField(null);
                                      }
                                    }}
                                    autoFocus
                                    className={`w-24 bg-[#1C1C1E] border-2 ${isTransfer ? 'border-sky-400' : 'border-[#30D158]'} text-white px-1.5 py-0.5 rounded-[6px] font-mono text-[10px] focus:outline-none shadow-lg`}
                                  />
                                ) : (
                                  <div className="flex items-center justify-between gap-1 group/tag">
                                    {isTransfer ? (
                                      <span className="px-2 py-0.5 rounded-[8px] bg-sky-500/15 text-sky-300 border border-sky-500/30 font-mono text-[10px] font-bold inline-flex items-center gap-1 group-hover/tag:bg-sky-500/25 transition">
                                        <ArrowRightLeft className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                                        <span>#{inc.sourceTag || 'Transfer'}</span>
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-[8px] bg-white/10 text-slate-300 font-mono text-[10px] group-hover/tag:bg-white/20 transition">
                                        #{inc.sourceTag || 'salary'}
                                      </span>
                                    )}
                                    <Edit2 className="w-2.5 h-2.5 text-slate-500 opacity-0 group-hover/tag:opacity-100 transition shrink-0" />
                                  </div>
                                )}
                              </td>

                              {/* Linked Account (Inline Dropdown) */}
                              <td className="py-2 px-3 border-r border-white/[0.06]">
                                <select
                                  value={inc.accountId || ''}
                                  onChange={(e) => {
                                    if (onUpdateIncome) {
                                      onUpdateIncome(inc.id, { accountId: e.target.value || undefined });
                                    }
                                  }}
                                  className="w-full bg-[#252528] hover:bg-[#2C2C2E] border border-white/10 text-slate-200 text-[11px] font-semibold py-1 px-2 rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#30D158] cursor-pointer"
                                >
                                  <option value="" disabled>
                                    Select Account
                                  </option>
                                  {accounts
                                    .filter((acc) => !['home_loan', 'vehicle_loan', 'loan', 'store_card'].includes(acc.type))
                                    .map((acc) => {
                                      const isCreditCard = acc.type === 'credit_card';
                                      const creditLimit = acc.creditLimit || 0;
                                      const balOwed = acc.currentBalance ?? acc.balanceOwed ?? 0;
                                      const availableCredit = Math.max(0, creditLimit - balOwed);
                                      const bal = acc.currentBalance ?? acc.openingBalance ?? 0;
                                      return (
                                        <option key={acc.id} value={acc.id} className="bg-[#1C1C1E] text-slate-200">
                                          {acc.name} ({isCreditCard ? `Avail: ${formatZARCompact(availableCredit)}` : `Bal: ${formatZARCompact(bal)}`})
                                        </option>
                                      );
                                    })}
                                </select>
                              </td>

                            {/* Income Planned Amount (Inline Editable with Calculator) */}
                            <td
                              className="py-2 px-3 text-right font-mono font-bold text-[#30D158] border-r border-white/[0.06] cursor-pointer hover:bg-white/[0.02]"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isEditingAmount) handleStartEditIncome(inc, 'amount');
                              }}
                              title="Click to edit planned income (Supports +, -, *, /)"
                            >
                              {isEditingAmount ? (
                                <div className="relative flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-slate-400 text-xs">R</span>
                                  <input
                                    type="text"
                                    inputMode="text"
                                    value={editingIncValue}
                                    onChange={(e) => setEditingIncValue(e.target.value)}
                                    onBlur={() => handleSaveIncomeField(inc)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveIncomeField(inc);
                                      if (e.key === 'Escape') {
                                        setEditingIncId(null);
                                        setEditingIncField(null);
                                      }
                                    }}
                                    autoFocus
                                    className="w-24 bg-[#1C1C1E] border-2 border-[#30D158] text-white px-2 py-0.5 rounded-[6px] text-right font-mono font-bold text-xs focus:outline-none shadow-lg"
                                  />
                                  {isMathExpression(editingIncValue) && (
                                    <div className="absolute right-0 top-full mt-1 z-30 bg-[#1C1C1E] border border-[#30D158]/50 px-2 py-0.5 rounded text-[10px] font-mono text-[#30D158] font-bold shadow-xl whitespace-nowrap flex items-center gap-1">
                                      <Calculator className="w-3 h-3 text-[#30D158]" />
                                      <span>= {formatMathLivePreview(editingIncValue)}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5 group/amt">
                                  <span className="group-hover/amt:underline decoration-dashed decoration-slate-600 underline-offset-4 transition">
                                    {formatZAR(inc.amount)}
                                  </span>
                                  <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover/amt:opacity-100 transition shrink-0" />
                                </div>
                              )}
                            </td>

                            {/* Actual Received */}
                            <td className="py-2 px-3 text-right font-mono font-bold text-white border-r border-white/[0.06]">
                              {isReceived ? formatZAR(inc.amount) : 'R 0.00'}
                            </td>

                            {/* Status */}
                            <td className="py-2 px-3 text-center border-r border-white/[0.06]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('[DEBUG LOG][ExcelBudgetView] Status button clicked for income:', {
                                    incomeId: inc.id,
                                    incomeTitle: inc.title,
                                    currentStatus: inc.status,
                                    amount: inc.amount,
                                    accountId: inc.accountId,
                                    periodId: inc.periodId,
                                    workspaceId: inc.workspaceId,
                                    householdId: inc.householdId,
                                    timestamp: new Date().toISOString(),
                                  });
                                  onToggleIncomeStatus(inc);
                                }}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                                  isReceived
                                    ? 'bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/40 hover:bg-[#30D158]/30'
                                    : 'bg-[#FF9F0A]/20 text-[#FF9F0A] border border-[#FF9F0A]/40 hover:bg-[#FF9F0A]/30'
                                }`}
                              >
                                {isReceived ? (
                                  <>
                                    <Check className="w-3 h-3 stroke-[3]" />
                                    <span>Received</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3" />
                                    <span>Expected</span>
                                  </>
                                )}
                              </button>
                            </td>

                            {/* Actions: Edit, Delete */}
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => {
                                    setCopyTargetItem(inc);
                                    setIsCopyModalOpen(true);
                                  }}
                                  className="w-6 h-6 rounded-[6px] flex items-center justify-center text-slate-400 hover:text-sky-400 hover:bg-white/10 transition cursor-pointer"
                                  title="Copy this income to another pay cycle"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onOpenEditIncomeModal(inc)}
                                  className="w-6 h-6 rounded-[6px] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                                  title="Edit in Modal"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteIncome(inc.id)}
                                  className="w-6 h-6 rounded-[6px] flex items-center justify-center text-slate-500 hover:text-[#FF453A] hover:bg-white/10 transition cursor-pointer"
                                  title="Delete Income"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Row Insertion Bar (Between Incomes) */}
                          {insertingBetweenIncIndex === index && (
                            <tr className="bg-emerald-950/30 border-y border-[#30D158]/50 animate-in fade-in duration-150">
                              <td className="py-2 px-2 text-center text-emerald-400 font-mono text-[10px]">
                                <CornerDownRight className="w-3.5 h-3.5 mx-auto" />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  placeholder="New income stream title..."
                                  value={betweenIncTitle}
                                  onChange={(e) => setBetweenIncTitle(e.target.value)}
                                  autoFocus
                                  className="w-full bg-[#1C1C1E] border border-emerald-500/50 text-white px-2 py-1 rounded-[6px] text-xs focus:outline-none"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  placeholder="tag"
                                  value={betweenIncTag}
                                  onChange={(e) => setBetweenIncTag(e.target.value)}
                                  className="w-full bg-[#1C1C1E] border border-emerald-500/50 text-white px-2 py-1 rounded-[6px] text-xs font-mono"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <select
                                  value={betweenIncAccountId}
                                  onChange={(e) => setBetweenIncAccountId(e.target.value)}
                                  className="w-full bg-[#1C1C1E] border border-emerald-500/50 text-white px-2 py-1 rounded-[6px] text-xs"
                                >
                                  <option value="" disabled>
                                    Select Account
                                  </option>
                                  {accounts
                                    .filter((acc) => !['home_loan', 'vehicle_loan', 'loan', 'store_card'].includes(acc.type))
                                    .map((acc) => {
                                      const isCreditCard = acc.type === 'credit_card';
                                      const creditLimit = acc.creditLimit || 0;
                                      const balOwed = acc.currentBalance ?? acc.balanceOwed ?? 0;
                                      const availableCredit = Math.max(0, creditLimit - balOwed);
                                      const bal = acc.currentBalance ?? acc.openingBalance ?? 0;
                                      return (
                                        <option key={acc.id} value={acc.id} className="bg-[#1C1C1E] text-slate-200">
                                          {acc.name} ({isCreditCard ? `Avail: ${formatZARCompact(availableCredit)}` : `Bal: ${formatZARCompact(bal)}`})
                                        </option>
                                      );
                                    })}
                                </select>
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  placeholder="Amount (e.g. 1500)"
                                  value={betweenIncAmount}
                                  onChange={(e) => setBetweenIncAmount(e.target.value)}
                                  className="w-full bg-[#1C1C1E] border border-emerald-500/50 text-white px-2 py-1 rounded-[6px] text-xs text-right font-mono"
                                />
                              </td>
                              <td colSpan={3} className="py-2 px-2 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setInsertingBetweenIncIndex(null)}
                                    className="px-2.5 py-1 rounded-[6px] bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveInsertBetweenInc(index + 1)}
                                    className="px-3 py-1 rounded-[6px] bg-[#30D158] text-black font-bold text-xs cursor-pointer shadow-md"
                                  >
                                    Insert Here
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    }))}

                    {/* Quick Insert Income Row at bottom */}
                    <tr>
                      <td colSpan={8} className="py-2.5 px-3 bg-[#1C1C1E]/50 border-t border-white/[0.06]">
                        <button
                          onClick={onOpenAddIncomeModal}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#30D158]/15 hover:bg-[#30D158]/25 text-[#30D158] text-xs font-bold border border-[#30D158]/30 transition active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.6]" />
                          <span>+ Add Income Row</span>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#242426] border-t-2 border-emerald-500/40 font-mono font-bold text-xs">
                      <td colSpan={4} className="py-2.5 px-3 text-emerald-400 uppercase tracking-wider">
                        TOTAL INCOMES
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#30D158] font-extrabold border-r border-white/[0.06]">
                        {formatZAR(totalPlannedIncome)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-white font-extrabold border-r border-white/[0.06]">
                        {formatZAR(totalReceivedIncome)}
                      </td>
                      <td colSpan={2} className="py-2.5 px-3 text-center text-slate-400 text-[11px]">
                        {totalPlannedIncome > 0
                          ? `${((totalReceivedIncome / totalPlannedIncome) * 100).toFixed(0)}% Collected`
                          : '0%'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 2. MAIN SPREADSHEET GRID: EXPENSE CATEGORIES & ENVELOPES */}
      <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] overflow-hidden shadow-2xl">
        
        {/* Table Title Bar with Account Filter, Search & Actions */}
        <div className="px-4 py-3 bg-[#242426] border-b border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
              [Sheet1: Expense Allocations]
            </span>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Type of Transaction (Category) Ledger
            </h3>
            <span className="text-xs text-slate-400">
              ({filteredCategories.length} items)
            </span>
          </div>

          {/* Controls: Account Filter, Search Box, CSV Export */}
          <div className="flex items-center gap-2.5 flex-wrap">
            
            {/* Filter by Financial Account */}
            {accounts.length > 0 && (
              <div className="flex items-center gap-1.5 bg-[#2C2C2E] border border-white/10 px-2.5 py-1 rounded-[12px]">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                <select
                  value={selectedAccountFilter}
                  onChange={(e) => setSelectedAccountFilter(e.target.value)}
                  className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-[#1C1C1E]">All Accounts ({categories.length})</option>
                  {accounts.map((acc) => {
                    const count = categories.filter((c) => c.defaultAccountId === acc.id).length;
                    return (
                      <option key={acc.id} value={acc.id} className="bg-[#1C1C1E]">
                        {acc.name} ({count})
                      </option>
                    );
                  })}
                  <option value="unassigned" className="bg-[#1C1C1E]">Unlinked Accounts</option>
                </select>
              </div>
            )}

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Find in sheet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#2C2C2E] border border-white/10 text-white pl-8 pr-3 py-1.5 rounded-[12px] text-xs focus:outline-none focus:ring-1 focus:ring-[#30D158] placeholder:text-slate-500 w-32 sm:w-40"
              />
            </div>

            {/* Tag Analysis Button */}
            <button
              onClick={onOpenTagAnalysis}
              title="Detailed Tag Analysis"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-[12px] bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-200 text-xs font-semibold border border-white/10 transition cursor-pointer"
            >
              <PieChart className="w-3.5 h-3.5 text-[#BF5AF2]" />
              <span className="hidden sm:inline">Analysis</span>
            </button>

            {/* CSV Export Button */}
            <button
              onClick={handleExportCSV}
              title="Export as CSV / Excel"
              className="p-1.5 rounded-[12px] bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-300 hover:text-white border border-white/10 transition active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* The Spreadsheet Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-[#2C2C2E] text-slate-400 font-mono text-[11px] border-b border-white/[0.08]">
                <th className="py-2.5 px-2 w-14 text-center font-normal border-r border-white/[0.08] bg-[#242426]">
                  Order
                </th>
                <th className="py-2.5 px-4 font-bold text-white border-r border-white/[0.08] min-w-[200px]">
                  <span>[A] Type of Transaction (Category)</span>
                </th>
                <th className="py-2.5 px-3 font-semibold text-slate-300 border-r border-white/[0.08] w-28">
                  <span>[B] Tag</span>
                </th>
                <th className="py-2.5 px-3 font-semibold text-slate-300 border-r border-white/[0.08] min-w-[140px]">
                  <span>[C] Linked Account</span>
                </th>
                <th className="py-2.5 px-3 font-semibold text-slate-300 border-r border-white/[0.08] text-right w-32">
                  <span>[D] Budgeted (R)</span>
                </th>
                <th className="py-2.5 px-3 font-semibold text-slate-300 border-r border-white/[0.08] text-right w-32">
                  <span>[E] Actual (R)</span>
                </th>
                <th className="py-2.5 px-3 font-semibold text-slate-300 border-r border-white/[0.08] text-right w-32">
                  <span>[F] Balance / Left</span>
                </th>
                <th className="py-2.5 px-3 font-semibold text-slate-300 border-r border-white/[0.08] text-center w-24">
                  <span>[G] % Spent</span>
                </th>
                <th className="py-2.5 px-3 font-semibold text-slate-300 text-center w-36">
                  <span>[H] Actions</span>
                </th>
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody className="divide-y divide-white/[0.04] font-normal bg-[#1C1C1E]">
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 px-4 text-center text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-md mx-auto">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#30D158] flex items-center justify-center font-bold">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <p className="text-white font-bold text-sm">Worksheet is Clean & Ready</p>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        You have a completely fresh slate. Add your budget envelopes (e.g. Groceries, Rent, Fuel, Emergency Fund) and assign them to your bank accounts.
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => setIsInsertingRow(true)}
                          className="flex items-center justify-center p-2.5 sm:px-3.5 sm:py-2 rounded-[10px] bg-[#30D158] hover:bg-[#34C759] text-black font-bold text-xs transition active:scale-95 cursor-pointer shadow-md"
                          title="Add First Category Row"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          <span className="hidden sm:inline ml-1.5">Add Row</span>
                        </button>
                        <button
                          onClick={onOpenAddCategoryModal}
                          className="flex items-center justify-center p-2.5 sm:px-3.5 sm:py-2 rounded-[10px] bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold border border-white/10 transition cursor-pointer"
                          title="Category Builder"
                        >
                          <Edit2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          <span className="hidden sm:inline ml-1.5">Builder</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat, index) => {
                  const spent = spentByCategoryId.map[cat.id] || 0;
                  const allocated = cat.allocatedAmount || 0;
                  const balance = allocated - spent;
                  const percentage = allocated > 0 ? (spent / allocated) * 100 : 0;
                  const isOver = spent > allocated;
                  const receiptCount = spentByCategoryId.countMap[cat.id] || 0;
                  const tagMeta = COMMON_CATEGORY_TAGS.find((m) => m.id === (cat.tag || '').toLowerCase());
                  const isEditingName = editingCatId === cat.id && editingCatField === 'name';
                  const isEditingTag = editingCatId === cat.id && editingCatField === 'tag';
                  const isEditingAmount = editingCatId === cat.id && editingCatField === 'amount';
                  const linkedAcc = cat.defaultAccountId ? accountMap.get(cat.defaultAccountId) : null;

                  return (
                    <React.Fragment key={cat.id}>
                      <tr className="hover:bg-white/[0.03] transition-colors group">
                        
                        {/* Order & Reorder Up/Down */}
                        <td className="py-2 px-1.5 text-center text-slate-500 font-mono text-[11px] border-r border-white/[0.06] bg-black/10">
                          <div className="flex items-center justify-center gap-0.5">
                            <span className="w-3 text-center">{index + 1}</span>
                            <div className="flex flex-col">
                              <button
                                onClick={() => handleMoveCategory(index, 'up')}
                                disabled={index === 0}
                                title="Move row up"
                                className="p-0.5 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer"
                              >
                                <ArrowUp className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={() => handleMoveCategory(index, 'down')}
                                disabled={index === filteredCategories.length - 1}
                                title="Move row down"
                                className="p-0.5 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer"
                              >
                                <ArrowDown className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* [A] Type of Transaction / Category Name (Inline Editable) */}
                        <td
                          className="py-2.5 px-4 font-bold text-white border-r border-white/[0.06] cursor-pointer hover:bg-white/[0.02]"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isEditingName) handleStartEditCategory(cat, 'name');
                          }}
                          title="Click to edit category name"
                        >
                          {isEditingName ? (
                            <input
                              type="text"
                              value={editingCatValue}
                              onChange={(e) => setEditingCatValue(e.target.value)}
                              onBlur={() => handleSaveCategoryField(cat)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCategoryField(cat);
                                if (e.key === 'Escape') {
                                  setEditingCatId(null);
                                  setEditingCatField(null);
                                }
                              }}
                              autoFocus
                              className="w-full bg-[#1C1C1E] border-2 border-[#30D158] text-white px-2 py-1 rounded-[6px] font-bold text-xs focus:outline-none shadow-lg"
                            />
                          ) : (
                            <div className="flex items-center justify-between gap-2 group/title">
                              <div className="flex items-center gap-2 truncate">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: cat.color || '#3b82f6' }}
                                />
                                <span className="truncate group-hover/title:text-emerald-400 group-hover/title:underline decoration-dashed decoration-slate-500 underline-offset-4 transition">
                                  {cat.name}
                                </span>
                                {cat.isEssential && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold shrink-0">
                                    Essential
                                  </span>
                                )}
                                <LastEditTag
                                  lastEditedBy={cat.lastEditedBy}
                                  lastEditedByEmail={cat.lastEditedByEmail}
                                  lastEditedAt={cat.lastEditedAt}
                                  compact
                                />
                              </div>
                              <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover/title:opacity-100 transition shrink-0" />
                            </div>
                          )}
                        </td>

                        {/* [B] Classification Tag (Inline Editable) */}
                        <td
                          className="py-2.5 px-3 border-r border-white/[0.06] cursor-pointer hover:bg-white/[0.02]"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isEditingTag) handleStartEditCategory(cat, 'tag');
                          }}
                          title="Click to change classification tag"
                        >
                          {isEditingTag ? (
                            <input
                              type="text"
                              value={editingCatValue}
                              onChange={(e) => setEditingCatValue(e.target.value)}
                              onBlur={() => handleSaveCategoryField(cat)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCategoryField(cat);
                                if (e.key === 'Escape') {
                                  setEditingCatId(null);
                                  setEditingCatField(null);
                                }
                              }}
                              autoFocus
                              className="w-20 bg-[#1C1C1E] border-2 border-[#30D158] text-white px-1.5 py-0.5 rounded-[6px] font-mono text-[10px] focus:outline-none shadow-lg"
                            />
                          ) : (
                            <div className="flex items-center justify-between gap-1 group/tag">
                              <span
                                className="px-2 py-0.5 rounded-[8px] font-mono text-[10px] font-semibold border flex items-center gap-1 truncate"
                                style={{
                                  backgroundColor: tagMeta ? `${tagMeta.color}15` : 'rgba(255,255,255,0.06)',
                                  color: tagMeta ? tagMeta.color : '#e2e8f0',
                                  borderColor: tagMeta ? `${tagMeta.color}30` : 'rgba(255,255,255,0.1)',
                                }}
                              >
                                #{cat.tag || 'other'}
                              </span>
                              <Edit2 className="w-2.5 h-2.5 text-slate-500 opacity-0 group-hover/tag:opacity-100 transition shrink-0" />
                            </div>
                          )}
                        </td>

                        {/* [C] Linked Account (Inline Dropdown) */}
                        <td className="py-2.5 px-3 border-r border-white/[0.06]">
                          <select
                            value={cat.defaultAccountId || ''}
                            onChange={(e) => {
                              if (onUpdateCategory) {
                                onUpdateCategory(cat.id, { defaultAccountId: e.target.value || undefined });
                              }
                            }}
                            className="w-full bg-[#252528] hover:bg-[#2C2C2E] border border-white/10 text-slate-200 text-[11px] font-semibold py-1 px-2 rounded-[8px] focus:outline-none focus:ring-1 focus:ring-[#30D158] cursor-pointer"
                          >
                            <option value="" disabled>
                              Select Account
                            </option>
                            {accounts
                              .filter((acc) => !['home_loan', 'vehicle_loan', 'loan', 'store_card'].includes(acc.type))
                              .map((acc) => {
                                const cap = accountCapacityMap[acc.id];
                                const rem = cap ? cap.remaining : 0;
                                return (
                                  <option key={acc.id} value={acc.id} className="bg-[#1C1C1E] text-slate-200">
                                    {acc.name} (Avail: {formatZARCompact(rem)})
                                  </option>
                                );
                              })}
                          </select>
                        </td>

                        {/* [D] Amount Budgeted (Inline Editable with Math Calculator & Real-Time Account Capacity Badge) */}
                        <td
                          className="py-2 px-3 text-right font-mono font-bold text-white border-r border-white/[0.06] cursor-pointer hover:bg-white/[0.02]"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isEditingAmount) handleStartEditCategory(cat, 'amount');
                          }}
                          title="Click to edit budgeted amount (Supports +, -, *, /)"
                        >
                          {(() => {
                            const targetCap = getAccountCapacity(cat.defaultAccountId);
                            return isEditingAmount ? (
                              <div className="relative flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
                                {targetCap && (
                                  <div className="flex items-center justify-end">
                                    <span
                                      className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap shadow-sm ${
                                        targetCap.remaining >= 0
                                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                      }`}
                                      title={`${targetCap.account.name}: ${formatZAR(targetCap.totalCapacity)} cycle funds − ${formatZAR(targetCap.totalBudgeted)} total budgeted = ${formatZAR(targetCap.remaining)} remaining`}
                                    >
                                      {targetCap.remaining >= 0
                                        ? `Avail: ${formatZARCompact(targetCap.remaining)}`
                                        : `Over: ${formatZARCompact(targetCap.remaining)}`}
                                    </span>
                                  </div>
                                )}
                                <div className="relative flex items-center justify-end gap-1">
                                  <span className="text-slate-400 text-xs">R</span>
                                  <input
                                    type="text"
                                    inputMode="text"
                                    value={editingCatValue}
                                    onChange={(e) => setEditingCatValue(e.target.value)}
                                    onBlur={() => handleSaveCategoryField(cat)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveCategoryField(cat);
                                      if (e.key === 'Escape') {
                                        setEditingCatId(null);
                                        setEditingCatField(null);
                                      }
                                    }}
                                    autoFocus
                                    className="w-24 bg-[#1C1C1E] border-2 border-[#30D158] text-white px-2 py-0.5 rounded-[6px] text-right font-mono font-bold text-xs focus:outline-none shadow-lg"
                                  />
                                  {isMathExpression(editingCatValue) && (
                                    <div className="absolute right-0 top-full mt-1 z-30 bg-[#1C1C1E] border border-[#30D158]/50 px-2 py-0.5 rounded text-[10px] font-mono text-[#30D158] font-bold shadow-xl whitespace-nowrap flex items-center gap-1">
                                      <Calculator className="w-3 h-3 text-[#30D158]" />
                                      <span>= {formatMathLivePreview(editingCatValue)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-end gap-0.5 group/amt">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="group-hover/amt:underline decoration-dashed decoration-slate-600 underline-offset-4 transition">
                                    {formatZAR(allocated)}
                                  </span>
                                  <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover/amt:opacity-100 transition shrink-0" />
                                </div>
                                {targetCap && (
                                  <span
                                    className={`text-[8.5px] font-mono font-medium px-1 py-0 rounded border whitespace-nowrap leading-tight transition ${
                                      targetCap.remaining >= 0
                                        ? 'bg-emerald-500/10 text-emerald-400/90 border-emerald-500/20'
                                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                    }`}
                                    title={`${targetCap.account.name}: ${formatZAR(targetCap.totalCapacity)} cycle funds − ${formatZAR(targetCap.totalBudgeted)} budgeted = ${formatZAR(targetCap.remaining)} remaining`}
                                  >
                                    {targetCap.remaining >= 0
                                      ? `Avail: ${formatZARCompact(targetCap.remaining)}`
                                      : `Over: ${formatZARCompact(targetCap.remaining)}`}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* [E] Actual Spent */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-200 border-r border-white/[0.06]">
                          <div className="flex items-center justify-end gap-1.5">
                            <span>{formatZAR(spent)}</span>
                            {receiptCount > 0 && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-slate-400 font-mono">
                                {receiptCount}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* [F] Remaining Balance */}
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-bold border-r border-white/[0.06] ${
                            isOver ? 'text-[#FF453A]' : balance === 0 ? 'text-slate-400' : 'text-[#30D158]'
                          }`}
                        >
                          {formatZAR(balance)}
                        </td>

                        {/* [G] % Spent */}
                        <td className="py-2.5 px-3 text-center border-r border-white/[0.06]">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                              isOver
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : percentage > 85
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {percentage.toFixed(0)}%
                          </span>
                        </td>

                        {/* [H] Actions: Insert Between, Duplicate, Log Expense, Edit, Delete */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                if (onUpdateCategory) {
                                  onUpdateCategory(cat.id, { isRecurring: !cat.isRecurring });
                                }
                              }}
                              className={`w-6 h-6 rounded-[6px] flex items-center justify-center transition cursor-pointer ${
                                cat.isRecurring !== false
                                  ? 'text-emerald-400 hover:bg-emerald-500/10'
                                  : 'text-slate-500 hover:bg-white/10'
                              }`}
                              title={cat.isRecurring !== false ? 'Recurring Monthly (Active)' : 'Once-off Expense (Click to make recurring)'}
                            >
                              <Sparkles className={`w-3.5 h-3.5 ${cat.isRecurring !== false ? 'fill-emerald-400/20' : ''}`} />
                            </button>
                            <button
                              onClick={() => {
                                setCopyTargetItem(cat);
                                setIsCopyModalOpen(true);
                              }}
                              className="w-6 h-6 rounded-[6px] flex items-center justify-center text-slate-400 hover:text-sky-400 hover:bg-white/10 transition cursor-pointer"
                              title="Copy this category/envelope to another pay cycle"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Quick Log Expense button */}
                            <button
                              onClick={() => onQuickLogExpense(cat.id)}
                              className="w-6 h-6 rounded-[6px] flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
                              title="Quick Log Expense for this category"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>

                            {/* Edit Modal */}
                            <button
                              onClick={() => onOpenEditCategoryModal(cat)}
                              className="w-6 h-6 rounded-[6px] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                              title="Edit in Modal"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Category */}
                            <button
                              onClick={() => onDeleteCategory(cat.id)}
                              className="w-6 h-6 rounded-[6px] flex items-center justify-center text-slate-500 hover:text-[#FF453A] hover:bg-white/10 transition cursor-pointer"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                    </React.Fragment>
                  );
                })
              )}

              {/* Quick Add Row at the bottom of the table */}
              {isInsertingRow ? (
                <tr className="bg-[#242426] border-t border-emerald-500/50">
                  <td className="py-2 px-2 text-center text-emerald-400 font-mono text-[11px]">
                    +
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      placeholder="Category name (e.g. Pharmacy, Car Wash)..."
                      value={newRowName}
                      onChange={(e) => setNewRowName(e.target.value)}
                      autoFocus
                      className="w-full bg-[#1C1C1E] border border-white/20 text-white px-2 py-1 rounded-[6px] text-xs focus:outline-none focus:ring-1 focus:ring-[#30D158]"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={newRowTag}
                      onChange={(e) => setNewRowTag(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-white/20 text-white px-1.5 py-1 rounded-[6px] text-xs font-mono focus:outline-none"
                    >
                      {COMMON_CATEGORY_TAGS.map((t) => (
                        <option key={t.id} value={t.id}>
                          #{t.id}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={newRowAccountId}
                      onChange={(e) => setNewRowAccountId(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-white/20 text-white px-1.5 py-1 rounded-[6px] text-xs focus:outline-none"
                    >
                      <option value="" disabled>
                        Select Account
                      </option>
                      {accounts
                        .filter((acc) => !['home_loan', 'vehicle_loan', 'loan', 'store_card'].includes(acc.type))
                        .map((acc) => {
                          const cap = accountCapacityMap[acc.id];
                          const rem = cap ? cap.remaining : 0;
                          return (
                            <option key={acc.id} value={acc.id} className="bg-[#1C1C1E] text-slate-200">
                              {acc.name} (Avail: {formatZARCompact(rem)})
                            </option>
                          );
                        })}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <div className="relative flex flex-col items-end gap-1">
                      {(() => {
                        const targetCap = getAccountCapacity(newRowAccountId);
                        return (
                          targetCap && (
                            <span
                              className={`text-[8.5px] font-mono font-semibold px-1 py-0.2 rounded border whitespace-nowrap ${
                                targetCap.remaining >= 0
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              }`}
                              title={`${targetCap.account.name}: ${formatZAR(targetCap.totalCapacity)} cycle funds − ${formatZAR(targetCap.totalBudgeted)} budgeted = ${formatZAR(targetCap.remaining)} remaining`}
                            >
                              {targetCap.remaining >= 0
                                ? `Avail: ${formatZARCompact(targetCap.remaining)}`
                                : `Over: ${formatZARCompact(targetCap.remaining)}`}
                            </span>
                          )
                        );
                      })()}
                      <input
                        type="text"
                        placeholder="0.00"
                        value={newRowAmount}
                        onChange={(e) => setNewRowAmount(e.target.value)}
                        className="w-full bg-[#1C1C1E] border border-white/20 text-white px-2 py-1 rounded-[6px] text-xs text-right font-mono focus:outline-none focus:ring-1 focus:ring-[#30D158]"
                      />
                    </div>
                  </td>
                  <td colSpan={4} className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsInsertingRow(false)}
                        className="px-2.5 py-1 rounded-[6px] bg-white/10 text-slate-300 text-xs font-semibold hover:bg-white/20 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickAddRow}
                        className="px-3.5 py-1 rounded-[6px] bg-[#30D158] hover:bg-[#34C759] text-black font-bold text-xs transition cursor-pointer shadow-md"
                      >
                        Save Row
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={9} className="py-3 px-4 bg-[#1C1C1E]/50 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setIsInsertingRow(true)}
                        className="flex items-center justify-center p-2 sm:px-3 sm:py-1.5 rounded-[10px] bg-[#30D158]/20 hover:bg-[#30D158]/30 text-[#30D158] text-xs font-bold border border-[#30D158]/40 transition active:scale-95 cursor-pointer"
                        title="Insert Row at Bottom"
                      >
                        <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5 stroke-[2.6]" />
                        <span className="hidden sm:inline ml-1.5">Insert Row</span>
                      </button>

                      <button
                        onClick={onOpenAddCategoryModal}
                        className="flex items-center justify-center p-2 sm:px-3 sm:py-1.5 rounded-[10px] bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition cursor-pointer"
                        title="Advanced Category Modal"
                      >
                        <PlusCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        <span className="hidden sm:inline ml-1.5">Advanced Modal</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>

            {/* Table Footer: Column Totals */}
            <tfoot>
              <tr className="bg-[#242426] border-t-2 border-emerald-500/50 font-mono font-bold text-xs text-white">
                <td colSpan={4} className="py-3 px-4 text-emerald-400 uppercase tracking-wider">
                  TOTAL EXPENSE ALLOCATIONS
                </td>
                <td className="py-3 px-3 text-right text-white font-extrabold border-r border-white/[0.08]">
                  {formatZAR(totalBudgetedExpenses)}
                </td>
                <td className="py-3 px-3 text-right text-white font-extrabold border-r border-white/[0.08]">
                  {formatZAR(totalActualSpent)}
                </td>
                <td
                  className={`py-3 px-3 text-right font-extrabold border-r border-white/[0.08] ${
                    totalBudgetedExpenses - totalActualSpent >= 0 ? 'text-[#30D158]' : 'text-[#FF453A]'
                  }`}
                >
                  {formatZAR(totalBudgetedExpenses - totalActualSpent)}
                </td>
                <td className="py-3 px-3 text-center font-extrabold border-r border-white/[0.08] text-emerald-300">
                  {totalBudgetedExpenses > 0
                    ? `${((totalActualSpent / totalBudgetedExpenses) * 100).toFixed(0)}%`
                    : '0%'}
                </td>
                <td className="py-3 px-3 text-center text-slate-400 text-[10px]">
                  Balanced
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

      </div>

      {/* Copy to Cycle Modal */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-[28px] max-w-sm w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Copy to Another Cycle</h3>
                  <p className="text-[10px] text-slate-500">Select the target pay cycle</p>
                </div>
              </div>
              <button onClick={() => setIsCopyModalOpen(false)} className="p-1.5 rounded-full hover:bg-white/5 text-slate-400 transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-1">Target Pay Cycles</div>
              {periods
                .filter(p => p.id !== currentPeriod?.id)
                .map(p => (
                  <button
                    key={p.id}
                    onClick={async () => {
                      if (copyTargetItem === 'whole_cycle') {
                        if (onCopyWholeCycle) await onCopyWholeCycle(p.id);
                      } else if (copyTargetItem && onCopyToCycle) {
                        await onCopyToCycle(copyTargetItem, p.id);
                      }
                      setIsCopyModalOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 group-hover:text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500">{formatDateNice(p.startDate)} - {formatDateNice(p.endDate)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-sky-400 transition" />
                  </button>
                ))}
              {periods.length <= 1 && (
                <p className="text-xs text-slate-500 text-center py-4">No other pay cycles available to copy to.</p>
              )}
            </div>
            
            <div className="p-4 bg-white/5 flex justify-end">
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
