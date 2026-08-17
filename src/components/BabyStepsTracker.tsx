import React from 'react';
import { BabyStepsState, Debt, BudgetCategory, EmergencyFundLog, FinancialAccount } from '../types';
import { formatZAR, formatZARCompact, formatDateNice } from '../utils/southAfricaHolidays';
import { FigmaIcon, FigmaIconName } from './ui/FigmaIcon';
import {
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Plus,
  AlertCircle,
  Trophy,
  ArrowRight,
  Wallet,
  Home,
  ShieldCheck,
  TrendingUp,
  Car,
  PiggyBank,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BabyStepsTrackerProps {
  babyState: BabyStepsState | null;
  debts: Debt[];
  categories: BudgetCategory[];
  emergencyLogs: EmergencyFundLog[];
  accounts?: FinancialAccount[];
  onOpenEmergencyModal: (step: 1 | 3) => void;
  onUpdateCurrentStep: (stepNumber: number) => void;
  onNavigateToSnowball: () => void;
}

interface StepInfo {
  step: number;
  title: string;
  shortDesc: string;
  icon: FigmaIconName;
  color: string;
  isCustomCalculator?: boolean;
}

export const BabyStepsTracker: React.FC<BabyStepsTrackerProps> = ({
  babyState,
  debts,
  categories,
  emergencyLogs,
  accounts = [],
  onOpenEmergencyModal,
  onUpdateCurrentStep,
  onNavigateToSnowball,
}) => {
  const currentStep = babyState?.currentStep || 1;

  // Find accounts specifically assigned to Baby Steps
  const step1AssignedAccounts = accounts.filter(
    (a) => a.babyStepAssignment === 1 || (!a.babyStepAssignment && a.type === 'savings' && !babyState?.step1CurrentBalance)
  );
  const step1AssignedTotal = accounts
    .filter((a) => a.babyStepAssignment === 1)
    .reduce((sum, a) => sum + (a.openingBalance || 0), 0);

  // Step 1: Starter Emergency Fund (R20,000 in South Africa)
  const step1Target = babyState?.step1EmergencyFundTarget || 20000;
  // Live balance is the sum of accounts assigned to Step 1, or the logged emergency balance
  const step1Balance =
    step1AssignedTotal > 0
      ? step1AssignedTotal
      : babyState?.step1CurrentBalance || 0;
  const step1Progress = Math.min(100, (step1Balance / step1Target) * 100);
  const step1Complete = step1Balance >= step1Target;

  // Step 2: Debt Snowball
  const activeDebts = debts.filter((d) => d.status === 'active');
  const paidDebts = debts.filter((d) => d.status === 'paid_off');
  const totalOriginalDebt = debts.reduce((sum, d) => sum + (d.originalBalance || d.balance), 0);
  const totalCurrentDebt = activeDebts.reduce((sum, d) => sum + d.balance, 0);
  const debtProgress =
    totalOriginalDebt > 0 ? ((totalOriginalDebt - totalCurrentDebt) / totalOriginalDebt) * 100 : 0;
  const step2Complete = debts.length > 0 && activeDebts.length === 0;

  // Step 3: 3-6 Months Full Emergency Fund
  const step3AssignedAccounts = accounts.filter((a) => a.babyStepAssignment === 3);
  const step3AssignedTotal = step3AssignedAccounts.reduce(
    (sum, a) => sum + (a.openingBalance || 0),
    0
  );

  const monthlyEssentialTotal = categories
    .filter((c) => c.isEssential)
    .reduce((sum, c) => sum + c.allocatedAmount, 0);

  const step3Months = babyState?.step3MonthsTarget || 3;
  const step3Target =
    monthlyEssentialTotal > 0
      ? monthlyEssentialTotal * step3Months
      : 60000;

  const step3Balance =
    step3AssignedTotal > 0
      ? step3AssignedTotal
      : babyState?.step3CurrentBalance || 0;

  const step3Progress = step3Target > 0 ? Math.min(100, (step3Balance / step3Target) * 100) : 0;
  const step3Complete = step3Target > 0 && step3Balance >= step3Target;

  // Step 4: Investing & Retirement accounts
  const step4AssignedAccounts = accounts.filter(
    (a) => a.babyStepAssignment === 4 || a.type === 'tax_free' || a.type === 'investment'
  );
  const step4Total = step4AssignedAccounts.reduce((sum, a) => sum + (a.openingBalance || 0), 0);

  // Step 6: Bond / Mortgage accounts
  const bondAccounts = accounts.filter((a) => a.type === 'home_loan' || a.babyStepAssignment === 6);
  const totalBondDebt = bondAccounts.reduce(
    (sum, a) => sum + (a.balanceOwed !== undefined ? a.balanceOwed : a.openingBalance || 0),
    0
  );
  const totalHomeValue = bondAccounts.reduce((sum, a) => sum + (a.marketValue || 0), 0);

  const STEPS: StepInfo[] = [
    {
      step: 1,
      title: 'Baby Step 1: Starter Emergency Fund',
      shortDesc: 'Save R20,000 cash buffer in a high-interest savings/investment account',
      icon: 'piggy',
      color: '#30D158',
    },
    {
      step: 2,
      title: 'Baby Step 2: Debt Snowball',
      shortDesc: 'Pay off all debt (credit cards, loans, car finance) from smallest to largest',
      icon: 'flame',
      color: '#FF453A',
    },
    {
      step: 3,
      title: 'Baby Step 3: 3–6 Months Emergency Fund',
      shortDesc: 'Fully fund 3 to 6 months of essential family living expenses',
      icon: 'shield',
      color: '#0A84FF',
    },
    {
      step: 4,
      title: 'Baby Step 4: Invest 15% for Retirement',
      shortDesc: 'Invest 15% into RA (Retirement Annuity), TFSA & long-term wealth funds',
      icon: 'trending',
      color: '#BF5AF2',
    },
    {
      step: 5,
      title: 'Baby Step 5: Save for Children’s College',
      shortDesc: 'Fund university education / school endowments for your children',
      icon: 'grad',
      color: '#FF9F0A',
    },
    {
      step: 6,
      title: 'Baby Step 6: Pay Off Your Home Bond Early',
      shortDesc: 'Attack your primary home mortgage bond with extra monthly installments',
      icon: 'home',
      color: '#64D2FF',
    },
    {
      step: 7,
      title: 'Baby Step 7: Build Wealth & Give',
      shortDesc: 'Live and give like no one else. Uncapped generational wealth & generosity',
      icon: 'heart',
      color: '#FF375F',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-[16px] bg-gradient-to-tr from-[#FF9F0A] to-[#FFD60A] text-black flex items-center justify-center shadow-lg shadow-amber-950/40 border border-white/20 shrink-0">
              <Trophy className="w-6 h-6" strokeWidth={2.4} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-[#FF9F0A]">
                  Dave Ramsey Pathway (South Africa)
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-white/10 text-white border border-white/10">
                  Step {currentStep} of 7
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5">
                Financial Freedom Milestones
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Live tracked against your real accounts, debts, investments & savings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/10 text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#FFD60A]" />
              <span>Celebrate Progress</span>
            </button>
          </div>
        </div>

        {/* 7-Step Mini Progress Pipeline */}
        <div className="mt-5 pt-4 border-t border-white/[0.08] grid grid-cols-7 gap-1 sm:gap-2">
          {STEPS.map((s) => {
            const isCompleted = s.step < currentStep;
            const isCurrent = s.step === currentStep;

            return (
              <button
                key={s.step}
                onClick={() => onUpdateCurrentStep(s.step)}
                className={`py-2 px-1 rounded-[12px] flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-white/15 border border-white/30 text-white shadow-md'
                    : isCompleted
                    ? 'bg-[#30D158]/15 border border-[#30D158]/30 text-[#30D158]'
                    : 'bg-[#2C2C2E]/60 text-slate-400 hover:bg-[#2C2C2E]'
                }`}
              >
                <div className="text-[10px] font-bold font-mono">
                  {isCompleted ? '✓' : `S${s.step}`}
                </div>
                <div className="text-[9px] font-medium hidden sm:block truncate w-full text-center mt-0.5">
                  Step {s.step}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Details & Interactive Cards */}
      <div className="space-y-4">
        {/* STEP 1 CARD */}
        <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] p-4 sm:p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-[#30D158]/15 border border-[#30D158]/30 flex items-center justify-center text-[#30D158] shrink-0">
                <FigmaIcon name="piggy" size="md" strokeWidth={2.4} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Step 1: Starter Emergency Fund (R20,000)
                  </h3>
                  {step1Complete && (
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30">
                      Completed ✓
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Target: <strong>{formatZAR(step1Target)}</strong> · Available:{' '}
                  <strong className="text-[#30D158]">{formatZAR(step1Balance)}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => onOpenEmergencyModal(1)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-[#30D158] hover:bg-[#34C759] text-black text-xs font-bold transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.8} />
              <span>Log Manual Entry</span>
            </button>
          </div>

          {/* Assigned Accounts Chips */}
          {step1AssignedAccounts.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold">Linked Accounts:</span>
              {step1AssignedAccounts.map((acc) => (
                <span
                  key={acc.id}
                  className="px-2.5 py-1 rounded-[8px] bg-[#252528] border border-white/10 text-white text-[11px] font-medium flex items-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color || '#30D158' }} />
                  <span>{acc.name}:</span>
                  <strong className="text-[#30D158] font-mono">{formatZAR(acc.openingBalance || 0)}</strong>
                </span>
              ))}
            </div>
          )}

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>Fund Progress ({step1Progress.toFixed(0)}%)</span>
              <span>
                {formatZAR(step1Balance)} / {formatZAR(step1Target)}
              </span>
            </div>
            <div className="w-full bg-[#2C2C2E] rounded-full h-3 overflow-hidden p-0.5 border border-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#248A3D] to-[#30D158] transition-all duration-500"
                style={{ width: `${step1Progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* STEP 2 CARD */}
        <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] p-4 sm:p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-[#FF453A]/15 border border-[#FF453A]/30 flex items-center justify-center text-[#FF453A] shrink-0">
                <FigmaIcon name="flame" size="md" strokeWidth={2.4} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Step 2: Debt Snowball (Excludes Mortgage)
                  </h3>
                  {step2Complete && (
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30">
                      Debt Free! ✓
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {activeDebts.length} active debts (Credit Cards, Loans, Vehicles) · Total Balance:{' '}
                  <strong className="text-[#FF453A]">{formatZAR(totalCurrentDebt)}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={onNavigateToSnowball}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white border border-white/10 text-xs font-semibold transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              <span>Manage Snowball</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#FF453A]" />
            </button>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>Paid Off ({debtProgress.toFixed(0)}%)</span>
              <span>
                {paidDebts.length} of {debts.length} debt accounts eliminated
              </span>
            </div>
            <div className="w-full bg-[#2C2C2E] rounded-full h-3 overflow-hidden p-0.5 border border-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FF453A] to-[#FF9F0A] transition-all duration-500"
                style={{ width: `${debtProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* STEP 3 CARD */}
        <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] p-4 sm:p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-[#0A84FF]/15 border border-[#0A84FF]/30 flex items-center justify-center text-[#0A84FF] shrink-0">
                <FigmaIcon name="shield" size="md" strokeWidth={2.4} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Step 3: 3–6 Months Emergency Reserve
                  </h3>
                  {step3Complete && (
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30">
                      Fully Funded! ✓
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Essential monthly costs: <strong>{formatZAR(monthlyEssentialTotal)}/mo</strong> · Target ({step3Months}mo):{' '}
                  <strong className="text-[#0A84FF]">{formatZAR(step3Target)}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => onOpenEmergencyModal(3)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-[#0A84FF] hover:bg-[#007AFF] text-white text-xs font-bold transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.8} />
              <span>Log Step 3 Deposit</span>
            </button>
          </div>

          {/* Assigned Accounts Chips */}
          {step3AssignedAccounts.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold">Linked Reserve Accounts:</span>
              {step3AssignedAccounts.map((acc) => (
                <span
                  key={acc.id}
                  className="px-2.5 py-1 rounded-[8px] bg-[#252528] border border-white/10 text-white text-[11px] font-medium flex items-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color || '#0A84FF' }} />
                  <span>{acc.name}:</span>
                  <strong className="text-[#0A84FF] font-mono">{formatZAR(acc.openingBalance || 0)}</strong>
                </span>
              ))}
            </div>
          )}

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>Fund Progress ({step3Progress.toFixed(0)}%)</span>
              <span>
                {formatZAR(step3Balance)} / {formatZAR(step3Target)}
              </span>
            </div>
            <div className="w-full bg-[#2C2C2E] rounded-full h-3 overflow-hidden p-0.5 border border-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0A84FF] to-[#64D2FF] transition-all duration-500"
                style={{ width: `${step3Progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* STEP 4 & 6 LIVE INTEGRATIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {/* STEP 4: INVESTING */}
          <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[22px] p-4 flex flex-col justify-between hover:bg-[#242426] transition shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    Baby Step 4: Invest 15% for Retirement
                  </h4>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Total Invested Assets: <strong className="text-purple-300 font-mono">{formatZAR(step4Total)}</strong>
                </p>
                {step4AssignedAccounts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {step4AssignedAccounts.map((a) => (
                      <span
                        key={a.id}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#2C2C2E] text-slate-300 border border-white/5"
                      >
                        {a.name} ({formatZARCompact(a.openingBalance || 0)})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => onUpdateCurrentStep(4)}
              className="mt-3 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition cursor-pointer"
            >
              <span>{currentStep === 4 ? 'Currently Active Focus' : 'Set as Focus Step'}</span>
              <ChevronRight className="w-3 h-3 text-slate-500" />
            </button>
          </div>

          {/* STEP 6: PAY OFF HOME BOND */}
          <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[22px] p-4 flex flex-col justify-between hover:bg-[#242426] transition shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <Home className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    Baby Step 6: Pay Off Home Bond Early
                  </h4>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Remaining Bond Balance:{' '}
                  <strong className="text-cyan-300 font-mono">{formatZAR(totalBondDebt)}</strong>
                </p>
                {bondAccounts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {bondAccounts.map((a) => (
                      <span
                        key={a.id}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#2C2C2E] text-slate-300 border border-white/5"
                      >
                        {a.name} ({formatZARCompact(a.balanceOwed || a.openingBalance || 0)} owed)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => onUpdateCurrentStep(6)}
              className="mt-3 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition cursor-pointer"
            >
              <span>{currentStep === 6 ? 'Currently Active Focus' : 'Set as Focus Step'}</span>
              <ChevronRight className="w-3 h-3 text-slate-500" />
            </button>
          </div>
        </div>

        {/* STEPS 5 & 7 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {[STEPS[4], STEPS[6]].map((s) => (
            <div
              key={s.step}
              className="bg-[#1C1C1E] border border-white/[0.08] rounded-[22px] p-4 flex items-start gap-3 hover:bg-[#242426] transition shadow-sm"
            >
              <div
                className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 border border-white/10"
                style={{
                  backgroundColor: `${s.color}20`,
                  color: s.color,
                }}
              >
                <FigmaIcon name={s.icon} size="md" strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white tracking-tight">{s.title}</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{s.shortDesc}</p>
                <button
                  onClick={() => onUpdateCurrentStep(s.step)}
                  className="mt-2 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition cursor-pointer"
                >
                  <span>{currentStep === s.step ? 'Currently Active' : 'Set as Focus Step'}</span>
                  <ChevronRight className="w-3 h-3 text-slate-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
