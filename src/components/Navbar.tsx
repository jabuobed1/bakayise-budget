import React, { useState } from 'react';
import { FigmaIcon, FigmaIconName } from './ui/FigmaIcon';
import { formatZARCompact } from '../utils/southAfricaHolidays';
import { useAuth } from '../context/AuthContext';
import { Plus, Menu, Smartphone, Monitor, Sparkles, UserCheck } from 'lucide-react';

export type ActiveTab = 'budget' | 'expenses' | 'accounts' | 'babysteps' | 'snowball' | 'calendar';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenExpenseModal: () => void;
  onOpenNavMenu: () => void;
  step1Balance?: number;
  totalDebtBalance?: number;
  unassignedAmount?: number;
  currentStep?: number;
  isIPhoneFrameMode?: boolean;
  onToggleIPhoneFrameMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenExpenseModal,
  onOpenNavMenu,
  step1Balance = 0,
  totalDebtBalance = 0,
  unassignedAmount = 0,
  currentStep = 1,
  isIPhoneFrameMode = false,
  onToggleIPhoneFrameMode,
}) => {
  const { member, user } = useAuth();
  const [isCameraPillExpanded, setIsCameraPillExpanded] = useState(false);

  const navItems: { id: ActiveTab; label: string; icon: FigmaIconName }[] = [
    { id: 'budget', label: 'Budget Plan', icon: 'wallet' },
    { id: 'expenses', label: 'Expenses', icon: 'receipt' },
    { id: 'accounts', label: 'Accounts & Funds', icon: 'wallet' },
    { id: 'babysteps', label: 'Baby Steps', icon: 'trophy' },
    { id: 'snowball', label: 'Debt Snowball', icon: 'flame' },
    { id: 'calendar', label: 'Paydays & Holidays', icon: 'calendarDays' },
  ];

  // Dynamic pill status calculation
  const statusLabel =
    Math.abs(unassignedAmount) < 0.01
      ? 'R0.00 Zero-Based'
      : unassignedAmount > 0
      ? `${formatZARCompact(unassignedAmount)} Left`
      : `${formatZARCompact(Math.abs(unassignedAmount))} Over`;

  const statusColor =
    Math.abs(unassignedAmount) < 0.01 ? '#30D158' : unassignedAmount > 0 ? '#FF9F0A' : '#FF453A';

  return (
    <header className="sticky top-0 z-40 bg-[#121214]/95 backdrop-blur-2xl border-b border-white/[0.08] text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* ZONE 1: BRAND TITLE (Bakayise) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-[12px] bg-gradient-to-tr from-[#248A3D] to-[#34C759] flex items-center justify-center text-white shadow-md shadow-emerald-950/60 border border-white/20">
              <FigmaIcon name="wallet" size="sm" strokeWidth={2.4} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
                Bakayise
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-[6px] text-[10px] font-semibold bg-white/10 text-emerald-300 border border-white/10 whitespace-nowrap">
                ZAR · SA
              </span>
            </div>
          </div>

          {/* ZONE 2 (MIDDLE): iPHONE CAMERA & DYNAMIC PILL SECTION (Between Bakayise and Enter Log) */}
          <div className="hidden sm:flex flex-1 items-center justify-center px-1 max-w-[280px] sm:max-w-xs">
            <div
              onClick={() => setIsCameraPillExpanded(!isCameraPillExpanded)}
              title="iPhone Camera & Budget Status Sensor (Click to toggle)"
              className={`group relative bg-black/90 hover:bg-black text-white transition-all duration-300 ease-out flex items-center justify-between border border-white/15 hover:border-white/30 rounded-full shadow-lg shadow-black/60 cursor-pointer select-none ${
                isCameraPillExpanded
                  ? 'px-3 py-1.5 w-full rounded-[20px] bg-black ring-1 ring-emerald-500/30'
                  : 'px-2.5 sm:px-3 py-1 w-full max-w-[210px] sm:max-w-[230px] h-8 sm:h-8.5'
              }`}
            >
              {isCameraPillExpanded ? (
                <div className="w-full flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
                      <Sparkles className="w-3 h-3" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <div className="font-bold text-white text-[11px] truncate">
                        {statusLabel}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">
                        Step {currentStep} · Bakayise Budget
                      </div>
                    </div>
                  </div>
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: statusColor }}
                  />
                </div>
              ) : (
                <div className="w-full flex items-center justify-between gap-1.5">
                  {/* Left: iPhone Front Camera Lens Aperture Dot */}
                  <div className="w-3.5 h-3.5 rounded-full bg-[#161618] border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#323d54] flex items-center justify-center">
                      <div className="w-0.5 h-0.5 rounded-full bg-[#8aa4f7]" />
                    </div>
                  </div>

                  {/* Middle: Dynamic Status Label */}
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                      style={{ backgroundColor: statusColor }}
                    />
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-200 tracking-tight truncate">
                      {statusLabel}
                    </span>
                  </div>

                  {/* Right: FaceID / Light Sensor Aperture */}
                  <div className="w-2 h-2 rounded-full bg-[#18181c] border border-white/20 shrink-0" />
                </div>
              )}
            </div>
          </div>

          {/* ZONE 3: ACTIONS & TOP NAVIGATION MENU OVERLAY BUTTON */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Desktop Quick Nav Links (Optional on large screens) */}
            <nav className="hidden xl:flex items-center gap-1 bg-[#1C1C1E] p-1 rounded-[12px] border border-white/[0.08] mr-1">
              {navItems.slice(0, 3).map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`px-2.5 py-1 rounded-[8px] text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      isActive ? 'bg-[#2C2C2E] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* User Profile / Role Chip */}
            {member && (
              <div
                onClick={onOpenNavMenu}
                title={`${member.displayName} (${member.email}) - Click to open menu`}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs cursor-pointer transition"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: member.avatarColor || '#30D158' }}
                />
                <span className="font-semibold text-slate-200">{member.role}</span>
              </div>
            )}

            {/* Navigation Menu Button (Opens Overlay with all Navigation Options) */}
            <button
              onClick={onOpenNavMenu}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[12px] bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-100 text-xs font-semibold border border-white/10 hover:border-white/20 shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Open Navigation Menu"
              aria-label="Navigation Menu"
            >
              <Menu className="w-4 h-4 text-[#30D158]" strokeWidth={2.4} />
              <span className="hidden sm:inline">Menu</span>
            </button>

            {/* Enter Log / Log Expense Primary Button */}
            <button
              onClick={onOpenExpenseModal}
              className="flex items-center gap-1 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-[12px] bg-[#30D158] hover:bg-[#34C759] text-black text-xs sm:text-sm font-bold shadow-md shadow-emerald-950/40 transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={2.8} />
              <span className="hidden sm:inline">Enter Log</span>
            </button>

            {/* Desktop Screen Switcher */}
            {onToggleIPhoneFrameMode && (
              <button
                onClick={onToggleIPhoneFrameMode}
                title={isIPhoneFrameMode ? 'Switch to Wide View' : 'Switch to iPhone Frame View'}
                className="hidden lg:flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-[12px] bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/10 text-xs font-medium transition cursor-pointer"
              >
                {isIPhoneFrameMode ? (
                  <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
