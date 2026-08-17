import React from 'react';

interface IPhoneMockupFrameProps {
  children: React.ReactNode;
  isFrameActive: boolean;
}

export const IPhoneMockupFrame: React.FC<IPhoneMockupFrameProps> = ({
  children,
  isFrameActive,
}) => {
  if (!isFrameActive) {
    return <div className="w-full min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#070709] py-6 sm:py-10 px-2 sm:px-4 flex flex-col items-center justify-center">
      {/* iPhone 16 Pro Device Frame Mockup */}
      <div className="relative w-full max-w-[430px] rounded-[52px] p-[10px] bg-gradient-to-b from-[#48484a] via-[#2c2c2e] to-[#1c1c1e] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.15)] ring-1 ring-black">
        
        {/* Outer Titanium Bezel Accent */}
        <div className="relative w-full rounded-[44px] overflow-hidden bg-black border border-white/10 shadow-inner flex flex-col max-h-[92vh] min-h-[750px]">
          
          {/* Inner Screen Surface */}
          <div className="w-full flex-1 overflow-y-auto flex flex-col scrollbar-none bg-black text-white">
            {children}
          </div>

        </div>

        {/* Physical hardware button hints (Subtle iOS design signature) */}
        {/* Action Button */}
        <div className="absolute -left-[13px] top-28 w-[3px] h-7 bg-[#3a3a3c] rounded-l-sm" />
        {/* Volume Up */}
        <div className="absolute -left-[13px] top-40 w-[3px] h-12 bg-[#3a3a3c] rounded-l-sm" />
        {/* Volume Down */}
        <div className="absolute -left-[13px] top-56 w-[3px] h-12 bg-[#3a3a3c] rounded-l-sm" />
        {/* Power Button */}
        <div className="absolute -right-[13px] top-36 w-[3px] h-16 bg-[#3a3a3c] rounded-r-sm" />

      </div>
    </div>
  );
};
