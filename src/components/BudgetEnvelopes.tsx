import React, { useState } from 'react';
import { BudgetCategory, Expense, CategoryGroup } from '../types';
import { CATEGORY_GROUPS, isExternalExpense } from '../utils/budgetConstants';
import { formatZAR, formatZARCompact } from '../utils/southAfricaHolidays';
import { FigmaIcon, FigmaIconName } from './ui/FigmaIcon';
import { Plus, Edit2, Trash2, Check, AlertCircle } from 'lucide-react';

const ICON_NAME_MAP: Record<string, FigmaIconName> = {
  Home: 'home',
  Building2: 'building',
  Zap: 'zap',
  Wifi: 'wifi',
  Smartphone: 'phone',
  ShoppingCart: 'cart',
  Beef: 'utensils',
  Fuel: 'fuel',
  Wrench: 'sliders',
  HeartPulse: 'heartPulse',
  ShieldCheck: 'shield',
  Pill: 'pill',
  GraduationCap: 'grad',
  UtensilsCrossed: 'utensils',
  Tv: 'tv',
  User: 'user',
  UserCheck: 'userCheck',
  Flame: 'flame',
  PiggyBank: 'piggy',
  Heart: 'heart',
  HelpCircle: 'folder',
};

interface BudgetEnvelopesProps {
  categories: BudgetCategory[];
  expenses: Expense[];
  onOpenAddCategoryModal: () => void;
  onOpenEditCategoryModal: (cat: BudgetCategory) => void;
  onDeleteCategory: (catId: string) => void;
  onQuickLogExpense: (categoryId: string) => void;
}

export const BudgetEnvelopes: React.FC<BudgetEnvelopesProps> = ({
  categories,
  expenses,
  onOpenAddCategoryModal,
  onOpenEditCategoryModal,
  onDeleteCategory,
  onQuickLogExpense,
}) => {
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');

  // Compute total spent per category (exclude internal transfers)
  const spentByCategoryId: Record<string, number> = {};
  for (const exp of expenses.filter(isExternalExpense)) {
    spentByCategoryId[exp.categoryId] = (spentByCategoryId[exp.categoryId] || 0) + exp.amount;
  }

  // Filter categories
  const filteredCategories =
    selectedGroupFilter === 'all'
      ? categories
      : categories.filter((c) => c.group === selectedGroupFilter);

  // Group categories for rendering
  const groupedCategories: Record<CategoryGroup, BudgetCategory[]> = {} as any;
  for (const cat of filteredCategories) {
    if (!groupedCategories[cat.group]) {
      groupedCategories[cat.group] = [];
    }
    groupedCategories[cat.group].push(cat);
  }

  return (
    <div className="space-y-6">
      
      {/* Header and Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-[#BF5AF2]/15 border border-[#BF5AF2]/30 flex items-center justify-center text-[#BF5AF2] shrink-0">
            <FigmaIcon name="folder" size="md" strokeWidth={2.4} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Budget Envelopes</span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                {categories.length}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Planned allocations vs actual family expenses
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAddCategoryModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] bg-[#30D158] hover:bg-[#34C759] text-black text-xs font-bold transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" strokeWidth={2.8} />
          <span>Add Envelope</span>
        </button>
      </div>

      {/* iOS Segmented Control / Group Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-xs">
        <button
          onClick={() => setSelectedGroupFilter('all')}
          className={`px-3 py-1.5 rounded-[12px] font-semibold transition whitespace-nowrap shrink-0 cursor-pointer ${
            selectedGroupFilter === 'all'
              ? 'bg-[#3A3A3C] text-white shadow-sm border border-white/10'
              : 'bg-[#2C2C2E]/60 text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({categories.length})
        </button>
        {CATEGORY_GROUPS.map((g) => {
          const count = categories.filter((c) => c.group === g.id).length;
          if (count === 0) return null;
          return (
            <button
              key={g.id}
              onClick={() => setSelectedGroupFilter(g.id)}
              className={`px-3 py-1.5 rounded-[12px] font-semibold transition whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedGroupFilter === g.id
                  ? 'bg-[#3A3A3C] text-white shadow-sm border border-white/10'
                  : 'bg-[#2C2C2E]/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{g.label}</span>
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Categories Inset Groups */}
      {CATEGORY_GROUPS.map((groupMeta) => {
        const groupCats = groupedCategories[groupMeta.id];
        if (!groupCats || groupCats.length === 0) return null;

        const groupTotalAllocated = groupCats.reduce((sum, c) => sum + (c.allocatedAmount || 0), 0);
        const groupTotalSpent = groupCats.reduce((sum, c) => sum + (spentByCategoryId[c.id] || 0), 0);
        const groupSpentPct = groupTotalAllocated > 0 ? (groupTotalSpent / groupTotalAllocated) * 100 : 0;

        return (
          <div
            key={groupMeta.id}
            className="bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] p-4 sm:p-5 shadow-xl space-y-3"
          >
            {/* Group Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: groupMeta.color }}
                  />
                  <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    {groupMeta.label}
                  </h4>
                </div>
                <p className="text-xs text-slate-400 ml-4.5">{groupMeta.description}</p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Spent: </span>
                  <strong className="text-white font-bold">{formatZAR(groupTotalSpent)}</strong>
                  <span className="text-slate-400"> / {formatZAR(groupTotalAllocated)}</span>
                </div>
                <div className="w-16 sm:w-20 bg-[#2C2C2E] rounded-full h-2 overflow-hidden border border-white/[0.06]">
                  <div
                    className={`h-full rounded-full transition-all ${
                      groupSpentPct > 100
                        ? 'bg-[#FF453A]'
                        : groupSpentPct > 85
                        ? 'bg-[#FF9F0A]'
                        : 'bg-[#30D158]'
                    }`}
                    style={{ width: `${Math.min(groupSpentPct, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Envelopes inside this group */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupCats.map((cat) => {
                const spent = spentByCategoryId[cat.id] || 0;
                const allocated = cat.allocatedAmount || 0;
                const remaining = allocated - spent;
                const percentage = allocated > 0 ? (spent / allocated) * 100 : 0;
                const isOverBudget = spent > allocated;
                const iconName = ICON_NAME_MAP[cat.icon || ''] || 'folder';

                return (
                  <div
                    key={cat.id}
                    className={`bg-[#2C2C2E]/70 border rounded-[20px] p-3.5 flex flex-col justify-between transition-all hover:bg-[#2C2C2E] shadow-sm ${
                      isOverBudget
                        ? 'border-[#FF453A]/40 bg-[#FF453A]/10'
                        : 'border-white/[0.06]'
                    }`}
                  >
                    <div>
                      {/* Top row: Figma Tool Icon, Name, Essential tag, Actions */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 border border-white/10"
                            style={{
                              backgroundColor: `${cat.color || '#3b82f6'}20`,
                              color: cat.color || '#3b82f6',
                            }}
                          >
                            <FigmaIcon name={iconName} size="sm" strokeWidth={2.2} />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-sm font-bold text-white truncate tracking-tight" title={cat.name}>
                              {cat.name}
                            </h5>
                            <div className="flex items-center gap-1 mt-0.5">
                              {cat.tag && (
                                <span className="text-[9px] font-semibold text-slate-300 bg-white/10 px-1.5 py-0.2 rounded-[5px] font-mono border border-white/10">
                                  #{cat.tag}
                                </span>
                              )}
                              {cat.isEssential && (
                                <span className="text-[9px] font-semibold text-[#30D158] bg-[#30D158]/15 px-1.5 py-0.2 rounded-[5px] border border-[#30D158]/30">
                                  Essential
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => onQuickLogExpense(cat.id)}
                            title="Log expense for envelope"
                            className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[#30D158] hover:bg-[#30D158]/20 transition cursor-pointer"
                          >
                            <Plus className="w-4 h-4" strokeWidth={2.6} />
                          </button>
                          <button
                            onClick={() => onOpenEditCategoryModal(cat)}
                            title="Edit envelope"
                            className="w-7 h-7 rounded-[8px] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteCategory(cat.id)}
                            title="Delete envelope"
                            className="w-7 h-7 rounded-[8px] flex items-center justify-center text-slate-500 hover:text-[#FF453A] hover:bg-white/10 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Amounts Display */}
                      <div className="flex items-baseline justify-between text-xs mt-3">
                        <span className="text-slate-400">
                          Spent: <strong className="text-white font-bold">{formatZAR(spent)}</strong>
                        </span>
                        <span className="text-slate-400">
                          Budget: <strong className="text-slate-200">{formatZAR(allocated)}</strong>
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-[#1C1C1E] rounded-full h-2 mt-2 overflow-hidden p-0.5 border border-white/[0.04]">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            percentage > 100
                              ? 'bg-[#FF453A]'
                              : percentage > 80
                              ? 'bg-[#FF9F0A]'
                              : 'bg-[#30D158]'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Bottom Status pill */}
                    <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                      {isOverBudget ? (
                        <div className="flex items-center gap-1 text-[#FF453A] font-semibold text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Over by {formatZAR(Math.abs(remaining))}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[#30D158] font-medium text-[11px]">
                          <Check className="w-3.5 h-3.5" strokeWidth={2.6} />
                          <span>{formatZAR(remaining)} remaining</span>
                        </div>
                      )}

                      <span className="text-[10px] text-slate-400 font-mono">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

    </div>
  );
};
