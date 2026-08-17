import React from 'react';
import { Clock, UserCheck } from 'lucide-react';

interface LastEditTagProps {
  lastEditedBy?: string;
  lastEditedByEmail?: string;
  lastEditedAt?: string;
  compact?: boolean;
  className?: string;
}

export function formatTimeAgo(isoString?: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffSec < 45) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    // Format Month Day (e.g. "14 Aug")
    return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export function formatFullDateTime(isoString?: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export const LastEditTag: React.FC<LastEditTagProps> = ({
  lastEditedBy,
  lastEditedByEmail,
  lastEditedAt,
  compact = false,
  className = '',
}) => {
  if (!lastEditedBy && !lastEditedAt) return null;

  const editorName = lastEditedBy || 'Hubby';
  const isHubby = editorName.toLowerCase().includes('hubby') || editorName.toLowerCase().includes('husband') || lastEditedByEmail?.includes('jabu');
  const isWifey = editorName.toLowerCase().includes('wife') || lastEditedByEmail?.includes('lum');
  
  const timeAgo = formatTimeAgo(lastEditedAt);
  const fullDateTime = formatFullDateTime(lastEditedAt);
  const tooltipText = `Last edited by ${editorName}${lastEditedByEmail ? ` (${lastEditedByEmail})` : ''}${fullDateTime ? ` on ${fullDateTime}` : ''}`;

  const badgeColor = isHubby
    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/15'
    : isWifey
    ? 'bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-rose-500/15'
    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10';

  const dotColor = isHubby ? 'bg-emerald-400' : isWifey ? 'bg-rose-400' : 'bg-slate-400';

  if (compact) {
    return (
      <span
        title={tooltipText}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] text-[10px] font-medium border transition-colors cursor-help select-none ${badgeColor} ${className}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
        <span className="font-semibold">{editorName}</span>
        {timeAgo && <span className="opacity-80 font-normal">· {timeAgo}</span>}
      </span>
    );
  }

  return (
    <span
      title={tooltipText}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[8px] text-[11px] font-medium border transition-colors cursor-help select-none ${badgeColor} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span className="font-semibold">{editorName}</span>
      {timeAgo && (
        <>
          <span className="opacity-40">•</span>
          <span className="opacity-80 font-normal">{timeAgo}</span>
        </>
      )}
    </span>
  );
};
