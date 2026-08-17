import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

// Health Check & Secret Verification endpoint
app.get('/api/check-api-key', (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  res.json({
    hasApiKey: !!apiKey,
    keyPreview: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : null,
  });
});

// Expense AI scanner endpoint
app.post('/api/scan-expense', async (req, res) => {
  try {
    const data = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'GEMINI_API_KEY environment variable is missing on server.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const parts: any[] = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const systemPrompt = `You are a high-reasoning financial intelligence AI for a South African family budgeting application.
Your task is to analyze financial text, receipt photos, tax invoices, bank statements, or SMS alerts and determine the exact financial transactions.

### CRITICAL REASONING STEP 1: DOCUMENT ARCHETYPE DISCOVERY
You MUST carefully evaluate whether the input is a SINGLE PURCHASE RECEIPT / TAX INVOICE vs a BANK STATEMENT / MULTI-TRANSACTION LIST:

1. ARCHETYPE A: SINGLE STORE RECEIPT / TAX INVOICE / ONLINE ORDER (e.g. Shoprite Checkers, Pick n Pay, Woolworths, Takealot, Shell, Engen, Eskom)
   - KEY IDENTIFIERS: A tax invoice or store receipt listing various products/items purchased during a SINGLE checkout order (e.g. popcorn, soap, bleach, delivery fee, sub-total, and a GRAND TOTAL / PAYMENT MADE).
   - MANDATORY CLASSIFICATION RULE:
     * This represents a SINGLE OVERALL EXPENSE TRANSACTION (set "isBulk": false).
     * Do NOT create individual expenses for each product item on a single store receipt!
     * "merchant": Store/vendor name (e.g. "Shoprite Checkers").
     * "amount": The FINAL GRAND TOTAL or PAYMENT MADE AMOUNT (e.g. 311.94).
     * "date": Invoice date (YYYY-MM-DD, e.g. 2026-08-17).
     * "category": Main envelope category (e.g. "Groceries").
     * "description": "Shoprite Checkers Tax Invoice" or "Online Order INV218133278".
     * "notes": Summary of key items purchased (e.g. "Popcorn, Sunlight detergent, Domestos bleach, dishwashing liquid, Protex soap, delivery fee R37.00").

2. ARCHETYPE B: BANK STATEMENT / ACCOUNT LEDGER / MULTI-MERCHANT ACTIVITY LOG
   - KEY IDENTIFIERS: A bank account transaction statement, credit card ledger, or list of SEPARATE transactions made at DIFFERENT vendors/stores or on DIFFERENT dates (e.g., Line 1: Checkers R311.94, Line 2: Engen R500.00, Line 3: Eskom R200.00).
   - MANDATORY CLASSIFICATION RULE:
     * This represents MULTIPLE INDEPENDENT EXPENSES (set "isBulk": true).
     * Extract EACH distinct bank transaction row into the "expenses" array as an individual item.

### FIELD REQUIREMENT DETAILS:
For each expense entry in "expenses":
1. "merchant": Vendor or payee name (e.g. "Shoprite Checkers", "Pick n Pay", "Woolworths", "Eskom", "Engen QuickShop", "Sasol", "Takealot", "Uber", "Clicks").
2. "amount": Numerical ZAR amount as a positive number (e.g. 311.94).
3. "date": Transaction date in YYYY-MM-DD format (if absent, default to today: ${todayStr}).
4. "category": Choose best match ("Groceries", "Fuel & Petrol", "Utilities & Electricity", "Dining Out & Fast Food", "Healthcare & Pharmacy", "Shopping & Home", "Housing & Rent", "Transport").
5. "paymentMethod": "Debit Card", "Credit Card", "EFT", "Cash", or "Electronic Transfer".
6. "lastFourDigits": Last 4 digits of card if visible.
7. "isCashDeposit": true only if this is an ATM cash deposit into a bank account.
8. "description": Short description.
9. "notes": Summarize itemized contents or context.`;

    if (data.type === 'text' && data.text) {
      parts.push({ text: `Analyze this text/SMS/bank notification and extract expense details:\n\n${data.text}` });
    } else if (data.base64Data && data.mimeType) {
      parts.push({
        inlineData: {
          data: data.base64Data.replace(/^data:[^;]+;base64,/, ''),
          mimeType: data.mimeType,
        },
      });
      parts.push({ text: 'Analyze this document/statement/receipt and extract all expense transactions.' });
    } else {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: { parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isBulk: { type: Type.BOOLEAN },
            expenses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  merchant: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  date: { type: Type.STRING },
                  category: { type: Type.STRING },
                  paymentMethod: { type: Type.STRING },
                  lastFourDigits: { type: Type.STRING },
                  isCashDeposit: { type: Type.BOOLEAN },
                  description: { type: Type.STRING },
                  notes: { type: Type.STRING },
                },
                required: ['merchant', 'amount'],
              },
            },
          },
          required: ['isBulk', 'expenses'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);

    const isBulk = !!parsed.isBulk && Array.isArray(parsed.expenses) && parsed.expenses.length > 1;
    const rawExpenses: any[] = Array.isArray(parsed.expenses) && parsed.expenses.length > 0
      ? parsed.expenses
      : [parsed];

    const formattedExpenses = rawExpenses.map((item: any) => ({
      merchant: item.merchant || 'Unknown Merchant',
      amount: typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || item.total || '0') || 0,
      date: item.date || todayStr,
      category: item.category || undefined,
      paymentMethod: item.paymentMethod || 'Debit Card',
      lastFourDigits: item.lastFourDigits || undefined,
      isCashDeposit: !!item.isCashDeposit,
      description: item.description || item.merchant || 'Scanned Expense',
      notes: item.notes || `Scanned via Gemini 3.1 Flash Lite AI (${data.type})`,
    }));

    return res.json({
      isBulk,
      expenses: formattedExpenses,
    });
  } catch (err: any) {
    console.error('Error in /api/scan-expense:', err);
    return res.status(500).json({ error: err?.message || 'Failed to scan expense' });
  }
});

// Serve static assets from build output
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Bakayise Budget production server running on port ${PORT}`);
});
