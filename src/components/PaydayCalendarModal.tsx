import React, { useState } from 'react';
import {
  getSouthAfricanHolidays,
  calculateSouthAfricanPayday,
  calculateBudgetDueDate,
  formatDateNice,
  formatDateFull,
} from '../utils/southAfricaHolidays';
import { FigmaIcon } from './ui/FigmaIcon';
import { X, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface PaydayCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNewPeriodDates?: (startDate: string, endDate: string, name: string) => void;
}

export const PaydayCalendarModal: React.FC<PaydayCalendarModalProps> = ({
  isOpen,
  onClose,
  onSelectNewPeriodDates,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [baseDay, setBaseDay] = useState<number>(25);

  if (!isOpen) return null;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const paydaysForYear = months.map((monthName, idx) => {
    const payInfo = calculateSouthAfricanPayday(selectedYear, idx, baseDay);
    const dueInfo = calculateBudgetDueDate(payInfo.payday);
    const isShifted = payInfo.shiftedReasons.length > 0;

    return {
      monthIndex: idx,
      monthName,
      payday: payInfo.payday,
      paydayString: payInfo.paydayString,
      originalDay: payInfo.originalDay,
      shiftedReasons: payInfo.shiftedReasons,
      isShifted,
      dueDate: dueInfo.dueDate,
      dueDateString: dueInfo.dueDateString,
    };
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#1C1C1E] border border-white/10 rounded-t-[28px] sm:rounded-[26px] max-w-2xl w-full p-5 sm:p-6 shadow-2xl my-0 sm:my-8 text-white max-h-[90vh] flex flex-col">
        
        {/* iOS Grabber */}
        <div className="w-10 h-1.2 bg-white/25 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#30D158]/15 border border-[#30D158]/30 text-[#30D158] flex items-center justify-center shrink-0">
              <FigmaIcon name="calendarDays" size="md" strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                South Africa Payday Engine
              </h3>
              <p className="text-xs text-slate-400">
                Weekend & public holiday shifts for 25th pay cycle
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

        {/* Info Explainer Box */}
        <div className="bg-[#2C2C2E]/80 border border-white/10 rounded-[16px] p-3.5 mt-3 text-xs text-slate-300 space-y-1.5 shrink-0">
          <div className="flex items-center gap-1.5 font-bold text-[#30D158]">
            <Info className="w-4 h-4" />
            <span>South African Salary Deposit Rules</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            When the <strong>{baseDay}th</strong> lands on a Saturday, Sunday, or Public Holiday (e.g. Heritage Day, Good Friday, Freedom Day, Youth Day), South African employers & banks pay on the preceding business Friday. Your budget setup deadline is scheduled 1–2 days prior to this arrival date!
          </p>
        </div>

        {/* Year and Base Day Selector */}
        <div className="flex items-center justify-between gap-3 mt-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-[#2C2C2E] border border-white/10 text-white font-bold text-xs sm:text-sm px-3 py-1.5 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
              <option value={2028}>2028</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Base Payday:</span>
            <select
              value={baseDay}
              onChange={(e) => setBaseDay(parseInt(e.target.value))}
              className="bg-[#2C2C2E] border border-white/10 text-white font-bold text-xs sm:text-sm px-3 py-1.5 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
            >
              <option value={25}>25th (Standard SA)</option>
              <option value={20}>20th</option>
              <option value={27}>27th</option>
              <option value={30}>30th / End of Month</option>
            </select>
          </div>
        </div>

        {/* 12 Months Paydays Grid */}
        <div className="mt-3 overflow-y-auto pr-1 space-y-2 flex-1">
          {paydaysForYear.map((item) => (
            <div
              key={item.monthIndex}
              className={`p-3 rounded-[16px] border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition ${
                item.isShifted
                  ? 'bg-[#FF9F0A]/10 border-[#FF9F0A]/30'
                  : 'bg-[#2C2C2E]/60 border-white/[0.06]'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs sm:text-sm">
                    {item.monthName} {selectedYear}
                  </span>
                  {item.isShifted ? (
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-[#FF9F0A]/20 text-[#FF9F0A] border border-[#FF9F0A]/40 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Shifted Payday
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Standard {baseDay}th
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-300 mt-1">
                  Salary Arrives:{' '}
                  <strong className="text-[#30D158]">
                    {formatDateFull(item.payday)}
                  </strong>
                </div>

                {item.shiftedReasons.length > 0 && (
                  <div className="text-[11px] text-[#FF9F0A] mt-0.5">
                    ↳ {item.shiftedReasons.join(' · ')}
                  </div>
                )}
              </div>

              <div className="text-left sm:text-right text-xs shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.06]">
                <div className="text-slate-400 text-[11px]">
                  Budget Due: <strong className="text-slate-200">{formatDateNice(item.dueDate)}</strong>
                </div>
                <div className="text-slate-500 text-[10px] mt-0.5">
                  Plan ready 1-2 days prior
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-white/[0.08] mt-3 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-200 rounded-[12px] text-xs font-semibold transition active:scale-95 cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
