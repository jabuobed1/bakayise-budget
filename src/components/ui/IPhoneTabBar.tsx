import React from 'react';
import { ActiveTab } from '../Navbar';
import { FigmaIcon, FigmaIconName } from './FigmaIcon';
import { Plus } from 'lucide-react';

interface IPhoneTabBarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenQuickAction: () => void;
  step1Balance?: number;
  totalDebtBalance?: number;
}

export const IPhoneTabBar: React.FC<IPhoneTabBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenQuickAction,
  step1Balance = 0,
  totalDebtBalance = 0,
}) => {
  const tabs: {
    id: ActiveTab;
    label: string;
    icon: FigmaIconName;
    badge?: string | number;
  }[] = [
    { id: 'budget', label: 'Budget', icon: 'wallet' },
    { id: 'expenses', label: 'Expenses', icon: 'receipt' },
    { id: 'babysteps', label: 'Steps', icon: 'trophy' },
    { id: 'snowball', label: 'Snowball', icon: 'flame' },
  ];

  return (
    <div className="sticky bottom-0 left-0 right-0 z-40">
      {/* Frosted Glass Container */}
      <div className="bg-[#121214]/90 backdrop-blur-2xl border-t border-white/[0.08] shadow-[0_-10px_25px_rgba(0,0,0,0.5)] px-4 pt-2 pb-2">
        <div className="max-w-md mx-auto flex items-center justify-between relative">
          
          {/* Tab 1: Budget */}
          <button
            onClick={() => setActiveTab('budget')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 cursor-pointer ${
              activeTab === 'budget' ? 'text-[#30D158]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FigmaIcon
              name="wallet"
              size="md"
              variant={activeTab === 'budget' ? 'plain' : 'plain'}
              strokeWidth={activeTab === 'budget' ? 2.4 : 1.8}
              color={activeTab === 'budget' ? '#30D158' : undefined}
            />
            <span className="text-[10px] font-medium tracking-tight mt-1">Budget</span>
          </button>

          {/* Tab 2: Expenses */}
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 cursor-pointer ${
              activeTab === 'expenses' ? 'text-[#30D158]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FigmaIcon
              name="receipt"
              size="md"
              variant="plain"
              strokeWidth={activeTab === 'expenses' ? 2.4 : 1.8}
              color={activeTab === 'expenses' ? '#30D158' : undefined}
            />
            <span className="text-[10px] font-medium tracking-tight mt-1">Expenses</span>
          </button>

          {/* Center Floating Quick Action Button */}
          <div className="flex-1 flex justify-center -mt-6">
            <button
              onClick={onOpenQuickAction}
              aria-label="Quick Action"
              className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#248A3D] to-[#34C759] text-white flex items-center justify-center shadow-lg shadow-emerald-900/50 border-2 border-[#121214] transition-transform active:scale-90 hover:scale-105 cursor-pointer"
            >
              <Plus className="w-6 h-6 text-white" strokeWidth={2.8} />
            </button>
          </div>

          {/* Tab 3: Baby Steps */}
          <button
            onClick={() => setActiveTab('babysteps')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 cursor-pointer relative ${
              activeTab === 'babysteps' ? 'text-[#30D158]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FigmaIcon
              name="trophy"
              size="md"
              variant="plain"
              strokeWidth={activeTab === 'babysteps' ? 2.4 : 1.8}
              color={activeTab === 'babysteps' ? '#30D158' : undefined}
            />
            <span className="text-[10px] font-medium tracking-tight mt-1">Baby Steps</span>
            {step1Balance > 0 && (
              <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#121214]" />
            )}
          </button>

          {/* Tab 4: Debt Snowball */}
          <button
            onClick={() => setActiveTab('snowball')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-90 cursor-pointer relative ${
              activeTab === 'snowball' ? 'text-[#FF453A]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FigmaIcon
              name="flame"
              size="md"
              variant="plain"
              strokeWidth={activeTab === 'snowball' ? 2.4 : 1.8}
              color={activeTab === 'snowball' ? '#FF453A' : undefined}
            />
            <span className="text-[10px] font-medium tracking-tight mt-1">Snowball</span>
            {totalDebtBalance > 0 && (
              <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#121214]" />
            )}
          </button>

        </div>

        {/* iOS Home Indicator Bar */}
        <div className="w-32 h-1 bg-white/25 rounded-full mx-auto mt-2" />
      </div>
    </div>
  );
};
