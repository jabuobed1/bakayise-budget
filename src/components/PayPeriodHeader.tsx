import React, { useState } from 'react';
import { BudgetPeriod } from '../types';
import { formatDateNice } from '../utils/southAfricaHolidays';
import { FigmaIcon } from './ui/FigmaIcon';
import { ChevronDown, ChevronUp, Plus, Calendar, Settings, Edit3 } from 'lucide-react';

interface PayPeriodHeaderProps {
  periods: BudgetPeriod[];
  currentPeriod: BudgetPeriod | null;
  onSelectPeriod: (period: BudgetPeriod) => void;
  onOpenNewPeriodModal: () => void;
  onOpenCalendarModal: () => void;
  onOpenEditPeriodModal?: () => void;
}

export const PayPeriodHeader: React.FC<PayPeriodHeaderProps> = ({
  periods,
  currentPeriod,
  onSelectPeriod,
  onOpenNewPeriodModal,
  onOpenCalendarModal,
  onOpenEditPeriodModal,
}) => {
  // Default to collapsed as requested
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);

  if (!currentPeriod) {
    return (
      <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[22px] p-4 flex items-center justify-between shadow-lg w-full max-w-full overflow-hidden mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <FigmaIcon name="calendarDays" size="md" variant="tool" color="#30D158" />
          <span className="text-slate-300 font-medium truncate">No budget period selected</span>
        </div>
        <button
          onClick={onOpenNewPeriodModal}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#30D158] hover:bg-[#34C759] text-black font-bold rounded-[14px] text-xs transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={2.8} />
          <span>Create Pay Cycle</span>
        </button>
      </div>
    );
  }

  // Calculate days until setup due date and payday
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(currentPeriod.startDate + 'T00:00:00');
  const endDate = new Date(currentPeriod.endDate + 'T00:00:00');
  const dueDate = new Date(currentPeriod.setupDueDate + 'T00:00:00');

  const diffTimeDue = dueDate.getTime() - today.getTime();
  const daysUntilDue = Math.ceil(diffTimeDue / (1000 * 60 * 60 * 24));

  const isCurrentActive = today >= startDate && today <= endDate;
  const isPlanning = today < startDate;

  return (
    <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[22px] p-3.5 sm:p-4 shadow-xl mb-5 w-full max-w-full overflow-hidden transition-all duration-200">
      
      {/* Top Header / Collapsed Summary Bar */}
      <div className="flex items-center justify-between gap-2.5 sm:gap-4 w-full min-w-0 max-w-full">
        
        {/* Left Side: Icon, Full Cycle Date in small font, and Quick Status (No dropdown or big font when collapsed) */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[12px] bg-[#30D158]/15 border border-[#30D158]/30 flex items-center justify-center text-[#30D158] shrink-0">
            <FigmaIcon name="calendarDays" size="sm" color="#30D158" />
          </div>

          <div className="min-w-0 flex-1 flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-xs sm:text-sm text-slate-200 font-medium truncate">
              {formatDateNice(currentPeriod.startDate)} – {formatDateNice(currentPeriod.endDate)}
            </span>

            {isCurrentActive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30 whitespace-nowrap shrink-0">
                <FigmaIcon name="check" size="xs" color="#30D158" />
                Active
              </span>
            )}
            {isPlanning && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FF9F0A]/15 text-[#FF9F0A] border border-[#FF9F0A]/30 whitespace-nowrap shrink-0">
                <FigmaIcon name="clock" size="xs" color="#FF9F0A" />
                Planning
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Quick Action & Collapse/Expand Toggle Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onOpenEditPeriodModal && (
            <button
              onClick={onOpenEditPeriodModal}
              title="Edit Pay Cycle details & carryover settings"
              className="w-8 h-8 rounded-[10px] bg-[#2C2C2E] hover:bg-[#3A3A3C] text-[#30D158] hover:text-white border border-[#30D158]/30 flex items-center justify-center transition active:scale-95 cursor-pointer"
              aria-label="Edit Pay Cycle details"
            >
              <Edit3 className="w-3.5 h-3.5" strokeWidth={2.2} />
            </button>
          )}

          <button
            onClick={onOpenCalendarModal}
            title="View South African Paydays & Holidays Calendar"
            className="w-8 h-8 rounded-[10px] bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-300 hover:text-white border border-white/10 flex items-center justify-center transition active:scale-95 cursor-pointer"
            aria-label="Paydays and Holidays Calendar"
          >
            <Calendar className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition active:scale-95 cursor-pointer select-none"
            aria-label={isCollapsed ? 'Expand Pay Cycle details' : 'Collapse Pay Cycle details'}
            title={isCollapsed ? 'Show Pay Cycle details' : 'Hide Pay Cycle details'}
          >
            <span className="hidden sm:inline text-[11px]">
              {isCollapsed ? 'Details' : 'Collapse'}
            </span>
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>

      </div>

      {/* Expanded Content Section (Includes Dropdown & Cycle Manager) */}
      {!isCollapsed && (
        <div className="mt-3.5 pt-3.5 border-t border-white/[0.08] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 animate-fadeIn">
          
          {/* Detailed Period Info with Dropdown */}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#30D158] flex items-center gap-1.5">
                <FigmaIcon name="calendarDays" size="xs" color="#30D158" />
                Select Pay Cycle
              </span>
              {isCurrentActive && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30">
                  <FigmaIcon name="check" size="xs" color="#30D158" />
                  Active Cycle
                </span>
              )}
              {isPlanning && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FF9F0A]/15 text-[#FF9F0A] border border-[#FF9F0A]/30">
                  <FigmaIcon name="clock" size="xs" color="#FF9F0A" />
                  Planning Mode
                </span>
              )}
            </div>

            {/* Dropdown in Expanded Mode */}
            <div className="flex items-center gap-3">
              <div className="relative min-w-0 max-w-xs w-full sm:w-auto">
                <select
                  value={currentPeriod.id}
                  onChange={(e) => {
                    const found = periods.find((p) => p.id === e.target.value);
                    if (found) onSelectPeriod(found);
                  }}
                  className="appearance-none bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white font-bold text-xs sm:text-sm py-1.5 pl-3 pr-8 rounded-[12px] border border-white/10 focus:outline-none focus:ring-1 focus:ring-[#30D158] transition cursor-pointer w-full truncate"
                >
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Spans from <strong className="text-white">{formatDateNice(currentPeriod.startDate)}</strong> to{' '}
              <strong className="text-white">{formatDateNice(currentPeriod.endDate)}</strong>
            </p>
          </div>

          {/* Budget Deadline Banner & New Cycle Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 w-full sm:w-auto min-w-0 shrink-0">
            <div className="bg-[#2C2C2E]/80 border border-white/[0.08] rounded-[14px] p-2.5 px-3 flex items-center gap-2.5 text-xs w-full sm:w-auto min-w-0">
              <div className="w-7 h-7 rounded-[10px] bg-[#30D158]/15 border border-[#30D158]/30 flex items-center justify-center text-[#30D158] shrink-0">
                <FigmaIcon name="clock" size="xs" strokeWidth={2.4} color="#30D158" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-slate-400 text-[10px] truncate">
                  Budget Deadline: <strong className="text-slate-200">{formatDateNice(currentPeriod.setupDueDate)}</strong>
                </div>
                <div className="font-semibold text-slate-200 text-[11px] mt-0.5 truncate">
                  {daysUntilDue > 0 ? (
                    <span className="text-[#FF9F0A] font-bold">{daysUntilDue} days left to plan</span>
                  ) : daysUntilDue === 0 ? (
                    <span className="text-[#FF9F0A] font-bold">⚠️ Budget due TODAY before salary lands!</span>
                  ) : (
                    <span className="text-[#30D158]">Budget locked in for salary arrival</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onOpenNewPeriodModal}
              className="flex items-center gap-1 px-3 py-2 rounded-[12px] bg-[#30D158] hover:bg-[#34C759] text-black text-xs font-bold transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.8} />
              <span>New Cycle</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};

