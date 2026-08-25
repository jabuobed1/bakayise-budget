import { IncomeType, CategoryGroup } from '../types';

export interface ScannedIncomeItem {
  id?: string;
  title: string;
  amount: number;
  type: IncomeType;
  sourceTag?: string;
  accountId?: string;
  receivedDate: string;
  status: 'expected' | 'received';
  notes?: string;
  selected?: boolean;
}

export interface ScanIncomeResponse {
  isBulk: boolean;
  incomes: ScannedIncomeItem[];
  error?: string;
}

export interface ScannedCategoryItem {
  id?: string;
  name: string;
  group: CategoryGroup;
  tag: string;
  allocatedAmount: number;
  defaultAccountId?: string;
  isEssential: boolean;
  icon: string;
  notes?: string;
  selected?: boolean;
}

export interface ScanCategoryResponse {
  isBulk: boolean;
  categories: ScannedCategoryItem[];
  error?: string;
}

/**
 * Local fallback parser for income streams if API or network is unavailable
 */
export function parseIncomesFromTextLocal(text: string): ScannedIncomeItem[] {
  const lines = text
    .split(/[\n,;]+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const todayStr = new Date().toISOString().split('T')[0];

  const results: ScannedIncomeItem[] = [];

  for (const line of lines) {
    let amount = 0;
    const amtMatch = line.match(/(?:R|ZAR)?\s*([\d,]+(?:\.\d{1,2})?|\d+k)/i);
    if (amtMatch) {
      const raw = amtMatch[1].toLowerCase().replace(/,/g, '');
      if (raw.endsWith('k')) {
        amount = parseFloat(raw.replace('k', '')) * 1000;
      } else {
        amount = parseFloat(raw) || 0;
      }
    }

    let title = line
      .replace(/(?:R|ZAR)?\s*[\d,]+(?:\.\d{1,2})?|\d+k/gi, '')
      .replace(/[-:]/g, '')
      .trim();

    if (!title) title = 'Income Stream';

    let type: IncomeType = 'primary_salary';
    let sourceTag = 'Main Job';

    if (/wife|spouse|partner|her/i.test(line)) {
      type = 'spouse_salary';
      sourceTag = 'Spouse Employer';
    } else if (/freelance|consulting|design|code|client/i.test(line)) {
      type = 'freelance';
      sourceTag = 'Freelance';
    } else if (/side|hustle|gig|bake|baking|tutor/i.test(line)) {
      type = 'side_hustle';
      sourceTag = 'Side Hustle';
    } else if (/rent|tenant|flat|cottage|property/i.test(line)) {
      type = 'rental';
      sourceTag = 'Rental Property';
    } else if (/dividend|invest|interest|return|shares/i.test(line)) {
      type = 'other';
      sourceTag = 'Investments';
    } else if (/bonus|13th|cheque|incentive/i.test(line)) {
      type = 'bonus';
      sourceTag = 'Annual Bonus';
    } else if (/sars|tax|rebate|refund/i.test(line)) {
      type = 'other';
      sourceTag = 'SARS Refund';
    }

    results.push({
      title,
      amount: Math.abs(amount),
      type,
      sourceTag,
      receivedDate: todayStr,
      status: 'expected',
      notes: `Extracted from text: "${line}"`,
      selected: true,
    });
  }

  return results.length > 0
    ? results
    : [
        {
          title: 'Primary Salary',
          amount: 0,
          type: 'primary_salary',
          sourceTag: 'Main Job',
          receivedDate: todayStr,
          status: 'expected',
          notes: 'Please specify amount and details',
          selected: true,
        },
      ];
}

/**
 * Local fallback parser for budget categories if API or network is unavailable
 */
export function parseCategoriesFromTextLocal(text: string): ScannedCategoryItem[] {
  const lines = text
    .split(/[\n,;]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const results: ScannedCategoryItem[] = [];

  for (const line of lines) {
    let amount = 0;
    const amtMatch = line.match(/(?:R|ZAR)?\s*([\d,]+(?:\.\d{1,2})?|\d+k)/i);
    if (amtMatch) {
      const raw = amtMatch[1].toLowerCase().replace(/,/g, '');
      if (raw.endsWith('k')) {
        amount = parseFloat(raw.replace('k', '')) * 1000;
      } else {
        amount = parseFloat(raw) || 0;
      }
    }

    let name = line
      .replace(/(?:R|ZAR)?\s*[\d,]+(?:\.\d{1,2})?|\d+k/gi, '')
      .replace(/[-:]/g, '')
      .trim();

    if (!name) name = 'Budget Category';

    let group: CategoryGroup = 'food';
    let tag = 'food';
    let icon = 'ShoppingCart';
    let isEssential = true;

    if (/grocer|food|checkers|pick n pay|woolies|spar|supermarket/i.test(line)) {
      group = 'food';
      tag = 'food';
      icon = 'ShoppingCart';
    } else if (/petrol|fuel|diesel|sasol|shell|engen|bp|total|transport|car|uber|bolt/i.test(line)) {
      group = 'transport';
      tag = 'transport';
      icon = 'Fuel';
    } else if (/bond|rent|mortgage|rates|levy|levies|home/i.test(line)) {
      group = 'housing';
      tag = 'housing';
      icon = 'Home';
    } else if (/electricity|eskom|city power|water|wifi|fiber|internet|vodacom|mtn/i.test(line)) {
      group = 'utilities';
      tag = 'utilities';
      icon = 'Zap';
    } else if (/medical|doctor|discovery|pharmacy|clicks|dis-chem|health|med/i.test(line)) {
      group = 'health_insurance';
      tag = 'health';
      icon = 'HeartPulse';
    } else if (/school|tuition|fees|education|university|college/i.test(line)) {
      group = 'lifestyle';
      tag = 'kids';
      icon = 'GraduationCap';
    } else if (/netflix|showmax|spotify|entertainment|dining|restaurant|takeaway|gym/i.test(line)) {
      group = 'lifestyle';
      tag = 'entertainment';
      icon = 'Tv';
      isEssential = false;
    } else if (/tithe|church|giving|charity|donation/i.test(line)) {
      group = 'giving';
      tag = 'giving';
      icon = 'Heart';
    } else if (/save|saving|emergency|invest|tfsa/i.test(line)) {
      group = 'savings_goals';
      tag = 'savings';
      icon = 'PiggyBank';
    } else if (/debt|card|loan|credit/i.test(line)) {
      group = 'debt_snowball';
      tag = 'debt';
      icon = 'Building2';
    }

    results.push({
      name,
      group,
      tag,
      allocatedAmount: Math.abs(amount),
      isEssential,
      icon,
      notes: `Extracted from: "${line}"`,
      selected: true,
    });
  }

  return results.length > 0
    ? results
    : [
        {
          name: 'General Budget Item',
          group: 'food',
          tag: 'food',
          allocatedAmount: 0,
          isEssential: true,
          icon: 'FolderPlus',
          selected: true,
        },
      ];
}

/**
 * Normalizes category group to valid CategoryGroup type
 */
function normalizeCategoryGroup(groupStr: string): CategoryGroup {
  const g = (groupStr || '').toLowerCase().trim();
  if (g.includes('give') || g.includes('tithe')) return 'giving';
  if (g.includes('sav') || g.includes('invest') || g.includes('tfsa')) return 'savings_goals';
  if (g.includes('hous') || g.includes('bond') || g.includes('rent') || g.includes('levy')) return 'housing';
  if (g.includes('util') || g.includes('elect') || g.includes('water') || g.includes('wifi') || g.includes('phone')) return 'utilities';
  if (g.includes('food') || g.includes('groc')) return 'food';
  if (g.includes('trans') || g.includes('fuel') || g.includes('petrol') || g.includes('car')) return 'transport';
  if (g.includes('health') || g.includes('medic') || g.includes('insur')) return 'health_insurance';
  if (g.includes('debt') || g.includes('loan') || g.includes('credit')) return 'debt_snowball';
  if (g.includes('person') || g.includes('pocket')) return 'personal';
  return 'lifestyle';
}

/**
 * Normalizes income type to valid IncomeType
 */
function normalizeIncomeType(typeStr: string): IncomeType {
  const t = (typeStr || '').toLowerCase().trim();
  if (t === 'spouse_salary' || t.includes('spouse') || t.includes('wife')) return 'spouse_salary';
  if (t === 'freelance' || t.includes('consult')) return 'freelance';
  if (t === 'side_hustle' || t.includes('gig') || t.includes('hustle')) return 'side_hustle';
  if (t === 'rental' || t.includes('rent')) return 'rental';
  if (t === 'bonus' || t.includes('13th')) return 'bonus';
  if (t === 'primary_salary' || t.includes('salary') || t.includes('job') || t.includes('paycheck')) return 'primary_salary';
  return 'other';
}

/**
 * Scans incomes using Gemini 3.1 Flash Lite via backend API
 */
export async function scanIncomesWithAI(
  text: string,
  onProgress?: (msg: string) => void
): Promise<ScanIncomeResponse> {
  if (onProgress) onProgress('Parsing income streams with Gemini 3.1 Flash Lite AI...');

  try {
    const res = await fetch('/api/scan-income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.incomes) && data.incomes.length > 0) {
        return {
          isBulk: !!data.isBulk && data.incomes.length > 1,
          incomes: data.incomes.map((inc: any) => ({
            ...inc,
            type: normalizeIncomeType(inc.type),
            selected: true,
          })),
        };
      }
    } else {
      const errJson = await res.json().catch(() => ({}));
      console.warn('[Gemini Income Scan API Warning]:', errJson.error);
    }
  } catch (err) {
    console.warn('[Gemini Income Scan Network Warning]:', err);
  }

  // Fallback to local parsing
  const local = parseIncomesFromTextLocal(text);
  return {
    isBulk: local.length > 1,
    incomes: local,
  };
}

/**
 * Scans budget categories using Gemini 3.1 Flash Lite via backend API
 */
export async function scanCategoriesWithAI(
  text: string,
  onProgress?: (msg: string) => void
): Promise<ScanCategoryResponse> {
  if (onProgress) onProgress('Parsing budget categories with Gemini 3.1 Flash Lite AI...');

  try {
    const res = await fetch('/api/scan-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.categories) && data.categories.length > 0) {
        return {
          isBulk: !!data.isBulk && data.categories.length > 1,
          categories: data.categories.map((cat: any) => ({
            ...cat,
            group: normalizeCategoryGroup(cat.group),
            selected: true,
          })),
        };
      }
    } else {
      const errJson = await res.json().catch(() => ({}));
      console.warn('[Gemini Category Scan API Warning]:', errJson.error);
    }
  } catch (err) {
    console.warn('[Gemini Category Scan Network Warning]:', err);
  }

  // Fallback to local parsing
  const local = parseCategoriesFromTextLocal(text);
  return {
    isBulk: local.length > 1,
    categories: local,
  };
}
