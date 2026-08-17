import React from 'react';
import { Income } from '../types';
import { formatZAR, formatDateNice } from '../utils/southAfricaHolidays';
import { FigmaIcon, FigmaIconName } from './ui/FigmaIcon';
import { Plus, Edit2, Trash2, Tag, Check, Clock } from 'lucide-react';

interface IncomeListProps {
  incomes: Income[];
  onOpenAddIncomeModal: () => void;
  onOpenEditIncomeModal: (inc: Income) => void;
  onDeleteIncome: (incId: string) => void;
  onToggleStatus: (inc: Income) => void;
}

export const IncomeList: React.FC<IncomeListProps> = ({
  incomes,
  onOpenAddIncomeModal,
  onOpenEditIncomeModal,
  onDeleteIncome,
  onToggleStatus,
}) => {
  const totalExpected = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalReceived = incomes
    .filter((i) => i.status === 'received')
    .reduce((sum, i) => sum + i.amount, 0);

  const getIncomeIconName = (type: string): { icon: FigmaIconName; color: string } => {
    switch (type) {
      case 'primary_salary':
        return { icon: 'building', color: '#30D158' };
      case 'spouse_salary':
        return { icon: 'user', color: '#FF375F' };
      case 'freelance':
      case 'side_hustle':
        return { icon: 'zap', color: '#FF9F0A' };
      default:
        return { icon: 'trending', color: '#0A84FF' };
    }
  };

  return (
    <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] p-4 sm:p-5 shadow-xl mb-6 space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-[#30D158]/15 border border-[#30D158]/30 flex items-center justify-center text-[#30D158] shrink-0">
            <FigmaIcon name="trending" size="md" strokeWidth={2.4} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Income Sources & Salary</span>
            </h3>
            <p className="text-xs text-slate-400">
              Husband, wife, freelance, and side revenue streams
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-right hidden md:block">
            <span className="text-slate-400">Received: </span>
            <strong className="text-[#30D158] font-bold">{formatZAR(totalReceived)}</strong>
            <span className="text-slate-500"> / {formatZAR(totalExpected)}</span>
          </div>

          <button
            onClick={onOpenAddIncomeModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-[#30D158] hover:bg-[#34C759] text-black text-xs font-bold transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.8} />
            <span>Add Income</span>
          </button>
        </div>
      </div>

      {/* Incomes Grid */}
      {incomes.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-xs">
          No income streams logged yet. Tap "Add Income" to register your family salary.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {incomes.map((inc) => {
            const isReceived = inc.status === 'received';
            const { icon, color } = getIncomeIconName(inc.type);

            return (
              <div
                key={inc.id}
                className="bg-[#2C2C2E]/70 border border-white/[0.06] rounded-[18px] p-3.5 flex flex-col justify-between hover:bg-[#2C2C2E] transition shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 border border-white/10"
                        style={{
                          backgroundColor: `${color}20`,
                          color: color,
                        }}
                      >
                        <FigmaIcon name={icon} size="sm" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white truncate tracking-tight" title={inc.title}>
                          {inc.title}
                        </h4>
                        {inc.sourceTag && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <Tag className="w-3 h-3 text-slate-500" />
                            <span className="truncate">{inc.sourceTag}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onOpenEditIncomeModal(inc)}
                        title="Edit income"
                        className="w-7 h-7 rounded-[8px] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteIncome(inc.id)}
                        title="Delete income"
                        className="w-7 h-7 rounded-[8px] flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-white/10 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className="text-xl font-bold text-[#30D158] tracking-tight">
                      {formatZAR(inc.amount)}
                    </span>
                  </div>

                  {inc.notes && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1 italic">
                      "{inc.notes}"
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                  <button
                    onClick={() => onToggleStatus(inc)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] text-xs font-semibold transition cursor-pointer ${
                      isReceived
                        ? 'bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30 hover:bg-[#30D158]/25'
                        : 'bg-[#FF9F0A]/15 text-[#FF9F0A] border border-[#FF9F0A]/30 hover:bg-[#FF9F0A]/25'
                    }`}
                  >
                    {isReceived ? (
                      <>
                        <Check className="w-3.5 h-3.5" strokeWidth={2.8} />
                        <span>Received</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" strokeWidth={2.2} />
                        <span>Expected</span>
                      </>
                    )}
                  </button>

                  {inc.receivedDate && (
                    <span className="text-[11px] text-slate-400">
                      {formatDateNice(inc.receivedDate)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
