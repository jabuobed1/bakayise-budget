import { PublicHoliday } from '../types';

/**
 * Calculates Western Easter Sunday for a given year using the Anonymous Gregorian algorithm.
 */
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed (2 = March, 3 = April)
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns all official South African Public Holidays for a given year.
 * Incorporates the Public Holidays Act rule: If a holiday falls on a Sunday,
 * the following Monday is an official public holiday.
 */
export function getSouthAfricanHolidays(year: number): PublicHoliday[] {
  const holidays: PublicHoliday[] = [];

  const fixedHolidays = [
    { month: 0, day: 1, name: "New Year's Day" },
    { month: 2, day: 21, name: 'Human Rights Day' },
    { month: 3, day: 27, name: 'Freedom Day' },
    { month: 4, day: 1, name: "Workers' Day" },
    { month: 5, day: 16, name: 'Youth Day' },
    { month: 7, day: 9, name: "National Women's Day" },
    { month: 8, day: 24, name: 'Heritage Day' },
    { month: 11, day: 16, name: 'Day of Reconciliation' },
    { month: 11, day: 25, name: 'Christmas Day' },
    { month: 11, day: 26, name: 'Day of Goodwill' },
  ];

  // Fixed holidays and Sunday rollover
  for (const h of fixedHolidays) {
    const d = new Date(year, h.month, h.day);
    holidays.push({
      date: formatDateKey(d),
      name: h.name,
      isObserved: false,
    });

    // Special December 25/26 handling
    if (h.month === 11 && h.day === 25 && d.getDay() === 0) {
      // Christmas is on Sunday => Monday Dec 26 is Christmas Observed, Tuesday Dec 27 is Day of Goodwill Observed
      holidays.push({
        date: `${year}-12-27`,
        name: 'Day of Goodwill (Observed)',
        isObserved: true,
      });
    } else if (d.getDay() === 0) {
      // Sunday rollover to Monday
      const observed = new Date(year, h.month, h.day + 1);
      holidays.push({
        date: formatDateKey(observed),
        name: `${h.name} (Observed)`,
        isObserved: true,
      });
    }
  }

  // Easter Holidays (Good Friday and Family Day / Easter Monday)
  const easterSunday = getEasterSunday(year);

  // Good Friday = 2 days before Easter Sunday
  const goodFriday = new Date(easterSunday);
  goodFriday.setDate(easterSunday.getDate() - 2);
  holidays.push({
    date: formatDateKey(goodFriday),
    name: 'Good Friday',
    isObserved: false,
  });

  // Family Day (Easter Monday) = 1 day after Easter Sunday
  const familyDay = new Date(easterSunday);
  familyDay.setDate(easterSunday.getDate() + 1);
  holidays.push({
    date: formatDateKey(familyDay),
    name: 'Family Day',
    isObserved: false,
  });

  return holidays;
}

export function isHoliday(date: Date, holidays: PublicHoliday[]): boolean {
  const dateStr = formatDateKey(date);
  return holidays.some((h) => h.date === dateStr);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

export function isBusinessDay(date: Date, holidays: PublicHoliday[]): boolean {
  return !isWeekend(date) && !isHoliday(date, holidays);
}

/**
 * Calculates South African payday for a specific year and month.
 * Base day is typically the 25th. If the 25th falls on a weekend or public holiday,
 * it rolls backwards to the preceding business day (e.g. Friday before).
 */
export function calculateSouthAfricanPayday(
  year: number,
  month: number, // 0 = Jan, 11 = Dec
  baseDay: number = 25
): {
  payday: Date;
  paydayString: string;
  originalDay: Date;
  shiftedReasons: string[];
} {
  const holidays = getSouthAfricanHolidays(year);
  const originalDate = new Date(year, month, baseDay);
  const currentDate = new Date(year, month, baseDay);
  const reasons: string[] = [];

  while (!isBusinessDay(currentDate, holidays)) {
    const dayOfWeek = currentDate.getDay();
    const dateStr = formatDateKey(currentDate);
    const matchedHoliday = holidays.find((h) => h.date === dateStr);

    if (matchedHoliday) {
      reasons.push(
        `${dateStr} is ${matchedHoliday.name} (Public Holiday) — moved earlier`
      );
    } else if (dayOfWeek === 6) {
      reasons.push(`${dateStr} is a Saturday — moved to preceding business day`);
    } else if (dayOfWeek === 0) {
      reasons.push(`${dateStr} is a Sunday — moved to preceding business day`);
    }

    currentDate.setDate(currentDate.getDate() - 1);
  }

  return {
    payday: currentDate,
    paydayString: formatDateKey(currentDate),
    originalDay: originalDate,
    shiftedReasons: reasons,
  };
}

/**
 * Calculates Budget Setup Due Date (e.g., 23rd/24th, 1 or 2 business days prior to payday).
 */
export function calculateBudgetDueDate(payday: Date): {
  dueDate: Date;
  dueDateString: string;
} {
  const holidays = getSouthAfricanHolidays(payday.getFullYear());
  const dueDate = new Date(payday);
  // Default to 1 calendar day before payday, adjusted if weekend/holiday
  dueDate.setDate(dueDate.getDate() - 1);

  // If due date is on weekend or holiday, shift to preceding business day
  while (!isBusinessDay(dueDate, holidays)) {
    dueDate.setDate(dueDate.getDate() - 1);
  }

  return {
    dueDate,
    dueDateString: formatDateKey(dueDate),
  };
}

/**
 * Creates a pay period definition for a given month.
 * Starts on payday of month N, ends the day before payday of month N+1.
 */
export function generatePayPeriodInfo(
  year: number,
  month: number,
  baseDay: number = 25
): {
  startDate: string;
  endDate: string;
  setupDueDate: string;
  periodName: string;
  paydayDate: Date;
  shiftedReasons: string[];
} {
  const currentPay = calculateSouthAfricanPayday(year, month, baseDay);
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const nextPay = calculateSouthAfricanPayday(nextYear, nextMonth, baseDay);

  // End date is 1 day before next payday
  const endDate = new Date(nextPay.payday);
  endDate.setDate(endDate.getDate() - 1);

  const due = calculateBudgetDueDate(currentPay.payday);

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const periodName = `${monthNames[month]} ${year} Pay Cycle (${formatDateNice(
    currentPay.payday
  )} – ${formatDateNice(endDate)})`;

  return {
    startDate: currentPay.paydayString,
    endDate: formatDateKey(endDate),
    setupDueDate: due.dueDateString,
    periodName,
    paydayDate: currentPay.payday,
    shiftedReasons: currentPay.shiftedReasons,
  };
}

export function formatDateNice(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  return d.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateFull(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  return d.toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formats currency in South African Rand (ZAR / R).
 */
export function formatZAR(amount: number | undefined | null): string {
  const val = amount || 0;
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(val)
    .replace('ZAR', 'R');
}

export function formatZARCompact(amount: number | undefined | null): string {
  const val = amount || 0;
  if (Math.abs(val) >= 1000000) {
    return `R ${(val / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(val) >= 1000) {
    return `R ${(val / 1000).toFixed(1)}k`;
  }
  return `R ${val.toFixed(0)}`;
}
