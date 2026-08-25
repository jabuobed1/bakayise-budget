import React, { useState } from 'react';
import { Debt, DebtCategory } from '../types';
import { formatZAR, formatZARCompact } from '../utils/southAfricaHolidays';
import { FigmaIcon, FigmaIconName } from './ui/FigmaIcon';
import { Flame, Plus, Edit2, Trash2, CheckCircle2, ArrowRight, Zap, Target } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DebtSnowballManagerProps {
  debts: Debt[];
  onOpenAddDebtModal: () => void;
  onOpenEditDebtModal: (debt: Debt) => void;
  onDeleteDebt: (debtId: string) => void;
  onRecordPayment?: (debtId: string, paymentAmount: number) => void;
  onMarkPaidOff: (debtId: string) => void;
}

const DEBT_ICON_MAP: Record<DebtCategory, { icon: FigmaIconName; color: string }> = {
  store_card: { icon: 'bag', color: '#FF9F0A' },
  credit_card: { icon: 'creditCard', color: '#FF453A' },
  personal_loan: { icon: 'banknote', color: '#BF5AF2' },
  car_finance: { icon: 'car', color: '#0A84FF' },
  student_loan: { icon: 'grad', color: '#64D2FF' },
  other: { icon: 'file', color: '#8E8E93' },
};

export const DebtSnowballManager: React.FC<DebtSnowballManagerProps> = ({
  debts,
  onOpenAddDebtModal,
  onOpenEditDebtModal,
  onDeleteDebt,
  onMarkPaidOff,
}) => {
  const [extraSnowball, setExtraSnowball] = useState<number>(1000);

  // Active debts sorted strictly by Balance Ascending (Dave Ramsey Snowball rule)
  const activeDebts = debts
    .filter((d) => d.status === 'active' && d.balance > 0)
    .sort((a, b) => a.balance - b.balance);

  const paidOffDebts = debts.filter((d) => d.status === 'paid_off' || d.balance <= 0);

  const totalOutstanding = activeDebts.reduce((sum, d) => sum + d.balance, 0);
  const totalMinPayment = activeDebts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const totalMonthlyAttack = totalMinPayment + extraSnowball;

  return (
    <div className="space-y-6">
      
      {/* Snowball Header & Summary Card */}
      <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#FF453A]/15 border border-[#FF453A]/30 flex items-center justify-center text-[#FF453A] shrink-0">
              <FigmaIcon name="flame" size="md" strokeWidth={2.4} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Baby Step 2: Debt Snowball Method</span>
              </h2>
              <p className="text-xs text-slate-400">
                Sorted smallest to largest balance for maximum psychological momentum
              </p>
            </div>
          </div>

          <button
            onClick={onOpenAddDebtModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] bg-[#FF453A] hover:bg-[#FF3B30] text-white text-xs font-bold transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" strokeWidth={2.8} />
            <span>Add Debt</span>
          </button>
        </div>

        {/* 3 Metric cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          
          <div className="bg-[#2C2C2E]/70 rounded-[18px] p-3.5 sm:p-4 border border-white/[0.06]">
            <div className="text-[11px] text-slate-400 font-medium">Total Debt Remaining</div>
            <div className="text-xl sm:text-2xl font-bold text-[#FF453A] mt-1 tracking-tight">
              {formatZAR(totalOutstanding)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {activeDebts.length} active account{activeDebts.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="bg-[#2C2C2E]/70 rounded-[18px] p-3.5 sm:p-4 border border-white/[0.06]">
            <div className="text-[11px] text-slate-400 font-medium">Total Minimums Due</div>
            <div className="text-xl sm:text-2xl font-bold text-white mt-1 tracking-tight">
              {formatZAR(totalMinPayment)}/mo
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Sum of monthly minimums
            </div>
          </div>

          <div className="bg-[#2C2C2E]/70 rounded-[18px] p-3.5 sm:p-4 border border-white/[0.06]">
            <div className="text-[11px] text-slate-400 font-medium">Total Monthly Attack</div>
            <div className="text-xl sm:text-2xl font-bold text-[#30D158] mt-1 tracking-tight">
              {formatZAR(totalMonthlyAttack)}/mo
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Minimums + {formatZAR(extraSnowball)} extra snowball
            </div>
          </div>

        </div>

        {/* Extra Snowball Intensity Slider */}
        <div className="mt-4 pt-4 border-t border-white/[0.08]">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
            <span className="font-semibold flex items-center gap-1.5 text-white">
              <Zap className="w-3.5 h-3.5 text-[#FF9F0A]" />
              Extra Monthly Snowball Boost:
            </span>
            <span className="font-bold text-[#30D158] font-mono text-sm">
              +{formatZAR(extraSnowball)}/month
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={10000}
            step={250}
            value={extraSnowball}
            onChange={(e) => setExtraSnowball(parseFloat(e.target.value))}
            className="w-full h-2 bg-[#2C2C2E] rounded-lg appearance-none cursor-pointer accent-[#30D158]"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>R0</span>
            <span>R2,500</span>
            <span>R5,000</span>
            <span>R7,500</span>
            <span>R10,000+</span>
          </div>
        </div>
      </div>

      {/* Active Debts List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <span>Snowball Attack Queue (Smallest to Largest)</span>
            <span className="text-[11px] font-medium px-2 py-0.2 rounded-full bg-white/10 text-slate-300">
              {activeDebts.length}
            </span>
          </h3>
        </div>

        {activeDebts.length === 0 ? (
          <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] p-8 text-center text-slate-400 text-xs">
            🎉 All consumer debts are completely paid off! You are in Baby Step 3.
          </div>
        ) : (
          <div className="space-y-3">
            {activeDebts.map((debt, index) => {
              const isTargetOne = index === 0;
              const meta = DEBT_ICON_MAP[debt.category] || { icon: 'creditCard', color: '#FF453A' };
              const original = debt.originalBalance || debt.balance;
              const paidAmount = Math.max(0, original - debt.balance);
              const pctPaid = original > 0 ? (paidAmount / original) * 100 : 0;

              return (
                <div
                  key={debt.id}
                  className={`bg-[#1C1C1E] border rounded-[22px] p-4 sm:p-5 shadow-xl transition-all ${
                    isTargetOne
                      ? 'border-[#FF453A]/60 ring-1 ring-[#FF453A]/30'
                      : 'border-white/[0.08]'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Left: Rank, Icon, Name, Lender */}
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Priority Rank Badge */}
                      <div
                        className={`w-9 h-9 rounded-[12px] flex items-center justify-center font-bold text-xs shrink-0 ${
                          isTargetOne
                            ? 'bg-[#FF453A] text-white shadow-md shadow-red-950/50'
                            : 'bg-white/10 text-slate-300 border border-white/10'
                        }`}
                      >
                        #{index + 1}
                      </div>

                      <div
                        className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 border border-white/10"
                        style={{
                          backgroundColor: `${meta.color}20`,
                          color: meta.color,
                        }}
                      >
                        <FigmaIcon name={meta.icon} size="sm" strokeWidth={2.2} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                            {debt.name}
                          </h4>
                          {isTargetOne && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF453A]/20 text-[#FF453A] border border-[#FF453A]/40 animate-pulse">
                              <Target className="w-3 h-3" />
                              TARGET #1 ATTACK
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                          {debt.lender && <span>Lender: {debt.lender}</span>}
                          <span>Min: <strong>{formatZAR(debt.minimumPayment)}/mo</strong></span>
                          {debt.interestRate ? <span>Interest: {debt.interestRate}%</span> : null}
                          {debt.monthlyFee ? <span>Admin Fee: {formatZAR(debt.monthlyFee)}/mo</span> : null}
                        </div>
                      </div>
                    </div>

                    {/* Center: Current Balance */}
                    <div className="text-left lg:text-right shrink-0">
                      <div className="text-[11px] text-slate-400 font-medium">Outstanding Balance</div>
                      <div className="text-lg sm:text-2xl font-bold text-white tracking-tight mt-0.5">
                        {formatZAR(debt.balance)}
                      </div>
                    </div>

                    {/* Right: Payment Actions & Edit */}
                    <div className="flex items-center gap-2 flex-wrap lg:justify-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/[0.06]">
                      <button
                        onClick={() => {
                          onMarkPaidOff(debt.id);
                          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                        }}
                        className="px-2.5 py-1.5 bg-white/10 hover:bg-[#30D158]/20 hover:text-[#30D158] text-slate-300 text-xs font-semibold rounded-[10px] border border-white/10 transition active:scale-95 cursor-pointer whitespace-nowrap"
                      >
                        Paid Off ✓
                      </button>

                      <div className="flex items-center gap-1 ml-1">
                        <button
                          onClick={() => onOpenEditDebtModal(debt)}
                          className="w-7 h-7 rounded-[8px] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteDebt(debt.id)}
                          className="w-7 h-7 rounded-[8px] flex items-center justify-center text-slate-500 hover:text-[#FF453A] hover:bg-white/10 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 pt-3 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>Principal Paid Down: {pctPaid.toFixed(0)}%</span>
                      <span>
                        {formatZAR(paidAmount)} / {formatZAR(original)}
                      </span>
                    </div>
                    <div className="w-full bg-[#2C2C2E] rounded-full h-2 overflow-hidden border border-white/[0.04]">
                      <div
                        className="bg-gradient-to-r from-[#FF453A] to-[#FF9F0A] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${pctPaid}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Paid Off Debts Trophy Section */}
      {paidOffDebts.length > 0 && (
        <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] p-4 sm:p-5 shadow-xl">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-[#30D158]" />
            <span>Eliminated Accounts ({paidOffDebts.length})</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {paidOffDebts.map((d) => (
              <div
                key={d.id}
                className="bg-[#2C2C2E]/60 border border-white/[0.06] rounded-[16px] p-3 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-300 line-through">{d.name}</div>
                  <div className="text-[10px] text-[#30D158] font-semibold">Fully Paid Off ✓</div>
                </div>
                <button
                  onClick={() => onDeleteDebt(d.id)}
                  className="text-slate-500 hover:text-[#FF453A] p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
