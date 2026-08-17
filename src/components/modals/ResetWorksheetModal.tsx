import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRight,
  Loader2,
  ShieldAlert,
  Archive,
  Lock,
} from 'lucide-react';
import { archiveCurrentWorksheet } from '../../services/firestoreService';

interface ResetWorksheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetToScratch: (options: {
    resetAccountsToCleanDefaults?: boolean;
    clearDebts?: boolean;
    clearEmergencyLogs?: boolean;
  }) => Promise<void>;
  onResetToExampleTemplate: () => Promise<void>;
  periodName?: string;
  categoryCount?: number;
  incomeCount?: number;
  expenseCount?: number;
}

export const ResetWorksheetModal: React.FC<ResetWorksheetModalProps> = ({
  isOpen,
  onClose,
  onResetToScratch,
  onResetToExampleTemplate,
  periodName = 'Current Pay Period',
  categoryCount = 0,
  incomeCount = 0,
  expenseCount = 0,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [backupTitle, setBackupTitle] = useState<string>(
    `Worksheet Backup - ${periodName} (${new Date().toLocaleDateString('en-ZA')})`
  );
  const [resetMode, setResetMode] = useState<'scratch' | 'fresh_all' | 'example'>('scratch');
  const [typedConfirmation, setTypedConfirmation] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);
  const [statusText, setStatusText] = useState<string>('');

  if (!isOpen) return null;

  const handleClose = () => {
    if (isResetting) return;
    setStep(1);
    setTypedConfirmation('');
    onClose();
  };

  const handleProceedToStep2 = () => {
    setStep(2);
  };

  const handleExecuteReset = async () => {
    if (typedConfirmation.trim().toUpperCase() !== 'RESET') return;

    setIsResetting(true);
    try {
      setStatusText('Archiving current worksheet safely to Firestore...');
      // 1. Archive current worksheet state first!
      await archiveCurrentWorksheet(backupTitle);

      setStatusText('Resetting worksheet entries to clean state...');
      // 2. Perform reset
      if (resetMode === 'scratch') {
        await onResetToScratch({
          resetAccountsToCleanDefaults: false,
          clearDebts: false,
          clearEmergencyLogs: false,
        });
      } else if (resetMode === 'fresh_all') {
        await onResetToScratch({
          resetAccountsToCleanDefaults: true,
          clearDebts: true,
          clearEmergencyLogs: true,
        });
      } else {
        await onResetToExampleTemplate();
      }

      handleClose();
    } catch (err) {
      console.error('Error in 2-step worksheet reset:', err);
      setStatusText('An error occurred during reset. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const isStep2Valid = typedConfirmation.trim().toUpperCase() === 'RESET';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#1C1C1E] border border-white/10 rounded-t-[28px] sm:rounded-[26px] max-w-lg w-full p-5 sm:p-6 shadow-2xl my-0 sm:my-8 text-white max-h-[90vh] overflow-y-auto">
        
        {/* iOS Grabber */}
        <div className="w-10 h-1.2 bg-white/25 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Step Indicator Badge */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Reset Budget Worksheet
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Step {step} of 2 Verification
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {step === 1 ? 'Warning & Safe Firestore Backup Setup' : 'Security Confirmation Required'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={isResetting}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Worksheet Metrics Card */}
        <div className="mt-4 p-3.5 rounded-[16px] bg-[#2C2C2E]/70 border border-white/[0.08]">
          <div className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-2">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Target: {periodName}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="bg-[#1C1C1E] p-2 rounded-[10px] border border-white/5">
              <div className="text-xs font-mono font-bold text-emerald-400">{incomeCount}</div>
              <div className="text-[10px] text-slate-400">Incomes</div>
            </div>
            <div className="bg-[#1C1C1E] p-2 rounded-[10px] border border-white/5">
              <div className="text-xs font-mono font-bold text-sky-400">{categoryCount}</div>
              <div className="text-[10px] text-slate-400">Envelopes</div>
            </div>
            <div className="bg-[#1C1C1E] p-2 rounded-[10px] border border-white/5">
              <div className="text-xs font-mono font-bold text-amber-400">{expenseCount}</div>
              <div className="text-[10px] text-slate-400">Expenses</div>
            </div>
          </div>
        </div>

        {/* STEP 1: WARNING & BACKUP TITLE */}
        {step === 1 && (
          <div className="mt-4 space-y-4 animate-fadeIn">
            <div className="p-3.5 rounded-[16px] bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Step 1: Warning & Automatic Backup</span>
              </div>
              <p>
                Resetting your worksheet will clear all current incomes, categories, and expenses so you can start completely fresh.
              </p>
              <p className="text-emerald-300 font-semibold flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5" />
                <span>Your current worksheet data will be saved safely in Firestore under Archived Worksheets before resetting. You can restore it anytime!</span>
              </p>
            </div>

            {/* Backup Title Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Archive / Backup Title:
              </label>
              <input
                type="text"
                value={backupTitle}
                onChange={(e) => setBackupTitle(e.target.value)}
                placeholder="Enter title for this backup snapshot..."
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#2C2C2E] border border-white/10 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Reset Options */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Choose Reset Mode:
              </label>

              {/* Option 1: Clean Scratch Worksheet */}
              <button
                type="button"
                onClick={() => setResetMode('scratch')}
                className={`w-full text-left p-3 rounded-[14px] border transition cursor-pointer flex items-start gap-2.5 ${
                  resetMode === 'scratch'
                    ? 'bg-emerald-950/40 border-[#30D158]/60 ring-1 ring-[#30D158]/40'
                    : 'bg-[#2C2C2E]/60 border-white/10 hover:bg-[#2C2C2E]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    resetMode === 'scratch' ? 'bg-[#30D158] text-black font-bold' : 'border border-white/30'
                  }`}
                >
                  {resetMode === 'scratch' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-white block">
                    Clean Scratch Worksheet (Empty State)
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Clears incomes and budget envelopes. Bank accounts are preserved.
                  </p>
                </div>
              </button>

              {/* Option 2: Total Fresh Start */}
              <button
                type="button"
                onClick={() => setResetMode('fresh_all')}
                className={`w-full text-left p-3 rounded-[14px] border transition cursor-pointer flex items-start gap-2.5 ${
                  resetMode === 'fresh_all'
                    ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/40'
                    : 'bg-[#2C2C2E]/60 border-white/10 hover:bg-[#2C2C2E]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    resetMode === 'fresh_all' ? 'bg-amber-400 text-black font-bold' : 'border border-white/30'
                  }`}
                >
                  {resetMode === 'fresh_all' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-white block">
                    Total Fresh Start (Reset Accounts to R0)
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Wipes budget entries and resets bank accounts to clean R0 defaults.
                  </p>
                </div>
              </button>
            </div>

            {/* Footer step 1 actions */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-300 rounded-[14px] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToStep2}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-[14px] text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>Proceed to Verification Step 2</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: TYPED VERIFICATION */}
        {step === 2 && (
          <div className="mt-4 space-y-4 animate-fadeIn">
            <div className="p-3.5 rounded-[16px] bg-red-500/10 border border-red-500/30 text-red-200 text-xs leading-relaxed space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-400 text-sm">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Step 2: 2-Step Verification Confirmation</span>
              </div>
              <p>
                To prevent accidental resets, please type <strong className="text-white font-mono bg-red-950 px-1.5 py-0.5 rounded border border-red-500/40">RESET</strong> in the confirmation box below.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Type RESET to confirm:
              </label>
              <input
                type="text"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder="Type RESET here..."
                disabled={isResetting}
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#2C2C2E] border border-white/20 text-white font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {statusText && (
              <div className="text-xs text-amber-300 font-semibold flex items-center gap-2 bg-amber-500/10 p-2.5 rounded-[12px] border border-amber-500/20">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                <span>{statusText}</span>
              </div>
            )}

            {/* Footer step 2 actions */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isResetting}
                className="px-3.5 py-2 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-300 rounded-[12px] text-xs font-semibold cursor-pointer"
              >
                Back to Step 1
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isResetting}
                  className="px-3.5 py-2 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-300 rounded-[12px] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteReset}
                  disabled={!isStep2Valid || isResetting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-[12px] text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing Reset...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Confirm & Archive & Reset</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
