import React, { useState, useEffect } from 'react';
import { Expense, BudgetCategory, LoggedBy, FinancialAccount, Debt } from '../../types';
import { PAYMENT_METHODS } from '../../utils/budgetConstants';
import { evaluateMathExpression, formatMathLivePreview, isMathExpression } from '../../utils/mathEvaluator';
import { formatZAR } from '../../utils/southAfricaHolidays';
import { FigmaIcon } from '../ui/FigmaIcon';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Calculator,
  Camera,
  Upload,
  MessageSquare,
  FileText,
  SlidersHorizontal,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Landmark,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
  Image as ImageIcon,
  Table,
  CheckSquare,
  Square,
  Target,
  ArrowRightLeft,
} from 'lucide-react';
import { scanExpenseReceipt, ScannedExpenseResult } from '../../services/aiReceiptScanner';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Expense) => void;
  onSaveBulk?: (expenses: Expense[]) => void;
  categories: BudgetCategory[];
  currentPeriodId: string;
  initialExpense?: Expense | null;
  defaultCategoryId?: string;
  accounts?: FinancialAccount[];
  debts?: Debt[];
  onOpenAtmDepositModal?: () => void;
}

const COMMON_SA_MERCHANTS = [
  'Checkers',
  'Pick n Pay',
  'Woolworths Food',
  'Spar',
  'Shoprite',
  'Engen QuickShop',
  'Shell Petrol',
  'Sasol',
  'City Power (Electricity)',
  'Discovery Health',
  'Clicks Pharmacy',
  'Dis-Chem',
  'Takealot',
  'Uber / Bolt',
  'School Fees',
  'Spur Restaurant',
  'KFC / Nando’s',
];

type TabType = 'image' | 'text' | 'upload' | 'manual';

interface CameraPhoto {
  id: string;
  url: string;
  name: string;
  file: File;
}

export interface BulkExpenseRow {
  id: string;
  date: string;
  merchant: string;
  categoryId: string;
  accountId: string;
  amount: number;
  paymentMethod: string;
  notes: string;
  selected: boolean;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveBulk,
  categories,
  currentPeriodId,
  initialExpense,
  defaultCategoryId,
  accounts = [],
  debts = [],
  onOpenAtmDepositModal,
}) => {
  const { member } = useAuth();
  const defaultMember: LoggedBy = member?.role === 'Wifey' ? 'Wifey' : 'Hubby';

  // Tabs: 1. Image (Camera), 2. Text, 3. Upload (PDF & Image), 4. Manual Form
  const [activeTab, setActiveTab] = useState<TabType>('image');

  // Single Form Fields
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState<string>('');
  const [linkedSelection, setLinkedSelection] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loggedBy, setLoggedBy] = useState<LoggedBy>(defaultMember);
  const [paymentMethod, setPaymentMethod] = useState('Debit Card');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // AI & Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatusMsg, setScanStatusMsg] = useState('');
  const [aiSuccessBadge, setAiSuccessBadge] = useState<string | null>(null);
  const [detectedCashDeposit, setDetectedCashDeposit] = useState(false);

  // Bulk Mode State (for statements or multi-receipt scans)
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkExpenseRow[]>([]);

  // Multiple Camera Photos State
  const [cameraPhotos, setCameraPhotos] = useState<CameraPhoto[]>([]);

  // Scanner Inputs
  const [pastedText, setPastedText] = useState('');
  const [uploadedFilePreview, setUploadedFilePreview] = useState<{
    url: string | null;
    name: string;
    type: string;
  } | null>(null);

  useEffect(() => {
    setErrorMessage('');
    setAiSuccessBadge(null);
    setDetectedCashDeposit(false);
    setIsScanning(false);
    setIsBulkMode(false);
    setBulkRows([]);
    setCameraPhotos([]);
    setUploadedFilePreview(null);

    if (initialExpense) {
      setTitle(initialExpense.title);
      setAmount(initialExpense.amount.toString());
      setCategoryId(initialExpense.categoryId);
      setAccountId(
        initialExpense.accountId ||
          (accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || '')
      );
      if (initialExpense.linkedDebtId) {
        setLinkedSelection(`debt:${initialExpense.linkedDebtId}`);
      } else if (initialExpense.targetAccountId) {
        setLinkedSelection(`account:${initialExpense.targetAccountId}`);
      } else {
        setLinkedSelection('');
      }
      setDate(initialExpense.date);
      setLoggedBy(initialExpense.loggedBy);
      setPaymentMethod(initialExpense.paymentMethod || 'Debit Card');
      setNotes(initialExpense.notes || '');
      setActiveTab('manual');
    } else {
      setTitle('');
      setAmount('');
      const targetCatId = defaultCategoryId || (categories[0]?.id ?? '');
      setCategoryId(targetCatId);
      const catObj = categories.find((c) => c.id === targetCatId);
      const defaultAcc =
        catObj?.defaultAccountId ||
        accounts.find((a) => a.isDefault)?.id ||
        accounts[0]?.id ||
        '';
      setAccountId(defaultAcc);
      setLinkedSelection('');
      setDate(new Date().toISOString().split('T')[0]);
      setLoggedBy(defaultMember);
      setPaymentMethod('Debit Card');
      setNotes('');
      setActiveTab('image'); // Default primary input tab
    }
  }, [initialExpense, defaultCategoryId, categories, isOpen, accounts, debts, defaultMember]);

  if (!isOpen) return null;

  // Handle Category Change & auto-suggest account
  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    const cat = categories.find((c) => c.id === newCatId);
    if (cat?.defaultAccountId) {
      setAccountId(cat.defaultAccountId);
    }
  };

  // Handle Linked Debt or Destination Account selection
  const handleLinkedSelectionChange = (val: string) => {
    setLinkedSelection(val);
    if (val.startsWith('debt:')) {
      const debtId = val.replace('debt:', '');
      const debt = debts.find((d) => d.id === debtId);
      if (debt) {
        if (!title || title.trim() === '') {
          setTitle(`Payment: ${debt.name}`);
        }
        // Auto-select debt category if available
        const debtCat = categories.find(
          (c) => c.group === 'debt_snowball' || (c.tag && c.tag.toLowerCase().includes('debt')) || c.name.toLowerCase().includes('debt')
        );
        if (debtCat) {
          setCategoryId(debtCat.id);
        }
        setPaymentMethod('Electronic Transfer / EFT');
      }
    } else if (val.startsWith('account:')) {
      const accId = val.replace('account:', '');
      const targetAcc = accounts.find((a) => a.id === accId);
      if (targetAcc) {
        if (!title || title.trim() === '') {
          setTitle(`Transfer to ${targetAcc.name}`);
        }
        setPaymentMethod('Electronic Transfer / EFT');
      }
    }
  };

  // Auto-match category ID from name/tag
  const matchCategoryId = (scannedCategory?: string): string => {
    const fallbackCat = defaultCategoryId || categories[0]?.id || '';
    if (!scannedCategory) return fallbackCat;
    const matchedCat = categories.find(
      (c) =>
        c.name.toLowerCase().includes(scannedCategory.toLowerCase()) ||
        (c.tag && scannedCategory.toLowerCase().includes(c.tag.toLowerCase()))
    );
    return matchedCat ? matchedCat.id : fallbackCat;
  };

  // Auto-match account ID from payment method/card
  const matchAccountId = (paymentMethod?: string, last4?: string): string => {
    const fallbackAcc =
      accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || '';
    if (paymentMethod?.toLowerCase().includes('cash')) {
      const cashAcc = accounts.find(
        (a) => a.type === 'cash' || a.name.toLowerCase().includes('cash')
      );
      if (cashAcc) return cashAcc.id;
    } else if (last4) {
      const cardAcc = accounts.find(
        (a) =>
          (a.accountNumber && a.accountNumber.includes(last4)) ||
          a.name.includes(last4)
      );
      if (cardAcc) return cardAcc.id;
    }
    return fallbackAcc;
  };

  // Process AI Scanned Results (handles single expense OR bulk expenses automatically)
  const processScanResponse = (scannedList: ScannedExpenseResult[], isBulk: boolean) => {
    if (!scannedList || scannedList.length === 0) {
      setErrorMessage('No valid expenses detected in document.');
      return;
    }

    if (isBulk || scannedList.length > 1) {
      // BULK EXPENSES MODE (e.g., Bank Statement / Multi-line scan)
      const rows: BulkExpenseRow[] = scannedList.map((item, idx) => ({
        id: `bulk_row_${Date.now()}_${idx}`,
        date: item.date || new Date().toISOString().split('T')[0],
        merchant: item.merchant || item.description || `Scanned Item #${idx + 1}`,
        amount: item.amount > 0 ? item.amount : 0,
        categoryId: matchCategoryId(item.category),
        accountId: matchAccountId(item.paymentMethod, item.lastFourDigits),
        paymentMethod: item.paymentMethod || 'Debit Card',
        notes: item.notes || `Scanned statement line via Gemini 3.1 Flash Lite`,
        selected: true,
      }));

      setBulkRows(rows);
      setIsBulkMode(true);
      setAiSuccessBadge(
        `✨ Gemini 3.1 Flash Lite detected ${rows.length} statement expenses! Review and edit in the Excel table below.`
      );
    } else {
      // SINGLE EXPENSE MODE
      setIsBulkMode(false);
      const scanned = scannedList[0];
      if (scanned.merchant) {
        setTitle(scanned.merchant);
      } else if (scanned.description) {
        setTitle(scanned.description);
      }

      if (scanned.amount > 0) {
        setAmount(scanned.amount.toString());
      }

      if (scanned.date) {
        setDate(scanned.date);
      }

      if (scanned.notes) {
        setNotes(scanned.notes);
      }

      if (scanned.isCashDeposit) {
        setDetectedCashDeposit(true);
      }

      if (scanned.paymentMethod) {
        const pmMatch = PAYMENT_METHODS.find(
          (pm) => pm.toLowerCase() === scanned.paymentMethod?.toLowerCase()
        );
        if (pmMatch) setPaymentMethod(pmMatch);
        else if (scanned.paymentMethod.toLowerCase().includes('cash')) setPaymentMethod('Cash');
      }

      const bestCat = matchCategoryId(scanned.category);
      if (bestCat) setCategoryId(bestCat);

      const bestAcc = matchAccountId(scanned.paymentMethod, scanned.lastFourDigits);
      if (bestAcc) setAccountId(bestAcc);

      setAiSuccessBadge('✨ Details extracted with Gemini 3.1 Flash Lite AI! Please preview & edit before saving.');
      setActiveTab('manual'); // Switch to manual form for preview
    }
  };

  // Camera Input: Allows taking multiple pictures (adds to array)
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: CameraPhoto[] = [];
    const fileList: File[] = Array.from(files);

    let processedCount = 0;
    fileList.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const url = evt.target?.result as string;
        newPhotos.push({
          id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          url,
          name: file.name || `Photo ${cameraPhotos.length + newPhotos.length + 1}`,
          file,
        });

        processedCount++;
        if (processedCount === fileList.length) {
          setCameraPhotos((prev) => [...prev, ...newPhotos]);
          // Automatically scan latest photo with Gemini
          const latestPhoto = newPhotos[newPhotos.length - 1];
          if (latestPhoto) {
            scanCameraPhoto(latestPhoto);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Scan camera photo
  const scanCameraPhoto = async (photo: CameraPhoto) => {
    setIsScanning(true);
    setScanStatusMsg(`Analyzing photo with Gemini 3.1 Flash Lite AI...`);
    try {
      const result = await scanExpenseReceipt({
        type: 'image',
        base64Data: photo.url,
        mimeType: photo.file.type || 'image/jpeg',
        fileName: photo.name,
        onProgress: (status) => setScanStatusMsg(status),
      });
      processScanResponse(result.expenses, result.isBulk);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to extract receipt photo. You can fill the fields manually.');
    } finally {
      setIsScanning(false);
    }
  };

  const removeCameraPhoto = (id: string) => {
    setCameraPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Process Text / SMS Notification Scan
  const handleScanText = async (textToScan: string) => {
    if (!textToScan.trim()) {
      setErrorMessage('Please enter or paste message text first.');
      return;
    }

    setErrorMessage('');
    setIsScanning(true);
    setScanStatusMsg('Analyzing text with Gemini 3.1 Flash Lite AI...');
    try {
      const result = await scanExpenseReceipt({
        type: 'text',
        text: textToScan,
        onProgress: (status) => setScanStatusMsg(status),
      });
      processScanResponse(result.expenses, result.isBulk);
    } catch (err) {
      console.error(err);
      setErrorMessage('Could not extract details from text. Please enter manually.');
    } finally {
      setIsScanning(false);
    }
  };

  // Process Upload (PDF or Image)
  const handleSingleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64Data = evt.target?.result as string;

      setUploadedFilePreview({
        url: base64Data,
        name: file.name,
        type: file.type,
      });

      setIsScanning(true);
      setScanStatusMsg(`Scanning ${file.type.includes('pdf') ? 'PDF statement/document' : 'image'} with Gemini 3.1 Flash Lite AI...`);

      try {
        const result = await scanExpenseReceipt({
          type: file.type.includes('image') ? 'image' : 'document',
          base64Data,
          mimeType: file.type || 'application/pdf',
          fileName: file.name,
          onProgress: (status) => setScanStatusMsg(status),
        });
        processScanResponse(result.expenses, result.isBulk);
      } catch (err) {
        console.error(err);
        setErrorMessage('Failed to read uploaded document/image. You can fill the fields manually.');
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Single Form Submit
  const handleSubmitSingle = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const numAmount = evaluateMathExpression(amount);
    if (numAmount === null || numAmount <= 0) {
      setErrorMessage('Please enter a valid expense amount greater than R0.00.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Please enter an expense description or merchant.');
      return;
    }
    if (!categoryId) {
      setErrorMessage('Please select a category envelope.');
      return;
    }
    if (!accountId || !accountId.trim()) {
      setErrorMessage('Please select the financial account this expense was paid from.');
      return;
    }

    let linkedDebtId: string | undefined = undefined;
    let targetAccountId: string | undefined = undefined;
    let transferType: 'standard' | 'debt_payment' | 'internal_transfer' = 'standard';

    if (linkedSelection.startsWith('debt:')) {
      linkedDebtId = linkedSelection.replace('debt:', '');
      transferType = 'debt_payment';
    } else if (linkedSelection.startsWith('account:')) {
      targetAccountId = linkedSelection.replace('account:', '');
      transferType = 'internal_transfer';
    }

    const expenseData: Expense = {
      id: initialExpense?.id || `exp_${Date.now()}`,
      periodId: currentPeriodId,
      categoryId,
      amount: numAmount,
      title: title.trim(),
      date,
      loggedBy,
      accountId: accountId.trim(),
      paymentMethod,
      notes: notes.trim() || undefined,
      linkedDebtId,
      targetAccountId,
      transferType,
      createdAt: initialExpense?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(expenseData);
    onClose();
  };

  // Bulk Excel Save Submit
  const handleSaveBulkExpenses = () => {
    setErrorMessage('');
    const selectedRows = bulkRows.filter((r) => r.selected);
    if (selectedRows.length === 0) {
      setErrorMessage('Please select at least 1 expense row to save.');
      return;
    }

    const invalidRow = selectedRows.find((r) => !r.merchant.trim() || r.amount <= 0 || !r.categoryId || !r.accountId);
    if (invalidRow) {
      setErrorMessage('Please make sure all selected rows have a merchant name, positive amount, category, and account.');
      return;
    }

    const createdExpenses: Expense[] = selectedRows.map((r, idx) => ({
      id: `exp_bulk_${Date.now()}_${idx}`,
      periodId: currentPeriodId,
      categoryId: r.categoryId,
      amount: r.amount,
      title: r.merchant.trim(),
      date: r.date,
      loggedBy,
      accountId: r.accountId,
      paymentMethod: r.paymentMethod,
      notes: r.notes.trim() || 'Scanned via Bulk Statement Loader (Gemini AI)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    if (onSaveBulk) {
      onSaveBulk(createdExpenses);
    } else {
      createdExpenses.forEach((exp) => onSave(exp));
    }

    onClose();
  };

  // Bulk Row Actions
  const updateBulkRow = (id: string, updates: Partial<BulkExpenseRow>) => {
    setBulkRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...updates } : row)));
  };

  const deleteBulkRow = (id: string) => {
    setBulkRows((prev) => prev.filter((row) => row.id !== id));
  };

  const addBulkRow = () => {
    const newRow: BulkExpenseRow = {
      id: `bulk_row_${Date.now()}_manual`,
      date: new Date().toISOString().split('T')[0],
      merchant: 'New Expense Line',
      amount: 0,
      categoryId: defaultCategoryId || categories[0]?.id || '',
      accountId: accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || '',
      paymentMethod: 'Debit Card',
      notes: 'Manually added to statement',
      selected: true,
    };
    setBulkRows((prev) => [...prev, newRow]);
  };

  const toggleAllBulkRows = () => {
    const allSelected = bulkRows.every((r) => r.selected);
    setBulkRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  };

  const selectedBulkCount = bulkRows.filter((r) => r.selected).length;
  const totalBulkSum = bulkRows
    .filter((r) => r.selected)
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto overflow-x-hidden">
      <div className={`bg-[#1C1C1E] border border-white/10 rounded-t-[28px] sm:rounded-[26px] ${isBulkMode ? 'max-w-4xl' : 'max-w-xl'} w-full p-4 sm:p-6 shadow-2xl my-0 sm:my-8 text-white max-h-[92vh] overflow-y-auto overflow-x-hidden flex flex-col box-border transition-all duration-300`}>
        
        {/* iOS Grabber */}
        <div className="w-10 h-1.2 bg-white/25 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-[14px] bg-[#30D158]/15 border border-[#30D158]/30 text-[#30D158] flex items-center justify-center shrink-0">
              <FigmaIcon name="receipt" size="md" strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate flex items-center gap-2">
                <span>{isBulkMode ? 'Bulk Statement Expense Loader' : initialExpense ? 'Edit Family Expense' : 'Log Family Expense'}</span>
                {isBulkMode && (
                  <span className="px-2 py-0.5 rounded-full bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/40 text-[10px] font-bold">
                    Excel View
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 truncate">
                Powered by Gemini 3.1 Flash Lite AI API
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition active:scale-95 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TOP SECTION INPUT TABS (Only shown if NOT in bulk mode) */}
        {!isBulkMode && (
          <div className="mt-4 grid grid-cols-4 gap-1 sm:gap-1.5 p-1 bg-[#2C2C2E] rounded-[16px] border border-white/10 shrink-0 w-full max-w-full box-border">
            <button
              type="button"
              onClick={() => setActiveTab('image')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-[12px] text-[11px] sm:text-xs font-semibold transition cursor-pointer min-w-0 ${
                activeTab === 'image'
                  ? 'bg-[#30D158] text-black shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Camera className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">1. Camera</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-[12px] text-[11px] sm:text-xs font-semibold transition cursor-pointer min-w-0 ${
                activeTab === 'text'
                  ? 'bg-[#30D158] text-black shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">2. Text</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-[12px] text-[11px] sm:text-xs font-semibold transition cursor-pointer min-w-0 ${
                activeTab === 'upload'
                  ? 'bg-[#30D158] text-black shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">3. Upload</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-[12px] text-[11px] sm:text-xs font-semibold transition cursor-pointer min-w-0 ${
                activeTab === 'manual'
                  ? 'bg-[#30D158] text-black shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">4. Form</span>
            </button>
          </div>
        )}

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-[12px] bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage('')}
              className="text-slate-400 hover:text-white shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* AI Success Badge Banner */}
        {aiSuccessBadge && (
          <div className="mt-3 p-3 rounded-[14px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200 shrink-0">
            <Sparkles className="w-4 h-4 text-[#30D158] shrink-0" />
            <span className="flex-1 min-w-0 truncate">{aiSuccessBadge}</span>
          </div>
        )}

        {/* Cash Deposit Alert */}
        {detectedCashDeposit && onOpenAtmDepositModal && !isBulkMode && (
          <div className="mt-3 p-3.5 rounded-[14px] bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <Landmark className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold truncate">Detected ATM Cash Deposit</p>
                <p className="text-[11px] text-amber-300/80 truncate">
                  This transaction appears to be a cash deposit into a bank account.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAtmDepositModal();
              }}
              className="px-3 py-1.5 rounded-[10px] bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition shrink-0 cursor-pointer flex items-center gap-1"
            >
              <span>Log Cash Deposit</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Scanning Spinner Overlay */}
        {isScanning && (
          <div className="mt-4 p-8 rounded-[18px] bg-[#2C2C2E] border border-[#30D158]/30 flex flex-col items-center justify-center text-center space-y-3 animate-pulse shrink-0">
            <div className="w-12 h-12 rounded-full bg-[#30D158]/20 border border-[#30D158] flex items-center justify-center text-[#30D158]">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{scanStatusMsg}</p>
              <p className="text-xs text-slate-400 mt-1">
                Extracting statement transactions using Gemini 3.1 Flash Lite API...
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE A: BULK EXPENSES EXCEL VIEW TABLE (For multi-item statements/scans) */}
        {/* ========================================================================= */}
        {!isScanning && isBulkMode && (
          <div className="mt-4 flex flex-col flex-1 min-h-0 space-y-4">
            
            {/* Spreadsheet Summary Toolbar */}
            <div className="p-3 bg-[#2C2C2E] border border-white/10 rounded-[16px] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleAllBulkRows}
                  className="px-3 py-1.5 rounded-[10px] bg-white/10 hover:bg-white/20 text-white font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  {bulkRows.every((r) => r.selected) ? (
                    <CheckSquare className="w-4 h-4 text-[#30D158]" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Select All ({selectedBulkCount}/{bulkRows.length})</span>
                </button>

                <button
                  type="button"
                  onClick={addBulkRow}
                  className="px-3 py-1.5 rounded-[10px] bg-[#30D158]/20 text-[#30D158] hover:bg-[#30D158]/30 font-semibold transition cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Row</span>
                </button>
              </div>

              <div className="flex items-center gap-4 font-bold text-slate-200">
                <span>Selected Total:</span>
                <span className="text-lg text-[#30D158] font-mono">
                  R {totalBulkSum.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Excel Table Spreadsheet Container */}
            <div className="overflow-x-auto border border-white/10 rounded-[16px] bg-[#2C2C2E] max-h-[50vh] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1C1C1E] text-slate-400 font-semibold border-b border-white/10 sticky top-0 z-20">
                    <th className="p-2.5 text-center w-10">Use</th>
                    <th className="p-2.5 min-w-[110px]">Date</th>
                    <th className="p-2.5 min-w-[160px]">Merchant / Payee</th>
                    <th className="p-2.5 min-w-[150px]">Category Envelope</th>
                    <th className="p-2.5 min-w-[140px]">Paid Account</th>
                    <th className="p-2.5 min-w-[110px] text-right">Amount (ZAR)</th>
                    <th className="p-2.5 w-10 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bulkRows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={`transition ${
                        row.selected ? 'hover:bg-white/[0.04]' : 'opacity-40 bg-black/20'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(e) => updateBulkRow(row.id, { selected: e.target.checked })}
                          className="w-4 h-4 rounded accent-[#30D158] cursor-pointer"
                        />
                      </td>

                      {/* Date */}
                      <td className="p-2">
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) => updateBulkRow(row.id, { date: e.target.value })}
                          className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2 py-1.5 rounded-[8px] text-xs focus:ring-1 focus:ring-[#30D158]"
                        />
                      </td>

                      {/* Merchant */}
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.merchant}
                          onChange={(e) => updateBulkRow(row.id, { merchant: e.target.value })}
                          placeholder="Merchant name"
                          className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2 py-1.5 rounded-[8px] text-xs font-semibold focus:ring-1 focus:ring-[#30D158]"
                        />
                      </td>

                      {/* Category */}
                      <td className="p-2">
                        <select
                          value={row.categoryId}
                          onChange={(e) => updateBulkRow(row.id, { categoryId: e.target.value })}
                          className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2 py-1.5 rounded-[8px] text-xs focus:ring-1 focus:ring-[#30D158]"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Paid Account */}
                      <td className="p-2">
                        <select
                          value={row.accountId}
                          onChange={(e) => updateBulkRow(row.id, { accountId: e.target.value })}
                          className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2 py-1.5 rounded-[8px] text-xs focus:ring-1 focus:ring-[#30D158]"
                        >
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Amount */}
                      <td className="p-2 text-right">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                            R
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={row.amount || ''}
                            onChange={(e) => updateBulkRow(row.id, { amount: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-[#1C1C1E] border border-white/10 text-[#30D158] font-bold pl-6 pr-2 py-1.5 rounded-[8px] text-xs text-right focus:ring-1 focus:ring-[#30D158]"
                          />
                        </div>
                      </td>

                      {/* Delete Action */}
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => deleteBulkRow(row.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-[6px] transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bulk Footer Actions */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsBulkMode(false)}
                className="px-4 py-2.5 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-300 rounded-[14px] text-xs font-semibold transition active:scale-95 cursor-pointer"
              >
                Switch to Single Form
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-300 rounded-[14px] text-xs font-semibold transition active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBulkExpenses}
                  className="px-5 py-2.5 bg-[#30D158] hover:bg-[#34C759] text-black font-bold rounded-[14px] text-xs shadow-md shadow-emerald-950/40 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save {selectedBulkCount} Expenses to Budget</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE B: STANDARD SINGLE EXPENSE MODAL TABS */}
        {/* ========================================================================= */}

        {/* TAB 1: CAMERA (TAKE MULTIPLE PICTURES) */}
        {!isScanning && !isBulkMode && activeTab === 'image' && (
          <div className="mt-4 space-y-4">
            
            {/* Primary Open Camera Button */}
            <div className="p-5 rounded-[18px] bg-[#2C2C2E] border border-dashed border-white/20 hover:border-[#30D158]/60 transition flex flex-col items-center justify-center text-center relative cursor-pointer group">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleCameraCapture}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />

              <div className="w-14 h-14 rounded-full bg-[#30D158]/15 text-[#30D158] flex items-center justify-center group-hover:scale-105 transition mb-2">
                <Camera className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-white">
                Take Receipt / Statement Photos
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Tap to open camera and capture receipt or bank statement pictures
              </p>
              <span className="mt-3 px-3.5 py-1.5 rounded-[10px] bg-[#30D158] text-black text-xs font-bold flex items-center gap-1.5 shadow-md">
                <Plus className="w-4 h-4" />
                <span>Snap Photo with Camera</span>
              </span>
            </div>

            {/* List of Captured Camera Photos */}
            {cameraPhotos.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Captured Receipt Photos ({cameraPhotos.length})</span>
                  <span className="text-[11px] text-[#30D158]">Tap any photo to scan with Gemini AI</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-44 overflow-y-auto pr-1">
                  {cameraPhotos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className="relative bg-[#2C2C2E] rounded-[12px] border border-white/10 overflow-hidden group flex flex-col min-w-0"
                    >
                      <img
                        src={photo.url}
                        alt={`Photo ${idx + 1}`}
                        className="h-24 w-full object-cover"
                      />
                      <div className="p-1.5 flex items-center justify-between bg-black/60 backdrop-blur-sm">
                        <span className="text-[10px] text-slate-300 truncate max-w-[80px]">
                          #{idx + 1} {photo.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => scanCameraPhoto(photo)}
                            title="Scan this photo"
                            className="p-1 rounded bg-[#30D158] text-black hover:bg-[#34C759] transition cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCameraPhoto(photo.id)}
                            title="Remove photo"
                            className="p-1 rounded bg-red-500/30 text-red-300 hover:bg-red-500/50 transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/10">
              <span>Or click tab #4 to enter manually</span>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className="text-[#30D158] hover:underline font-semibold"
              >
                Go to Manual Form →
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: TEXT MESSAGE / BANK STATEMENT TEXT */}
        {!isScanning && !isBulkMode && activeTab === 'text' && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Paste SMS, Bank Alert, Email, or Multi-Line Statement Text
              </label>
              <textarea
                rows={5}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="e.g. Capitec: R349.50 paid at Checkers on 2026-08-15. Or paste multiple lines from bank statement..."
                className="w-full bg-[#2C2C2E] border border-white/10 text-white p-3 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158] resize-none box-border"
              />
            </div>

            {/* Quick Sample Presets */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-400">Quick Test Samples:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const sample = 'Capitec: R349.50 paid at Checkers Hyper on 2026-08-15 with card ending 4210. Avail Bal R1,420.00';
                    setPastedText(sample);
                    handleScanText(sample);
                  }}
                  className="p-2 rounded-[10px] bg-[#2C2C2E] hover:bg-[#3A3A3C] text-left border border-white/10 text-[11px] text-slate-300 transition active:scale-95 cursor-pointer truncate"
                >
                  🛒 <span className="font-semibold text-white">Single Receipt:</span> R349.50
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const sample = `STATEMENT SUMMARY FOR AUG 2026:
1. 2026-08-10 Checkers Hyper R450.00 (Groceries)
2. 2026-08-12 Sasol Fuel Station R650.00 (Fuel)
3. 2026-08-14 Eskom Prepaid Power R300.00 (Utilities)
4. 2026-08-15 Spur Steak Ranch R280.00 (Dining Out)`;
                    setPastedText(sample);
                    handleScanText(sample);
                  }}
                  className="p-2 rounded-[10px] bg-[#2C2C2E] hover:bg-[#3A3A3C] text-left border border-white/10 text-[11px] text-slate-300 transition active:scale-95 cursor-pointer truncate"
                >
                  📊 <span className="font-semibold text-white">Bulk Statement (4 Items):</span> Multi
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const sample = `Shoprite Checkers (Pty) Ltd
Tax Invoice INV218133278
Date placed: 17 Aug, 2026 12:01 PM
Customer name: Jabu Msiza
Delivery address: 17 Iris St, Witbank

Product Detail:
Crossbow Popcorn Kernals 1kg R39.99
Sunlight Handwash Powder Detergent 2kg R74.99
Domestos Multipurpose Bleach 750ml R73.98
Sunlight Dishwashing Liquid Refill 750ml R29.99
Scotch-Brite Wire Pot Scourers 3 Pack R29.99
Protex Gentle Bar Soap 175g R39.98
Discount -R13.98
Product sub-total R274.94
Delivery fee R37.00
Invoice Total R311.94
Payment made at order placement R311.94`;
                    setPastedText(sample);
                    handleScanText(sample);
                  }}
                  className="p-2 rounded-[10px] bg-[#2C2C2E] hover:bg-[#3A3A3C] text-left border border-white/10 text-[11px] text-slate-300 transition active:scale-95 cursor-pointer truncate col-span-1 sm:col-span-2"
                >
                  🧾 <span className="font-semibold text-white">Tax Invoice w/ Line Items:</span> Shoprite Checkers Total R311.94
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleScanText(pastedText)}
              className="w-full py-3 rounded-[14px] bg-[#30D158] hover:bg-[#34C759] text-black font-bold text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Extract Details with Gemini 3.1 Flash Lite</span>
            </button>
          </div>
        )}

        {/* TAB 3: UPLOAD DOCUMENT / STATEMENT */}
        {!isScanning && !isBulkMode && activeTab === 'upload' && (
          <div className="mt-4 space-y-4">
            <div className="p-6 rounded-[18px] bg-[#2C2C2E] border border-dashed border-white/20 hover:border-[#30D158]/60 transition flex flex-col items-center justify-center text-center relative cursor-pointer group">
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={handleSingleUploadChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />

              <div className="w-14 h-14 rounded-full bg-[#30D158]/15 text-[#30D158] flex items-center justify-center group-hover:scale-105 transition mb-3">
                <Upload className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-white">
                Upload Statement PDF or Receipt Image
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Upload a bank statement PDF or multi-receipt image for automatic extraction
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-[8px] bg-white/10 text-slate-300 text-[11px] font-semibold flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-[#64D2FF]" />
                  <span>PDF Statement</span>
                </span>
                <span className="px-2.5 py-1 rounded-[8px] bg-white/10 text-slate-300 text-[11px] font-semibold flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-[#30D158]" />
                  <span>PNG / JPG Scan</span>
                </span>
              </div>

              {uploadedFilePreview && (
                <div className="mt-4 p-2 bg-[#1C1C1E] border border-[#30D158]/40 rounded-[12px] flex items-center gap-2 text-xs font-semibold text-[#30D158] max-w-full min-w-0">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">Uploaded: {uploadedFilePreview.name}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: MANUAL SINGLE FORM */}
        {!isScanning && !isBulkMode && activeTab === 'manual' && (
          <form onSubmit={handleSubmitSingle} className="mt-4 space-y-4 w-full max-w-full box-border">
            
            {/* Amount input */}
            <div className="w-full max-w-full min-w-0">
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Amount (ZAR / R) *</span>
                <span className="text-[11px] text-slate-400 font-normal">Supports +, -, *, /</span>
              </label>
              <div className="relative w-full">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg pointer-events-none">
                  R
                </span>
                <input
                  type="text"
                  inputMode="text"
                  placeholder="0.00 (e.g. 150*3, 1200/12, 120+234)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={() => {
                    if (isMathExpression(amount)) {
                      const res = evaluateMathExpression(amount);
                      if (res !== null) setAmount(res.toString());
                    }
                  }}
                  required
                  autoFocus
                  className="w-full max-w-full min-w-0 box-border bg-[#2C2C2E] border border-white/10 text-white pl-10 pr-10 py-2.5 rounded-[14px] font-bold text-xl focus:outline-none focus:ring-2 focus:ring-[#30D158]"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  <Calculator className="w-4 h-4" />
                </div>

                {isMathExpression(amount) && (
                  <div className="absolute left-0 top-full mt-1 z-30 bg-[#1C1C1E] border border-[#30D158]/50 px-2.5 py-1 rounded-[8px] text-xs font-mono text-[#30D158] font-bold shadow-xl whitespace-nowrap flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                    <Calculator className="w-3.5 h-3.5 text-[#30D158]" />
                    <span>Calculated: {formatMathLivePreview(amount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Title / Merchant */}
            <div className="w-full max-w-full min-w-0">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Expense Description or Merchant *
              </label>
              <input
                type="text"
                placeholder="e.g. Checkers Groceries, Shell Petrol, Eskom Prepaid"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full max-w-full min-w-0 box-border bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
              />
              <div className="flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-none w-full max-w-full">
                <span className="text-[10px] text-slate-500 shrink-0">Quick:</span>
                {COMMON_SA_MERCHANTS.slice(0, 7).map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setTitle(m)}
                    className="px-2 py-0.5 rounded-[8px] text-[10px] bg-[#2C2C2E] text-slate-300 hover:bg-[#3A3A3C] hover:text-white border border-white/10 whitespace-nowrap shrink-0 cursor-pointer transition active:scale-95"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Category selection */}
            <div className="w-full max-w-full min-w-0">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Transaction Type / Category Envelope *
              </label>
              <select
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                required
                className="w-full max-w-full min-w-0 box-border bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.tag ? `[#${c.tag}] ` : ''}{c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Paid From Account Selection */}
            <div className="w-full max-w-full min-w-0">
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Paid From Account *</span>
                <span className="text-[11px] text-emerald-400 font-normal">Required for Fund Tracking</span>
              </label>
              {accounts.length === 0 ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-[14px] text-amber-300 text-xs">
                  No financial accounts found. Please add a bank account first under the Accounts tab.
                </div>
              ) : (
                <select
                  value={accountId}
                  onChange={(e) => {
                    setAccountId(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  required
                  className="w-full max-w-full min-w-0 box-border bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
                >
                  <option value="" disabled>
                    Select Paid From Account *
                  </option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.institution || acc.type})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Logged By */}
            <div className="w-full max-w-full min-w-0">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Logged By (Family Member) *
              </label>
              <div className="grid grid-cols-3 gap-2 w-full max-w-full">
                {(['Hubby', 'Wifey', 'Shared'] as LoggedBy[]).map((m) => {
                  const isSelected =
                    loggedBy === m ||
                    (m === 'Hubby' && loggedBy === 'Husband') ||
                    (m === 'Wifey' && loggedBy === 'Wife');

                  return (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setLoggedBy(m)}
                      className={`py-2 rounded-[12px] text-xs font-semibold border transition active:scale-95 cursor-pointer min-w-0 truncate ${
                        isSelected
                          ? m === 'Hubby'
                            ? 'bg-[#30D158]/20 text-[#30D158] border-[#30D158]/60 shadow-sm'
                            : m === 'Wifey'
                            ? 'bg-[#FF375F]/20 text-[#FF375F] border-[#FF375F]/60 shadow-sm'
                            : 'bg-[#64D2FF]/20 text-[#64D2FF] border-[#64D2FF]/60 shadow-sm'
                          : 'bg-[#2C2C2E] border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-full box-border">
              <div className="min-w-0 max-w-full">
                <label className="block text-xs font-semibold text-slate-300 mb-1 truncate">
                  Transaction Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full max-w-full min-w-0 box-border bg-[#2C2C2E] border border-white/10 text-white px-3 py-2 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer appearance-none"
                />
              </div>

              <div className="min-w-0 max-w-full">
                <label className="block text-xs font-semibold text-slate-300 mb-1 truncate">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full max-w-full min-w-0 box-border bg-[#2C2C2E] border border-white/10 text-white px-3 py-2 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Link to Debt / Destination Account (Optional) */}
            <div className="w-full max-w-full min-w-0 bg-[#242426] border border-white/[0.08] rounded-[16px] p-3.5 space-y-2">
              <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-white">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  <span>Link to Debt Payoff or Transfer Account (Optional)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Auto-deducts balance</span>
              </label>
              <select
                value={linkedSelection}
                onChange={(e) => handleLinkedSelectionChange(e.target.value)}
                className="w-full max-w-full min-w-0 box-border bg-[#1C1C1E] border border-white/10 text-white px-3.5 py-2.5 rounded-[12px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158] cursor-pointer"
              >
                <option value="">None (Standard Envelope Expense)</option>
                {debts.length > 0 && (
                  <optgroup label="🎯 Debts & Snowball (Reduces Debt Balance)">
                    {debts.map((d) => (
                      <option key={`debt:${d.id}`} value={`debt:${d.id}`}>
                        🎯 Debt: {d.name} (Owing {formatZAR(d.balance)})
                      </option>
                    ))}
                  </optgroup>
                )}
                {accounts.length > 0 && (
                  <optgroup label="🔄 Destination Financial Accounts (Internal Transfer / Card Payoff)">
                    {accounts
                      .filter((a) => a.id !== accountId)
                      .map((acc) => (
                        <option key={`account:${acc.id}`} value={`account:${acc.id}`}>
                          🔄 Transfer to: {acc.name} ({acc.institution || acc.type})
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
              {linkedSelection.startsWith('debt:') && (
                <div className="text-[11px] text-amber-300/90 flex items-center gap-1.5 mt-1 bg-amber-500/10 p-2 rounded-[10px] border border-amber-500/20">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>
                    Saving this expense will automatically subtract {amount ? formatZAR(parseFloat(amount) || 0) : 'the payment'} from the debt balance.
                  </span>
                </div>
              )}
              {linkedSelection.startsWith('account:') && (
                <div className="text-[11px] text-sky-300/90 flex items-center gap-1.5 mt-1 bg-sky-500/10 p-2 rounded-[10px] border border-sky-500/20">
                  <ArrowRightLeft className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                  <span>
                    This transaction will be recorded as an internal transfer between your accounts.
                  </span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="w-full max-w-full min-w-0">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Month end stock up, warranty slip saved"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full max-w-full min-w-0 box-border bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
              />
            </div>

            {/* Footer actions */}
            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-slate-300 rounded-[14px] text-xs font-semibold transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#30D158] hover:bg-[#34C759] text-black font-bold rounded-[14px] text-xs shadow-md shadow-emerald-950/40 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{initialExpense ? 'Save Changes' : 'Log Expense'}</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
