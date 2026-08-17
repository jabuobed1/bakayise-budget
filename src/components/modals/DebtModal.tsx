import React, { useState, useEffect } from 'react';
import { Debt, DebtCategory } from '../../types';
import { DEBT_CATEGORIES } from '../../utils/budgetConstants';
import { evaluateMathExpression, formatMathLivePreview, isMathExpression } from '../../utils/mathEvaluator';
import { FigmaIcon } from '../ui/FigmaIcon';
import { X, Calculator } from 'lucide-react';

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (debt: Debt) => void;
  initialDebt?: Debt | null;
}

export const DebtModal: React.FC<DebtModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDebt,
}) => {
  const [name, setName] = useState('');
  const [lender, setLender] = useState('');
  const [category, setCategory] = useState<DebtCategory>('store_card');
  const [balance, setBalance] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialDebt) {
      setName(initialDebt.name);
      setLender(initialDebt.lender || '');
      setCategory(initialDebt.category);
      setBalance(initialDebt.balance.toString());
      setMinimumPayment(initialDebt.minimumPayment.toString());
      setInterestRate(initialDebt.interestRate.toString());
      setNotes(initialDebt.notes || '');
    } else {
      setName('');
      setLender('');
      setCategory('store_card');
      setBalance('');
      setMinimumPayment('');
      setInterestRate('21.0');
      setNotes('');
    }
  }, [initialDebt, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numBalance = evaluateMathExpression(balance);
    const numMin = evaluateMathExpression(minimumPayment);
    const numRate = parseFloat(interestRate) || 0;

    if (!name.trim() || numBalance === null || numBalance < 0 || numMin === null || numMin < 0) {
      return;
    }

    const debtData: Debt = {
      id: initialDebt?.id || `debt_${Date.now()}`,
      name: name.trim(),
      lender: lender.trim() || undefined,
      category,
      balance: numBalance,
      originalBalance: initialDebt?.originalBalance || numBalance,
      minimumPayment: numMin,
      interestRate: numRate,
      status: numBalance === 0 ? 'paid_off' : (initialDebt?.status || 'active'),
      notes: notes.trim() || undefined,
      createdAt: initialDebt?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(debtData);
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
            <div className="w-10 h-10 rounded-[14px] bg-[#FF453A]/15 border border-[#FF453A]/30 text-[#FF453A] flex items-center justify-center shrink-0">
              <FigmaIcon name="flame" size="md" strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {initialDebt ? 'Edit Debt Account' : 'Add Debt to Snowball'}
              </h3>
              <p className="text-xs text-slate-400">
                Baby Step 2: Pay off debts smallest to largest
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
          
          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Debt Type *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DebtCategory)}
              className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF453A] cursor-pointer"
            >
              {DEBT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Debt Name / Account *
            </label>
            <input
              type="text"
              placeholder="e.g. Woolworths Store Card, FNB Credit Card, Capitec Loan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF453A]"
            />
          </div>

          {/* Lender */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Bank / Credit Provider (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Woolworths Financial Services, First National Bank, RCS"
              value={lender}
              onChange={(e) => setLender(e.target.value)}
              className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF453A]"
            />
          </div>

          {/* Current Balance */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>Current Outstanding Balance (ZAR / R) *</span>
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
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                onBlur={() => {
                  if (isMathExpression(balance)) {
                    const res = evaluateMathExpression(balance);
                    if (res !== null) setBalance(res.toString());
                  }
                }}
                required
                className="w-full bg-[#2C2C2E] border border-white/10 text-white pl-10 pr-10 py-2.5 rounded-[14px] font-bold text-lg focus:outline-none focus:ring-2 focus:ring-[#FF453A]"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                <Calculator className="w-4 h-4" />
              </div>

              {isMathExpression(balance) && (
                <div className="absolute left-0 top-full mt-1 z-30 bg-[#1C1C1E] border border-[#FF453A]/50 px-2.5 py-1 rounded-[8px] text-xs font-mono text-[#FF453A] font-bold shadow-xl whitespace-nowrap flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                  <Calculator className="w-3.5 h-3.5 text-[#FF453A]" />
                  <span>Calculated: {formatMathLivePreview(balance)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Minimum Payment & Interest Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Minimum Monthly Due *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">
                  R
                </span>
                <input
                  type="text"
                  inputMode="text"
                  placeholder="0.00"
                  value={minimumPayment}
                  onChange={(e) => setMinimumPayment(e.target.value)}
                  onBlur={() => {
                    if (isMathExpression(minimumPayment)) {
                      const res = evaluateMathExpression(minimumPayment);
                      if (res !== null) setMinimumPayment(res.toString());
                    }
                  }}
                  required
                  className="w-full bg-[#2C2C2E] border border-white/10 text-white pl-8 pr-3 py-2 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF453A]"
                />
                {isMathExpression(minimumPayment) && (
                  <div className="absolute left-0 top-full mt-1 z-30 bg-[#1C1C1E] border border-[#FF453A]/50 px-2 py-0.5 rounded text-[10px] font-mono text-[#FF453A] font-bold shadow-xl whitespace-nowrap">
                    = {formatMathLivePreview(minimumPayment)}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Annual Interest %
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  placeholder="21.0"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="w-full bg-[#2C2C2E] border border-white/10 text-white pl-3 pr-7 py-2 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF453A]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Cut card upon full payoff"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF453A]"
            />
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
              className="px-5 py-2.5 bg-[#FF453A] hover:bg-[#FF3B30] text-white font-bold rounded-[14px] text-xs shadow-md shadow-red-950/40 transition active:scale-95 cursor-pointer"
            >
              {initialDebt ? 'Save Changes' : 'Add to Snowball'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
