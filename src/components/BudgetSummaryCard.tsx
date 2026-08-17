import React from 'react';
import { FigmaIcon } from './ui/FigmaIcon';
import { formatZAR, formatZARCompact } from '../utils/southAfricaHolidays';
import { ArrowRight, Sparkles } from 'lucide-react';

interface BudgetSummaryCardProps {
  totalIncome: number;
  totalAllocated: number;
  totalSpent: number;
  onOpenIncomeModal: () => void;
  onOpenCategoryModal: () => void;
}

export const BudgetSummaryCard: React.FC<BudgetSummaryCardProps> = ({
  totalIncome,
  totalAllocated,
  totalSpent,
  onOpenIncomeModal,
  onOpenCategoryModal,
}) => {
  const unassigned = totalIncome - totalAllocated;
  const remainingToSpend = totalAllocated - totalSpent;
  const spentPercentage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
  const isZeroBased = Math.abs(unassigned) < 0.01;

  return (
    <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] p-4 sm:p-6 shadow-xl mb-6 relative overflow-hidden">
      
      {/* iOS Top Pill Status Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-[#30D158]/15 border border-[#30D158]/30 flex items-center justify-center text-[#30D158] shrink-0">
            <FigmaIcon name="wallet" size="md" strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Zero-Based Budget Balance</span>
            </h2>
            <p className="text-xs text-slate-400">
              Give every single Rand a mission before payday
            </p>
          </div>
        </div>

        <div>
          {isZeroBased ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30 shadow-sm">
              <FigmaIcon name="check" size="xs" color="#30D158" />
              <span>Zero-Based Complete (R0.00 left)</span>
            </div>
          ) : unassigned > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FF9F0A]/15 text-[#FF9F0A] border border-[#FF9F0A]/30 shadow-sm">
              <FigmaIcon name="alert" size="xs" color="#FF9F0A" />
              <span>{formatZAR(unassigned)} Left to Assign</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FF453A]/15 text-[#FF453A] border border-[#FF453A]/30 shadow-sm">
              <FigmaIcon name="alert" size="xs" color="#FF453A" />
              <span>{formatZAR(Math.abs(unassigned))} Over Allocated!</span>
            </div>
          )}
        </div>
      </div>

      {/* Main 4 Key Metrics (Apple Health / Wallet Card Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        
        {/* 1. Total Income */}
        <div className="bg-[#2C2C2E]/70 rounded-[18px] p-3.5 sm:p-4 border border-white/[0.06] flex flex-col justify-between hover:bg-[#2C2C2E] transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Total Income</span>
            <div className="w-7 h-7 rounded-[10px] bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30 flex items-center justify-center">
              <FigmaIcon name="trending" size="xs" strokeWidth={2.4} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-lg sm:text-2xl font-bold text-white tracking-tight">
              {formatZAR(totalIncome)}
            </span>
          </div>
          <button
            onClick={onOpenIncomeModal}
            className="mt-2 text-xs font-medium text-[#30D158] hover:text-emerald-300 flex items-center gap-1 transition cursor-pointer"
          >
            <span>Manage Incomes</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* 2. Total Planned (Allocated) */}
        <div className="bg-[#2C2C2E]/70 rounded-[18px] p-3.5 sm:p-4 border border-white/[0.06] flex flex-col justify-between hover:bg-[#2C2C2E] transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Total Allocated</span>
            <div className="w-7 h-7 rounded-[10px] bg-[#64D2FF]/20 text-[#64D2FF] border border-[#64D2FF]/30 flex items-center justify-center">
              <FigmaIcon name="piggy" size="xs" strokeWidth={2.4} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-lg sm:text-2xl font-bold text-white tracking-tight">
              {formatZAR(totalAllocated)}
            </span>
          </div>
          <button
            onClick={onOpenCategoryModal}
            className="mt-2 text-xs font-medium text-[#64D2FF] hover:text-cyan-300 flex items-center gap-1 transition cursor-pointer"
          >
            <span>Add Envelope</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* 3. Total Spent */}
        <div className="bg-[#2C2C2E]/70 rounded-[18px] p-3.5 sm:p-4 border border-white/[0.06] flex flex-col justify-between hover:bg-[#2C2C2E] transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Total Spent</span>
            <div className="w-7 h-7 rounded-[10px] bg-[#BF5AF2]/20 text-[#BF5AF2] border border-[#BF5AF2]/30 flex items-center justify-center">
              <FigmaIcon name="creditCard" size="xs" strokeWidth={2.4} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-lg sm:text-2xl font-bold text-white tracking-tight">
              {formatZAR(totalSpent)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            <span>{spentPercentage.toFixed(1)}% of budget</span>
          </div>
        </div>

        {/* 4. Left to Spend in Month */}
        <div
          className={`rounded-[18px] p-3.5 sm:p-4 border flex flex-col justify-between transition ${
            remainingToSpend >= 0
              ? 'bg-[#30D158]/10 border-[#30D158]/30'
              : 'bg-[#FF453A]/10 border-[#FF453A]/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Left to Spend</span>
            <div
              className={`w-7 h-7 rounded-[10px] border flex items-center justify-center ${
                remainingToSpend >= 0
                  ? 'bg-[#30D158]/20 text-[#30D158] border-[#30D158]/30'
                  : 'bg-[#FF453A]/20 text-[#FF453A] border-[#FF453A]/30'
              }`}
            >
              <FigmaIcon name="wallet" size="xs" strokeWidth={2.4} />
            </div>
          </div>
          <div className="mt-2.5">
            <span
              className={`text-lg sm:text-2xl font-bold tracking-tight ${
                remainingToSpend >= 0 ? 'text-[#30D158]' : 'text-[#FF453A]'
              }`}
            >
              {formatZAR(remainingToSpend)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {remainingToSpend >= 0 ? 'Spendable buffer remaining' : 'Over allocated budget!'}
          </div>
        </div>

      </div>

      {/* iOS Spending Progress Bar */}
      <div className="mt-4 pt-4 border-t border-white/[0.08]">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span>Cycle Spending Velocity</span>
          <span className="font-semibold text-slate-200">
            {formatZAR(totalSpent)} / {formatZAR(totalAllocated)} ({spentPercentage.toFixed(0)}%)
          </span>
        </div>
        <div className="w-full bg-[#2C2C2E] rounded-full h-2.5 overflow-hidden p-0.5 border border-white/[0.06]">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              spentPercentage > 100
                ? 'bg-[#FF453A]'
                : spentPercentage > 85
                ? 'bg-[#FF9F0A]'
                : 'bg-gradient-to-r from-[#248A3D] to-[#30D158]'
            }`}
            style={{ width: `${Math.min(spentPercentage, 100)}%` }}
          />
        </div>
      </div>

    </div>
  );
};
