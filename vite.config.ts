import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

function geminiScanPlugin(): Plugin {
  return {
    name: 'gemini-scan-plugin',
    configureServer(server) {
      server.middlewares.use('/api/check-api-key', (req, res) => {
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        return res.end(
          JSON.stringify({
            hasApiKey: !!apiKey,
            keyPreview: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : null,
          })
        );
      });

      server.middlewares.use('/api/scan-expense', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('Method not allowed');
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

            if (!apiKey) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  error: 'GEMINI_API_KEY environment variable not set.',
                })
              );
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
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Invalid payload' }));
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

            const result = {
              isBulk,
              expenses: formattedExpenses,
            };

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(result));
          } catch (err: any) {
            console.error('Scan expense API error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: err.message || 'Error processing document' }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), geminiScanPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
