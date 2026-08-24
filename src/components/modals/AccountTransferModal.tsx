import React, { useState } from 'react';
import { FinancialAccount, BudgetPeriod } from '../../types';
import { formatZAR } from '../../utils/southAfricaHolidays';
import { ArrowRightLeft, X, ArrowRight, ShieldCheck, CheckCircle2, Wallet, CreditCard, Building2 } from 'lucide-react';

interface AccountTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: FinancialAccount[];
  accountBalances?: Record<string, number>;
  currentPeriod: BudgetPeriod | null;
  initialSourceAccountId?: string;
  onExecuteTransfer: (transferData: {
    sourceAccountId: string;
    destinationAccountId: string;
    amount: number;
    date: string;
    reference: string;
    notes?: string;
  }) => Promise<void>;
}

export const AccountTransferModal: React.FC<AccountTransferModalProps> = ({
  isOpen,
  onClose,
  accounts,
  accountBalances,
  currentPeriod,
  initialSourceAccountId,
  onExecuteTransfer,
}) => {
  const [sourceAccountId, setSourceAccountId] = useState<string>(
    initialSourceAccountId || accounts[0]?.id || ''
  );
  const [destinationAccountId, setDestinationAccountId] = useState<string>(
    accounts.find((a) => a.id !== (initialSourceAccountId || accounts[0]?.id))?.id || ''
  );
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState<string>('Internal Transfer');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const sourceAccount = accounts.find((a) => a.id === sourceAccountId);
  const destAccount = accounts.find((a) => a.id === destinationAccountId);

  const getBalance = (acc: FinancialAccount) => {
    return accountBalances?.[acc.id] ?? (acc.openingBalance || 0);
  };

  const handleQuickPercent = (percent: number) => {
    if (!sourceAccount) return;
    const bal = getBalance(sourceAccount);
    if (bal > 0) {
      setAmount((bal * percent).toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!sourceAccountId || !destinationAccountId || !numAmount || numAmount <= 0) return;
    if (sourceAccountId === destinationAccountId) return;

    setIsSubmitting(true);
    try {
      await onExecuteTransfer({
        sourceAccountId,
        destinationAccountId,
        amount: numAmount,
        date,
        reference: reference.trim() || 'Internal Account Transfer',
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Failed to execute account transfer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#1C1C1E] border border-white/10 rounded-t-[28px] sm:rounded-[26px] max-w-md w-full p-5 sm:p-6 shadow-2xl my-0 sm:my-8 text-white max-h-[90vh] overflow-y-auto">
        
        {/* Drag handle for mobile */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[12px] bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Transfer Between Accounts
              </h3>
              <p className="text-[11px] text-slate-400">
                Move funds instantly across bank & cash accounts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Source & Destination Account Pickers */}
          <div className="bg-[#2C2C2E]/80 border border-white/10 rounded-[18px] p-3.5 space-y-3">
            
            {/* From Account */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                From (Source Account)
              </label>
              <select
                value={sourceAccountId}
                onChange={(e) => {
                  setSourceAccountId(e.target.value);
                  if (e.target.value === destinationAccountId) {
                    const alt = accounts.find((a) => a.id !== e.target.value);
                    if (alt) setDestinationAccountId(alt.id);
                  }
                }}
                required
                className="w-full bg-[#1C1C1E] border border-white/10 rounded-[12px] px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatZAR(getBalance(acc))})
                  </option>
                ))}
              </select>
            </div>

            {/* Transfer Direction Indicator */}
            <div className="flex items-center justify-center my-0.5">
              <div className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30 shadow-sm">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* To Account */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                To (Destination Account)
              </label>
              <select
                value={destinationAccountId}
                onChange={(e) => setDestinationAccountId(e.target.value)}
                required
                className="w-full bg-[#1C1C1E] border border-white/10 rounded-[12px] px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                {accounts
                  .filter((a) => a.id !== sourceAccountId)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatZAR(getBalance(acc))})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Transfer Amount */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Transfer Amount (ZAR)
              </label>
              {sourceAccount && (
                <span className="text-[10px] text-slate-400 font-mono">
                  Available: {formatZAR(getBalance(sourceAccount))}
                </span>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                R
              </span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full bg-[#2C2C2E] border border-white/10 rounded-[14px] pl-8 pr-3 py-2.5 text-base font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Quick Percentage Buttons */}
            <div className="flex items-center gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => handleQuickPercent(0.25)}
                className="px-2.5 py-1 rounded-[8px] bg-[#2C2C2E] hover:bg-[#3A3A3C] text-[10px] font-bold text-slate-300 transition cursor-pointer"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => handleQuickPercent(0.5)}
                className="px-2.5 py-1 rounded-[8px] bg-[#2C2C2E] hover:bg-[#3A3A3C] text-[10px] font-bold text-slate-300 transition cursor-pointer"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => handleQuickPercent(1.0)}
                className="px-2.5 py-1 rounded-[8px] bg-[#2C2C2E] hover:bg-[#3A3A3C] text-[10px] font-bold text-slate-300 transition cursor-pointer"
              >
                100% Full Balance
              </button>
            </div>
          </div>

          {/* Date & Reference */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Transfer Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-[#2C2C2E] border border-white/10 rounded-[12px] px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Reference
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. Monthly Savings"
                className="w-full bg-[#2C2C2E] border border-white/10 rounded-[12px] px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Moved cash to Capitec Savings"
              className="w-full bg-[#2C2C2E] border border-white/10 rounded-[12px] px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Summary Preview */}
          {sourceAccount && destAccount && amount && parseFloat(amount) > 0 && (
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-[14px] text-xs text-sky-200 flex items-center justify-between">
              <div>
                <span className="font-bold block text-white">Transfer Summary:</span>
                <span>
                  {sourceAccount.name} → {destAccount.name}
                </span>
              </div>
              <span className="font-mono font-bold text-sky-400 text-sm">
                {formatZAR(parseFloat(amount))}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-[12px] bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[12px] bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs transition active:scale-95 cursor-pointer shadow-lg shadow-sky-500/20"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Transferring...' : 'Execute Transfer'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
