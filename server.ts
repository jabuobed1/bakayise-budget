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

// Income AI voice & text scanner endpoint
app.post('/api/scan-income', async (req, res) => {
  try {
    const data = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'GEMINI_API_KEY environment variable is missing on server.',
      });
    }

    const text = (data.text || '').trim();
    if (!text) {
      return res.status(400).json({ error: 'Text payload is required.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const systemPrompt = `You are a high-reasoning financial intelligence AI for a South African family budgeting application.
Your task is to analyze user speech, voice recording transcripts, or typed text describing monthly income streams.
Determine whether the user provided a SINGLE income stream or MULTIPLE income streams (set "isBulk": true if 2 or more income streams are mentioned).

### Valid Income Types:
- "primary_salary": Main employment salary / paycheck
- "spouse_salary": Partner / spouse salary
- "freelance": Freelance consulting, design, coding, or contract work
- "side_hustle": Weekend business, baking, trading, informal sales
- "rental": Rental income from property / tenants
- "investment": Dividends, unit trust interest, returns
- "bonus": 13th cheque, performance bonus, commission
- "tax_refund": SARS tax rebate or refund
- "transfer": Transfer from another account or savings
- "other": Gifts, maintenance, miscellaneous

### Output Extraction Guidelines:
1. "title": Concise, human-friendly income title (e.g. "Primary Salary", "Wife's Salary", "Rental Income Unit 2", "Freelance Web Design", "Side Gig Tutoring").
2. "amount": Positive number in South African Rands (ZAR). Understand terms like "35k" = 35000, "4.5k" = 4500, "thirty thousand" = 30000, "R25,000" = 25000.
3. "type": One of the valid income types above.
4. "sourceTag": Short tag (e.g. "Main Job", "Spouse Employer", "Property", "Side Hustle", "SARS").
5. "receivedDate": YYYY-MM-DD (default: ${todayStr} unless a specific day or date is stated).
6. "status": "expected" or "received" (default: "expected" unless stated as already received or paid in).
7. "notes": Brief note describing the parsed entry.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ text: `Extract all income streams from this spoken or typed message:\n\n"${text}"` }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isBulk: { type: Type.BOOLEAN },
            incomes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  type: { type: Type.STRING },
                  sourceTag: { type: Type.STRING },
                  receivedDate: { type: Type.STRING },
                  status: { type: Type.STRING },
                  notes: { type: Type.STRING },
                },
                required: ['title', 'amount'],
              },
            },
          },
          required: ['isBulk', 'incomes'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);

    const isBulk = !!parsed.isBulk && Array.isArray(parsed.incomes) && parsed.incomes.length > 1;
    const rawIncomes: any[] = Array.isArray(parsed.incomes) && parsed.incomes.length > 0
      ? parsed.incomes
      : [parsed];

    const formattedIncomes = rawIncomes.map((item: any) => ({
      title: item.title || 'Income Stream',
      amount: typeof item.amount === 'number' ? Math.abs(item.amount) : parseFloat(item.amount || '0') || 0,
      type: item.type || 'primary_salary',
      sourceTag: item.sourceTag || undefined,
      receivedDate: item.receivedDate || todayStr,
      status: item.status === 'received' ? 'received' : 'expected',
      notes: item.notes || `Parsed via Gemini 3.1 Flash Lite`,
    }));

    return res.json({
      isBulk,
      incomes: formattedIncomes,
    });
  } catch (err: any) {
    console.error('Error in /api/scan-income:', err);
    return res.status(500).json({ error: err?.message || 'Failed to parse income entries' });
  }
});

// Category / Budget Entry AI voice & text scanner endpoint
app.post('/api/scan-categories', async (req, res) => {
  try {
    const data = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'GEMINI_API_KEY environment variable is missing on server.',
      });
    }

    const text = (data.text || '').trim();
    if (!text) {
      return res.status(400).json({ error: 'Text payload is required.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemPrompt = `You are a high-reasoning financial intelligence AI for a South African family budgeting application following zero-based envelope budgeting.
Your task is to analyze user speech, voice recording transcripts, or typed text describing planned budget categories and envelope allocations.
Determine whether the user provided a SINGLE budget category or MULTIPLE budget categories (set "isBulk": true if 2 or more budget categories are described).

### Valid Category Groups:
- "housing": Bond, rent, rates & taxes, levies, home maintenance
- "transport": Petrol, diesel, vehicle finance, car insurance, Uber, car service
- "food": Groceries (Checkers, Pick n Pay, Woolies, Spar), household food supplies
- "utilities": Eskom electricity, City Power, prepaid water, Wi-Fi / fiber, mobile airtime/data
- "insurance": Life insurance, funeral cover, gap cover, household contents insurance
- "medical": Discovery Health, medical aid, chronic medication, doctor visits, pharmacy
- "education": School fees, tuition, aftercare, textbooks, uniforms
- "lifestyle": Dining out, takeaway, entertainment, Netflix, gym, hobbies, shopping
- "personal": Haircuts, personal care, clothing, pocket money
- "savings": Emergency fund, tax-free savings, investment contributions
- "debt_payment": Credit card repayment, personal loan, store accounts
- "giving": Tithes, church, charity, family support

### Output Extraction Guidelines:
1. "name": Clean, specific name (e.g. "Groceries (Checkers)", "Fuel & Petrol", "Home Bond", "Electricity (Prepaid)", "Medical Aid", "Netflix", "School Fees").
2. "group": Exactly one of the valid groups listed above.
3. "tag": A classification tag matching the group (e.g. "food", "transport", "housing", "utilities", "insurance", "medical", "education", "lifestyle", "personal", "savings", "debt", "giving").
4. "allocatedAmount": Positive number in South African Rands (ZAR). Understand terms like "6k" = 6000, "1.5k" = 1500, "fifteen thousand" = 15000, "R2,500" = 2500.
5. "isEssential": Boolean (true for essentials like shelter, groceries, electricity, petrol, basic healthcare, debt minimums; false for luxuries, entertainment, subscriptions).
6. "icon": Suggested icon name ("ShoppingCart", "Fuel", "Home", "Zap", "Wifi", "ShieldCheck", "HeartPulse", "GraduationCap", "Tv", "UtensilsCrossed", "PiggyBank", "FolderPlus").
7. "notes": Brief note or details.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ text: `Extract all budget envelope categories and planned amounts from this message:\n\n"${text}"` }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isBulk: { type: Type.BOOLEAN },
            categories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  group: { type: Type.STRING },
                  tag: { type: Type.STRING },
                  allocatedAmount: { type: Type.NUMBER },
                  isEssential: { type: Type.BOOLEAN },
                  icon: { type: Type.STRING },
                  notes: { type: Type.STRING },
                },
                required: ['name', 'group', 'allocatedAmount'],
              },
            },
          },
          required: ['isBulk', 'categories'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);

    const isBulk = !!parsed.isBulk && Array.isArray(parsed.categories) && parsed.categories.length > 1;
    const rawCategories: any[] = Array.isArray(parsed.categories) && parsed.categories.length > 0
      ? parsed.categories
      : [parsed];

    const formattedCategories = rawCategories.map((item: any) => ({
      name: item.name || 'Budget Category',
      group: item.group || 'food',
      tag: item.tag || item.group || 'food',
      allocatedAmount: typeof item.allocatedAmount === 'number' ? Math.abs(item.allocatedAmount) : parseFloat(item.allocatedAmount || '0') || 0,
      isEssential: item.isEssential !== undefined ? !!item.isEssential : true,
      icon: item.icon || 'FolderPlus',
      notes: item.notes || `Parsed via Gemini 3.1 Flash Lite`,
    }));

    return res.json({
      isBulk,
      categories: formattedCategories,
    });
  } catch (err: any) {
    console.error('Error in /api/scan-categories:', err);
    return res.status(500).json({ error: err?.message || 'Failed to parse budget categories' });
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
