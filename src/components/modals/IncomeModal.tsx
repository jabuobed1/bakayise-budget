import React, { useState, useEffect } from 'react';
import { Income, IncomeType, FinancialAccount } from '../../types';
import { INCOME_TYPES } from '../../utils/budgetConstants';
import { evaluateMathExpression, formatMathLivePreview, isMathExpression } from '../../utils/mathEvaluator';
import { formatZAR } from '../../utils/southAfricaHolidays';
import { FigmaIcon } from '../ui/FigmaIcon';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { scanIncomesWithAI, ScannedIncomeItem } from '../../services/aiBulkScanner';
import {
  X,
  Calculator,
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Landmark,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (income: Income) => void;
  onSaveBulk?: (incomes: Income[]) => void;
  currentPeriodId: string;
  defaultDate?: string;
  initialIncome?: Income | null;
  accounts?: FinancialAccount[];
  accountBalances?: Record<string, number>;
}

type TabType = 'ai_voice' | 'manual';

export const IncomeModal: React.FC<IncomeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveBulk,
  currentPeriodId,
  defaultDate,
  initialIncome,
  accounts = [],
  accountBalances,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('ai_voice');

  // Manual Form Fields
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<IncomeType>('primary_salary');
  const [sourceTag, setSourceTag] = useState('');
  const [accountId, setAccountId] = useState<string>('');
  const [receivedDate, setReceivedDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'expected' | 'received'>('expected');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // AI & Voice State
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState('');
  const [aiSuccessBadge, setAiSuccessBadge] = useState<string | null>(null);

  // Bulk Review State
  const [bulkRows, setBulkRows] = useState<ScannedIncomeItem[]>([]);
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

    if (initialIncome) {
      setActiveTab('manual');
      setTitle(initialIncome.title);
      setAmount(initialIncome.amount.toString());
      setType(initialIncome.type);
      setSourceTag(initialIncome.sourceTag || '');
      setAccountId(
        initialIncome.accountId ||
          (accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || '')
      );
      setReceivedDate(
        initialIncome.receivedDate || defaultDate || new Date().toISOString().split('T')[0]
      );
      setStatus(initialIncome.status);
      setNotes(initialIncome.notes || '');
    } else {
      setActiveTab('ai_voice');
      setTitle('');
      setAmount('');
      setType('primary_salary');
      setSourceTag('Main Job');
      const defaultAcc = accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || '';
      setAccountId(defaultAcc);
      setReceivedDate(defaultDate || new Date().toISOString().split('T')[0]);
      setStatus('expected');
      setNotes('');
    }
  }, [initialIncome, defaultDate, isOpen, accounts]);

  if (!isOpen) return null;

  const defaultAccountId = accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || '';

  const handleTypeChange = (selectedType: IncomeType) => {
    setType(selectedType);
    const match = INCOME_TYPES.find((t) => t.id === selectedType);
    if (match && !title) {
      setTitle(match.label);
      setSourceTag(match.defaultTag);
    }
  };

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
      setErrorMessage('Please record your voice or type your income streams first.');
      return;
    }

    if (isListening) {
      stopListening();
    }

    setErrorMessage('');
    setIsParsing(true);
    setParseStatus('Analyzing with Gemini 3.1 Flash Lite...');

    try {
      const response = await scanIncomesWithAI(query, (msg) => setParseStatus(msg));

      if (!response.incomes || response.incomes.length === 0) {
        setErrorMessage('No income entries could be identified. Please check the text and try again.');
        setIsParsing(false);
        return;
      }

      if (response.isBulk && response.incomes.length > 1) {
        // Multiple items -> switch to Bulk Review Table
        const rows: ScannedIncomeItem[] = response.incomes.map((item, idx) => ({
          ...item,
          id: `bulk_inc_${Date.now()}_${idx}`,
          accountId: item.accountId || defaultAccountId,
          selected: true,
        }));
        setBulkRows(rows);
        setIsBulkMode(true);
        setAiSuccessBadge(`Extracted ${rows.length} income streams using Gemini 3.1 Flash Lite AI.`);
      } else {
        // Single item -> populate manual form fields and switch to manual view
        const item = response.incomes[0];
        setTitle(item.title);
        setAmount(item.amount.toString());
        setType(item.type);
        setSourceTag(item.sourceTag || '');
        setAccountId(item.accountId || defaultAccountId);
        setReceivedDate(item.receivedDate || defaultDate || new Date().toISOString().split('T')[0]);
        setStatus(item.status || 'expected');
        setNotes(item.notes || '');

        setActiveTab('manual');
        setAiSuccessBadge('Single income extracted via Gemini 3.1 Flash Lite. Review and click Save.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to parse income stream. Please try again.');
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

  const handleUpdateBulkRow = (idx: number, updates: Partial<ScannedIncomeItem>) => {
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
      setErrorMessage('Please select at least one income entry to save.');
      return;
    }

    const entriesToSave: Income[] = selected.map((r, idx) => ({
      id: r.id || `inc_${Date.now()}_${idx}`,
      periodId: currentPeriodId,
      title: r.title.trim() || 'Income Stream',
      amount: r.amount > 0 ? r.amount : 0,
      type: r.type,
      sourceTag: r.sourceTag?.trim() || undefined,
      accountId: r.accountId || defaultAccountId,
      receivedDate: r.receivedDate || defaultDate || new Date().toISOString().split('T')[0],
      status: r.status,
      notes: r.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    if (onSaveBulk) {
      onSaveBulk(entriesToSave);
    } else {
      for (const inc of entriesToSave) {
        onSave(inc);
      }
    }

    onClose();
  };

  // Single Manual Form Submit
  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const numAmount = evaluateMathExpression(amount);
    if (numAmount === null || numAmount <= 0) {
      setErrorMessage('Please enter a valid income amount greater than R0.00.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Please enter an income title / description.');
      return;
    }
    if (!accountId || !accountId.trim()) {
      setErrorMessage('Please select the financial account this income deposits into.');
      return;
    }

    const incomeData: Income = {
      id: initialIncome?.id || `inc_${Date.now()}`,
      periodId: currentPeriodId,
      title: title.trim(),
      amount: numAmount,
      type,
      sourceTag: sourceTag.trim() || undefined,
      accountId: accountId.trim(),
      receivedDate,
      status,
      notes: notes.trim() || undefined,
      createdAt: initialIncome?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(incomeData);
    onClose();
  };

  const totalBulkAmount = bulkRows
    .filter((r) => r.selected)
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className={`bg-[#1C1C1E] border border-white/10 rounded-t-[28px] sm:rounded-[26px] ${isBulkMode ? 'max-w-3xl' : 'max-w-xl'} w-full p-5 sm:p-6 shadow-2xl my-0 sm:my-8 text-white max-h-[90vh] overflow-y-auto transition-all`}>
        
        {/* iOS Grabber */}
        <div className="w-10 h-1.2 bg-white/25 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#30D158]/15 border border-[#30D158]/30 text-[#30D158] flex items-center justify-center shrink-0">
              <FigmaIcon name="trending" size="md" strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {initialIncome
                  ? 'Edit Income Stream'
                  : isBulkMode
                  ? 'Review & Batch Save Incomes'
                  : 'Add Incomes (Voice & Bulk AI)'}
              </h3>
              <p className="text-xs text-slate-400">
                {isBulkMode
                  ? `Extracted ${bulkRows.length} income streams via Gemini 3.1 Flash Lite`
                  : 'Record speech, type notes, or log single & bulk salary streams'}
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
        {!initialIncome && !isBulkMode && (
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
                <span className="text-xs text-slate-400">Total Selected: </span>
                <span className="text-sm font-bold font-mono text-[#30D158]">
                  {formatZAR(totalBulkAmount)}
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
                      {/* Title */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                          Income Title
                        </label>
                        <input
                          type="text"
                          value={row.title}
                          onChange={(e) => handleUpdateBulkRow(idx, { title: e.target.value })}
                          className="w-full bg-[#1C1C1E] border border-white/10 rounded-[10px] px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#30D158]"
                        />
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                          Amount (ZAR)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={row.amount || ''}
                          onChange={(e) =>
                            handleUpdateBulkRow(idx, {
                              amount: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-[#1C1C1E] border border-white/10 rounded-[10px] px-2.5 py-1.5 text-xs font-mono font-bold text-[#30D158] focus:outline-none focus:ring-1 focus:ring-[#30D158]"
                        />
                      </div>

                      {/* Type */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                          Stream Type
                        </label>
                        <select
                          value={row.type}
                          onChange={(e) =>
                            handleUpdateBulkRow(idx, { type: e.target.value as IncomeType })
                          }
                          className="w-full bg-[#1C1C1E] border border-white/10 rounded-[10px] px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#30D158]"
                        >
                          {INCOME_TYPES.map((t) => (
                            <option key={t.id} value={t.id} className="bg-[#1C1C1E]">
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Destination Account */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                          Deposit Account
                        </label>
                        <select
                          value={row.accountId || defaultAccountId}
                          onChange={(e) => handleUpdateBulkRow(idx, { accountId: e.target.value })}
                          className="w-full bg-[#1C1C1E] border border-white/10 rounded-[10px] px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#30D158]"
                        >
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id} className="bg-[#1C1C1E]">
                              {acc.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                          Status
                        </label>
                        <select
                          value={row.status}
                          onChange={(e) =>
                            handleUpdateBulkRow(idx, {
                              status: e.target.value as 'expected' | 'received',
                            })
                          }
                          className="w-full bg-[#1C1C1E] border border-white/10 rounded-[10px] px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#30D158]"
                        >
                          <option value="expected" className="bg-[#1C1C1E]">Expected</option>
                          <option value="received" className="bg-[#1C1C1E]">Received (Direct Ledger)</option>
                        </select>
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
                <span>Save All Selected ({bulkRows.filter((r) => r.selected).length}) Incomes</span>
              </button>
            </div>
          </div>
        ) : activeTab === 'ai_voice' && !initialIncome ? (
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
                      ? 'Listening to voice... Speak now'
                      : 'Voice-to-Text & Bulk Entry'}
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
                  Income Streams Description or Speech Transcript *
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
                placeholder="Example: Primary salary R35,000 paid to Cheque, Freelance coding R8,500, Rental income Unit 4B R7,200, and wife salary R28,000..."
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
                    const text = 'Primary Salary R35,000 from Main Job, Side hustle R4,500 tutoring, and Rental income R6,500';
                    setInputText(text);
                    handleParseWithAI(text);
                  }}
                  className="text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-2.5 py-1 rounded-[10px] transition cursor-pointer"
                >
                  3 Incomes (Salary, Side Gig, Rental)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = 'Husband Salary R32,000 received, Wife Salary R29,500 received';
                    setInputText(text);
                    handleParseWithAI(text);
                  }}
                  className="text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-2.5 py-1 rounded-[10px] transition cursor-pointer"
                >
                  Dual Household Salaries (Received)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = 'Freelance UI/UX project R12,500 deposited into Savings account';
                    setInputText(text);
                    handleParseWithAI(text);
                  }}
                  className="text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-2.5 py-1 rounded-[10px] transition cursor-pointer"
                >
                  Single Freelance Entry
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
                    <span>{parseStatus || 'Extracting Incomes with Gemini AI...'}</span>
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
            {/* Income Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Income Category / Type *
              </label>
              <select
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as IncomeType)}
                className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
              >
                {INCOME_TYPES.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#1C1C1E]">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Income Stream Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Income Description / Source Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Primary Salary (Discovery), Freelance Coding, Rental Flat"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
              />
            </div>

            {/* Expected Amount with Math Evaluator */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Income Amount (ZAR) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. 35000 or 32000 + 3000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#30D158]"
                />
                {isMathExpression(amount) && (
                  <div className="absolute right-3 top-2.5 flex items-center gap-1.5 text-xs text-[#30D158] font-mono bg-black/40 px-2 py-0.5 rounded-[8px] border border-[#30D158]/30">
                    <Calculator className="w-3 h-3" />
                    <span>= {formatMathLivePreview(amount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Account Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-[#30D158]" />
                  <span>Destination Financial Account *</span>
                </span>
                <span className="text-[10px] text-slate-400">Direct Balance Ledger</span>
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
              >
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

            {/* Source Tag & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Source Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Job, Side Hustle, SARS"
                  value={sourceTag}
                  onChange={(e) => setSourceTag(e.target.value)}
                  className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Expected / Payday Date
                </label>
                <input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
                />
              </div>
            </div>

            {/* Status: Expected vs Received */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Receipt Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('expected')}
                  className={`py-2 rounded-[12px] text-xs font-bold border transition ${
                    status === 'expected'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-[#2C2C2E] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  Expected (Planned)
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('received')}
                  className={`py-2 rounded-[12px] text-xs font-bold border transition ${
                    status === 'received'
                      ? 'bg-[#30D158]/20 border-[#30D158]/50 text-[#30D158]'
                      : 'bg-[#2C2C2E] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  Received (Direct Balance Deposit)
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Notes / Memo (Optional)
              </label>
              <input
                type="text"
                placeholder="Optional notes or context"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2 rounded-[14px] text-xs focus:outline-none focus:ring-2 focus:ring-[#30D158]"
              />
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
                <span>{initialIncome ? 'Save Changes' : 'Add Income Stream'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
