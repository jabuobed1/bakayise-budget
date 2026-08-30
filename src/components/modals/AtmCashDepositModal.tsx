import React, { useState, useMemo, useEffect } from 'react';
import { FinancialAccount, BudgetPeriod } from '../../types';
import { SOUTH_AFRICAN_INSTITUTIONS } from '../../utils/budgetConstants';
import { formatZAR } from '../../utils/southAfricaHolidays';
import {
  calculateBankCharge,
  identifyBankFromText,
  getCostOptimizationTip,
  TransactionType,
} from '../../utils/bankChargesEngine';
import { Landmark, Banknote, X, MapPin, Building2, Wallet, Plus, ArrowUpRight, Info, AlertCircle } from 'lucide-react';

interface AtmCashDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: FinancialAccount[];
  accountBalances?: Record<string, number>;
  currentPeriod: BudgetPeriod | null;
  initialDestinationAccountId?: string;
  onExecuteDeposit: (depositData: {
    destinationAccountId: string;
    sourceType: 'cash_wallet' | 'external_atm_cash';
    cashAccountId?: string;
    amount: number;
    date: string;
    atmLocation: string;
    reference: string;
    notes?: string;
  }) => Promise<void>;
}

export const AtmCashDepositModal: React.FC<AtmCashDepositModalProps> = ({
  isOpen,
  onClose,
  accounts,
  accountBalances,
  currentPeriod,
  initialDestinationAccountId,
  onExecuteDeposit,
}) => {
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [sourceType, setSourceType] = useState<'cash_wallet' | 'external_atm_cash'>('external_atm_cash');
  const [cashAccountId, setCashAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [depositChannel, setDepositChannel] = useState<'bank_atm' | 'retail_till'>('bank_atm');
  const [atmLocation, setAtmLocation] = useState<string>('Capitec Deposit ATM');
  const [reference, setReference] = useState<string>('ATM Cash Deposit');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when modal opens or accounts change
  useEffect(() => {
    if (isOpen && accounts.length > 0) {
      const bankAccounts = accounts.filter(
        (a) => a.type === 'cheque' || a.type === 'savings' || a.type === 'tax_free'
      );
      const cashAccounts = accounts.filter((a) => a.type === 'cash');

      const resolvedDestId =
        (initialDestinationAccountId && accounts.some((a) => a.id === initialDestinationAccountId))
          ? initialDestinationAccountId
          : bankAccounts[0]?.id || accounts[0]?.id || '';

      const hasCashAccs = cashAccounts.length > 0;
      setDestinationAccountId(resolvedDestId);
      setSourceType(hasCashAccs ? 'cash_wallet' : 'external_atm_cash');
      setCashAccountId(cashAccounts[0]?.id || '');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setDepositChannel('bank_atm');
      setAtmLocation('Capitec Deposit ATM');
      setReference('ATM Cash Deposit');
      setNotes('');
      setIsSubmitting(false);
      setErrorMessage(null);
    }
  }, [isOpen, initialDestinationAccountId, accounts]);

  const getBalance = (acc: FinancialAccount) => {
    return accountBalances?.[acc.id] ?? (acc.openingBalance || 0);
  };

  const cashAccounts = useMemo(() => accounts.filter((a) => a.type === 'cash'), [accounts]);
  const destAccount = accounts.find((a) => a.id === destinationAccountId);
  const cashAccount = accounts.find((a) => a.id === cashAccountId);
  const parsedAmount = parseFloat(amount) || 0;

  const destBank = identifyBankFromText(destAccount?.name);
  const txType: TransactionType = depositChannel === 'retail_till' ? 'retail_cash_deposit' : 'atm_deposit_own';

  const chargeInfo = useMemo(() => {
    return calculateBankCharge({
      bankCode: destBank,
      accountName: destAccount?.name,
      transactionType: txType,
      amount: parsedAmount,
    });
  }, [destBank, destAccount?.name, txType, parsedAmount]);

  const costTip = useMemo(() => {
    return getCostOptimizationTip({
      sourceBank: destBank,
      amount: parsedAmount,
      transactionType: txType,
    });
  }, [destBank, parsedAmount, txType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = parseFloat(amount);
    if (!destinationAccountId) {
      setErrorMessage('Please select a destination account.');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setErrorMessage('Please enter a valid deposit amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onExecuteDeposit({
        destinationAccountId,
        sourceType,
        cashAccountId: sourceType === 'cash_wallet' ? cashAccountId : undefined,
        amount: numAmount,
        date,
        atmLocation: atmLocation.trim() || 'ATM Cash Deposit',
        reference: reference.trim() || 'ATM Deposit',
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to execute ATM cash deposit:', err);
      setErrorMessage(err?.message || 'Failed to complete deposit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#1C1C1E] border border-white/10 rounded-t-[28px] sm:rounded-[26px] max-w-md w-full p-5 sm:p-6 shadow-2xl my-0 sm:my-8 text-white max-h-[90vh] overflow-y-auto">
        
        {/* iOS Grabber */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[12px] bg-[#30D158]/15 border border-[#30D158]/30 text-[#30D158] flex items-center justify-center shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                ATM Cash Deposit
              </h3>
              <p className="text-[11px] text-slate-400">
                Log cash deposited at South African bank ATMs
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
          
          {/* Source Type Selector Tabs */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Cash Source
            </label>
            <div className="grid grid-cols-2 gap-2 bg-[#2C2C2E] p-1 rounded-[14px]">
              {cashAccounts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSourceType('cash_wallet')}
                  className={`py-2 px-3 rounded-[10px] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    sourceType === 'cash_wallet'
                      ? 'bg-[#30D158] text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Physical Cash Wallet</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSourceType('external_atm_cash')}
                className={`py-2 px-3 rounded-[10px] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  sourceType === 'external_atm_cash'
                    ? 'bg-[#30D158] text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                } ${cashAccounts.length === 0 ? 'col-span-2' : ''}`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>External / ATM Cash Inflow</span>
              </button>
            </div>
          </div>

          {/* Physical Cash Account selection if cash_wallet */}
          {sourceType === 'cash_wallet' && cashAccounts.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                From Cash Account
              </label>
              <select
                value={cashAccountId}
                onChange={(e) => setCashAccountId(e.target.value)}
                required
                className="w-full bg-[#2C2C2E] border border-white/10 rounded-[12px] px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
              >
                {cashAccounts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({formatZAR(getBalance(c))})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Destination Account */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Receiving Bank Account
            </label>
            <select
              value={destinationAccountId}
              onChange={(e) => setDestinationAccountId(e.target.value)}
              required
              className="w-full bg-[#2C2C2E] border border-white/10 rounded-[12px] px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatZAR(getBalance(acc))})
                </option>
              ))}
            </select>
          </div>

          {/* Deposit Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Deposit Amount (ZAR)
            </label>
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
                className="w-full bg-[#2C2C2E] border border-white/10 rounded-[14px] pl-8 pr-3 py-2.5 text-base font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#30D158]"
              />
            </div>
          </div>

          {/* Deposit Channel (Bank ATM vs Retail Store Till) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Deposit Channel
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDepositChannel('bank_atm');
                  setAtmLocation(`${destAccount?.name || 'Bank'} ATM`);
                }}
                className={`p-2.5 rounded-[12px] border text-left transition cursor-pointer ${
                  depositChannel === 'bank_atm'
                    ? 'bg-[#30D158]/15 border-[#30D158] text-white'
                    : 'bg-[#2C2C2E] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-[#30D158]" />
                  <p className="text-xs font-bold">Bank ATM</p>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Cash Accepting ATM</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDepositChannel('retail_till');
                  setAtmLocation('Pick n Pay / Boxer Till');
                }}
                className={`p-2.5 rounded-[12px] border text-left transition cursor-pointer ${
                  depositChannel === 'retail_till'
                    ? 'bg-[#30D158]/15 border-[#30D158] text-white'
                    : 'bg-[#2C2C2E] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  <p className="text-xs font-bold">Store Till Counter</p>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Pick n Pay / Boxer / Checkers</p>
              </button>
            </div>
          </div>

          {/* Bank Charges Engine Breakdown */}
          {destAccount && parsedAmount > 0 && (
            <div className="p-3 bg-[#2C2C2E]/90 border border-white/10 rounded-[14px] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: chargeInfo.profile.brandColor }} />
                  <span className="font-bold text-white">{chargeInfo.profile.displayName} Fee:</span>
                  <span className="text-slate-400 text-[11px]">({chargeInfo.rule.description})</span>
                </div>
                <span className={`font-mono font-bold ${chargeInfo.fee === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {chargeInfo.fee === 0 ? 'R0.00 (FREE)' : formatZAR(chargeInfo.fee)}
                </span>
              </div>
              {chargeInfo.rule.notes && (
                <p className="text-[10px] text-slate-400">{chargeInfo.rule.notes}</p>
              )}
              {costTip && (
                <div className="mt-1 pt-1.5 border-t border-white/[0.06] flex items-start gap-1.5 text-[10px] text-sky-300">
                  <Info className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                  <span>{costTip}</span>
                </div>
              )}
            </div>
          )}

          {/* Date & ATM Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Deposit Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-[#2C2C2E] border border-white/10 rounded-[12px] px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#30D158]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                ATM / Location
              </label>
              <input
                type="text"
                value={atmLocation}
                onChange={(e) => setAtmLocation(e.target.value)}
                placeholder="e.g. Capitec Sandton ATM"
                className="w-full bg-[#2C2C2E] border border-white/10 rounded-[12px] px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#30D158]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Reference / Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cash from side hustle deposited at ATM"
              className="w-full bg-[#2C2C2E] border border-white/10 rounded-[12px] px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#30D158]"
            />
          </div>

          {/* Deposit Summary */}
          {destAccount && amount && parseFloat(amount) > 0 && (
            <div className="p-3 bg-[#30D158]/10 border border-[#30D158]/20 rounded-[14px] text-xs text-emerald-200 flex items-center justify-between">
              <div>
                <span className="font-bold block text-white">Deposit Inflow:</span>
                <span>
                  {atmLocation} → {destAccount.name}
                </span>
              </div>
              <span className="font-mono font-bold text-[#30D158] text-sm">
                +{formatZAR(parseFloat(amount))}
              </span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-[14px] flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Actions */}
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-[12px] bg-[#30D158] hover:bg-[#34C759] text-black font-bold text-xs transition active:scale-95 cursor-pointer shadow-lg shadow-[#30D158]/20"
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Logging...' : 'Log Cash Deposit'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
