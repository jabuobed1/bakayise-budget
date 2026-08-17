import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Sparkles } from 'lucide-react';
import { FigmaIcon } from './FigmaIcon';

interface IPhoneStatusBarProps {
  dynamicIslandContent?: {
    title: string;
    subtitle?: string;
    badgeColor?: string;
    icon?: 'check' | 'alert' | 'flame' | 'piggy' | 'wallet';
  };
  onDynamicIslandClick?: () => void;
}

export const IPhoneStatusBar: React.FC<IPhoneStatusBarProps> = ({
  dynamicIslandContent,
  onDynamicIslandClick,
}) => {
  const [timeStr, setTimeStr] = useState<string>('09:41');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      setTimeStr(`${hours}:${mins}`);
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative select-none z-30 pt-2 px-6 pb-2 flex items-center justify-between text-white text-[13px] font-semibold tracking-tight">
      {/* Left: Clock */}
      <div className="w-16 font-medium text-left">
        <span className="font-semibold text-slate-100">{timeStr}</span>
      </div>

      {/* Center: Dynamic Island */}
      <div
        onClick={() => {
          setIsExpanded(!isExpanded);
          if (onDynamicIslandClick) onDynamicIslandClick();
        }}
        className={`bg-black text-white transition-all duration-300 ease-spring flex items-center justify-between cursor-pointer border border-white/10 shadow-lg ${
          isExpanded
            ? 'px-4 py-2 w-64 rounded-[22px] -mt-0.5'
            : 'px-3 py-1 w-32 sm:w-36 h-7 rounded-full'
        }`}
      >
        {isExpanded ? (
          <div className="w-full flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-3 h-3" />
              </div>
              <div className="text-left leading-tight">
                <div className="font-bold text-white text-[11px]">
                  {dynamicIslandContent?.title || 'Bagaiise Budget'}
                </div>
                <div className="text-[9px] text-slate-400">
                  {dynamicIslandContent?.subtitle || 'Zero-Based Family Finance'}
                </div>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
        ) : (
          <>
            <div className="w-2.5 h-2.5 rounded-full bg-[#1c1c1e] border border-white/20 flex items-center justify-center">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: dynamicIslandContent?.badgeColor || '#34C759' }}
              />
            </div>

            <span className="text-[10px] font-medium text-slate-300 truncate max-w-[70px] sm:max-w-[80px]">
              {dynamicIslandContent?.title || 'Bagaiise'}
            </span>

            <div className="w-2.5 h-2.5 rounded-full bg-[#1c1c1e] border border-white/20" />
          </>
        )}
      </div>

      {/* Right: Cellular, Wi-Fi, Battery */}
      <div className="w-16 flex items-center justify-end gap-1.5 text-slate-200">
        {/* Cell signal bars */}
        <div className="flex items-end gap-0.5 h-3">
          <div className="w-0.5 h-1 bg-white rounded-full" />
          <div className="w-0.5 h-1.5 bg-white rounded-full" />
          <div className="w-0.5 h-2 bg-white rounded-full" />
          <div className="w-0.5 h-2.5 bg-white rounded-full" />
        </div>

        {/* 5G label */}
        <span className="text-[10px] font-bold text-slate-300 tracking-tighter">5G</span>

        {/* Wi-Fi */}
        <Wifi className="w-3 h-3 text-slate-200" strokeWidth={2.2} />

        {/* Battery */}
        <div className="flex items-center gap-0.5">
          <div className="w-5 h-2.5 rounded-[4px] border border-white/80 p-0.5 flex items-center">
            <div className="w-3 h-full bg-emerald-400 rounded-[2px]" />
          </div>
          <div className="w-0.5 h-1 bg-white/80 rounded-r-sm" />
        </div>
      </div>
    </div>
  );
};
