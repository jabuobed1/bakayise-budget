import React from 'react';
import { FigmaIcon } from './FigmaIcon';
import { X } from 'lucide-react';

interface IPhoneActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (
    action: 'expense' | 'income' | 'category' | 'emergency' | 'debt' | 'calendar' | 'period'
  ) => void;
}

export const IPhoneActionSheet: React.FC<IPhoneActionSheetProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  if (!isOpen) return null;

  const actions = [
    {
      id: 'expense',
      label: 'Log Family Expense',
      desc: 'Record a receipt for husband, wife, or household',
      icon: 'receipt' as const,
      color: '#30D158',
    },
    {
      id: 'income',
      label: 'Add Monthly Income',
      desc: 'Log salary, consulting, or side income',
      icon: 'trending' as const,
      color: '#0A84FF',
    },
    {
      id: 'category',
      label: 'Create Budget Category',
      desc: 'Add a new monthly spending envelope',
      icon: 'folder' as const,
      color: '#BF5AF2',
    },
    {
      id: 'emergency',
      label: 'Emergency Fund Savings',
      desc: 'Deposit or withdraw from Step 1 or 3 fund',
      icon: 'piggy' as const,
      color: '#FF9F0A',
    },
    {
      id: 'debt',
      label: 'Add Debt to Snowball',
      desc: 'Register an account for Baby Step 2 attack',
      icon: 'flame' as const,
      color: '#FF453A',
    },
    {
      id: 'calendar',
      label: 'Payday & Holiday Calendar',
      desc: 'Explore South Africa 25th weekend shifts',
      icon: 'calendarDays' as const,
      color: '#64D2FF',
    },
    {
      id: 'period',
      label: 'Start New Pay Cycle',
      desc: 'Initialize the next month budget period',
      icon: 'calendar' as const,
      color: '#5E5CE6',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-[#1C1C1E] border border-white/10 w-full max-w-lg rounded-t-[28px] sm:rounded-[26px] p-5 shadow-2xl text-white max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
      >
        {/* iOS Grabber */}
        <div className="w-10 h-1.2 bg-white/25 rounded-full mx-auto mb-4" />

        {/* Title */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Quick Family Action
            </h3>
            <p className="text-xs text-slate-400">
              Select an action to update your budget
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action List (iOS Inset Grouped style) */}
        <div className="mt-3 space-y-1.5">
          {actions.map((act) => (
            <button
              key={act.id}
              onClick={() => {
                onClose();
                onSelectAction(act.id as any);
              }}
              className="w-full p-3 rounded-[16px] bg-[#2C2C2E]/60 hover:bg-[#2C2C2E] border border-white/[0.06] flex items-center gap-3 transition-all active:scale-[0.98] text-left cursor-pointer"
            >
              <div
                className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 border border-white/10 shadow-sm"
                style={{
                  backgroundColor: `${act.color}20`,
                  color: act.color,
                }}
              >
                <FigmaIcon name={act.icon} size="md" strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white tracking-tight truncate">
                  {act.label}
                </div>
                <div className="text-xs text-slate-400 truncate mt-0.5">
                  {act.desc}
                </div>
              </div>
              <div className="text-slate-500">
                <FigmaIcon name="chevronRight" size="xs" />
              </div>
            </button>
          ))}
        </div>

        {/* Close Button */}
        <div className="mt-4 pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-[16px] bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-200 text-sm font-semibold transition active:scale-95 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
