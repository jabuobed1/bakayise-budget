import React from 'react';
import {
  Wallet,
  PieChart,
  Receipt,
  Trophy,
  Flame,
  Calendar,
  Plus,
  TrendingUp,
  CreditCard,
  PiggyBank,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  FolderPlus,
  Home,
  Zap,
  ShoppingCart,
  Fuel,
  HeartPulse,
  User,
  Users,
  GraduationCap,
  Heart,
  Building2,
  Wifi,
  Smartphone,
  ShieldCheck,
  Pill,
  UtensilsCrossed,
  Tv,
  UserCheck,
  ShoppingBag,
  Banknote,
  Car,
  FileText,
  Sparkles,
  Download,
  Printer,
  RefreshCw,
  ChevronRight,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Sliders,
  DollarSign,
  Tag,
  Copy,
  Edit2,
  Trash2,
  X,
  Check,
  Info,
  CalendarDays,
  SmartphoneNfc,
  Sparkle,
  History,
} from 'lucide-react';

export type FigmaIconName =
  | 'wallet'
  | 'pie'
  | 'receipt'
  | 'trophy'
  | 'flame'
  | 'calendar'
  | 'plus'
  | 'trending'
  | 'creditCard'
  | 'piggy'
  | 'check'
  | 'alert'
  | 'clock'
  | 'search'
  | 'folder'
  | 'home'
  | 'zap'
  | 'cart'
  | 'fuel'
  | 'heartPulse'
  | 'user'
  | 'users'
  | 'grad'
  | 'heart'
  | 'building'
  | 'wifi'
  | 'phone'
  | 'shield'
  | 'pill'
  | 'utensils'
  | 'tv'
  | 'userCheck'
  | 'bag'
  | 'banknote'
  | 'car'
  | 'file'
  | 'sparkles'
  | 'download'
  | 'printer'
  | 'refresh'
  | 'chevronRight'
  | 'arrowRight'
  | 'arrowDown'
  | 'arrowUp'
  | 'sliders'
  | 'tag'
  | 'copy'
  | 'edit'
  | 'trash'
  | 'close'
  | 'info'
  | 'calendarDays'
  | 'nfc'
  | 'history';

interface FigmaIconProps {
  name: FigmaIconName;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'tool' | 'badge' | 'ghost' | 'filled' | 'plain';
  color?: string; // Hex, e.g. #10b981
  className?: string;
  strokeWidth?: number;
}

const ICON_COMPONENTS: Record<FigmaIconName, React.ComponentType<any>> = {
  wallet: Wallet,
  pie: PieChart,
  receipt: Receipt,
  trophy: Trophy,
  flame: Flame,
  calendar: Calendar,
  plus: Plus,
  trending: TrendingUp,
  creditCard: CreditCard,
  piggy: PiggyBank,
  check: CheckCircle2,
  alert: AlertCircle,
  clock: Clock,
  search: Search,
  folder: FolderPlus,
  home: Home,
  zap: Zap,
  cart: ShoppingCart,
  fuel: Fuel,
  heartPulse: HeartPulse,
  user: User,
  users: Users,
  grad: GraduationCap,
  heart: Heart,
  building: Building2,
  wifi: Wifi,
  phone: Smartphone,
  shield: ShieldCheck,
  pill: Pill,
  utensils: UtensilsCrossed,
  tv: Tv,
  userCheck: UserCheck,
  bag: ShoppingBag,
  banknote: Banknote,
  car: Car,
  file: FileText,
  sparkles: Sparkles,
  download: Download,
  printer: Printer,
  refresh: RefreshCw,
  chevronRight: ChevronRight,
  arrowRight: ArrowRight,
  arrowDown: ArrowDownLeft,
  arrowUp: ArrowUpRight,
  sliders: Sliders,
  tag: Tag,
  copy: Copy,
  edit: Edit2,
  trash: Trash2,
  close: X,
  info: Info,
  calendarDays: CalendarDays,
  nfc: SmartphoneNfc,
  history: History,
};

const SIZE_MAP = {
  xs: { icon: 13, box: 'w-6 h-6 rounded-[7px]' },
  sm: { icon: 15, box: 'w-7 h-7 rounded-[9px]' },
  md: { icon: 18, box: 'w-9 h-9 rounded-[11px]' },
  lg: { icon: 22, box: 'w-11 h-11 rounded-[14px]' },
  xl: { icon: 26, box: 'w-14 h-14 rounded-[18px]' },
};

/**
 * Tldraw / Figma style Icon Component
 * Crisp vector lines (stroke-width 2-2.2), rounded caps/joins, squircle tool badges
 */
export const FigmaIcon: React.FC<FigmaIconProps> = ({
  name,
  size = 'md',
  variant = 'plain',
  color,
  className = '',
  strokeWidth = 2,
}) => {
  const IconComp = ICON_COMPONENTS[name] || Sparkle;
  const config = SIZE_MAP[size];

  if (variant === 'plain') {
    return (
      <IconComp
        size={config.icon}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`shrink-0 ${className}`}
        style={color ? { color } : undefined}
      />
    );
  }

  // Figma / Tldraw Tool Box styling
  if (variant === 'tool') {
    return (
      <div
        className={`flex items-center justify-center shrink-0 border border-white/10 shadow-sm transition-transform active:scale-95 ${config.box} ${className}`}
        style={{
          backgroundColor: color ? `${color}18` : 'rgba(255, 255, 255, 0.07)',
          borderColor: color ? `${color}40` : 'rgba(255, 255, 255, 0.12)',
          color: color || '#FFFFFF',
        }}
      >
        <IconComp
          size={config.icon}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div
        className={`flex items-center justify-center shrink-0 rounded-full border ${config.box} ${className}`}
        style={{
          backgroundColor: color ? `${color}20` : 'rgba(255, 255, 255, 0.1)',
          borderColor: color ? `${color}50` : 'rgba(255, 255, 255, 0.2)',
          color: color || '#FFFFFF',
        }}
      >
        <IconComp
          size={config.icon}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </div>
    );
  }

  // Filled variant
  return (
    <div
      className={`flex items-center justify-center shrink-0 text-white font-bold shadow-sm ${config.box} ${className}`}
      style={{
        backgroundColor: color || '#0A84FF',
      }}
    >
      <IconComp
        size={config.icon}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </div>
  );
};
