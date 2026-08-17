import React, { useState, useEffect } from 'react';
import { BudgetCategory, CategoryGroup, FinancialAccount } from '../../types';
import { CATEGORY_GROUPS, COMMON_CATEGORY_TAGS } from '../../utils/budgetConstants';
import { evaluateMathExpression, formatMathLivePreview, isMathExpression } from '../../utils/mathEvaluator';
import { FigmaIcon } from '../ui/FigmaIcon';
import { X, Tag, Plus, Calculator } from 'lucide-react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: BudgetCategory) => void;
  currentPeriodId: string;
  initialCategory?: BudgetCategory | null;
  accounts?: FinancialAccount[];
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentPeriodId,
  initialCategory,
  accounts = [],
}) => {
  const [name, setName] = useState('');
  const [group, setGroup] = useState<CategoryGroup>('food');
  const [tag, setTag] = useState<string>('food');
  const [customTag, setCustomTag] = useState<string>('');
  const [isCustomTag, setIsCustomTag] = useState<boolean>(false);
  const [allocatedAmount, setAllocatedAmount] = useState('');
  const [defaultAccountId, setDefaultAccountId] = useState<string>('');
  const [isEssential, setIsEssential] = useState(true);
  const [icon, setIcon] = useState('ShoppingCart');

  useEffect(() => {
    if (initialCategory) {
      setName(initialCategory.name);
      setGroup(initialCategory.group);
      const existingTag = initialCategory.tag || 'other';
      const isKnown = COMMON_CATEGORY_TAGS.some((t) => t.id === existingTag);
      if (isKnown) {
        setTag(existingTag);
        setIsCustomTag(false);
        setCustomTag('');
      } else {
        setIsCustomTag(true);
        setCustomTag(existingTag);
        setTag('custom');
      }
      setAllocatedAmount(initialCategory.allocatedAmount.toString());
      setDefaultAccountId(initialCategory.defaultAccountId || (accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || ''));
      setIsEssential(initialCategory.isEssential);
      setIcon(initialCategory.icon || 'FolderPlus');
    } else {
      setName('');
      setGroup('food');
      setTag('food');
      setIsCustomTag(false);
      setCustomTag('');
      setAllocatedAmount('');
      const defAcc = accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || '';
      setDefaultAccountId(defAcc);
      setIsEssential(true);
      setIcon('ShoppingCart');
    }
  }, [initialCategory, isOpen, accounts]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = evaluateMathExpression(allocatedAmount);
    if (!name.trim() || numAmount === null || numAmount < 0) return;

    const groupMeta = CATEGORY_GROUPS.find((g) => g.id === group);
    const finalTag = isCustomTag && customTag.trim() ? customTag.trim().toLowerCase() : tag;

    const catData: BudgetCategory = {
      id: initialCategory?.id || `cat_${currentPeriodId}_${Date.now()}`,
      periodId: currentPeriodId,
      name: name.trim(),
      group,
      tag: finalTag,
      allocatedAmount: numAmount,
      defaultAccountId: defaultAccountId || undefined,
      color: groupMeta?.color || '#3b82f6',
      icon,
      isEssential,
      createdAt: initialCategory?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(catData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#1C1C1E] border border-white/10 rounded-t-[28px] sm:rounded-[26px] max-w-md w-full p-5 sm:p-6 shadow-2xl my-0 sm:my-8 text-white max-h-[90vh] overflow-y-auto">
        
        {/* iOS Grabber */}
        <div className="w-10 h-1.2 bg-white/25 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#107c41]/20 border border-[#107c41]/40 text-[#30D158] flex items-center justify-center shrink-0">
              <FigmaIcon name="folder" size="md" strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {initialCategory ? 'Edit Transaction Type / Category' : 'Create Budget Transaction Type'}
              </h3>
              <p className="text-xs text-slate-400">
                Sets up the category for expense logging and Excel tracking
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Name / Transaction Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Transaction Type / Category Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Groceries (Checkers), Home Bond, Sasol Fuel, Netflix"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              This name will appear as the category dropdown option when logging expenses.
            </p>
          </div>

          {/* Category Tag Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#30D158]" />
                <span>Classification Tag (for Analysis & Summaries)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsCustomTag(!isCustomTag)}
                className="text-[11px] text-[#64D2FF] hover:underline font-normal cursor-pointer"
              >
                {isCustomTag ? 'Choose Preset' : '+ Custom Tag'}
              </button>
            </label>

            {!isCustomTag ? (
              <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto p-1 bg-[#2C2C2E]/60 rounded-[14px] border border-white/[0.06]">
                {COMMON_CATEGORY_TAGS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTag(t.id);
                      if (t.id === 'bond' || t.id === 'housing') setGroup('housing');
                      else if (t.id === 'debt') setGroup('debt_snowball');
                      else if (t.id === 'food') setGroup('food');
                      else if (t.id === 'transport') setGroup('transport');
                      else if (t.id === 'utilities') setGroup('utilities');
                      else if (t.id === 'health' || t.id === 'insurance') setGroup('health_insurance');
                      else if (t.id === 'savings') setGroup('savings_goals');
                      else if (t.id === 'personal') setGroup('personal');
                      else if (t.id === 'entertainment') setGroup('lifestyle');
                    }}
                    className={`px-2 py-1.5 rounded-[10px] text-xs font-semibold text-left truncate transition cursor-pointer flex items-center gap-1.5 border ${
                      tag === t.id
                        ? 'border-white/40 bg-white/15 text-white shadow-sm'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="truncate">#{t.id}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-mono text-sm">#</span>
                <input
                  type="text"
                  placeholder="e.g. bond, debt, entertainment, petcare, gym"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2 rounded-[14px] text-xs focus:outline-none focus:ring-2 focus:ring-[#30D158]"
                />
              </div>
            )}
          </div>

          {/* Group */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Category Group (Dave Ramsey Allocation)
            </label>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value as CategoryGroup)}
              className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
            >
              {CATEGORY_GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* Default Account */}
          {accounts.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Default Linked Payment Account</span>
                <span className="text-[11px] text-emerald-400 font-normal">Auto-assigned for expenses</span>
              </label>
              <select
                value={defaultAccountId}
                onChange={(e) => setDefaultAccountId(e.target.value)}
                className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.institution || acc.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Planned Allocation */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>Amount Budgeted (ZAR / R) *</span>
              <span className="text-[11px] text-slate-400 font-normal">Supports +, -, *, / (e.g. 150*3, 1200/12)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg pointer-events-none">
                R
              </span>
              <input
                type="text"
                inputMode="text"
                placeholder="0.00 (e.g. 150*3, 1200/12, 120+234)"
                value={allocatedAmount}
                onChange={(e) => setAllocatedAmount(e.target.value)}
                onBlur={() => {
                  if (isMathExpression(allocatedAmount)) {
                    const res = evaluateMathExpression(allocatedAmount);
                    if (res !== null) setAllocatedAmount(res.toString());
                  }
                }}
                required
                className="w-full bg-[#2C2C2E] border border-white/10 text-white pl-10 pr-10 py-2.5 rounded-[14px] font-bold text-lg focus:outline-none focus:ring-2 focus:ring-[#30D158]"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                <Calculator className="w-4 h-4" />
              </div>

              {isMathExpression(allocatedAmount) && (
                <div className="absolute left-0 top-full mt-1 z-30 bg-[#1C1C1E] border border-[#30D158]/50 px-2.5 py-1 rounded-[8px] text-xs font-mono text-[#30D158] font-bold shadow-xl whitespace-nowrap flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                  <Calculator className="w-3.5 h-3.5 text-[#30D158]" />
                  <span>Calculated: {formatMathLivePreview(allocatedAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Essential Toggle */}
          <div className="bg-[#2C2C2E]/80 border border-white/10 rounded-[16px] p-3.5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isEssential}
                onChange={(e) => setIsEssential(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#30D158] focus:ring-[#30D158] bg-[#1C1C1E] border-white/20 cursor-pointer accent-[#30D158]"
              />
              <div>
                <span className="text-xs font-bold text-white">
                  Essential Living Expense
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Include in Dave Ramsey Step 3 Emergency Fund target calculation (Housing, Food, Utilities, Transport, Medical).
                </p>
              </div>
            </label>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-300 rounded-[14px] text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#30D158] hover:bg-[#34C759] text-black font-bold rounded-[14px] text-xs shadow-md shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
            >
              {initialCategory ? 'Save Changes' : 'Insert Category'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
