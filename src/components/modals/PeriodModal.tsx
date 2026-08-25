import React, { useState } from 'react';
import { BudgetPeriod, BudgetCategory, Debt, FinancialAccount } from '../../types';
import {
  generatePayPeriodInfo,
  formatDateNice,
  formatDateFull,
  formatZAR,
} from '../../utils/southAfricaHolidays';
import { FigmaIcon } from '../ui/FigmaIcon';
import { X, Copy, AlertTriangle, ShieldCheck } from 'lucide-react';

interface PeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNewPeriod?: (newPeriod: BudgetPeriod, copyFromCategories: boolean) => void;
  onSave?: (newPeriod: BudgetPeriod, copyFromCategories: boolean) => void;
  existingPeriods?: BudgetPeriod[];
  currentCategories?: BudgetCategory[];
  hasExistingCategories?: boolean;
  debts?: Debt[];
  accounts?: FinancialAccount[];
}

export const PeriodModal: React.FC<PeriodModalProps> = ({
  isOpen,
  onClose,
  onSaveNewPeriod,
  onSave,
  existingPeriods = [],
  currentCategories = [],
  hasExistingCategories,
  debts = [],
  accounts = [],
}) => {
  const now = new Date();
  const nextMonth = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
  const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();

  const [selectedYear, setSelectedYear] = useState<number>(nextYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(nextMonth);
  const [copyCategories, setCopyCategories] = useState<boolean>(true);
  const [customName, setCustomName] = useState<string>('');

  if (!isOpen) return null;

  const info = generatePayPeriodInfo(selectedYear, selectedMonth, 25);
  const isShifted = info.shiftedReasons.length > 0;
  const saveHandler = onSaveNewPeriod || onSave;
  const showCopyCheckbox = (currentCategories && currentCategories.length > 0) || !!hasExistingCategories;
  const categoryCount = currentCategories?.length || 0;

  const activeDebts = debts.filter(
    (d) => d.status !== 'paid_off' && (d.balance > 0 || d.minimumPayment > 0)
  );

  const installmentAccounts = accounts.filter(
    (a) =>
      (a.type === 'vehicle_loan' ||
        a.type === 'home_loan' ||
        (a.manualMonthlyInstallment && a.manualMonthlyInstallment > 0) ||
        (a.monthlyInstallment && a.monthlyInstallment > 0)) &&
      !debts.some((d) => d.linkedAccountId === a.id)
  );

  const totalMinimumObligations =
    activeDebts.reduce((sum, d) => sum + (d.minimumPayment || 0), 0) +
    installmentAccounts.reduce(
      (sum, a) =>
        sum + (a.manualMonthlyInstallment || a.monthlyInstallment || a.minimumPaymentAmount || 0),
      0
    );

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const periodId = `period_${selectedYear}_${selectedMonth + 1}_${Date.now()}`;
    const name = customName.trim() || info.periodName;

    const newPeriod: BudgetPeriod = {
      id: periodId,
      name,
      startDate: info.startDate,
      endDate: info.endDate,
      setupDueDate: info.setupDueDate,
      status: 'planning',
      totalPlannedIncome: 0,
      totalPlannedExpenses: 0,
      openingFloatingBalance: 0,
      closingFloatingBalance: 0,
      autoCarryoverFromPrevious: true,
      notes: isShifted ? info.shiftedReasons.join('; ') : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (saveHandler) {
      saveHandler(newPeriod, copyCategories);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#1C1C1E] border border-white/10 rounded-t-[28px] sm:rounded-[26px] max-w-lg w-full p-5 sm:p-6 shadow-2xl my-0 sm:my-8 text-white max-h-[90vh] overflow-y-auto">
        
        {/* iOS Grabber */}
        <div className="w-10 h-1.2 bg-white/25 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#30D158]/15 border border-[#30D158]/30 text-[#30D158] flex items-center justify-center shrink-0">
              <FigmaIcon name="calendar" size="md" strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Create Pay Cycle Budget
              </h3>
              <p className="text-xs text-slate-400">
                South African 25th payday & public holiday logic
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
          
          {/* Month & Year Select */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Month *
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Year *
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
                <option value={2028}>2028</option>
              </select>
            </div>
          </div>

          {/* Payday preview card (iOS Grouped Style) */}
          <div
            className={`border rounded-[18px] p-3.5 text-xs space-y-2 ${
              isShifted
                ? 'bg-[#FF9F0A]/10 border-[#FF9F0A]/30'
                : 'bg-[#30D158]/10 border-[#30D158]/30'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span className="text-slate-200">Payday Arrival:</span>
              <span className={isShifted ? 'text-[#FF9F0A]' : 'text-[#30D158]'}>
                {formatDateFull(info.startDate)}
              </span>
            </div>

            {isShifted && (
              <div className="flex items-start gap-1.5 text-[#FF9F0A] text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Shifted: {info.shiftedReasons.join('; ')}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-slate-400 pt-2 border-t border-white/[0.08]">
              <span>Budget Setup Due:</span>
              <strong className="text-slate-200">{formatDateNice(info.setupDueDate)}</strong>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>Cycle Spans:</span>
              <strong className="text-slate-200">
                {formatDateNice(info.startDate)} – {formatDateNice(info.endDate)}
              </strong>
            </div>
          </div>

          {/* Debt Snowball & Vehicle Installments Auto-Population Notice */}
          {(activeDebts.length > 0 || installmentAccounts.length > 0) && (
            <div className="bg-[#1C1C1E] border border-blue-500/30 rounded-[16px] p-3.5 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-white block">
                  Automatic Debt & Installment Protection
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  The system will automatically include minimum payment entries for your{' '}
                  <strong className="text-blue-300">
                    {activeDebts.length + installmentAccounts.length} debt/installment obligations
                  </strong>{' '}
                  (totaling {formatZAR(totalMinimumObligations)}), skipping any that are already in your budget envelopes.
                </p>
              </div>
            </div>
          )}

          {/* Copy Envelopes checkbox */}
          {showCopyCheckbox && (
            <div className="bg-[#2C2C2E]/80 border border-white/10 rounded-[16px] p-3.5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyCategories}
                  onChange={(e) => setCopyCategories(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#30D158] focus:ring-[#30D158] bg-[#1C1C1E] border-white/20 cursor-pointer accent-[#30D158]"
                />
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5 text-[#30D158]" />
                    <span>Copy current {categoryCount > 0 ? `${categoryCount} ` : ''}category envelopes</span>
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Pre-fills your existing budget envelopes and allocations so you don&apos;t have to recreate them from scratch.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Custom Name (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Custom Period Name (Optional)
            </label>
            <input
              type="text"
              placeholder={info.periodName}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
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
              className="px-5 py-2.5 bg-[#30D158] hover:bg-[#34C759] text-black font-bold rounded-[14px] text-xs shadow-md shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
            >
              Create Pay Cycle
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
