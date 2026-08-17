import React from 'react';
import { BudgetCategory, Expense } from '../types';
import { COMMON_CATEGORY_TAGS } from '../utils/budgetConstants';
import { formatZAR, formatZARCompact } from '../utils/southAfricaHolidays';
import { FigmaIcon } from './ui/FigmaIcon';
import { X, Tag, PieChart, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TagAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: BudgetCategory[];
  expenses: Expense[];
  onSelectTagFilter?: (tag: string) => void;
}

export const TagAnalysisModal: React.FC<TagAnalysisModalProps> = ({
  isOpen,
  onClose,
  categories,
  expenses,
  onSelectTagFilter,
}) => {
  if (!isOpen) return null;

  // Calculate spent per category
  const spentByCategoryId: Record<string, number> = {};
  for (const exp of expenses) {
    spentByCategoryId[exp.categoryId] = (spentByCategoryId[exp.categoryId] || 0) + exp.amount;
  }

  // Aggregate by Tag
  const tagSummaryMap: Record<
    string,
    {
      tag: string;
      label: string;
      color: string;
      bg: string;
      budgeted: number;
      actual: number;
      categories: { name: string; budgeted: number; actual: number }[];
    }
  > = {};

  // Initialize known tags
  for (const t of COMMON_CATEGORY_TAGS) {
    tagSummaryMap[t.id] = {
      tag: t.id,
      label: t.label,
      color: t.color,
      bg: t.bg,
      budgeted: 0,
      actual: 0,
      categories: [],
    };
  }

  // Populate from categories
  for (const cat of categories) {
    const rawTag = (cat.tag || 'other').toLowerCase();
    if (!tagSummaryMap[rawTag]) {
      tagSummaryMap[rawTag] = {
        tag: rawTag,
        label: `#${rawTag}`,
        color: '#A1A1AA',
        bg: 'rgba(161,161,170,0.15)',
        budgeted: 0,
        actual: 0,
        categories: [],
      };
    }
    const catSpent = spentByCategoryId[cat.id] || 0;
    tagSummaryMap[rawTag].budgeted += cat.allocatedAmount || 0;
    tagSummaryMap[rawTag].actual += catSpent;
    tagSummaryMap[rawTag].categories.push({
      name: cat.name,
      budgeted: cat.allocatedAmount || 0,
      actual: catSpent,
    });
  }

  const activeTagSummaries = Object.values(tagSummaryMap)
    .filter((t) => t.budgeted > 0 || t.actual > 0)
    .sort((a, b) => b.budgeted - a.budgeted);

  const totalBudgetedAllTags = activeTagSummaries.reduce((sum, t) => sum + t.budgeted, 0);
  const totalActualAllTags = activeTagSummaries.reduce((sum, t) => sum + t.actual, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#1C1C1E] border border-white/10 rounded-t-[28px] sm:rounded-[26px] max-w-2xl w-full p-5 sm:p-6 shadow-2xl my-0 sm:my-8 text-white max-h-[90vh] overflow-y-auto">
        
        {/* iOS Grabber */}
        <div className="w-10 h-1.2 bg-white/25 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#BF5AF2]/15 border border-[#BF5AF2]/30 text-[#BF5AF2] flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Category Tag Summaries & Analysis</span>
              </h3>
              <p className="text-xs text-slate-400">
                Aggregated financial breakdown by tags (#debt, #bond, #entertainment, #food, etc.)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Grand Total Summary Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
          <div className="bg-[#2C2C2E]/70 border border-white/[0.06] rounded-[18px] p-3.5">
            <span className="text-[11px] text-slate-400 font-medium">Total Tagged Budget</span>
            <div className="text-lg font-bold text-white mt-0.5">{formatZAR(totalBudgetedAllTags)}</div>
            <span className="text-[10px] text-slate-500">{activeTagSummaries.length} active tags</span>
          </div>

          <div className="bg-[#2C2C2E]/70 border border-white/[0.06] rounded-[18px] p-3.5">
            <span className="text-[11px] text-slate-400 font-medium">Total Actual Spent</span>
            <div className="text-lg font-bold text-[#30D158] mt-0.5">{formatZAR(totalActualAllTags)}</div>
            <span className="text-[10px] text-slate-500">
              {totalBudgetedAllTags > 0
                ? `${((totalActualAllTags / totalBudgetedAllTags) * 100).toFixed(0)}% consumed`
                : '0%'}
            </span>
          </div>

          <div className="bg-[#2C2C2E]/70 border border-white/[0.06] rounded-[18px] p-3.5 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-400 font-medium">Net Tag Balance</span>
            <div className="text-lg font-bold text-[#64D2FF] mt-0.5">
              {formatZAR(totalBudgetedAllTags - totalActualAllTags)}
            </div>
            <span className="text-[10px] text-slate-500">Remaining to spend</span>
          </div>
        </div>

        {/* Tags List */}
        <div className="space-y-3 mt-4">
          {activeTagSummaries.map((tagItem) => {
            const balance = tagItem.budgeted - tagItem.actual;
            const pct = tagItem.budgeted > 0 ? (tagItem.actual / tagItem.budgeted) * 100 : 0;
            const isOver = tagItem.actual > tagItem.budgeted;

            return (
              <div
                key={tagItem.tag}
                className="bg-[#2C2C2E]/60 border border-white/[0.06] rounded-[20px] p-4 transition hover:bg-[#2C2C2E]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="px-2.5 py-1 rounded-[10px] text-xs font-bold font-mono border"
                      style={{
                        backgroundColor: tagItem.bg,
                        color: tagItem.color,
                        borderColor: `${tagItem.color}40`,
                      }}
                    >
                      #{tagItem.tag}
                    </span>
                    <span className="text-sm font-semibold text-white">{tagItem.label}</span>
                    <span className="text-[11px] text-slate-400">
                      ({tagItem.categories.length} {tagItem.categories.length === 1 ? 'item' : 'items'})
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Budgeted: </span>
                      <strong className="text-white">{formatZAR(tagItem.budgeted)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Actual: </span>
                      <strong className={isOver ? 'text-[#FF453A]' : 'text-[#30D158]'}>
                        {formatZAR(tagItem.actual)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Balance: </span>
                      <strong className={balance < 0 ? 'text-[#FF453A]' : 'text-[#64D2FF]'}>
                        {formatZAR(balance)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[#1C1C1E] rounded-full h-2 mt-3 overflow-hidden border border-white/[0.04]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isOver ? 'bg-[#FF453A]' : pct > 85 ? 'bg-[#FF9F0A]' : 'bg-[#30D158]'
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>

                {/* Subcategory list */}
                <div className="mt-3 pt-2.5 border-t border-white/[0.04] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {tagItem.categories.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-slate-300 bg-white/[0.02] px-2.5 py-1.5 rounded-[8px]"
                    >
                      <span className="truncate pr-2">{c.name}</span>
                      <span className="font-mono text-slate-400 shrink-0">
                        {formatZARCompact(c.actual)} / {formatZARCompact(c.budgeted)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Filter button */}
                {onSelectTagFilter && (
                  <div className="mt-2.5 flex justify-end">
                    <button
                      onClick={() => {
                        onSelectTagFilter(tagItem.tag);
                        onClose();
                      }}
                      className="text-[11px] font-semibold text-[#64D2FF] hover:underline cursor-pointer"
                    >
                      Filter Excel sheet by #{tagItem.tag} &rarr;
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3.5 border-t border-white/[0.08] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-[14px] bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
