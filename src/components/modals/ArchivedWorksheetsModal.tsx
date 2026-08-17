import React, { useState } from 'react';
import { ArchivedWorksheet } from '../../types';
import {
  X,
  History,
  Archive,
  RotateCcw,
  Trash2,
  Calendar,
  User,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  Database,
} from 'lucide-react';
import { formatZARCompact } from '../../utils/southAfricaHolidays';

interface ArchivedWorksheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  archives: ArchivedWorksheet[];
  onRestoreArchive: (archive: ArchivedWorksheet) => Promise<void>;
  onDeleteArchive: (archiveId: string) => Promise<void>;
}

export const ArchivedWorksheetsModal: React.FC<ArchivedWorksheetsModalProps> = ({
  isOpen,
  onClose,
  archives,
  onRestoreArchive,
  onDeleteArchive,
}) => {
  const [selectedArchive, setSelectedArchive] = useState<ArchivedWorksheet | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExecuteRestore = async (archive: ArchivedWorksheet) => {
    setIsRestoring(true);
    setSuccessMsg(null);
    try {
      await onRestoreArchive(archive);
      setSuccessMsg(`Successfully restored worksheet snapshot: "${archive.title}"!`);
      setConfirmRestoreId(null);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error restoring archive:', err);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExecuteDelete = async (archiveId: string) => {
    setIsDeleting(true);
    try {
      await onDeleteArchive(archiveId);
      if (selectedArchive?.id === archiveId) {
        setSelectedArchive(null);
      }
    } catch (err) {
      console.error('Error deleting archive:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#1C1C1E] border border-white/10 rounded-t-[28px] sm:rounded-[26px] max-w-2xl w-full p-5 sm:p-6 shadow-2xl my-0 sm:my-8 text-white max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Archived Worksheets & Backups</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Firestore Safe
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                View saved worksheet snapshots and restore old budgets anytime
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

        {/* Success Toast Banner */}
        {successMsg && (
          <div className="mt-3 p-3 rounded-[14px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1">
          {archives.length === 0 ? (
            <div className="p-8 text-center bg-[#2C2C2E]/40 border border-white/5 rounded-[20px] my-4">
              <Archive className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-300">No Saved Worksheets Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                When you reset your budget worksheet, a safe backup snapshot will be automatically saved in Firestore here so you can restore it anytime.
              </p>
            </div>
          ) : (
            archives.map((arch) => {
              const snap = arch.dataSnapshot;
              const incomeCount = snap.incomes?.length || 0;
              const categoryCount = snap.categories?.length || 0;
              const expenseCount = snap.expenses?.length || 0;
              const totalIncomePlanned = snap.incomes?.reduce((acc, i) => acc + (i.amount || 0), 0) || 0;

              const isConfirmingRestore = confirmRestoreId === arch.id;

              const dateNice = new Date(arch.archivedAt).toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={arch.id}
                  className="p-4 rounded-[20px] bg-[#242426] border border-white/10 hover:border-emerald-500/40 transition flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white">{arch.title}</span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white/10 text-slate-300">
                          {arch.periodName || 'Pay Period'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          <span>{dateNice}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-sky-400" />
                          <span>Saved by {arch.archivedBy || 'User'}</span>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleExecuteDelete(arch.id)}
                      disabled={isDeleting || isRestoring}
                      className="p-2 rounded-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition active:scale-90 cursor-pointer shrink-0 border border-red-500/20"
                      title="Delete this archive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Stats Pill Bar */}
                  <div className="grid grid-cols-4 gap-2 bg-[#1C1C1E] p-2.5 rounded-[14px] border border-white/5 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Total Income</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {formatZARCompact(totalIncomePlanned)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Incomes</span>
                      <span className="font-mono font-bold text-slate-200">{incomeCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Envelopes</span>
                      <span className="font-mono font-bold text-sky-400">{categoryCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Expenses</span>
                      <span className="font-mono font-bold text-amber-400">{expenseCount}</span>
                    </div>
                  </div>

                  {arch.notes && (
                    <p className="text-[11px] text-slate-400 italic bg-[#18181A] p-2 rounded-[10px]">
                      "{arch.notes}"
                    </p>
                  )}

                  {/* Restore Confirmation Step */}
                  {isConfirmingRestore ? (
                    <div className="p-3 rounded-[14px] bg-emerald-500/10 border border-emerald-500/30 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
                      <div className="flex items-center gap-2 text-emerald-300">
                        <AlertTriangle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Restore this worksheet and replace active entries?</span>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => setConfirmRestoreId(null)}
                          disabled={isRestoring}
                          className="px-3 py-1.5 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-300 rounded-[10px] text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExecuteRestore(arch)}
                          disabled={isRestoring}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-[10px] text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                        >
                          {isRestoring ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Restoring...</span>
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Confirm Restore</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setConfirmRestoreId(arch.id)}
                        disabled={isRestoring}
                        className="px-3.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-[12px] text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore This Worksheet</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>{archives.length} Backup Snapshots Saved</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white rounded-[12px] font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
