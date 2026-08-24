import React, { useState } from 'react';
import { EmergencyFundLog, BabyStepsState, BudgetCategory, FinancialAccount } from '../../types';
import { evaluateMathExpression, formatMathLivePreview, isMathExpression } from '../../utils/mathEvaluator';
import { FigmaIcon } from '../ui/FigmaIcon';
import { X, ArrowDownLeft, ArrowUpRight, Calculator } from 'lucide-react';
import confetti from 'canvas-confetti';

interface EmergencyFundModalProps {
  isOpen: boolean;
  onClose: () => void;
  step: 1 | 3;
  babyState?: BabyStepsState | null;
  currentState?: BabyStepsState | null;
  categories?: BudgetCategory[];
  accounts?: FinancialAccount[];
  onSaveLog?: (log: EmergencyFundLog, updatedState: BabyStepsState) => void;
  onSaveLogs?: (updatedState: BabyStepsState, newLog: EmergencyFundLog) => void;
}

export const EmergencyFundModal: React.FC<EmergencyFundModalProps> = ({
  isOpen,
  onClose,
  step,
  babyState,
  currentState,
  categories = [],
  accounts = [],
  onSaveLog,
  onSaveLogs,
}) => {
  const activeBabyState = babyState || currentState;
  const [type, setType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  if (!isOpen || !activeBabyState) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = evaluateMathExpression(amount);
    if (!description.trim() || numAmount === null || numAmount <= 0) return;

    const log: EmergencyFundLog = {
      id: `log_ef_${Date.now()}`,
      step,
      type,
      amount: numAmount,
      date,
      description: description.trim(),
      createdAt: new Date().toISOString(),
    };

    let updatedState = { ...activeBabyState };

    if (step === 1) {
      const current = activeBabyState.step1CurrentBalance || 0;
      const newBal = type === 'deposit' ? current + numAmount : Math.max(0, current - numAmount);
      updatedState.step1CurrentBalance = newBal;
      if (newBal >= (activeBabyState.step1EmergencyFundTarget || 20000)) {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      }
    } else {
      const current = activeBabyState.step3CurrentBalance || 0;
      const newBal = type === 'deposit' ? current + numAmount : Math.max(0, current - numAmount);
      updatedState.step3CurrentBalance = newBal;
    }

    updatedState.updatedAt = new Date().toISOString();
    if (onSaveLog) {
      onSaveLog(log, updatedState);
    }
    if (onSaveLogs) {
      onSaveLogs(updatedState, log);
    }
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
            <div className="w-10 h-10 rounded-[14px] bg-[#30D158]/15 border border-[#30D158]/30 text-[#30D158] flex items-center justify-center shrink-0">
              <FigmaIcon name="piggy" size="md" strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {step === 1 ? 'Step 1: Starter Fund' : 'Step 3: Full Emergency Fund'}
              </h3>
              <p className="text-xs text-slate-400">
                Log a deposit or emergency withdrawal
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
          
          {/* Deposit vs Withdrawal toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('deposit')}
              className={`py-2.5 rounded-[12px] text-xs font-bold border flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                type === 'deposit'
                  ? 'bg-[#30D158]/20 text-[#30D158] border-[#30D158]/60 shadow-sm'
                  : 'bg-[#2C2C2E] border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4 text-[#30D158]" />
              <span>+ Deposit Savings</span>
            </button>

            <button
              type="button"
              onClick={() => setType('withdrawal')}
              className={`py-2.5 rounded-[12px] text-xs font-bold border flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                type === 'withdrawal'
                  ? 'bg-[#FF453A]/20 text-[#FF453A] border-[#FF453A]/60 shadow-sm'
                  : 'bg-[#2C2C2E] border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-[#FF453A]" />
              <span>- Emergency Use</span>
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>Amount (ZAR / R) *</span>
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

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description / Reason *
            </label>
            <input
              type="text"
              placeholder={
                type === 'deposit'
                  ? 'e.g. August budget transfer, freelance bonus savings'
                  : 'e.g. Urgent car tyre repair, unexpected medical gap fee'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3 py-2 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
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
              className={`px-5 py-2.5 font-bold rounded-[14px] text-xs shadow-md transition active:scale-95 cursor-pointer ${
                type === 'deposit'
                  ? 'bg-[#30D158] hover:bg-[#34C759] text-black shadow-emerald-950/40'
                  : 'bg-[#FF453A] hover:bg-[#FF3B30] text-white shadow-red-950/40'
              }`}
            >
              Save Entry
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
