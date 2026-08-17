import React, { useState, useEffect } from 'react';
import { BudgetPeriod, PeriodStatus } from '../../types';
import { FigmaIcon } from '../ui/FigmaIcon';
import { formatDateNice } from '../../utils/southAfricaHolidays';
import { formatZAR } from '../../utils/southAfricaHolidays';
import { X, Calendar, DollarSign, FileText, CheckCircle2, Clock, Archive, Save, Trash2, ArrowRightLeft } from 'lucide-react';

interface EditPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  period: BudgetPeriod | null;
  onSavePeriod: (updatedPeriod: BudgetPeriod) => Promise<void>;
  onDeletePeriod?: (periodId: string) => Promise<void>;
}

export const EditPeriodModal: React.FC<EditPeriodModalProps> = ({
  isOpen,
  onClose,
  period,
  onSavePeriod,
  onDeletePeriod,
}) => {
  const [name, setName] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [setupDueDate, setSetupDueDate] = useState<string>('');
  const [status, setStatus] = useState<PeriodStatus>('active');
  const [openingFloatingBalance, setOpeningFloatingBalance] = useState<number>(0);
  const [autoCarryoverFromPrevious, setAutoCarryoverFromPrevious] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  useEffect(() => {
    if (period) {
      setName(period.name || '');
      setStartDate(period.startDate || '');
      setEndDate(period.endDate || '');
      setSetupDueDate(period.setupDueDate || '');
      setStatus(period.status || 'active');
      setOpeningFloatingBalance(period.openingFloatingBalance || 0);
      setAutoCarryoverFromPrevious(period.autoCarryoverFromPrevious !== false);
      setNotes(period.notes || '');
      setConfirmDelete(false);
    }
  }, [period]);

  if (!isOpen || !period) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;

    setIsSubmitting(true);
    try {
      const updatedPeriod: BudgetPeriod = {
        ...period,
        name: name.trim(),
        startDate,
        endDate,
        setupDueDate: setupDueDate || startDate,
        status,
        openingFloatingBalance: Number(openingFloatingBalance) || 0,
        autoCarryoverFromPrevious,
        notes: notes.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };

      await onSavePeriod(updatedPeriod);
      onClose();
    } catch (err) {
      console.error('Failed to save pay period:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDeletePeriod) return;
    setIsSubmitting(true);
    try {
      await onDeletePeriod(period.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete pay period:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#1C1C1E] border border-white/10 rounded-t-[28px] sm:rounded-[26px] max-w-lg w-full p-5 sm:p-6 shadow-2xl my-0 sm:my-8 text-white max-h-[90vh] overflow-y-auto">
        
        {/* iOS Drag Indicator */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#30D158]/15 border border-[#30D158]/30 text-[#30D158] flex items-center justify-center shrink-0">
              <FigmaIcon name="calendar" size="md" strokeWidth={2.4} color="#30D158" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Edit Pay Cycle Details
              </h3>
              <p className="text-xs text-slate-400">
                {formatDateNice(period.startDate)} – {formatDateNice(period.endDate)}
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
          {/* Cycle Name */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Pay Cycle Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. August 2026 Pay Cycle"
              required
              className="w-full bg-[#2C2C2E] border border-white/10 rounded-[14px] px-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#30D158]"
            />
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Cycle Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`py-2 px-3 rounded-[12px] border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  status === 'active'
                    ? 'bg-[#30D158]/20 border-[#30D158] text-[#30D158]'
                    : 'bg-[#2C2C2E] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('planning')}
                className={`py-2 px-3 rounded-[12px] border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  status === 'planning'
                    ? 'bg-[#FF9F0A]/20 border-[#FF9F0A] text-[#FF9F0A]'
                    : 'bg-[#2C2C2E] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Planning</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('completed')}
                className={`py-2 px-3 rounded-[12px] border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  status === 'completed'
                    ? 'bg-[#0A84FF]/20 border-[#0A84FF] text-[#0A84FF]'
                    : 'bg-[#2C2C2E] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Completed</span>
              </button>
            </div>
          </div>

          {/* Date Range Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full bg-[#2C2C2E] border border-white/10 rounded-[14px] px-3 py-2 text-xs font-mono font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#30D158]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full bg-[#2C2C2E] border border-white/10 rounded-[14px] px-3 py-2 text-xs font-mono font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#30D158]"
              />
            </div>
          </div>

          {/* Setup Due Date */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Budget Setup Due Date
            </label>
            <input
              type="date"
              value={setupDueDate}
              onChange={(e) => setSetupDueDate(e.target.value)}
              className="w-full bg-[#2C2C2E] border border-white/10 rounded-[14px] px-3 py-2 text-xs font-mono font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#30D158]"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Deadline date when budget envelopes should be locked in before salary arrives.
            </p>
          </div>

          {/* Floating Balance & Auto Carryover */}
          <div className="bg-[#2C2C2E]/80 border border-white/10 rounded-[18px] p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Auto Carryover From Prev Cycle</span>
                <p className="text-[11px] text-slate-400">
                  Automatically roll over unspent leftover cash from previous cycle.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoCarryoverFromPrevious}
                onChange={(e) => setAutoCarryoverFromPrevious(e.target.checked)}
                className="w-5 h-5 accent-[#30D158] rounded cursor-pointer shrink-0"
              />
            </div>

            {!autoCarryoverFromPrevious && (
              <div className="pt-2 border-t border-white/10">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Manual Opening Floating Balance (ZAR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    R
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={openingFloatingBalance}
                    onChange={(e) => setOpeningFloatingBalance(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-[12px] pl-8 pr-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#30D158]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Notes & Reminders
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Adjusted payday due to Heritage Day holiday"
              rows={2}
              className="w-full bg-[#2C2C2E] border border-white/10 rounded-[14px] px-3.5 py-2 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#30D158]"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-3">
            {onDeletePeriod && (
              <div>
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="p-2.5 rounded-[12px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition cursor-pointer"
                    title="Delete Pay Cycle"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="px-3 py-2 rounded-[12px] bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Confirm Delete?
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-[14px] bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] bg-[#30D158] hover:bg-[#34C759] text-black font-bold text-xs transition active:scale-95 cursor-pointer shadow-lg shadow-[#30D158]/20"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : 'Save Cycle Details'}</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
