import React, { useState, useEffect } from 'react';
import { Income, IncomeType, FinancialAccount } from '../../types';
import { INCOME_TYPES } from '../../utils/budgetConstants';
import { evaluateMathExpression, formatMathLivePreview, isMathExpression } from '../../utils/mathEvaluator';
import { FigmaIcon } from '../ui/FigmaIcon';
import { X, Calculator } from 'lucide-react';

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (income: Income) => void;
  currentPeriodId: string;
  defaultDate?: string;
  initialIncome?: Income | null;
  accounts?: FinancialAccount[];
}

export const IncomeModal: React.FC<IncomeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentPeriodId,
  defaultDate,
  initialIncome,
  accounts = [],
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<IncomeType>('primary_salary');
  const [sourceTag, setSourceTag] = useState('');
  const [accountId, setAccountId] = useState<string>('');
  const [receivedDate, setReceivedDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'expected' | 'received'>('expected');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setErrorMessage('');
    if (initialIncome) {
      setTitle(initialIncome.title);
      setAmount(initialIncome.amount.toString());
      setType(initialIncome.type);
      setSourceTag(initialIncome.sourceTag || '');
      setAccountId(
        initialIncome.accountId ||
          (accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || '')
      );
      setReceivedDate(
        initialIncome.receivedDate || defaultDate || new Date().toISOString().split('T')[0]
      );
      setStatus(initialIncome.status);
      setNotes(initialIncome.notes || '');
    } else {
      setTitle('');
      setAmount('');
      setType('primary_salary');
      setSourceTag('Main Job');
      const defaultAcc = accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || '';
      setAccountId(defaultAcc);
      setReceivedDate(defaultDate || new Date().toISOString().split('T')[0]);
      setStatus('expected');
      setNotes('');
    }
  }, [initialIncome, defaultDate, isOpen, accounts]);

  if (!isOpen) return null;

  const handleTypeChange = (selectedType: IncomeType) => {
    setType(selectedType);
    const match = INCOME_TYPES.find((t) => t.id === selectedType);
    if (match && !title) {
      setTitle(match.label);
      setSourceTag(match.defaultTag);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const numAmount = evaluateMathExpression(amount);
    if (numAmount === null || numAmount <= 0) {
      setErrorMessage('Please enter a valid income amount greater than R0.00.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Please enter an income title / description.');
      return;
    }
    if (!accountId || !accountId.trim()) {
      setErrorMessage('Please select the financial account this income deposits into.');
      return;
    }

    const incomeData: Income = {
      id: initialIncome?.id || `inc_${Date.now()}`,
      periodId: currentPeriodId,
      title: title.trim(),
      amount: numAmount,
      type,
      sourceTag: sourceTag.trim() || undefined,
      accountId: accountId.trim(),
      receivedDate,
      status,
      notes: notes.trim() || undefined,
      createdAt: initialIncome?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(incomeData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#1C1C1E] border border-white/10 rounded-t-[28px] sm:rounded-[26px] max-w-lg w-full p-5 sm:p-6 shadow-2xl my-0 sm:my-8 text-white max-h-[90vh] overflow-y-auto">
        
        {/* iOS Grabber */}
        <div className="w-10 h-1.2 bg-white/25 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#30D158]/15 border border-[#30D158]/30 text-[#30D158] flex items-center justify-center shrink-0">
              <FigmaIcon name="trending" size="md" strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {initialIncome ? 'Edit Income Stream' : 'Add Monthly Income Stream'}
              </h3>
              <p className="text-xs text-slate-400">
                Log salary, freelance, side hustle, or household funds
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

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-[12px] bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Income Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Income Category / Type *
            </label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as IncomeType)}
              className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
            >
              {INCOME_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>Monthly Amount (ZAR / R) *</span>
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={() => {
                  if (isMathExpression(amount)) {
                    const res = evaluateMathExpression(amount);
                    if (res !== null) setAmount(res.toString());
                  }
                }}
                required
                autoFocus
                className="w-full bg-[#2C2C2E] border border-white/10 text-white pl-10 pr-10 py-2.5 rounded-[14px] font-bold text-xl focus:outline-none focus:ring-2 focus:ring-[#30D158]"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                <Calculator className="w-4 h-4" />
              </div>

              {isMathExpression(amount) && (
                <div className="absolute left-0 top-full mt-1 z-30 bg-[#1C1C1E] border border-[#30D158]/50 px-2.5 py-1 rounded-[8px] text-xs font-mono text-[#30D158] font-bold shadow-xl whitespace-nowrap flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                  <Calculator className="w-3.5 h-3.5 text-[#30D158]" />
                  <span>Calculated: {formatMathLivePreview(amount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Deposit Account (Strictly Required) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>Deposit Into Account *</span>
              <span className="text-[11px] text-emerald-400 font-normal">Required for Fund Tracking</span>
            </label>
            {accounts.length === 0 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-[14px] text-amber-300 text-xs">
                No financial accounts found. Please add a bank account first under the Accounts tab.
              </div>
            ) : (
              <select
                value={accountId}
                onChange={(e) => {
                  setAccountId(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                required
                className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
              >
                <option value="" disabled>
                  Select Deposit Account *
                </option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.institution || acc.type})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Income Title / Description *
            </label>
            <input
              type="text"
              placeholder="e.g. Husband Primary Salary, Wife Net Salary, Side Consulting"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
            />
          </div>

          {/* Source Tag */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Source Tag (e.g. Employer Name, Client, Business Name)
            </label>
            <input
              type="text"
              placeholder="e.g. Corporate Job, E-Commerce Store, Client Projects"
              value={sourceTag}
              onChange={(e) => setSourceTag(e.target.value)}
              className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
            />
          </div>

          {/* Expected Date and Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Expected Payday Date
              </label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3 py-2 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3 py-2 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
              >
                <option value="expected">Expected / Scheduled</option>
                <option value="received">Received in Bank</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Includes travel allowance, net after medical aid tax"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
            />
          </div>

          {/* Footer actions */}
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
              {initialIncome ? 'Save Changes' : 'Save Income'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
