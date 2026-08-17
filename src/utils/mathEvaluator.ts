/**
 * Safe Math Expression Evaluator
 * Allows users to manually type arithmetic expressions in any amount/currency input:
 * - Addition: "120 + 234" -> 354
 * - Subtraction: "500 - 120.50" -> 379.50
 * - Multiplication: "150 * 3", "150 x 3", "150 X 3", "150 × 3" -> 450
 * - Division: "1200 / 12", "1200 ÷ 12", "1200 : 4" -> 100, 300
 * - Combined with precedence: "100 + 50 * 2" -> 200
 * - Parentheses: "(100 + 50) * 2" -> 300
 * - Percentages: "5000 * 15%" -> 750, "500 + 10%" -> 550
 */

/**
 * Checks if a string contains arithmetic operators (+, -, *, /, x, ×, ÷, %, etc.)
 */
export function isMathExpression(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const clean = val.replace(/^[Rr]\s*/i, '').replace(/,/g, '.').trim();
  // Pure simple numbers like "120", "-50", "12.5" are not arithmetic expressions
  if (/^-?\d+(\.\d+)?$/.test(clean)) return false;

  // Has arithmetic operators or expressions (+, -, *, /, x, X, ×, ÷, %, (, ))
  return /[\+\-\*\/xX×÷%:\(\)]/.test(clean);
}

/**
 * Normalizes user input string into a standard mathematical formula
 */
export function normalizeMathString(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  let str = raw
    .trim()
    .replace(/^[Rr]\s*/i, '') // Remove leading South African Rand "R" or "R "
    .replace(/\s+/g, '') // Remove all whitespace
    .replace(/,/g, '.') // Convert decimal comma to dot
    .replace(/×/g, '*') // Convert multiplication sign × to *
    .replace(/[xX](?=\d|\(|\.|\+|-)/g, '*') // Convert 'x' or 'X' followed by digit/bracket to *
    .replace(/(?<=\d|\))[xX]/g, '*') // Convert 'x' or 'X' preceded by digit/bracket to *
    .replace(/÷/g, '/') // Convert division sign ÷ to /
    .replace(/:/g, '/'); // Convert colon : division to /

  // Handle percentages like "5000*15%" -> "5000*(15/100)"
  // or "500+10%" -> "500+(500*0.1)" or simple "15%" -> "0.15"
  str = str.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

  return str;
}

/**
 * Safely evaluates mathematical expressions supporting +, -, *, /, %, (), and decimals.
 * Returns the computed number or null if invalid / empty / division-by-zero.
 */
export function evaluateMathExpression(raw: string | number): number | null {
  if (typeof raw === 'number') {
    return isNaN(raw) || !isFinite(raw) ? null : raw;
  }
  if (!raw || typeof raw !== 'string') return null;

  let clean = normalizeMathString(raw);
  if (!clean) return null;

  // If it's a simple number already
  if (/^-?\d+(\.\d+)?$/.test(clean)) {
    const num = parseFloat(clean);
    return isNaN(num) || !isFinite(num) ? null : num;
  }

  // Strip trailing dangling operators while typing (e.g. "120*", "500+", "1200/")
  while (/[\+\-\*\/\.]$/.test(clean)) {
    clean = clean.slice(0, -1);
  }

  if (!clean) return null;

  // Validate allowed characters only: digits, ., +, -, *, /, (, )
  if (!/^[\d\.\+\-\*\/\(\)]+$/.test(clean)) {
    return null;
  }

  try {
    let pos = 0;

    const peek = (): string => clean[pos] || '';
    const get = (): string => clean[pos++] || '';

    // Parses a number or parenthesized expression: (expr)
    const parsePrimary = (): number => {
      if (peek() === '(') {
        get(); // consume '('
        const val = parseExpression();
        if (peek() === ')') get(); // consume ')'
        return val;
      }

      // Handle unary plus/minus e.g. -50 or +20
      if (peek() === '+' || peek() === '-') {
        const sign = get() === '-' ? -1 : 1;
        return sign * parsePrimary();
      }

      let numStr = '';
      while ((peek() >= '0' && peek() <= '9') || peek() === '.') {
        numStr += get();
      }

      if (!numStr) throw new Error('Expected number');
      const val = parseFloat(numStr);
      if (isNaN(val)) throw new Error('Invalid number');
      return val;
    };

    // Parses multiplication and division: a * b, a / b
    const parseFactor = (): number => {
      let val = parsePrimary();
      while (peek() === '*' || peek() === '/') {
        const op = get();
        const next = parsePrimary();
        if (op === '*') {
          val *= next;
        } else {
          if (next === 0) throw new Error('Division by zero');
          val /= next;
        }
      }
      return val;
    };

    // Parses addition and subtraction: a + b, a - b
    const parseExpression = (): number => {
      let val = parseFactor();
      while (peek() === '+' || peek() === '-') {
        const op = get();
        const next = parseFactor();
        if (op === '+') val += next;
        else val -= next;
      }
      return val;
    };

    const result = parseExpression();
    if (isNaN(result) || !isFinite(result)) return null;

    // Round to 2 decimal places for financial calculations
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}

/**
 * Returns formatted live preview string like "= R 450.00" if input is an arithmetic expression
 */
export function formatMathLivePreview(raw: string): string | null {
  if (!isMathExpression(raw)) return null;
  const evaluated = evaluateMathExpression(raw);
  if (evaluated === null) return null;
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(evaluated);
}

/**
 * Calculates standard monthly amortized loan / bond repayment.
 * Formula: PMT = [P * r * (1 + r)^n - B * r] / [(1 + r)^n - 1]
 * where P = principal, r = monthly interest rate, n = term in months, B = balloon residual amount.
 */
export function calculateMonthlyInstallment(
  principal: number,
  annualInterestRatePercent: number,
  termMonths: number,
  balloonAmount: number = 0
): number {
  if (principal <= 0 || termMonths <= 0) return 0;

  const validBalloon = Math.min(balloonAmount || 0, principal);
  const monthlyRate = (annualInterestRatePercent || 0) / 100 / 12;

  if (monthlyRate === 0) {
    return (principal - validBalloon) / termMonths;
  }

  // Standard PMT with residual balloon calculation:
  // PMT = (principal - balloon / (1 + r)^n) * (r / (1 - (1 + r)^(-n)))
  const compound = Math.pow(1 + monthlyRate, termMonths);
  const installment =
    ((principal * compound - validBalloon) * monthlyRate) / (compound - 1);

  return Math.max(0, Math.round(installment * 100) / 100);
}

/**
 * Calculates home loan / mortgage bond monthly repayment.
 */
export function calculateBondInstallment(
  principal: number,
  annualInterestRatePercent: number,
  termYears: number
): number {
  const termMonths = Math.max(1, termYears * 12);
  return calculateMonthlyInstallment(principal, annualInterestRatePercent, termMonths, 0);
}

/**
 * Calculates remaining total interest payable over remaining term at current installment.
 */
export function calculateTotalInterestRemaining(
  balance: number,
  monthlyInstallment: number,
  remainingMonths: number,
  balloonAmount: number = 0
): number {
  if (balance <= 0 || remainingMonths <= 0 || monthlyInstallment <= 0) return 0;
  const totalPayments = (monthlyInstallment * remainingMonths) + (balloonAmount || 0);
  return Math.max(0, Math.round((totalPayments - balance) * 100) / 100);
}
