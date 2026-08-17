import React, { useState } from 'react';
import { evaluateMathExpression, formatMathLivePreview, isMathExpression } from '../../utils/mathEvaluator';
import { Calculator } from 'lucide-react';

interface MathAmountInputProps {
  value: string;
  onChange: (val: string) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  containerClassName?: string;
  currencyPrefix?: string;
  showLiveBadge?: boolean;
  align?: 'left' | 'right';
  id?: string;
  name?: string;
  required?: boolean;
}

export const MathAmountInput: React.FC<MathAmountInputProps> = ({
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder = '0.00 (e.g. 150*3, 1200/12, 120+234)',
  autoFocus = false,
  className = '',
  containerClassName = '',
  currencyPrefix = 'R',
  showLiveBadge = true,
  align = 'left',
  id,
  name,
  required,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const livePreview = isMathExpression(value) ? formatMathLivePreview(value) : null;

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (isMathExpression(value)) {
      const computed = evaluateMathExpression(value);
      if (computed !== null) {
        onChange(computed.toString());
      }
    }
    if (onBlur) onBlur(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (isMathExpression(value)) {
        const computed = evaluateMathExpression(value);
        if (computed !== null) {
          onChange(computed.toString());
        }
      }
    }
    if (onKeyDown) onKeyDown(e);
  };

  return (
    <div className={`relative ${containerClassName}`}>
      <div className="relative flex items-center">
        {currencyPrefix && (
          <span className="absolute left-3 text-slate-400 font-mono text-xs pointer-events-none select-none">
            {currencyPrefix}
          </span>
        )}

        <input
          id={id}
          name={name}
          type="text"
          inputMode="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          placeholder={placeholder}
          required={required}
          className={`w-full ${
            currencyPrefix ? 'pl-8' : 'pl-3'
          } pr-8 py-2 bg-[#2C2C2E] border border-white/10 rounded-[12px] text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158] focus:border-transparent transition placeholder:text-slate-500 ${
            align === 'right' ? 'text-right' : 'text-left'
          } ${className}`}
        />

        {/* Small calculator icon on the right */}
        <div className="absolute right-2.5 text-slate-500 pointer-events-none">
          <Calculator className="w-3.5 h-3.5 opacity-60" />
        </div>
      </div>

      {/* Live evaluated preview badge when an arithmetic expression like 150*3 or 120+234 is typed */}
      {showLiveBadge && livePreview && isFocused && (
        <div className="absolute left-0 -bottom-6 z-20 flex items-center gap-1.5 px-2 py-0.5 bg-[#1C1C1E] border border-[#30D158]/50 text-[#30D158] font-mono text-[10px] font-bold rounded-[6px] shadow-lg animate-in fade-in zoom-in-95 duration-150">
          <span>Result:</span>
          <span className="text-white">{livePreview}</span>
          <span className="text-slate-400 text-[9px] font-normal">(Press Enter / Blur to calculate)</span>
        </div>
      )}
    </div>
  );
};
