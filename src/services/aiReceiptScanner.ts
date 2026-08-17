export interface ScannedExpenseResult {
  merchant: string;
  amount: number;
  date: string;
  category?: string;
  paymentMethod?: string;
  lastFourDigits?: string;
  isCashDeposit?: boolean;
  description?: string;
  notes?: string;
  rawText?: string;
}

export interface ScanReceiptResponse {
  isBulk: boolean;
  expenses: ScannedExpenseResult[];
  error?: string;
}

/**
 * Local regex fallback parser for SMS notifications, bank alerts, and plain text statements.
 */
export function parseExpenseFromTextLocal(text: string): ScannedExpenseResult {
  const clean = text.trim();
  const todayStr = new Date().toISOString().split('T')[0];

  let amount = 0;
  // Match ZAR / R amounts like R 150.00, R250, ZAR 1,200.50
  const amountMatch =
    clean.match(/(?:R|ZAR)\s*([\d,]+\.?\d{0,2})/i) ||
    clean.match(/(?:amt|amount|paid|total|val|purchase)\D*([\d,]+\.\d{2})/i) ||
    clean.match(/([\d,]+\.\d{2})/);
  if (amountMatch) {
    const rawNum = amountMatch[1].replace(/,/g, '');
    const parsed = parseFloat(rawNum);
    if (!isNaN(parsed)) amount = parsed;
  }

  // Detect Merchant
  let merchant = '';
  const saMerchants = [
    'Checkers',
    'Pick n Pay',
    'Woolworths',
    'Spar',
    'Shoprite',
    'Engen',
    'Shell',
    'Sasol',
    'Total',
    'BP',
    'Eskom',
    'City Power',
    'Clicks',
    'Dis-Chem',
    'Takealot',
    'Uber',
    'Bolt',
    'Spur',
    'KFC',
    'Nando\'s',
    'McDonald\'s',
    'Steers',
    'Debonairs',
    'Mr Price',
    'Pep',
  ];
  for (const m of saMerchants) {
    if (new RegExp(m, 'i').test(clean)) {
      merchant = m;
      break;
    }
  }

  if (!merchant) {
    const atMatch = clean.match(/(?:at|from|merchant|vendor|to)\s+([A-Za-z0-9\s&'-]{3,20})/i);
    if (atMatch) {
      merchant = atMatch[1].trim();
    } else {
      merchant = 'Scanned Expense';
    }
  }

  // Detect Date YYYY-MM-DD
  let date = todayStr;
  const dateMatch =
    clean.match(/(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/) ||
    clean.match(/(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/);
  if (dateMatch) {
    try {
      const parts = dateMatch[1].split(/[-/.]/);
      if (parts[0].length === 4) {
        date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (parts[2].length === 4) {
        date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (parts[2].length === 2) {
        date = `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    } catch {
      date = todayStr;
    }
  }

  // Detect Payment Method & Last 4 digits
  let paymentMethod = 'Debit Card';
  if (/cash|notes|coins|wallet|change/i.test(clean)) {
    paymentMethod = 'Cash';
  } else if (/credit|visa|mastercard/i.test(clean)) {
    paymentMethod = 'Credit Card';
  } else if (/eft|transfer|online|capitec pay|ozow|instant/i.test(clean)) {
    paymentMethod = 'EFT';
  }

  // Card ending
  let lastFourDigits = '';
  const cardMatch =
    clean.match(/(?:card|acc|account|ending in|ending|\*+)\s*(\d{4})/i) || clean.match(/x+(\d{4})/i);
  if (cardMatch) {
    lastFourDigits = cardMatch[1];
  }

  // Cash deposit detection
  const isCashDeposit = /cash deposit|atm deposit|dep at atm|cash in/i.test(clean);

  return {
    merchant,
    amount,
    date,
    category: merchant.includes('Checkers') || merchant.includes('Pick') ? 'Groceries' : undefined,
    paymentMethod,
    lastFourDigits,
    isCashDeposit,
    description: clean.length > 60 ? clean.substring(0, 60) + '...' : clean,
    notes: `Extracted from text: "${clean.substring(0, 100)}"`,
    rawText: clean,
  };
}

/**
 * Executes expense/statement scan via server API using Gemini 3.1 Flash Lite with local fallbacks.
 */
export async function scanExpenseReceipt(params: {
  type: 'image' | 'text' | 'document';
  text?: string;
  base64Data?: string;
  mimeType?: string;
  fileName?: string;
  onProgress?: (status: string) => void;
}): Promise<ScanReceiptResponse> {
  console.log('--------------------------------------------------');
  console.log('[START GEMINI 3.1 FLASH LITE SCAN REQUEST]');
  console.log('Type:', params.type);
  console.log('File Name:', params.fileName || 'N/A');
  console.log('Mime Type:', params.mimeType || 'N/A');
  console.log('--------------------------------------------------');

  if (params.onProgress) {
    params.onProgress('Connecting to Gemini 3.1 Flash Lite API...');
  }

  // 1. Try Gemini 3.1 Flash Lite server route
  try {
    const res = await fetch('/api/scan-expense', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (res.ok) {
      const json = await res.json();
      console.log('[Gemini Scan API Response]:', json);
      if (json && Array.isArray(json.expenses) && json.expenses.length > 0) {
        return {
          isBulk: !!json.isBulk && json.expenses.length > 1,
          expenses: json.expenses,
        };
      }
    } else {
      const errJson = await res.json().catch(() => ({}));
      if (errJson.error) {
        console.warn('[Gemini Scan API Warning]:', errJson.error);
      }
    }
  } catch (apiErr) {
    console.warn('[Server Scanner API Unavailable]:', apiErr);
  }

  // 2. Text or Document fallback
  if (params.text) {
    const local = parseExpenseFromTextLocal(params.text);
    return {
      isBulk: false,
      expenses: [local],
    };
  }

  if (params.base64Data && params.mimeType?.includes('text')) {
    try {
      const decoded = atob(params.base64Data.replace(/^data:[^;]+;base64,/, ''));
      const local = parseExpenseFromTextLocal(decoded);
      return {
        isBulk: false,
        expenses: [local],
      };
    } catch {
      // ignore
    }
  }

  const finalFallback: ScannedExpenseResult = {
    merchant: params.fileName ? params.fileName.replace(/\.[^/.]+$/, '') : 'Scanned Receipt',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Debit Card',
    notes: `Scanned file: ${params.fileName || 'Document'}. Please review amount and category.`,
  };

  return {
    isBulk: false,
    expenses: [finalFallback],
  };
}
