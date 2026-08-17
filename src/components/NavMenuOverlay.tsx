import React, { useEffect } from 'react';
import { ActiveTab } from './Navbar';
import { FigmaIcon, FigmaIconName } from './ui/FigmaIcon';
import { formatZARCompact } from '../utils/southAfricaHolidays';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Plus,
  Receipt,
  PiggyBank,
  Flame,
  Calendar,
  Wallet,
  Tag,
  Download,
  Printer,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Monitor,
  LogOut,
  User,
  History,
  AlertOctagon,
} from 'lucide-react';

interface NavMenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenExpenseModal: () => void;
  onOpenIncomeModal: () => void;
  onOpenCategoryModal: () => void;
  onOpenPeriodModal: () => void;
  onOpenTagAnalysis: () => void;
  onOpenCalendarModal: () => void;
  onOpenArchivedWorksheets?: () => void;
  onExportJSON: () => void;
  onPrint: () => void;
  onResetStarterData: () => void;
  step1Balance?: number;
  totalDebtBalance?: number;
  currentStep?: number;
  unassignedAmount?: number;
  currentPeriodName?: string;
  isIPhoneFrameMode?: boolean;
  onToggleIPhoneFrameMode?: () => void;
}

export const NavMenuOverlay: React.FC<NavMenuOverlayProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  onOpenExpenseModal,
  onOpenIncomeModal,
  onOpenCategoryModal,
  onOpenPeriodModal,
  onOpenTagAnalysis,
  onOpenCalendarModal,
  onOpenArchivedWorksheets,
  onExportJSON,
  onPrint,
  onResetStarterData,
  step1Balance = 0,
  totalDebtBalance = 0,
  currentStep = 1,
  unassignedAmount = 0,
  currentPeriodName,
  isIPhoneFrameMode,
  onToggleIPhoneFrameMode,
}) => {
  const { user, member, logout } = useAuth();
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background body scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    onClose();
  };

  const navMenuItems: {
    id: ActiveTab;
    title: string;
    description: string;
    icon: FigmaIconName;
    color: string;
    badge?: string;
    badgeColor?: string;
  }[] = [
    {
      id: 'budget',
      title: 'Budget Planner & Excel View',
      description: 'Zero-based envelopes, income streams & spreadsheet view',
      icon: 'wallet',
      color: '#30D158',
      badge:
        Math.abs(unassignedAmount) < 0.01
          ? 'R0.00 Assigned'
          : unassignedAmount > 0
          ? `${formatZARCompact(unassignedAmount)} Left`
          : `${formatZARCompact(Math.abs(unassignedAmount))} Over`,
      badgeColor:
        Math.abs(unassignedAmount) < 0.01 ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300',
    },
    {
      id: 'expenses',
      title: 'Expenses Ledger',
      description: 'Log and review family transactions, merchant tags & receipts',
      icon: 'receipt',
      color: '#38BDF8',
    },
    {
      id: 'accounts',
      title: 'Accounts & Fund Tracking',
      description: 'Track where funds live: Cheque, Savings, TFSA, Credit & Inflow/Outflow',
      icon: 'wallet',
      color: '#30D158',
    },
    {
      id: 'babysteps',
      title: 'Dave Ramsey Baby Steps',
      description: `South African 7 Steps progression · Currently on Step ${currentStep}`,
      icon: 'trophy',
      color: '#FFD60A',
      badge: step1Balance > 0 ? `EF: ${formatZARCompact(step1Balance)}` : undefined,
      badgeColor: 'bg-emerald-950 text-emerald-300',
    },
    {
      id: 'snowball',
      title: 'Debt Snowball Calculator',
      description: 'Smallest to largest debt payoff engine with interest tracking',
      icon: 'flame',
      color: '#FF453A',
      badge: totalDebtBalance > 0 ? `Debt: ${formatZARCompact(totalDebtBalance)}` : undefined,
      badgeColor: 'bg-red-950 text-red-300',
    },
    {
      id: 'calendar',
      title: 'Paydays & Holidays Calendar',
      description: 'South Africa 25th payday cycle, weekend shifts & public holidays',
      icon: 'calendarDays',
      color: '#BF5AF2',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-start bg-black/80 backdrop-blur-xl animate-fadeIn">
      {/* Overlay Backdrop Click Area */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Navigation Content Card Container */}
      <div className="relative z-10 w-full max-w-2xl mx-auto bg-[#1C1C1E] border-b border-x border-white/[0.12] rounded-b-[32px] sm:rounded-b-[36px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header inside overlay */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#121214]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-gradient-to-tr from-[#248A3D] to-[#34C759] flex items-center justify-center text-white shadow-md border border-white/20">
              <FigmaIcon name="wallet" size="sm" strokeWidth={2.4} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white tracking-tight">Bakayise Budget</h3>
                <span className="px-1.5 py-0.5 rounded-[6px] text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ZAR · SA
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {currentPeriodName || 'South Africa Family Finance & Zero-Based Budgeting'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-90 cursor-pointer"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          
          {/* Family Member Profile & Google Auth Chip */}
          {member && (
            <div className="p-3.5 rounded-[18px] bg-[#242426] border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-[14px] flex items-center justify-center font-bold text-sm text-black shrink-0 shadow-md"
                  style={{ backgroundColor: member.avatarColor || '#30D158' }}
                >
                  {member.role === 'Hubby' ? 'H' : 'W'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-sm truncate">{member.role}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Authorized
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{member.email}</div>
                </div>
              </div>

              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 text-xs font-semibold transition active:scale-95 cursor-pointer shrink-0"
                title="Sign out of Bakayise Budget"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {/* Main Navigation Tab Items */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-2 block">
              Navigation Menu
            </span>
            <div className="space-y-2">
              {navMenuItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full p-3 sm:p-3.5 rounded-[18px] border transition-all flex items-center justify-between group cursor-pointer text-left ${
                      isActive
                        ? 'bg-[#2C2C2E] border-[#30D158]/50 shadow-md shadow-emerald-950/30 ring-1 ring-[#30D158]/30'
                        : 'bg-[#242426]/70 hover:bg-[#2C2C2E] border-white/[0.06] hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div
                        className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: `${item.color}15`,
                          borderColor: `${item.color}40`,
                        }}
                      >
                        <FigmaIcon
                          name={item.icon}
                          size="md"
                          strokeWidth={isActive ? 2.4 : 2}
                          color={item.color}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm truncate">{item.title}</span>
                          {isActive && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#30D158] text-black shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{item.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-2 shrink-0">
                      {item.badge && (
                        <span
                          className={`text-[11px] font-semibold font-mono px-2 py-0.5 rounded-[8px] border border-white/10 ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition group-hover:translate-x-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Action Shortcuts */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-2 block">
              Quick Actions & Modals
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenExpenseModal();
                }}
                className="p-3 rounded-[16px] bg-[#2C2C2E]/80 hover:bg-[#34C759]/20 border border-white/[0.08] hover:border-[#34C759]/40 text-left transition active:scale-95 cursor-pointer group flex flex-col gap-1.5"
              >
                <div className="w-7 h-7 rounded-[10px] bg-[#30D158]/20 flex items-center justify-center text-[#30D158]">
                  <Plus className="w-4 h-4" strokeWidth={2.6} />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block truncate group-hover:text-[#30D158]">
                    Enter Log
                  </span>
                  <span className="text-[10px] text-slate-400 truncate block">New expense</span>
                </div>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenIncomeModal();
                }}
                className="p-3 rounded-[16px] bg-[#2C2C2E]/80 hover:bg-[#38BDF8]/20 border border-white/[0.08] hover:border-[#38BDF8]/40 text-left transition active:scale-95 cursor-pointer group flex flex-col gap-1.5"
              >
                <div className="w-7 h-7 rounded-[10px] bg-[#38BDF8]/20 flex items-center justify-center text-[#38BDF8]">
                  <PiggyBank className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block truncate group-hover:text-[#38BDF8]">
                    Add Income
                  </span>
                  <span className="text-[10px] text-slate-400 truncate block">Salary stream</span>
                </div>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenCategoryModal();
                }}
                className="p-3 rounded-[16px] bg-[#2C2C2E]/80 hover:bg-[#FF9F0A]/20 border border-white/[0.08] hover:border-[#FF9F0A]/40 text-left transition active:scale-95 cursor-pointer group flex flex-col gap-1.5"
              >
                <div className="w-7 h-7 rounded-[10px] bg-[#FF9F0A]/20 flex items-center justify-center text-[#FF9F0A]">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block truncate group-hover:text-[#FF9F0A]">
                    New Envelope
                  </span>
                  <span className="text-[10px] text-slate-400 truncate block">Expense category</span>
                </div>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenTagAnalysis();
                }}
                className="p-3 rounded-[16px] bg-[#2C2C2E]/80 hover:bg-[#BF5AF2]/20 border border-white/[0.08] hover:border-[#BF5AF2]/40 text-left transition active:scale-95 cursor-pointer group flex flex-col gap-1.5"
              >
                <div className="w-7 h-7 rounded-[10px] bg-[#BF5AF2]/20 flex items-center justify-center text-[#BF5AF2]">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block truncate group-hover:text-[#BF5AF2]">
                    Tag Analysis
                  </span>
                  <span className="text-[10px] text-slate-400 truncate block">Group summaries</span>
                </div>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenPeriodModal();
                }}
                className="p-3 rounded-[16px] bg-[#2C2C2E]/80 hover:bg-[#30D158]/20 border border-white/[0.08] hover:border-[#30D158]/40 text-left transition active:scale-95 cursor-pointer group flex flex-col gap-1.5"
              >
                <div className="w-7 h-7 rounded-[10px] bg-[#30D158]/20 flex items-center justify-center text-[#30D158]">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block truncate group-hover:text-[#30D158]">
                    New Pay Cycle
                  </span>
                  <span className="text-[10px] text-slate-400 truncate block">25th cycle</span>
                </div>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenCalendarModal();
                }}
                className="p-3 rounded-[16px] bg-[#2C2C2E]/80 hover:bg-[#FF453A]/20 border border-white/[0.08] hover:border-[#FF453A]/40 text-left transition active:scale-95 cursor-pointer group flex flex-col gap-1.5"
              >
                <div className="w-7 h-7 rounded-[10px] bg-[#FF453A]/20 flex items-center justify-center text-[#FF453A]">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block truncate group-hover:text-[#FF453A]">
                    SA Holidays
                  </span>
                  <span className="text-[10px] text-slate-400 truncate block">Calendar engine</span>
                </div>
              </button>
            </div>
          </div>

          {/* Backup, Report & System Actions */}
          <div className="pt-2 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {onOpenArchivedWorksheets && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenArchivedWorksheets();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition cursor-pointer font-semibold"
                >
                  <History className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Archived Worksheets & Backups</span>
                </button>
              )}

              <button
                onClick={() => {
                  onClose();
                  onExportJSON();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onPrint();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report</span>
              </button>
            </div>

            {onToggleIPhoneFrameMode && (
              <button
                onClick={() => {
                  onToggleIPhoneFrameMode();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
              >
                {isIPhoneFrameMode ? (
                  <>
                    <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Wide Screen</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>iPhone Frame</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Reset Worksheet Button placed safely at the very bottom of overlay options */}
          <div className="pt-2 border-t border-white/[0.06]">
            <button
              onClick={() => {
                onClose();
                onResetStarterData();
              }}
              className="w-full flex items-center justify-between p-3 rounded-[14px] bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 border border-red-500/20 transition cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[8px] bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold block">Reset Worksheet & Start Afresh</span>
                  <span className="text-[10px] text-slate-400 block">2-step verification · Auto-archives to Firestore first</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-red-500/60 group-hover:text-red-400 group-hover:translate-x-0.5 transition" />
            </button>
          </div>

        </div>

        {/* Footer info */}
        <div className="p-3 bg-[#121214] border-t border-white/[0.08] text-center text-[11px] text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[#30D158]" />
          <span>Bakayise Budget · South Africa Zero-Based Family Finance</span>
        </div>

      </div>
    </div>
  );
};
