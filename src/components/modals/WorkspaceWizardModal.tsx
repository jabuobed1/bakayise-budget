import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchAllMigrationData,
  createWorkspaceAndLinkData,
  linkDataToExistingWorkspace,
  BabyStepOption,
  BudgetPeriodOption,
  FinancialAccountOption,
} from '../../services/firestoreService';
import {
  X,
  Briefcase,
  Layers,
  Calendar,
  CreditCard,
  CheckCircle2,
  Lock,
  Globe,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  Search,
  Check,
  Clock,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { formatZAR } from '../../utils/southAfricaHolidays';

interface WorkspaceWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetWorkspaceId?: string; // If supplied, works in "Link Data to Existing Workspace" mode
  existingWorkspaceName?: string;
  onCompleted?: (workspaceId: string) => void;
}

export const WorkspaceWizardModal: React.FC<WorkspaceWizardModalProps> = ({
  isOpen,
  onClose,
  targetWorkspaceId,
  existingWorkspaceName,
  onCompleted,
}) => {
  const { user, member, switchWorkspace, refreshWorkspaces } = useAuth();

  // Multi-step state: 1: Name & Privacy, 2: Baby Steps, 3: Budget Periods, 4: Accounts, 5: Confirmation
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(targetWorkspaceId ? 2 : 1);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Workspace info
  const [wsName, setWsName] = useState<string>(
    existingWorkspaceName || (member ? `${member.displayName}'s Family Workspace` : 'Main Family Workspace')
  );
  const [wsDescription, setWsDescription] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);

  // Database all discovered records
  const [babyStepOptions, setBabyStepOptions] = useState<BabyStepOption[]>([]);
  const [periodOptions, setPeriodOptions] = useState<BudgetPeriodOption[]>([]);
  const [accountOptions, setAccountOptions] = useState<FinancialAccountOption[]>([]);

  // Search and filter filters
  const [periodSearch, setPeriodSearch] = useState<string>('');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'unassigned' | 'active'>('all');

  const [accountSearch, setAccountSearch] = useState<string>('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all');

  // Selections - Selected items
  const [selectedBabyStepId, setSelectedBabyStepId] = useState<string | null>(null);
  const [createNewBabyStep, setCreateNewBabyStep] = useState<boolean>(true);
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // Load data from Firestore when modal opens
  useEffect(() => {
    if (!isOpen) return;

    async function loadData() {
      setLoadingData(true);
      setErrorMessage(null);
      try {
        const result = await fetchAllMigrationData();
        setBabyStepOptions(result.babySteps);
        setPeriodOptions(result.budgetPeriods);
        setAccountOptions(result.accounts);

        // Pre-select unassigned / legacy baby step if exists, otherwise create new
        const legacyBaby = result.babySteps.find(
          (b) => b.id === 'main' || b.id === 'shared_family_workspace' || b.isUnassigned
        );
        if (legacyBaby) {
          setSelectedBabyStepId(legacyBaby.docId);
          setCreateNewBabyStep(false);
        } else {
          setCreateNewBabyStep(true);
        }

        // CRITICAL REQUIREMENT: Select ALL budget periods and ALL accounts by default
        // so that no pay cycles or bank accounts are missed!
        setSelectedPeriodIds(result.budgetPeriods.map((p) => p.id));
        setSelectedAccountIds(result.accounts.map((a) => a.id));

      } catch (err: any) {
        console.error('Error loading migration data:', err);
        setErrorMessage(err.message || 'Failed to fetch existing data from database.');
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [isOpen]);

  // Filtered Periods
  const filteredPeriods = useMemo(() => {
    return periodOptions.filter((p) => {
      const matchesSearch =
        !periodSearch.trim() ||
        p.name.toLowerCase().includes(periodSearch.toLowerCase()) ||
        p.id.toLowerCase().includes(periodSearch.toLowerCase()) ||
        (p.startDate && p.startDate.includes(periodSearch)) ||
        (p.endDate && p.endDate.includes(periodSearch));

      if (!matchesSearch) return false;

      if (periodFilter === 'unassigned') {
        return p.isUnassigned || p.householdId === 'shared_family_workspace' || !p.householdId;
      }
      if (periodFilter === 'active') {
        return p.status === 'active';
      }
      return true;
    });
  }, [periodOptions, periodSearch, periodFilter]);

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    return accountOptions.filter((a) => {
      const matchesSearch =
        !accountSearch.trim() ||
        a.name.toLowerCase().includes(accountSearch.toLowerCase()) ||
        a.id.toLowerCase().includes(accountSearch.toLowerCase()) ||
        (a.institution && a.institution.toLowerCase().includes(accountSearch.toLowerCase()));

      if (!matchesSearch) return false;

      if (accountTypeFilter !== 'all') {
        return a.type === accountTypeFilter;
      }
      return true;
    });
  }, [accountOptions, accountSearch, accountTypeFilter]);

  if (!isOpen) return null;

  const togglePeriodSelection = (id: string) => {
    setSelectedPeriodIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleAccountSelection = (id: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllPeriods = () => {
    if (selectedPeriodIds.length === periodOptions.length) {
      setSelectedPeriodIds([]);
    } else {
      setSelectedPeriodIds(periodOptions.map((p) => p.id));
    }
  };

  const handleSelectAllAccounts = () => {
    if (selectedAccountIds.length === accountOptions.length) {
      setSelectedAccountIds([]);
    } else {
      setSelectedAccountIds(accountOptions.map((a) => a.id));
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (targetWorkspaceId) {
        // Link to existing workspace
        await linkDataToExistingWorkspace({
          workspaceId: targetWorkspaceId,
          userName: user.displayName || member?.displayName || 'User',
          userEmail: user.email || '',
          selectedBabyStepDocId: createNewBabyStep ? null : selectedBabyStepId,
          selectedPeriodIds,
          selectedAccountIds,
          discoveredPeriods: periodOptions,
        });

        await refreshWorkspaces();
        await switchWorkspace(targetWorkspaceId);
        if (onCompleted) onCompleted(targetWorkspaceId);
      } else {
        // Create new workspace & link
        if (!wsName.trim()) {
          setErrorMessage('Please provide a name for your workspace.');
          setStep(1);
          setIsSubmitting(false);
          return;
        }

        const newWs = await createWorkspaceAndLinkData({
          workspace: {
            name: wsName.trim(),
            description: wsDescription.trim(),
            isPrivate,
            ownerId: user.uid,
            ownerEmail: user.email || '',
            ownerName: user.displayName || member?.displayName || 'User',
          },
          selectedBabyStepDocId: createNewBabyStep ? null : selectedBabyStepId,
          createNewBabyStep,
          selectedPeriodIds,
          selectedAccountIds,
          discoveredPeriods: periodOptions,
        });

        await refreshWorkspaces();
        await switchWorkspace(newWs.id);
        if (onCompleted) onCompleted(newWs.id);
      }

      onClose();
    } catch (err: any) {
      console.error('Error completing workspace wizard:', err);
      setErrorMessage(err.message || 'An error occurred while setting up the workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-[#18181B] border border-white/10 rounded-[32px] max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-b from-white/[0.06] to-transparent border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {targetWorkspaceId ? 'Assign Records to Workspace' : 'Workspace Setup & Data Population'}
                </h2>
                <p className="text-xs text-slate-400">
                  {targetWorkspaceId
                    ? `Assigning periods, accounts & baby steps to "${existingWorkspaceName || targetWorkspaceId}"`
                    : 'List and link all budget periods, accounts, and baby steps without missing any'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-between mt-6 px-2">
            {[
              { num: 1, title: 'Workspace', icon: Briefcase, skip: Boolean(targetWorkspaceId) },
              { num: 2, title: 'Baby Steps', icon: Layers },
              { num: 3, title: 'Periods', icon: Calendar },
              { num: 4, title: 'Accounts', icon: CreditCard },
              { num: 5, title: 'Confirm', icon: CheckCircle2 },
            ]
              .filter((s) => !s.skip)
              .map((s, idx, arr) => {
                const isActive = step === s.num;
                const isPassed = step > s.num;
                const Icon = s.icon;

                return (
                  <React.Fragment key={s.num}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                          isActive
                            ? 'bg-emerald-500 text-black ring-4 ring-emerald-500/20'
                            : isPassed
                            ? 'bg-emerald-500/30 text-emerald-300'
                            : 'bg-white/5 text-slate-500'
                        }`}
                      >
                        {isPassed ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                      </div>
                      <span
                        className={`text-xs font-semibold hidden sm:inline ${
                          isActive ? 'text-white' : isPassed ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {s.title}
                      </span>
                    </div>
                    {idx < arr.length - 1 && (
                      <div
                        className={`flex-1 h-[2px] mx-2 transition-all duration-300 ${
                          isPassed ? 'bg-emerald-500/50' : 'bg-white/10'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-300 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {loadingData ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-300 font-medium">Scanning Firestore for all budget data...</p>
              <p className="text-xs text-slate-500">Retrieving all baby steps, budget cycles, and accounts</p>
            </div>
          ) : (
            <>
              {/* STEP 1: Workspace Basics & Privacy */}
              {step === 1 && !targetWorkspaceId && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Workspace Name
                    </label>
                    <input
                      type="text"
                      value={wsName}
                      onChange={(e) => setWsName(e.target.value)}
                      placeholder="e.g. Main Family Household or Hubby Personal"
                      className="w-full bg-black/40 border border-white/15 focus:border-emerald-500 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={wsDescription}
                      onChange={(e) => setWsDescription(e.target.value)}
                      placeholder="e.g. Shared budget for household living expenses and savings"
                      className="w-full bg-black/40 border border-white/15 focus:border-emerald-500 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Access & Visibility
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setIsPrivate(false)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                          !isPrivate
                            ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20'
                            : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm font-bold text-white">Public / Family Shared</span>
                          </div>
                          {!isPrivate && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <p className="text-xs text-slate-400">
                          Accessible to both Hubby & Wifey. The other spouse can view and join this workspace anytime.
                        </p>
                      </div>

                      <div
                        onClick={() => setIsPrivate(true)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                          isPrivate
                            ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/20'
                            : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-bold text-white">Private / Personal</span>
                          </div>
                          {isPrivate && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                        </div>
                        <p className="text-xs text-slate-400">
                          Restricted exclusively to your login. Other family members will not see or access this budget.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Baby Steps Assignment (Lists all Baby Steps) */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Select Baby Steps Progress</h3>
                      <p className="text-xs text-slate-400">
                        Listing all baby step plans in Firestore. Select an existing plan or start clean.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                      {babyStepOptions.length} Plans Found
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Option: Create Clean Default */}
                    <div
                      onClick={() => {
                        setCreateNewBabyStep(true);
                        setSelectedBabyStepId(null);
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                        createNewBabyStep
                          ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20'
                          : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                            1
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">Start Fresh: Dave Ramsey Step 1</h4>
                            <p className="text-xs text-slate-400">
                              Starter Emergency Fund target (Target: R20,000)
                            </p>
                          </div>
                        </div>
                        {createNewBabyStep && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                      </div>
                    </div>

                    {/* All Baby Step Records found in Firestore */}
                    {babyStepOptions.map((bs) => {
                      const isSelected = !createNewBabyStep && selectedBabyStepId === bs.docId;
                      return (
                        <div
                          key={bs.docId}
                          onClick={() => {
                            setCreateNewBabyStep(false);
                            setSelectedBabyStepId(bs.docId);
                          }}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20'
                              : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                                {bs.currentStep || 1}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-bold text-white">
                                    Step {bs.currentStep || 1} Plan (ID: <code className="text-xs font-mono text-emerald-400">{bs.docId}</code>)
                                  </h4>
                                  {bs.isUnassigned ? (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                                      Unassigned / Legacy ({bs.householdId || 'no tag'})
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                                      Workspace: {bs.householdId}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  Step 1 Emergency Fund: {formatZAR(bs.step1CurrentBalance || 0)} / Target {formatZAR(bs.step1EmergencyFundTarget || 20000)}
                                </p>
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                          </div>

                          <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-2 pt-2 border-t border-white/5 flex-wrap">
                            <span>Step 3 Balance: {formatZAR(bs.step3CurrentBalance || 0)}</span>
                            {bs.step4MonthlyInvestment ? <span>Step 4: {formatZAR(bs.step4MonthlyInvestment)}/mo</span> : null}
                            {bs.updatedAt && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <Clock className="w-3 h-3" />
                                Updated: {new Date(bs.updatedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: Budget Periods (Lists ALL periods) */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        All Budget Periods ({periodOptions.length})
                      </h3>
                      <p className="text-xs text-slate-400">
                        {selectedPeriodIds.length} of {periodOptions.length} periods selected to populate this workspace.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSelectAllPeriods}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-xs font-bold text-emerald-300 transition cursor-pointer border border-emerald-500/30"
                      >
                        {selectedPeriodIds.length === periodOptions.length ? 'Deselect All' : 'Select All Periods'}
                      </button>
                    </div>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search periods by name, date or ID..."
                        value={periodSearch}
                        onChange={(e) => setPeriodSearch(e.target.value)}
                        className="w-full bg-black/40 border border-white/15 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                      {periodSearch && (
                        <button
                          onClick={() => setPeriodSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {(['all', 'unassigned', 'active'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setPeriodFilter(f)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold capitalize transition cursor-pointer ${
                            periodFilter === f
                              ? 'bg-white/20 text-white'
                              : 'bg-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {periodOptions.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-2">
                      <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
                      <p className="text-sm font-bold text-slate-300">No budget periods found in Firestore</p>
                      <p className="text-xs text-slate-500">A clean pay cycle will be automatically provisioned.</p>
                    </div>
                  ) : filteredPeriods.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center text-slate-400 text-xs">
                      No periods match your search filter.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {filteredPeriods.map((period) => {
                        const isSelected = selectedPeriodIds.includes(period.id);
                        return (
                          <div
                            key={period.id}
                            onClick={() => togglePeriodSelection(period.id)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20'
                                : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="mt-1">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="rounded border-white/20 text-emerald-500 focus:ring-emerald-500"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-bold text-white">{period.name}</h4>
                                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px] font-mono">
                                      {period.id}
                                    </span>
                                    {period.originSource === 'archived_backup' ? (
                                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                                        Backup: {period.sourceArchiveTitle || 'Archived Snapshot'}
                                      </span>
                                    ) : period.originSource === 'discovered_transactions' ? (
                                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                                        Discovered from Entries
                                      </span>
                                    ) : period.isUnassigned ? (
                                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                                        Legacy: {period.householdId || 'unassigned'}
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                                        Workspace: {period.householdId}
                                      </span>
                                    )}
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        period.status === 'active'
                                          ? 'bg-emerald-500/20 text-emerald-300'
                                          : 'bg-slate-500/20 text-slate-400'
                                      }`}
                                    >
                                      {period.status}
                                    </span>
                                  </div>

                                  <p className="text-xs text-slate-400 mt-1">
                                    Dates: <span className="text-slate-200 font-medium">{period.startDate}</span> to{' '}
                                    <span className="text-slate-200 font-medium">{period.endDate}</span>
                                  </p>

                                  <div className="flex items-center gap-4 text-xs text-slate-300 mt-2 font-medium flex-wrap">
                                    <span className="text-emerald-400 font-bold">
                                      Income: {formatZAR(period.totalPlannedIncome || 0)}
                                    </span>
                                    <span className="text-slate-400">
                                      Expenses / Planned: {formatZAR(period.totalPlannedExpenses || 0)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                                    <span className="bg-white/5 px-2 py-0.5 rounded-md text-emerald-300 font-medium">
                                      {period.associatedIncomesCount || 0} Incomes
                                    </span>
                                    <span className="bg-white/5 px-2 py-0.5 rounded-md text-blue-300 font-medium">
                                      {period.associatedCategoriesCount || 0} Categories
                                    </span>
                                    <span className="bg-white/5 px-2 py-0.5 rounded-md text-slate-300 font-medium">
                                      {period.associatedExpensesCount || 0} Expenses
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: Financial Accounts (Lists ALL accounts) */}
              {step === 4 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        All Financial Accounts ({accountOptions.length})
                      </h3>
                      <p className="text-xs text-slate-400">
                        {selectedAccountIds.length} of {accountOptions.length} accounts selected to populate this workspace.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSelectAllAccounts}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-xs font-bold text-emerald-300 transition cursor-pointer border border-emerald-500/30"
                      >
                        {selectedAccountIds.length === accountOptions.length ? 'Deselect All' : 'Select All Accounts'}
                      </button>
                    </div>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search accounts by name, bank, or type..."
                        value={accountSearch}
                        onChange={(e) => setAccountSearch(e.target.value)}
                        className="w-full bg-black/40 border border-white/15 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                      {accountSearch && (
                        <button
                          onClick={() => setAccountSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 overflow-x-auto">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'cheque', label: 'Cheque' },
                        { id: 'savings', label: 'Savings' },
                        { id: 'credit_card', label: 'Credit Card' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setAccountTypeFilter(f.id)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer shrink-0 ${
                            accountTypeFilter === f.id
                              ? 'bg-white/20 text-white'
                              : 'bg-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {accountOptions.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-2">
                      <CreditCard className="w-8 h-8 text-slate-500 mx-auto" />
                      <p className="text-sm font-bold text-slate-300">No existing financial accounts found</p>
                      <p className="text-xs text-slate-500">Clean starter banking accounts will be provisioned.</p>
                    </div>
                  ) : filteredAccounts.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center text-slate-400 text-xs">
                      No accounts match your search filter.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {filteredAccounts.map((acc) => {
                        const isSelected = selectedAccountIds.includes(acc.id);
                        return (
                          <div
                            key={acc.id}
                            onClick={() => toggleAccountSelection(acc.id)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20'
                                : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="mt-1">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="rounded border-white/20 text-emerald-500 focus:ring-emerald-500"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-bold text-white">{acc.name}</h4>
                                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px] font-mono">
                                      {acc.id}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold uppercase">
                                      {acc.type.replace('_', ' ')}
                                    </span>
                                    {acc.isUnassigned ? (
                                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                                        Legacy: {acc.householdId || 'unassigned'}
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                                        Workspace: {acc.householdId}
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-xs text-slate-400 mt-1">
                                    {acc.institution ? `Institution: ${acc.institution}` : 'Custom Account'}
                                    {acc.accountNumberMask ? ` • ${acc.accountNumberMask}` : ''}
                                  </p>

                                  <div className="flex items-center gap-4 text-xs font-bold mt-2 flex-wrap">
                                    <span className="text-white">
                                      Opening Balance: {formatZAR(acc.openingBalance || 0)}
                                    </span>
                                    {acc.balanceOwed !== undefined && acc.balanceOwed > 0 && (
                                      <span className="text-rose-400">
                                        Owed: {formatZAR(acc.balanceOwed)}
                                      </span>
                                    )}
                                    {acc.creditLimit !== undefined && acc.creditLimit > 0 && (
                                      <span className="text-blue-400">
                                        Limit: {formatZAR(acc.creditLimit)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: Confirmation & Summary */}
              {step === 5 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-bold">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">
                          {targetWorkspaceId ? 'Ready to Populate Workspace' : `Ready to Create "${wsName}"`}
                        </h3>
                        <p className="text-xs text-slate-300">
                          All selected periods, child transactions, accounts, and baby steps will be assigned and saved.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Access Mode</p>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        {isPrivate ? (
                          <>
                            <Lock className="w-4 h-4 text-amber-400" /> Private (Personal)
                          </>
                        ) : (
                          <>
                            <Globe className="w-4 h-4 text-emerald-400" /> Public (Family Shared)
                          </>
                        )}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Baby Steps Track</p>
                      <p className="text-sm font-bold text-white">
                        {createNewBabyStep
                          ? 'Fresh Step 1 (R20,000 Target)'
                          : `Existing Plan (${selectedBabyStepId})`}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Budget Periods</p>
                      <p className="text-sm font-bold text-emerald-400">
                        {selectedPeriodIds.length} of {periodOptions.length} Periods Linked
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Financial Accounts</p>
                      <p className="text-sm font-bold text-emerald-400">
                        {selectedAccountIds.length} of {accountOptions.length} Accounts Linked
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Navigation Controls */}
        <div className="p-6 bg-black/40 border-t border-white/10 flex items-center justify-between shrink-0">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev + 1) as any)}
                disabled={loadingData}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || loadingData}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Populating Workspace...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {targetWorkspaceId ? 'Save & Assign All Records' : 'Complete Setup & Open Workspace'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
