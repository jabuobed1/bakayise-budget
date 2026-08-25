import React, { useState, useEffect } from 'react';
import { BudgetCategory, CategoryGroup, FinancialAccount } from '../../types';
import { CATEGORY_GROUPS, COMMON_CATEGORY_TAGS } from '../../utils/budgetConstants';
import { evaluateMathExpression, formatMathLivePreview, isMathExpression } from '../../utils/mathEvaluator';
import { formatZAR } from '../../utils/southAfricaHolidays';
import { FigmaIcon } from '../ui/FigmaIcon';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { scanCategoriesWithAI, ScannedCategoryItem } from '../../services/aiBulkScanner';
import {
  X,
  Tag,
  Plus,
  Calculator,
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Trash2,
  CheckSquare,
  Square,
  Landmark,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: BudgetCategory) => void;
  onSaveBulk?: (categories: BudgetCategory[]) => void;
  currentPeriodId: string;
  initialCategory?: BudgetCategory | null;
  accounts?: FinancialAccount[];
  accountBalances?: Record<string, number>;
}

type TabType = 'ai_voice' | 'manual';

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveBulk,
  currentPeriodId,
  initialCategory,
  accounts = [],
  accountBalances,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('ai_voice');

  // Manual Form Fields
  const [name, setName] = useState('');
  const [group, setGroup] = useState<CategoryGroup>('food');
  const [tag, setTag] = useState<string>('food');
  const [customTag, setCustomTag] = useState<string>('');
  const [isCustomTag, setIsCustomTag] = useState<boolean>(false);
  const [allocatedAmount, setAllocatedAmount] = useState('');
  const [defaultAccountId, setDefaultAccountId] = useState<string>('');
  const [isEssential, setIsEssential] = useState(true);
  const [icon, setIcon] = useState('ShoppingCart');
  const [errorMessage, setErrorMessage] = useState('');

  // AI & Voice State
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState('');
  const [aiSuccessBadge, setAiSuccessBadge] = useState<string | null>(null);

  // Bulk Review State
  const [bulkRows, setBulkRows] = useState<ScannedCategoryItem[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);

  // Voice recording hook
  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported: isVoiceSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecorder();

  // Sync speech transcript into input text while recording
  useEffect(() => {
    if (isListening && transcript !== undefined) {
      setInputText(transcript);
    }
  }, [transcript, isListening]);

  useEffect(() => {
    setErrorMessage('');
    setAiSuccessBadge(null);
    setIsParsing(false);
    setIsBulkMode(false);
    setBulkRows([]);
    setInputText('');
    resetTranscript();

    if (initialCategory) {
      setActiveTab('manual');
      setName(initialCategory.name);
      setGroup(initialCategory.group);
      const existingTag = initialCategory.tag || 'other';
      const isKnown = COMMON_CATEGORY_TAGS.some((t) => t.id === existingTag);
      if (isKnown) {
        setTag(existingTag);
        setIsCustomTag(false);
        setCustomTag('');
      } else {
        setIsCustomTag(true);
        setCustomTag(existingTag);
        setTag('custom');
      }
      setAllocatedAmount(initialCategory.allocatedAmount.toString());
      setDefaultAccountId(
        initialCategory.defaultAccountId ||
          (accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || '')
      );
      setIsEssential(initialCategory.isEssential);
      setIcon(initialCategory.icon || 'FolderPlus');
    } else {
      setActiveTab('ai_voice');
      setName('');
      setGroup('food');
      setTag('food');
      setIsCustomTag(false);
      setCustomTag('');
      setAllocatedAmount('');
      const defAcc = accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || '';
      setDefaultAccountId(defAcc);
      setIsEssential(true);
      setIcon('ShoppingCart');
    }
  }, [initialCategory, isOpen, accounts]);

  if (!isOpen) return null;

  const fallbackAccountId = accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || '';

  const handleToggleVoiceRecording = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(inputText);
    }
  };

  const handleParseWithAI = async (textToParse?: string) => {
    const query = (textToParse || inputText).trim();
    if (!query) {
      setErrorMessage('Please record your voice or type your budget categories first.');
      return;
    }

    if (isListening) {
      stopListening();
    }

    setErrorMessage('');
    setIsParsing(true);
    setParseStatus('Analyzing budget entries with Gemini 3.1 Flash Lite...');

    try {
      const response = await scanCategoriesWithAI(query, (msg) => setParseStatus(msg));

      if (!response.categories || response.categories.length === 0) {
        setErrorMessage('No budget categories could be identified. Please check the text and try again.');
        setIsParsing(false);
        return;
      }

      if (response.isBulk && response.categories.length > 1) {
        // Multiple entries -> switch to Bulk Review Table
        const rows: ScannedCategoryItem[] = response.categories.map((item, idx) => ({
          ...item,
          id: `bulk_cat_${Date.now()}_${idx}`,
          defaultAccountId: item.defaultAccountId || fallbackAccountId,
          selected: true,
        }));
        setBulkRows(rows);
        setIsBulkMode(true);
        setAiSuccessBadge(`Extracted ${rows.length} budget envelope categories using Gemini 3.1 Flash Lite AI.`);
      } else {
        // Single entry -> populate manual form fields and switch to manual view
        const item = response.categories[0];
        setName(item.name);
        setGroup(item.group || 'food');
        setTag(item.tag || item.group || 'food');
        setIsCustomTag(false);
        setCustomTag('');
        setAllocatedAmount(item.allocatedAmount.toString());
        setDefaultAccountId(item.defaultAccountId || fallbackAccountId);
        setIsEssential(item.isEssential !== undefined ? item.isEssential : true);
        setIcon(item.icon || 'FolderPlus');

        setActiveTab('manual');
        setAiSuccessBadge('Single category extracted via Gemini 3.1 Flash Lite. Review and click Save.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to parse budget categories. Please try again.');
    } finally {
      setIsParsing(false);
    }
  };

  // Bulk Table actions
  const handleToggleSelectRow = (idx: number) => {
    setBulkRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleToggleSelectAll = () => {
    const allSelected = bulkRows.every((r) => r.selected);
    setBulkRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  };

  const handleUpdateBulkRow = (idx: number, updates: Partial<ScannedCategoryItem>) => {
    setBulkRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...updates } : r))
    );
  };

  const handleDeleteBulkRow = (idx: number) => {
    setBulkRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveBulkEntries = () => {
    setErrorMessage('');
    const selected = bulkRows.filter((r) => r.selected);
    if (selected.length === 0) {
      setErrorMessage('Please select at least one category to save.');
      return;
    }

    const categoriesToSave: BudgetCategory[] = selected.map((r, idx) => {
      const groupMeta = CATEGORY_GROUPS.find((g) => g.id === r.group);
      return {
        id: r.id || `cat_${currentPeriodId}_${Date.now()}_${idx}`,
        periodId: currentPeriodId,
        name: r.name.trim() || 'Budget Category',
        group: r.group,
        tag: r.tag || r.group,
        allocatedAmount: r.allocatedAmount > 0 ? r.allocatedAmount : 0,
        defaultAccountId: r.defaultAccountId || fallbackAccountId || undefined,
        color: groupMeta?.color || '#3b82f6',
        icon: r.icon || 'FolderPlus',
        isEssential: r.isEssential !== undefined ? r.isEssential : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    if (onSaveBulk) {
      onSaveBulk(categoriesToSave);
    } else {
      for (const cat of categoriesToSave) {
        onSave(cat);
      }
    }

    onClose();
  };

  // Single Manual Form Submit
  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const numAmount = evaluateMathExpression(allocatedAmount);
    if (!name.trim()) {
      setErrorMessage('Please enter a category / transaction type name.');
      return;
    }
    if (numAmount === null || numAmount < 0) {
      setErrorMessage('Please enter a valid planned allocation amount (R0.00 or higher).');
      return;
    }

    const groupMeta = CATEGORY_GROUPS.find((g) => g.id === group);
    const finalTag = isCustomTag && customTag.trim() ? customTag.trim().toLowerCase() : tag;

    const catData: BudgetCategory = {
      id: initialCategory?.id || `cat_${currentPeriodId}_${Date.now()}`,
      periodId: currentPeriodId,
      name: name.trim(),
      group,
      tag: finalTag,
      allocatedAmount: numAmount,
      defaultAccountId: defaultAccountId || undefined,
      color: groupMeta?.color || '#3b82f6',
      icon,
      isEssential,
      createdAt: initialCategory?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(catData);
    onClose();
  };

  const totalBulkAllocation = bulkRows
    .filter((r) => r.selected)
    .reduce((sum, r) => sum + (r.allocatedAmount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className={`bg-[#1C1C1E] border border-white/10 rounded-t-[28px] sm:rounded-[26px] ${isBulkMode ? 'max-w-3xl' : 'max-w-xl'} w-full p-5 sm:p-6 shadow-2xl my-0 sm:my-8 text-white max-h-[90vh] overflow-y-auto transition-all`}>
        
        {/* iOS Grabber */}
        <div className="w-10 h-1.2 bg-white/25 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#107c41]/20 border border-[#107c41]/40 text-[#30D158] flex items-center justify-center shrink-0">
              <FigmaIcon name="folder" size="md" strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {initialCategory
                  ? 'Edit Transaction Type / Category'
                  : isBulkMode
                  ? 'Review & Batch Save Categories'
                  : 'Create Budget Entries (Voice & Bulk AI)'}
              </h3>
              <p className="text-xs text-slate-400">
                {isBulkMode
                  ? `Extracted ${bulkRows.length} budget envelope categories via Gemini 3.1 Flash Lite`
                  : 'Record speech, type notes, or set up single & bulk budget allocations'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        {!initialCategory && !isBulkMode && (
          <div className="flex bg-[#2C2C2E]/80 p-1 rounded-[14px] border border-white/5 my-3.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('ai_voice');
                setErrorMessage('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-[11px] text-xs font-bold transition ${
                activeTab === 'ai_voice'
                  ? 'bg-[#30D158] text-black shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Voice & Bulk AI Entry</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('manual');
                setErrorMessage('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-[11px] text-xs font-bold transition ${
                activeTab === 'manual'
                  ? 'bg-[#30D158] text-black shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Manual Form</span>
            </button>
          </div>
        )}

        {/* AI Success Badge */}
        {aiSuccessBadge && (
          <div className="my-2.5 p-3 rounded-[14px] bg-[#30D158]/15 border border-[#30D158]/30 text-[#30D158] text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="flex-1">{aiSuccessBadge}</span>
          </div>
        )}

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="my-2.5 p-3 rounded-[12px] bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: BULK REVIEW TABLE MODE                                           */}
        {/* ========================================================================= */}
        {isBulkMode ? (
          <div className="space-y-4 my-3">
            <div className="flex items-center justify-between bg-[#2C2C2E]/60 p-3 rounded-[14px] border border-white/5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                >
                  {bulkRows.every((r) => r.selected) ? (
                    <CheckSquare className="w-4 h-4 text-[#30D158]" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Select All ({bulkRows.length})</span>
                </button>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400">Total Planned: </span>
                <span className="text-sm font-bold font-mono text-[#30D158]">
                  {formatZAR(totalBulkAllocation)}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {bulkRows.map((row, idx) => (
                <div
                  key={row.id || idx}
                  className={`p-3.5 rounded-[16px] border transition ${
                    row.selected
                      ? 'bg-[#2C2C2E] border-[#30D158]/40'
                      : 'bg-[#2C2C2E]/40 border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectRow(idx)}
                      className="mt-1 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {row.selected ? (
                        <CheckSquare className="w-4 h-4 text-[#30D158]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Name */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                          Category / Envelope Name
                        </label>
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => handleUpdateBulkRow(idx, { name: e.target.value })}
                          className="w-full bg-[#1C1C1E] border border-white/10 rounded-[10px] px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#30D158]"
                        />
                      </div>

                      {/* Allocated Amount */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                          Allocated Budget (ZAR)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={row.allocatedAmount || ''}
                          onChange={(e) =>
                            handleUpdateBulkRow(idx, {
                              allocatedAmount: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-[#1C1C1E] border border-white/10 rounded-[10px] px-2.5 py-1.5 text-xs font-mono font-bold text-[#30D158] focus:outline-none focus:ring-1 focus:ring-[#30D158]"
                        />
                      </div>

                      {/* Group */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                          Budget Group
                        </label>
                        <select
                          value={row.group}
                          onChange={(e) =>
                            handleUpdateBulkRow(idx, {
                              group: e.target.value as CategoryGroup,
                              tag: e.target.value,
                            })
                          }
                          className="w-full bg-[#1C1C1E] border border-white/10 rounded-[10px] px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#30D158]"
                        >
                          {CATEGORY_GROUPS.map((g) => (
                            <option key={g.id} value={g.id} className="bg-[#1C1C1E]">
                              {g.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Default Account */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                          Default Paying Account
                        </label>
                        <select
                          value={row.defaultAccountId || fallbackAccountId}
                          onChange={(e) => handleUpdateBulkRow(idx, { defaultAccountId: e.target.value })}
                          className="w-full bg-[#1C1C1E] border border-white/10 rounded-[10px] px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#30D158]"
                        >
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id} className="bg-[#1C1C1E]">
                              {acc.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Essential toggle */}
                      <div className="flex items-center gap-2 pt-4">
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.isEssential}
                            onChange={(e) =>
                              handleUpdateBulkRow(idx, { isEssential: e.target.checked })
                            }
                            className="w-4 h-4 rounded text-[#30D158] focus:ring-0 cursor-pointer"
                          />
                          <span>Essential (Four Walls)</span>
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteBulkRow(idx)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition cursor-pointer"
                      title="Remove row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bulk Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => {
                  setIsBulkMode(false);
                  setActiveTab('ai_voice');
                }}
                className="px-4 py-2.5 rounded-[14px] bg-[#2C2C2E] text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Back to Voice & Text
              </button>

              <button
                type="button"
                onClick={handleSaveBulkEntries}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-[14px] bg-[#30D158] hover:bg-[#34C759] text-black text-xs font-bold shadow-lg transition active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save All Selected ({bulkRows.filter((r) => r.selected).length}) Categories</span>
              </button>
            </div>
          </div>
        ) : activeTab === 'ai_voice' && !initialCategory ? (
          /* ========================================================================= */
          /* VIEW 2: AI VOICE & BULK TEXT INPUT                                        */
          /* ========================================================================= */
          <div className="space-y-4 my-3">
            {/* Voice Recording Control Card */}
            <div className={`p-4 rounded-[20px] border transition-all ${
              isListening
                ? 'bg-red-500/10 border-red-500/40 ring-2 ring-red-500/20'
                : 'bg-[#2C2C2E]/60 border-white/10'
            }`}>
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className={`w-3 h-3 rounded-full ${
                    isListening ? 'bg-red-500 animate-ping' : 'bg-[#30D158]'
                  }`} />
                  <span className="text-xs font-bold text-white">
                    {isListening
                      ? 'Listening to voice... Speak your budget entries now'
                      : 'Voice-to-Text & Bulk Budget Setup'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-[#30D158]/15 border border-[#30D158]/30 text-[#30D158] text-[10px] font-mono font-bold flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Gemini 3.1 Flash Lite
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleVoiceRecording}
                  disabled={!isVoiceSupported}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-[14px] text-xs font-bold transition active:scale-95 cursor-pointer ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                  } ${!isVoiceSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span>Stop Recording</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-[#30D158]" />
                      <span>Tap to Speak</span>
                    </>
                  )}
                </button>

                {isListening && interimTranscript && (
                  <span className="text-xs italic text-slate-300 truncate">
                    &ldquo;{interimTranscript}&rdquo;
                  </span>
                )}
              </div>
            </div>

            {/* Editable Paragraph / Transcript Area */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Budget Entries Description or Speech Transcript *
                </label>
                {inputText && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputText('');
                      resetTranscript();
                    }}
                    className="text-[11px] text-slate-400 hover:text-red-300 transition cursor-pointer"
                  >
                    Clear text
                  </button>
                )}
              </div>

              <textarea
                rows={4}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Example: Checkers Groceries R6,000, Sasol Fuel R2,500, Absa Home Bond R14,500, Eskom Electricity R1,800, Discovery Medical Aid R3,400, Netflix R199, and Kids School Fees R4,000..."
                className="w-full bg-[#2C2C2E] border border-white/10 text-white placeholder-slate-500 p-3.5 rounded-[16px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158] leading-relaxed"
              />
            </div>

            {/* Quick Example Prompt Chips */}
            <div>
              <p className="text-[11px] text-slate-400 mb-1.5">
                Quick examples (click to fill & parse):
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const text = 'Checkers Groceries R6,000, Sasol Petrol R2,500, Home Loan R14,000, Eskom Electricity R1,800, Discovery Medical R3,200';
                    setInputText(text);
                    handleParseWithAI(text);
                  }}
                  className="text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-2.5 py-1 rounded-[10px] transition cursor-pointer"
                >
                  Essential Household Envelopes (5 items)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = 'Netflix R199, Spotify R120, Virgin Active Gym R850, Weekend Dining Out R2,000';
                    setInputText(text);
                    handleParseWithAI(text);
                  }}
                  className="text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-2.5 py-1 rounded-[10px] transition cursor-pointer"
                >
                  Lifestyle & Subscriptions
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = 'Woolworths Food R4,500 planned allocation';
                    setInputText(text);
                    handleParseWithAI(text);
                  }}
                  className="text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-2.5 py-1 rounded-[10px] transition cursor-pointer"
                >
                  Single Category
                </button>
              </div>
            </div>

            {/* Parse Action Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isParsing || !inputText.trim()}
                onClick={() => handleParseWithAI()}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-[16px] text-xs sm:text-sm font-bold shadow-xl transition active:scale-95 cursor-pointer ${
                  isParsing || !inputText.trim()
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-[#30D158] hover:bg-[#34C759] text-black'
                }`}
              >
                {isParsing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{parseStatus || 'Extracting Categories with Gemini AI...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Parse with Gemini 3.1 Flash Lite</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* VIEW 3: SINGLE MANUAL FORM                                                */
          /* ========================================================================= */
          <form onSubmit={handleSubmitManual} className="mt-4 space-y-4">
            {/* Name / Transaction Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Transaction Type / Category Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Groceries (Checkers), Home Bond, Sasol Fuel, Netflix"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                This name will appear as the category dropdown option when logging expenses.
              </p>
            </div>

            {/* Category Tag Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Tag className="w-3.5 h-3.5 text-[#30D158]" />
                  <span>Classification Tag (for Summaries)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCustomTag(!isCustomTag)}
                  className="text-[11px] text-[#64D2FF] hover:underline font-normal cursor-pointer"
                >
                  {isCustomTag ? 'Choose standard tag' : '+ Custom tag'}
                </button>
              </div>

              {isCustomTag ? (
                <input
                  type="text"
                  placeholder="e.g. groceries, bond, petrol, wifi, tithe"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
                />
              ) : (
                <select
                  value={tag}
                  onChange={(e) => {
                    setTag(e.target.value);
                    const matchedGroup = CATEGORY_GROUPS.find((g) => g.id === e.target.value);
                    if (matchedGroup) {
                      setGroup(matchedGroup.id);
                    }
                  }}
                  className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
                >
                  {COMMON_CATEGORY_TAGS.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#1C1C1E]">
                      {t.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Category Group */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Budget Group *
              </label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value as CategoryGroup)}
                className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
              >
                {CATEGORY_GROUPS.map((g) => (
                  <option key={g.id} value={g.id} className="bg-[#1C1C1E]">
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Planned Allocation with Math Evaluator */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Planned Monthly Envelope Allocation (ZAR) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. 4500 or 2000 + 2500"
                  value={allocatedAmount}
                  onChange={(e) => setAllocatedAmount(e.target.value)}
                  required
                  className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#30D158]"
                />
                {isMathExpression(allocatedAmount) && (
                  <div className="absolute right-3 top-2.5 flex items-center gap-1.5 text-xs text-[#30D158] font-mono bg-black/40 px-2 py-0.5 rounded-[8px] border border-[#30D158]/30">
                    <Calculator className="w-3 h-3" />
                    <span>= {formatMathLivePreview(allocatedAmount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Default Paying Financial Account */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-[#30D158]" />
                  <span>Default Paying Account</span>
                </span>
                <span className="text-[10px] text-slate-400">Pre-fills during expense logging</span>
              </label>
              <select
                value={defaultAccountId}
                onChange={(e) => setDefaultAccountId(e.target.value)}
                className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
              >
                <option value="" className="bg-[#1C1C1E]">
                  -- Select Account or Leave Unset --
                </option>
                {accounts
                  .filter((acc) => !['home_loan', 'vehicle_loan', 'loan', 'store_card'].includes(acc.type))
                  .map((acc) => {
                    const isCreditCard = acc.type === 'credit_card';
                    const creditLimit = acc.creditLimit || 0;
                    const balOwed = acc.currentBalance ?? acc.balanceOwed ?? 0;
                    const availableCredit = Math.max(0, creditLimit - balOwed);
                    const bal = acc.currentBalance ?? acc.openingBalance ?? 0;

                    return (
                      <option key={acc.id} value={acc.id} className="bg-[#1C1C1E]">
                        {acc.name} ({acc.institution || acc.type}) {isCreditCard ? `— Avail Credit: ${formatZAR(availableCredit)}` : `— Bal: ${formatZAR(bal)}`}
                      </option>
                    );
                  })}
              </select>
            </div>

            {/* Essential Four Walls Checkbox */}
            <div className="flex items-center gap-3 p-3 bg-[#2C2C2E]/60 rounded-[14px] border border-white/5">
              <input
                type="checkbox"
                id="isEssential"
                checked={isEssential}
                onChange={(e) => setIsEssential(e.target.checked)}
                className="w-4 h-4 rounded text-[#30D158] focus:ring-0 cursor-pointer"
              />
              <label htmlFor="isEssential" className="text-xs text-slate-300 cursor-pointer select-none">
                <span className="font-semibold text-white">Essential Expense (Dave Ramsey Four Walls)</span>
                <p className="text-[11px] text-slate-400">
                  Food, Shelter, Utilities, Basic Transport, and Medical
                </p>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-[14px] bg-[#2C2C2E] text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-[14px] bg-[#30D158] hover:bg-[#34C759] text-black text-xs font-bold shadow-lg transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{initialCategory ? 'Save Changes' : 'Create Category'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
