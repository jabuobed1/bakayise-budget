/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { testConnection } from './firebase/config';
import {
  subscribeToBudgetPeriods,
  subscribeToIncomes,
  subscribeToCategories,
  subscribeToExpenses,
  subscribeToAllWorkspaceIncomes,
  subscribeToAllWorkspaceCategories,
  subscribeToAllWorkspaceExpenses,
  subscribeToDebts,
  subscribeToBabyStepsState,
  subscribeToEmergencyFundLogs,
  subscribeToAccounts,
  saveBudgetPeriod,
  deleteBudgetPeriod,
  saveIncome,
  saveIncomesBulk,
  updateIncome,
  deleteIncome,
  saveCategory,
  saveCategoriesBulk,
  updateCategory,
  deleteCategory,
  saveExpense,
  batchSaveExpenses,
  deleteExpense,
  saveDebt,
  updateDebt,
  deleteDebt,
  saveBabyStepsState,
  addEmergencyFundLog,
  saveAccount,
  deleteAccount,
  batchUpdateCategoryOrders,
  batchUpdateIncomeOrders,
  checkAndSeedInitialData,
  seedFamilyData,
  resetWorksheetToScratch,
  subscribeToArchivedWorksheets,
  restoreArchivedWorksheet,
  deleteArchivedWorksheet,
  syncUserProfile,
  executeTransfer,
} from './services/firestoreService';
import {
  BudgetPeriod,
  Income,
  BudgetCategory,
  Expense,
  Debt,
  BabyStepsState,
  EmergencyFundLog,
  FinancialAccount,
  CategoryGroup,
  ArchivedWorksheet,
} from './types';
import { formatZAR, formatZARCompact, formatDateNice } from './utils/southAfricaHolidays';

import { Navbar, ActiveTab } from './components/Navbar';
import { NavMenuOverlay } from './components/NavMenuOverlay';
import { IPhoneActionSheet } from './components/ui/IPhoneActionSheet';
import { IPhoneMockupFrame } from './components/ui/IPhoneMockupFrame';

import { PayPeriodHeader } from './components/PayPeriodHeader';
import { ExcelBudgetView } from './components/ExcelBudgetView';
import { AccountsManager } from './components/AccountsManager';
import { TagAnalysisModal } from './components/TagAnalysisModal';
import { ExpenseTracker } from './components/ExpenseTracker';
import { TransactionsView } from './components/TransactionsView';
import { BabyStepsTracker } from './components/BabyStepsTracker';
import { DebtSnowballManager } from './components/DebtSnowballManager';
import { PaydayCalendarModal } from './components/PaydayCalendarModal';
import { CATEGORY_GROUPS } from './utils/budgetConstants';

import { ExpenseModal } from './components/modals/ExpenseModal';
import { IncomeModal } from './components/modals/IncomeModal';
import { CategoryModal } from './components/modals/CategoryModal';
import { AccountModal } from './components/modals/AccountModal';
import { PeriodModal } from './components/modals/PeriodModal';
import { EditPeriodModal } from './components/modals/EditPeriodModal';
import { AccountTransferModal } from './components/modals/AccountTransferModal';
import { WorkspaceSelectorModal } from './components/modals/WorkspaceSelectorModal';
import { AtmCashDepositModal } from './components/modals/AtmCashDepositModal';
import { EmergencyFundModal } from './components/modals/EmergencyFundModal';
import { DebtModal } from './components/modals/DebtModal';
import { ResetWorksheetModal } from './components/modals/ResetWorksheetModal';
import { ArchivedWorksheetsModal } from './components/modals/ArchivedWorksheetsModal';
import { WorkspaceGatekeeperModal } from './components/modals/WorkspaceGatekeeperModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GoogleAuthScreen } from './components/auth/GoogleAuthScreen';

import {
  Loader2,
  Sparkles,
  Download,
  Printer,
  RefreshCw,
  Calendar,
  Plus,
} from 'lucide-react';

function BakayiseAppContent() {
  const { user, member, isAuthorized, loading: authLoading, activeWorkspaceId, workspaces } = useAuth();

  // Auto-open workspace selector if none active
  useEffect(() => {
    if (isAuthorized && !activeWorkspaceId && !authLoading && workspaces.length > 0) {
      setIsWorkspaceModalOpen(true);
    }
  }, [isAuthorized, activeWorkspaceId, authLoading, workspaces.length]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('budget');
  const [loading, setLoading] = useState<boolean>(true);
  const [isIPhoneFrameMode, setIsIPhoneFrameMode] = useState<boolean>(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState<boolean>(false);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState<boolean>(false);

  const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allWorkspaceIncomes, setAllWorkspaceIncomes] = useState<Income[]>([]);
  const [allWorkspaceCategories, setAllWorkspaceCategories] = useState<BudgetCategory[]>([]);
  const [allWorkspaceExpenses, setAllWorkspaceExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [babyState, setBabyState] = useState<BabyStepsState | null>(null);
  const [emergencyLogs, setEmergencyLogs] = useState<EmergencyFundLog[]>([]);
  const [archivedWorksheets, setArchivedWorksheets] = useState<ArchivedWorksheet[]>([]);

  // Modal visibility states
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [quickCategoryId, setQuickCategoryId] = useState<string | undefined>(undefined);

  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);

  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [isEditPeriodModalOpen, setIsEditPeriodModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [transferSourceAccountId, setTransferSourceAccountId] = useState<string | undefined>(undefined);

  const [isAtmDepositModalOpen, setIsAtmDepositModalOpen] = useState(false);
  const [depositDestinationAccountId, setDepositDestinationAccountId] = useState<string | undefined>(undefined);

  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [emergencyModalStep, setEmergencyModalStep] = useState<1 | 3>(1);

  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  const [isTagAnalysisModalOpen, setIsTagAnalysisModalOpen] = useState(false);
  const [isResetWorksheetModalOpen, setIsResetWorksheetModalOpen] = useState(false);
  const [isArchivedWorksheetsModalOpen, setIsArchivedWorksheetsModalOpen] = useState(false);

  // Initial connection check and starter seed
  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }
    let isMounted = true;
    const fallbackTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 4000);

    async function init() {
      try {
        await testConnection();
        await syncUserProfile();
        await checkAndSeedInitialData();
      } catch (err) {
        console.warn('Initial seed error or offline fallback:', err);
      } finally {
        if (isMounted) {
          clearTimeout(fallbackTimer);
          setLoading(false);
        }
      }
    }
    init();

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
    };
  }, [isAuthorized]);

  // Subscribe to Periods, Debts, Accounts, BabySteps, EmergencyLogs, ArchivedWorksheets
  useEffect(() => {
    if (!isAuthorized || !activeWorkspaceId) {
      setPeriods([]);
      setDebts([]);
      setAccounts([]);
      setBabyState(null);
      setEmergencyLogs([]);
      setSelectedPeriodId(null);
      return;
    }

    const unsubPeriods = subscribeToBudgetPeriods(activeWorkspaceId, (loadedPeriods) => {
      setPeriods(loadedPeriods);
      if (loadedPeriods.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const currentByDate = loadedPeriods.find(
          (p) => p.startDate <= todayStr && todayStr <= p.endDate
        );

        setSelectedPeriodId((prevSelected) => {
          if (prevSelected && loadedPeriods.some((p) => p.id === prevSelected)) {
            return prevSelected;
          }
          const defaultPeriod =
            currentByDate ||
            loadedPeriods.find((p) => p.status === 'active') ||
            loadedPeriods[0];
          return defaultPeriod ? defaultPeriod.id : null;
        });
      } else {
        setSelectedPeriodId(null);
      }
    });

    const unsubDebts = subscribeToDebts(activeWorkspaceId, (loadedDebts) => {
      setDebts(loadedDebts);
    });

    const unsubAccounts = subscribeToAccounts(activeWorkspaceId, (loadedAccounts) => {
      setAccounts(loadedAccounts);
    });

    const unsubBaby = subscribeToBabyStepsState(activeWorkspaceId, (loadedState) => {
      setBabyState(loadedState);
    });

    const unsubLogs = subscribeToEmergencyFundLogs(activeWorkspaceId, (loadedLogs) => {
      setEmergencyLogs(loadedLogs);
    });

    const unsubArchives = subscribeToArchivedWorksheets(activeWorkspaceId, (loadedArchives) => {
      setArchivedWorksheets(loadedArchives);
    });

    const unsubAllIncomes = subscribeToAllWorkspaceIncomes(activeWorkspaceId, (loaded) => {
      setAllWorkspaceIncomes(loaded);
    });

    const unsubAllCategories = subscribeToAllWorkspaceCategories(activeWorkspaceId, (loaded) => {
      setAllWorkspaceCategories(loaded);
    });

    const unsubAllExpenses = subscribeToAllWorkspaceExpenses(activeWorkspaceId, (loaded) => {
      setAllWorkspaceExpenses(loaded);
    });

    return () => {
      unsubPeriods();
      unsubDebts();
      unsubAccounts();
      unsubBaby();
      unsubLogs();
      unsubArchives();
      unsubAllIncomes();
      unsubAllCategories();
      unsubAllExpenses();
    };
  }, [selectedPeriodId, isAuthorized, activeWorkspaceId]);

  // Current active period object
  const currentPeriod = useMemo(() => {
    if (!periods.length) return null;
    if (selectedPeriodId) {
      const match = periods.find((p) => p.id === selectedPeriodId);
      if (match) return match;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const currentByDate = periods.find(
      (p) => p.startDate <= todayStr && todayStr <= p.endDate
    );
    return currentByDate || periods.find((p) => p.status === 'active') || periods[0];
  }, [periods, selectedPeriodId]);

  // Subscribe to Incomes, Categories, and Expenses for the selected period
  useEffect(() => {
    if (!isAuthorized || !currentPeriod || !activeWorkspaceId) return;

    const unsubIncomes = subscribeToIncomes(currentPeriod.id, activeWorkspaceId, (loadedIncomes) => {
      setIncomes(loadedIncomes);
    });

    const unsubCategories = subscribeToCategories(currentPeriod.id, activeWorkspaceId, (loadedCats) => {
      setCategories(loadedCats);
    });

    const unsubExpenses = subscribeToExpenses(currentPeriod.id, activeWorkspaceId, (loadedExpenses) => {
      setExpenses(loadedExpenses);
    });

    return () => {
      unsubIncomes();
      unsubCategories();
      unsubExpenses();
    };
  }, [currentPeriod?.id, isAuthorized, activeWorkspaceId]);

  // Total income calculation
  const totalPlannedIncome = useMemo(() => {
    return incomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
  }, [incomes]);

  // Total allocated categories
  const totalAllocated = useMemo(() => {
    return categories.reduce((sum, cat) => sum + (cat.allocatedAmount || 0), 0);
  }, [categories]);

  // Total expenses spent
  const totalSpent = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  }, [expenses]);

  const totalDebtBalance = useMemo(() => {
    return debts
      .filter((d) => d.status !== 'paid_off')
      .reduce((sum, d) => sum + d.balance, 0);
  }, [debts]);

  // Direct Balance Ledger: Account balances computed dynamically from baseline openingBalance + received incomes - actual expenses
  const accountLiveBalances = useMemo(() => {
    const map: Record<string, number> = {};
    const defaultAccId = accounts.find((a) => a.isDefault)?.id || accounts[0]?.id;

    for (const acc of accounts) {
      const baseOwed =
        acc.type === 'credit_card' ||
        acc.type === 'loan' ||
        acc.type === 'vehicle_loan' ||
        acc.type === 'home_loan'
          ? (acc.balanceOwed !== undefined ? acc.balanceOwed : acc.openingBalance || 0)
          : acc.openingBalance || 0;

      const linkedIncomes = allWorkspaceIncomes.filter(
        (i) => (i.accountId || defaultAccId) === acc.id && i.status === 'received'
      );
      const linkedExpenses = allWorkspaceExpenses.filter(
        (e) => (e.accountId || defaultAccId) === acc.id
      );
      const inSum = linkedIncomes.reduce((s, i) => s + (i.amount || 0), 0);
      const outSum = linkedExpenses.reduce((s, e) => s + (e.amount || 0), 0);

      if (
        acc.type === 'credit_card' ||
        acc.type === 'loan' ||
        acc.type === 'vehicle_loan' ||
        acc.type === 'home_loan'
      ) {
        map[acc.id] = Math.max(0, baseOwed + outSum - inSum);
      } else {
        map[acc.id] = (acc.openingBalance || 0) + inSum - outSum;
      }
    }
    return map;
  }, [accounts, allWorkspaceIncomes, allWorkspaceExpenses]);

  const totalBankBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => {
      // Only count positive asset accounts for "total bank balance"
      if (
        acc.type === 'cheque' ||
        acc.type === 'savings' ||
        acc.type === 'cash' ||
        acc.type === 'tax_free' ||
        acc.type === 'investment' ||
        acc.type === 'other'
      ) {
        return sum + (accountLiveBalances[acc.id] ?? (acc.openingBalance || 0));
      }
      return sum;
    }, 0);
  }, [accounts, accountLiveBalances]);

  const unassigned = totalPlannedIncome - totalAllocated;

  // Handle save new period with optional category cloning and automatic Debt Snowball / Installments population
  const handleSaveNewPeriod = async (
    newPeriod: BudgetPeriod,
    copyFromCategories: boolean
  ) => {
    if (!activeWorkspaceId) {
      throw new Error('Cannot create period: No workspace selected.');
    }
    const periodToSave: BudgetPeriod = {
      ...newPeriod,
      householdId: activeWorkspaceId,
      workspaceId: activeWorkspaceId,
    };
    await saveBudgetPeriod(periodToSave);
    setSelectedPeriodId(periodToSave.id);

    const defaultAccId = accounts.find((a) => a.isDefault)?.id || accounts[0]?.id;
    const createdCategories: BudgetCategory[] = [];

    // 1. Copy existing categories if requested
    if (copyFromCategories && categories.length > 0) {
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        const clonedCat: BudgetCategory = {
          ...cat,
          id: `cat_${periodToSave.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          periodId: periodToSave.id,
          householdId: activeWorkspaceId,
          workspaceId: activeWorkspaceId,
          order: i,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        createdCategories.push(clonedCat);
        await saveCategory(clonedCat);
      }
    }

    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 2. Automatically populate Debt Snowball minimum payments for all active debts (if not already present)
    const activeDebts = debts.filter(
      (d) => d.status !== 'paid_off' && (d.balance > 0 || (d.minimumPayment && d.minimumPayment > 0))
    );

    for (const debt of activeDebts) {
      const debtNorm = normalize(debt.name);
      const lenderNorm = debt.lender ? normalize(debt.lender) : '';

      const alreadyExists = createdCategories.some((cat) => {
        const catNorm = normalize(cat.name);
        return (
          catNorm === debtNorm ||
          (debtNorm.length > 3 && catNorm.includes(debtNorm)) ||
          (catNorm.length > 3 && debtNorm.includes(catNorm)) ||
          (lenderNorm.length > 3 && catNorm.includes(lenderNorm) && (cat.tag === 'debt' || cat.group === 'debt_snowball')) ||
          (cat.defaultAccountId && debt.linkedAccountId && cat.defaultAccountId === debt.linkedAccountId && (cat.tag === 'debt' || cat.group === 'debt_snowball'))
        );
      });

      if (!alreadyExists) {
        const isCar =
          debt.category === 'car_finance' ||
          /car|vehicle|auto|polo|toyota|ford|wesbank|mfc|bmw|audi|hyundai|kia/i.test(debt.name);
        const isBond = /bond|mortgage|home loan|property/i.test(debt.name);

        const newDebtCat: BudgetCategory = {
          id: `cat_${periodToSave.id}_debt_${debt.id}_${Date.now()}`,
          periodId: periodToSave.id,
          householdId: activeWorkspaceId,
          workspaceId: activeWorkspaceId,
          name: debt.name,
          group: isCar ? 'transport' : isBond ? 'housing' : 'debt_snowball',
          tag: isCar ? 'car_payment' : isBond ? 'bond' : 'debt',
          allocatedAmount: Math.max(0, debt.minimumPayment || 0),
          defaultAccountId: debt.linkedAccountId || defaultAccId,
          color: isCar ? '#FF9F0A' : isBond ? '#0A84FF' : '#FF453A',
          icon: isCar ? 'Car' : isBond ? 'Home' : 'CreditCard',
          order: createdCategories.length,
          isEssential: true,
          isRecurring: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        createdCategories.push(newDebtCat);
        await saveCategory(newDebtCat);
      }
    }

    // 3. Automatically populate manual installments for liabilities / vehicle loans / bond accounts (if not already present)
    const installmentAccounts = accounts.filter(
      (a) =>
        a.type === 'vehicle_loan' ||
        a.type === 'home_loan' ||
        a.type === 'loan' ||
        (a.manualMonthlyInstallment && a.manualMonthlyInstallment > 0) ||
        (a.monthlyInstallment && a.monthlyInstallment > 0)
    );

    for (const acc of installmentAccounts) {
      const accNorm = normalize(acc.name);
      const isAlreadyHandledByDebt = activeDebts.some(
        (d) => d.linkedAccountId === acc.id || normalize(d.name) === accNorm
      );

      const alreadyExists =
        isAlreadyHandledByDebt ||
        createdCategories.some((cat) => {
          const catNorm = normalize(cat.name);
          return (
            catNorm === accNorm ||
            (accNorm.length > 3 && catNorm.includes(accNorm)) ||
            (catNorm.length > 3 && accNorm.includes(catNorm)) ||
            cat.defaultAccountId === acc.id
          );
        });

      if (!alreadyExists) {
        const isCar = acc.type === 'vehicle_loan' || /car|vehicle|auto|wesbank|mfc|toyota|polo/i.test(acc.name);
        const isBond = acc.type === 'home_loan' || /bond|mortgage|home loan/i.test(acc.name);
        const installmentAmt =
          acc.manualMonthlyInstallment ||
          acc.monthlyInstallment ||
          acc.minimumPaymentAmount ||
          0;

        const newAccCat: BudgetCategory = {
          id: `cat_${periodToSave.id}_acc_${acc.id}_${Date.now()}`,
          periodId: periodToSave.id,
          householdId: activeWorkspaceId,
          workspaceId: activeWorkspaceId,
          name: acc.name,
          group: isCar ? 'transport' : isBond ? 'housing' : 'debt_snowball',
          tag: isCar ? 'car_payment' : isBond ? 'bond' : 'debt',
          allocatedAmount: Math.max(0, installmentAmt),
          defaultAccountId: acc.id,
          color: isCar ? '#FF9F0A' : isBond ? '#0A84FF' : '#FF453A',
          icon: isCar ? 'Car' : isBond ? 'Home' : 'CreditCard',
          order: createdCategories.length,
          isEssential: true,
          isRecurring: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        createdCategories.push(newAccCat);
        await saveCategory(newAccCat);
      }
    }
  };

  // Quick inline update category fields (amount, name, tag, group, defaultAccountId, etc.)
  const handleUpdateCategory = async (catId: string, updates: Partial<BudgetCategory>) => {
    await updateCategory(catId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  };

  // Quick inline update category allocation
  const handleUpdateCategoryAllocation = async (catId: string, amount: number) => {
    await handleUpdateCategory(catId, { allocatedAmount: amount });
  };

  // Quick inline update income fields (amount, title, tag, accountId, status, etc.)
  const handleUpdateIncome = async (incId: string, updates: Partial<Income>) => {
    const inc = incomes.find((i) => i.id === incId) || allWorkspaceIncomes.find((i) => i.id === incId);
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultAccId = accounts.find((a) => a.isDefault)?.id || accounts[0]?.id;

    let receivedDate = updates.receivedDate;
    if (updates.status === 'received' && !receivedDate) {
      receivedDate = inc?.receivedDate || todayStr;
    } else if (updates.status === 'expected') {
      receivedDate = undefined;
    }

    if (inc) {
      const fullIncome: Income = {
        ...inc,
        ...updates,
        householdId: activeWorkspaceId || inc.householdId || inc.workspaceId || undefined,
        workspaceId: activeWorkspaceId || inc.workspaceId || inc.householdId || undefined,
        accountId: updates.accountId || inc.accountId || defaultAccId,
        receivedDate,
        updatedAt: new Date().toISOString(),
      };
      await saveIncome(fullIncome);
    } else {
      await updateIncome(incId, {
        ...updates,
        householdId: activeWorkspaceId || undefined,
        workspaceId: activeWorkspaceId || undefined,
        accountId: updates.accountId || defaultAccId,
        receivedDate,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Toggle Income Status between 'expected' and 'received' with real-time account balancing
  const handleToggleIncomeStatus = async (inc: Income) => {
    const startTime = performance.now();
    const defaultAccId = accounts.find((a) => a.isDefault)?.id || accounts[0]?.id;
    const targetAccountId = inc.accountId || defaultAccId;
    const newStatus: 'expected' | 'received' = inc.status === 'received' ? 'expected' : 'received';
    const todayStr = new Date().toISOString().split('T')[0];

    console.log('[DEBUG LOG][App.tsx] handleToggleIncomeStatus START:', {
      incomeId: inc.id,
      incomeTitle: inc.title,
      previousStatus: inc.status,
      newStatus,
      targetAccountId,
      defaultAccId,
      activeWorkspaceId,
      currentPeriodId: currentPeriod?.id,
      availableAccountsCount: accounts.length,
      availableAccounts: accounts.map((a) => ({ id: a.id, name: a.name, currentBalance: a.currentBalance, openingBalance: a.openingBalance })),
      timestamp: new Date().toISOString(),
    });

    const updatedIncome: Income = {
      ...inc,
      householdId: activeWorkspaceId || inc.householdId || inc.workspaceId || undefined,
      workspaceId: activeWorkspaceId || inc.workspaceId || inc.householdId || undefined,
      accountId: targetAccountId,
      status: newStatus,
      receivedDate: newStatus === 'received' ? (inc.receivedDate || todayStr) : undefined,
      updatedAt: new Date().toISOString(),
    };

    console.log('[DEBUG LOG][App.tsx] Prepared updatedIncome payload for saveIncome:', updatedIncome);

    try {
      await saveIncome(updatedIncome);
      const elapsed = (performance.now() - startTime).toFixed(2);
      console.log(`[DEBUG LOG][App.tsx] handleToggleIncomeStatus COMPLETED successfully in ${elapsed}ms for income:`, inc.id);
    } catch (err) {
      const elapsed = (performance.now() - startTime).toFixed(2);
      console.error(`[DEBUG LOG][App.tsx] handleToggleIncomeStatus FAILED in ${elapsed}ms:`, err);
    }
  };

  // Quick insert row from spreadsheet bottom
  const handleQuickAddCategoryRow = async (
    name: string,
    tag: string,
    group: CategoryGroup,
    amount: number,
    isEssential: boolean,
    accountId?: string
  ) => {
    if (!currentPeriod) return;
    const groupMeta = CATEGORY_GROUPS.find((g) => g.id === group);
    const newCat: BudgetCategory = {
      id: `cat_${currentPeriod.id}_${Date.now()}`,
      periodId: currentPeriod.id,
      name,
      group,
      tag,
      allocatedAmount: amount,
      defaultAccountId: accountId || undefined,
      color: groupMeta?.color || '#3b82f6',
      icon: 'ShoppingCart',
      order: categories.length,
      isEssential,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveCategory(newCat);
  };

  // Insert Category between existing rows at target index
  const handleInsertCategoryAt = async (targetIndex: number, partialCat: Partial<BudgetCategory>) => {
    if (!currentPeriod) return;
    const group = partialCat.group || 'food';
    const groupMeta = CATEGORY_GROUPS.find((g) => g.id === group);
    const newCat: BudgetCategory = {
      id: `cat_${currentPeriod.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      periodId: currentPeriod.id,
      name: partialCat.name || 'New Category',
      group,
      tag: partialCat.tag || 'food',
      allocatedAmount: partialCat.allocatedAmount || 0,
      defaultAccountId: partialCat.defaultAccountId,
      color: groupMeta?.color || '#3b82f6',
      icon: 'ShoppingCart',
      order: targetIndex,
      isEssential: partialCat.isEssential ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newCategories = [...categories];
    newCategories.splice(targetIndex, 0, newCat);
    
    // Save new category
    await saveCategory(newCat);

    // Batch update orders for shifted items
    const orderUpdates = newCategories.map((c, idx) => ({ id: c.id, order: idx }));
    await batchUpdateCategoryOrders(orderUpdates);
  };

  // Duplicate Category
  const handleDuplicateCategory = async (cat: BudgetCategory, targetIndex: number) => {
    if (!currentPeriod) return;
    const duplicatedCat: BudgetCategory = {
      ...cat,
      id: `cat_${currentPeriod.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${cat.name} (Copy)`,
      order: targetIndex,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newCategories = [...categories];
    newCategories.splice(targetIndex, 0, duplicatedCat);

    await saveCategory(duplicatedCat);

    const orderUpdates = newCategories.map((c, idx) => ({ id: c.id, order: idx }));
    await batchUpdateCategoryOrders(orderUpdates);
  };

  // Reorder Categories list
  const handleReorderCategories = async (reordered: BudgetCategory[]) => {
    setCategories(reordered);
    const orderUpdates = reordered.map((c, idx) => ({ id: c.id, order: idx }));
    await batchUpdateCategoryOrders(orderUpdates);
  };

  // Insert Income between existing rows at target index
  const handleInsertIncomeAt = async (targetIndex: number, partialInc: Partial<Income>) => {
    if (!currentPeriod) return;
    const newInc: Income = {
      id: `inc_${currentPeriod.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      periodId: currentPeriod.id,
      title: partialInc.title || 'New Income Stream',
      amount: partialInc.amount || 0,
      type: partialInc.type || 'primary_salary',
      sourceTag: partialInc.sourceTag || 'salary',
      accountId: partialInc.accountId,
      status: partialInc.status || 'expected',
      order: targetIndex,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newIncomes = [...incomes];
    newIncomes.splice(targetIndex, 0, newInc);

    await saveIncome(newInc);

    const orderUpdates = newIncomes.map((inc, idx) => ({ id: inc.id, order: idx }));
    await batchUpdateIncomeOrders(orderUpdates);
  };

  // Duplicate Income
  const handleDuplicateIncome = async (inc: Income, targetIndex: number) => {
    if (!currentPeriod) return;
    const duplicatedInc: Income = {
      ...inc,
      id: `inc_${currentPeriod.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: `${inc.title} (Copy)`,
      order: targetIndex,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newIncomes = [...incomes];
    newIncomes.splice(targetIndex, 0, duplicatedInc);

    await saveIncome(duplicatedInc);

    const orderUpdates = newIncomes.map((i, idx) => ({ id: i.id, order: idx }));
    await batchUpdateIncomeOrders(orderUpdates);
  };

  // Reorder Incomes list
  const handleReorderIncomes = async (reordered: Income[]) => {
    setIncomes(reordered);
    const orderUpdates = reordered.map((inc, idx) => ({ id: inc.id, order: idx }));
    await batchUpdateIncomeOrders(orderUpdates);
  };

  // Sync Debt balance and Transfer accounts when saving expenses
  const handleSaveExpenseWithSync = async (exp: Expense) => {
    await saveExpense(exp);
  };

  // Sync Debt balance when batch saving multiple expenses
  const handleBatchSaveExpensesWithSync = async (bulkExps: Expense[]) => {
    for (const exp of bulkExps) {
      await saveExpense(exp);
    }
  };

  // Sync Debt balance when deleting an expense
  const handleDeleteExpenseWithSync = async (expId: string) => {
    const exp = expenses.find((e) => e.id === expId) || allWorkspaceExpenses.find((e) => e.id === expId);
    await deleteExpense(expId, exp?.transferId);
  };

  // Quick Action Sheet Trigger Handler
  const handleSelectQuickAction = (
    action: 'expense' | 'income' | 'category' | 'emergency' | 'debt' | 'calendar' | 'period' | 'account'
  ) => {
    switch (action) {
      case 'expense':
        setEditingExpense(null);
        setQuickCategoryId(undefined);
        setIsExpenseModalOpen(true);
        break;
      case 'income':
        setEditingIncome(null);
        setIsIncomeModalOpen(true);
        break;
      case 'category':
        setEditingCategory(null);
        setIsCategoryModalOpen(true);
        break;
      case 'account':
        setEditingAccount(null);
        setIsAccountModalOpen(true);
        break;
      case 'emergency':
        setEmergencyModalStep(1);
        setIsEmergencyModalOpen(true);
        break;
      case 'debt':
        setEditingDebt(null);
        setIsDebtModalOpen(true);
        break;
      case 'calendar':
        setIsCalendarModalOpen(true);
        break;
      case 'period':
        setIsPeriodModalOpen(true);
        break;
    }
  };

  // Export family budget data to JSON
  const handleExportJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      currentPeriod,
      accounts,
      incomes,
      categories,
      expenses,
      debts,
      babyState,
      emergencyLogs,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bakayise_budget_${currentPeriod?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'backup'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExecuteTransfer = async (transferData: {
    sourceAccountId: string;
    destinationAccountId: string;
    amount: number;
    date: string;
    reference: string;
    notes?: string;
  }) => {
    const sourceAcc = accounts.find((a) => a.id === transferData.sourceAccountId);
    const destAcc = accounts.find((a) => a.id === transferData.destinationAccountId);
    if (!sourceAcc || !destAcc || !currentPeriod || !activeWorkspaceId) return;

    const timestamp = Date.now();
    const dateStr = transferData.date || new Date().toISOString().split('T')[0];
    const transferId = `transfer_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;

    const transferExpense: Expense = {
      id: `exp_${transferId}`,
      periodId: currentPeriod.id,
      categoryId: categories[0]?.id || 'cat_transfer',
      amount: transferData.amount,
      title: `Transfer to ${destAcc.name}${transferData.reference ? `: ${transferData.reference}` : ''}`,
      date: dateStr,
      loggedBy: 'Shared',
      paymentMethod: sourceAcc.type === 'cash' ? 'cash' : 'electronic_transfer',
      accountId: sourceAcc.id,
      notes: transferData.notes,
      transferId: transferId,
      householdId: activeWorkspaceId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const transferIncome: Income = {
      id: `inc_${transferId}`,
      periodId: currentPeriod.id,
      title: `Transfer from ${sourceAcc.name}${transferData.reference ? `: ${transferData.reference}` : ''}`,
      amount: transferData.amount,
      type: 'other',
      sourceTag: 'Internal Transfer',
      status: 'received',
      receivedDate: dateStr,
      accountId: destAcc.id,
      notes: transferData.notes,
      transferId: transferId,
      householdId: activeWorkspaceId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await executeTransfer(transferExpense, transferIncome);
  };

  const handleExecuteDeposit = async (depositData: {
    destinationAccountId: string;
    sourceType: 'cash_wallet' | 'external_atm_cash';
    cashAccountId?: string;
    amount: number;
    date: string;
    atmLocation: string;
    reference: string;
    notes?: string;
  }) => {
    const destAcc = accounts.find((a) => a.id === depositData.destinationAccountId);
    if (!destAcc || !currentPeriod) return;

    const timestamp = Date.now();
    const dateStr = depositData.date || new Date().toISOString().split('T')[0];

    if (depositData.sourceType === 'cash_wallet' && depositData.cashAccountId) {
      const cashAcc = accounts.find((a) => a.id === depositData.cashAccountId);
      if (cashAcc) {
        const cashExpense: Expense = {
          id: `exp_atmdep_${timestamp}`,
          periodId: currentPeriod.id,
          categoryId: categories[0]?.id || 'cat_atm_deposit',
          amount: depositData.amount,
          title: `ATM Cash Deposit to ${destAcc.name} (${depositData.atmLocation})`,
          date: dateStr,
          loggedBy: 'Shared',
          paymentMethod: 'cash',
          accountId: cashAcc.id,
          notes: depositData.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await saveExpense(cashExpense);
      }
    }

    const depositIncome: Income = {
      id: `inc_atmdep_${timestamp}`,
      periodId: currentPeriod.id,
      title: `ATM Cash Deposit (${depositData.atmLocation})`,
      amount: depositData.amount,
      type: 'other',
      sourceTag: 'ATM Cash Deposit',
      status: 'received',
      receivedDate: dateStr,
      accountId: destAcc.id,
      notes: depositData.notes || `Location: ${depositData.atmLocation}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveIncome(depositIncome);
  };

  const handleCopyToCycle = async (item: BudgetCategory | Income, targetPeriodId: string) => {
    const timestamp = Date.now();
    const newId = `${'group' in item ? 'cat' : 'inc'}_${targetPeriodId}_${timestamp}`;

    if ('group' in item) {
      const clonedCat: BudgetCategory = {
        ...item,
        id: newId,
        periodId: targetPeriodId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveCategory(clonedCat);
    } else {
      const clonedInc: Income = {
        ...item,
        id: newId,
        periodId: targetPeriodId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveIncome(clonedInc);
    }
  };

  const handleCopyWholeCycle = async (targetPeriodId: string) => {
    if (!currentPeriod || !activeWorkspaceId) return;
    
    // Copy all incomes
    for (const inc of incomes) {
      await handleCopyToCycle(inc, targetPeriodId);
    }
    
    // Copy all categories
    for (const cat of categories) {
      await handleCopyToCycle(cat, targetPeriodId);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleResetToScratch = async (options: {
    resetAccountsToCleanDefaults?: boolean;
    clearDebts?: boolean;
    clearEmergencyLogs?: boolean;
  }) => {
    setLoading(true);
    try {
      if (!activeWorkspaceId) return;
      const newPeriodId = await resetWorksheetToScratch(activeWorkspaceId, options);
      setSelectedPeriodId(newPeriodId);
    } catch (err) {
      console.error('Error resetting worksheet to scratch:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetToExampleTemplate = async () => {
    setLoading(true);
    try {
      const newPeriodId = await seedFamilyData();
      setSelectedPeriodId(newPeriodId);
    } catch (err) {
      console.error('Error restoring template:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
  return (
      <div className="min-h-screen bg-[#0C0C0E] flex flex-col items-center justify-center text-slate-200 p-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#30D158] mb-3" />
        <h2 className="text-base font-bold text-white">Verifying Google Account...</h2>
        <p className="text-xs text-slate-400 mt-1">Bakayise Private Family Security Gate</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return <GoogleAuthScreen />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-slate-200 p-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#30D158] mb-3" />
        <h2 className="text-lg font-bold">Loading Bakayise Budget...</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to Firestore Database</p>
      </div>
    );
  }

  return (
    <IPhoneMockupFrame isFrameActive={isIPhoneFrameMode}>
      <div className="min-h-screen bg-black text-white flex flex-col selection:bg-[#30D158]/30">

        {/* Top Navbar with iPhone Camera / Dynamic Status Pill & Navigation Menu Overlay Button */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenExpenseModal={() => {
            setEditingExpense(null);
            setQuickCategoryId(undefined);
            setIsExpenseModalOpen(true);
          }}
          onOpenNavMenu={() => setIsNavMenuOpen(true)}
          step1Balance={babyState?.step1CurrentBalance}
          totalDebtBalance={totalDebtBalance}
          totalBankBalance={totalBankBalance}
          unassignedAmount={unassigned}
          currentStep={babyState?.currentStep || 1}
          isIPhoneFrameMode={isIPhoneFrameMode}
          onToggleIPhoneFrameMode={() => setIsIPhoneFrameMode(!isIPhoneFrameMode)}
        />

        {/* Top Navigation Menu Overlay */}
        <NavMenuOverlay
          isOpen={isNavMenuOpen}
          onClose={() => setIsNavMenuOpen(false)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenExpenseModal={() => {
            setEditingExpense(null);
            setQuickCategoryId(undefined);
            setIsExpenseModalOpen(true);
          }}
          onOpenIncomeModal={() => {
            setEditingIncome(null);
            setIsIncomeModalOpen(true);
          }}
          onOpenCategoryModal={() => {
            setEditingCategory(null);
            setIsCategoryModalOpen(true);
          }}
          onOpenPeriodModal={() => setIsPeriodModalOpen(true)}
          onOpenTagAnalysis={() => setIsTagAnalysisModalOpen(true)}
          onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
          onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
          onOpenArchivedWorksheets={() => setIsArchivedWorksheetsModalOpen(true)}
          onExportJSON={handleExportJSON}
          onPrint={handlePrint}
          onResetStarterData={() => setIsResetWorksheetModalOpen(true)}
          step1Balance={babyState?.step1CurrentBalance}
          totalDebtBalance={totalDebtBalance}
          currentStep={babyState?.currentStep || 1}
          unassignedAmount={unassigned}
          currentPeriodName={currentPeriod?.name}
          isIPhoneFrameMode={isIPhoneFrameMode}
          onToggleIPhoneFrameMode={() => setIsIPhoneFrameMode(!isIPhoneFrameMode)}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-5 pb-12">
          
          {/* Pay Period & Holiday Banner */}
          <PayPeriodHeader
            periods={periods}
            currentPeriod={currentPeriod}
            onSelectPeriod={(p) => {
              setSelectedPeriodId(p.id);
              localStorage.setItem('bakayise_selected_period_id', p.id);
            }}
            onOpenNewPeriodModal={() => setIsPeriodModalOpen(true)}
            onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
            onOpenEditPeriodModal={() => setIsEditPeriodModalOpen(true)}
          />

          {/* TAB 1: MONTHLY BUDGET PLANNER (EXCEL SPREADSHEET VIEW) */}
          {activeTab === 'budget' && (
            <ExcelBudgetView
              categories={categories}
              incomes={incomes}
              expenses={expenses}
              accounts={accounts}
              accountBalances={accountLiveBalances}
              periods={periods}
              currentPeriod={currentPeriod}
              onOpenAddCategoryModal={() => {
                setEditingCategory(null);
                setIsCategoryModalOpen(true);
              }}
              onOpenEditCategoryModal={(cat) => {
                setEditingCategory(cat);
                setIsCategoryModalOpen(true);
              }}
              onDeleteCategory={(catId) => deleteCategory(catId)}
              onUpdateCategory={handleUpdateCategory}
              onUpdateCategoryAllocation={handleUpdateCategoryAllocation}
              onQuickAddCategoryRow={handleQuickAddCategoryRow}
              onInsertCategoryAt={handleInsertCategoryAt}
              onDuplicateCategory={handleDuplicateCategory}
              onReorderCategories={handleReorderCategories}
              onOpenAddIncomeModal={() => {
                setEditingIncome(null);
                setIsIncomeModalOpen(true);
              }}
              onOpenEditIncomeModal={(inc) => {
                setEditingIncome(inc);
                setIsIncomeModalOpen(true);
              }}
              onUpdateIncome={handleUpdateIncome}
              onDeleteIncome={(incId) => {
                const inc = incomes.find((i) => i.id === incId);
                deleteIncome(incId, inc?.transferId);
              }}
              onInsertIncomeAt={handleInsertIncomeAt}
              onDuplicateIncome={handleDuplicateIncome}
              onReorderIncomes={handleReorderIncomes}
              onToggleIncomeStatus={handleToggleIncomeStatus}
              onQuickLogExpense={(catId) => {
                setEditingExpense(null);
                setQuickCategoryId(catId);
                setIsExpenseModalOpen(true);
              }}
              onOpenTagAnalysis={() => setIsTagAnalysisModalOpen(true)}
              onOpenAddAccountModal={() => {
                setEditingAccount(null);
                setIsAccountModalOpen(true);
              }}
              onOpenEditPeriodModal={() => setIsEditPeriodModalOpen(true)}
              onCopyToCycle={handleCopyToCycle}
              onCopyWholeCycle={handleCopyWholeCycle}
            />
          )}

          {/* TAB 2: EXPENSES TRACKER */}
          {activeTab === 'expenses' && (
            <ExpenseTracker
              expenses={expenses}
              categories={categories}
              accounts={accounts}
              onOpenAddExpenseModal={() => {
                setEditingExpense(null);
                setQuickCategoryId(undefined);
                setIsExpenseModalOpen(true);
              }}
              onOpenEditExpenseModal={(exp) => {
                setEditingExpense(exp);
                setIsExpenseModalOpen(true);
              }}
              onDeleteExpense={(expId) => {
                handleDeleteExpenseWithSync(expId);
              }}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              expenses={allWorkspaceExpenses}
              incomes={allWorkspaceIncomes}
              accounts={accounts}
              categories={allWorkspaceCategories}
              debts={debts}
              periods={periods}
              currentPeriodId={currentPeriod?.id}
              onDeleteExpense={(id) => {
                handleDeleteExpenseWithSync(id);
              }}
              onDeleteIncome={(id) => {
                const inc = allWorkspaceIncomes.find((i) => i.id === id);
                deleteIncome(id, inc?.transferId);
              }}
            />
          )}

          {/* TAB 3: FINANCIAL ACCOUNTS & FUND TRACKER */}
          {activeTab === 'accounts' && (
            <AccountsManager
              accounts={accounts}
              incomes={allWorkspaceIncomes}
              expenses={allWorkspaceExpenses}
              categories={allWorkspaceCategories}
              periods={periods}
              onOpenAddAccountModal={() => {
                setEditingAccount(null);
                setIsAccountModalOpen(true);
              }}
              onOpenEditAccountModal={(acc) => {
                setEditingAccount(acc);
                setIsAccountModalOpen(true);
              }}
              onDeleteAccount={(accId) => deleteAccount(accId)}
              onOpenAddIncomeModal={() => {
                setEditingIncome(null);
                setIsIncomeModalOpen(true);
              }}
              onOpenAddExpenseModal={() => {
                setEditingExpense(null);
                setQuickCategoryId(undefined);
                setIsExpenseModalOpen(true);
              }}
              onOpenTransferModal={(sourceId) => {
                setTransferSourceAccountId(sourceId);
                setIsTransferModalOpen(true);
              }}
              onOpenAtmDepositModal={(destId) => {
                setDepositDestinationAccountId(destId);
                setIsAtmDepositModalOpen(true);
              }}
            />
          )}

          {/* TAB 4: DAVE RAMSEY BABY STEPS */}
          {activeTab === 'babysteps' && (
            <BabyStepsTracker
              babyState={babyState}
              debts={debts}
              categories={categories}
              incomes={incomes}
              allIncomes={allWorkspaceIncomes}
              allExpenses={allWorkspaceExpenses}
              currentPeriod={currentPeriod}
              emergencyLogs={emergencyLogs}
              accounts={accounts}
              onOpenEmergencyModal={(step) => {
                setEmergencyModalStep(step);
                setIsEmergencyModalOpen(true);
              }}
              onUpdateCurrentStep={(stepNumber) => {
                if (babyState && activeWorkspaceId) {
                  saveBabyStepsState({
                    ...babyState,
                    currentStep: stepNumber,
                    householdId: activeWorkspaceId,
                    updatedAt: new Date().toISOString(),
                  });
                }
              }}
              onNavigateToSnowball={() => setActiveTab('snowball')}
            />
          )}

          {/* TAB 5: DEBT SNOWBALL DESTROYER */}
          {activeTab === 'snowball' && (
            <DebtSnowballManager
              debts={debts}
              onOpenAddDebtModal={() => {
                setEditingDebt(null);
                setIsDebtModalOpen(true);
              }}
              onOpenEditDebtModal={(debt) => {
                setEditingDebt(debt);
                setIsDebtModalOpen(true);
              }}
              onDeleteDebt={(debtId) => deleteDebt(debtId)}
              onRecordPayment={async (debtId, amount) => {
                const targetDebt = debts.find((d) => d.id === debtId);
                if (targetDebt && currentPeriod && activeWorkspaceId) {
                  const newBalance = Math.max(0, targetDebt.balance - amount);
                  await updateDebt(debtId, {
                    balance: newBalance,
                    status: newBalance === 0 ? 'paid_off' : 'active',
                    paidOffDate: newBalance === 0 ? new Date().toISOString().split('T')[0] : undefined,
                    updatedAt: new Date().toISOString(),
                  });

                  // Log debt payment as an Expense transaction
                  const timestamp = Date.now();
                  const todayStr = new Date().toISOString().split('T')[0];
                  const defaultAccId = accounts.find((a) => a.isDefault)?.id || accounts[0]?.id;
                  const debtCat = categories.find(
                    (c) => c.group === 'debt_snowball' || c.name.toLowerCase().includes('debt')
                  );

                  const debtExpense: Expense = {
                    id: `exp_debt_${debtId}_${timestamp}`,
                    periodId: currentPeriod.id,
                    categoryId: debtCat?.id || categories[0]?.id || 'cat_debt',
                    amount: amount,
                    title: `Debt Payment: ${targetDebt.name}`,
                    date: todayStr,
                    loggedBy: 'Shared',
                    paymentMethod: 'electronic_transfer',
                    accountId: defaultAccId,
                    notes: `Snowball payment towards ${targetDebt.name}. Remaining balance: ${formatZAR(newBalance)}`,
                    householdId: activeWorkspaceId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  await saveExpense(debtExpense);
                }
              }}
              onMarkPaidOff={async (debtId) => {
                const targetDebt = debts.find((d) => d.id === debtId);
                if (targetDebt) {
                  await updateDebt(debtId, {
                    balance: 0,
                    status: 'paid_off',
                    paidOffDate: new Date().toISOString().split('T')[0],
                    updatedAt: new Date().toISOString(),
                  });
                }
              }}
            />
          )}

          {/* TAB 6: PAYDAYS & HOLIDAYS EXPLORER */}
          {activeTab === 'calendar' && (
            <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-[24px] p-5 sm:p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#30D158]" />
                    <span>South Africa Paydays & Public Holidays Engine</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Plan budget deadlines ahead of time with automated weekend and holiday shifts
                  </p>
                </div>

                <button
                  onClick={() => setIsCalendarModalOpen(true)}
                  className="px-4 py-2 bg-[#30D158] hover:bg-[#34C759] text-black font-bold rounded-[14px] text-xs transition active:scale-95 cursor-pointer whitespace-nowrap self-start sm:self-auto"
                >
                  Open 12-Month Calendar
                </button>
              </div>

              <div className="mt-4 text-xs sm:text-sm text-slate-300 space-y-3 leading-relaxed">
                <p>
                  In South Africa, when the <strong>25th of the month</strong> lands on a Saturday, Sunday, or official Public Holiday (such as Freedom Day, Youth Day, Heritage Day, Day of Reconciliation, or Christmas), your salary arrives on the <strong>preceding business day (Friday or earlier)</strong>.
                </p>
                <p>
                  To maintain a peaceful zero-based family budget, your budget plan is due <strong>1 to 2 days before salary arrives</strong> so that when the funds land in your account, every Rand already has an assigned envelope!
                </p>
              </div>
            </div>
          )}

        </main>

        {/* Floating Quick Action Button (iOS Floating Bottom Pill) */}
        <div className="fixed bottom-5 right-5 z-40">
          <button
            onClick={() => setIsActionSheetOpen(true)}
            className="flex items-center gap-2 px-4 py-3 bg-[#30D158] hover:bg-[#34C759] text-black font-bold rounded-full shadow-2xl shadow-emerald-950/80 border border-white/20 transition-all transform active:scale-95 cursor-pointer hover:shadow-emerald-500/25"
          >
            <Plus className="w-5 h-5 stroke-[2.8]" />
            <span className="text-xs tracking-tight">Quick Action</span>
          </button>
        </div>

        {/* iPhone Action Sheet Modal */}
        <IPhoneActionSheet
          isOpen={isActionSheetOpen}
          onClose={() => setIsActionSheetOpen(false)}
          onSelectAction={(act) => handleSelectQuickAction(act as any)}
        />

        {/* Modals */}
        <ExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => {
            setIsExpenseModalOpen(false);
            setEditingExpense(null);
            setQuickCategoryId(undefined);
          }}
          onSave={(exp) => handleSaveExpenseWithSync(exp)}
          onSaveBulk={(bulkExps) => handleBatchSaveExpensesWithSync(bulkExps)}
          categories={categories}
          accounts={accounts}
          debts={debts}
          currentPeriodId={currentPeriod?.id || ''}
          initialExpense={editingExpense}
          defaultCategoryId={quickCategoryId}
          onOpenAtmDepositModal={() => setIsAtmDepositModalOpen(true)}
        />

        <IncomeModal
          isOpen={isIncomeModalOpen}
          onClose={() => {
            setIsIncomeModalOpen(false);
            setEditingIncome(null);
          }}
          onSave={(inc) => {
            if (!activeWorkspaceId) throw new Error('Cannot save income: No workspace selected.');
            saveIncome({ ...inc, householdId: activeWorkspaceId, workspaceId: activeWorkspaceId });
          }}
          onSaveBulk={async (incomes) => {
            if (!activeWorkspaceId) throw new Error('Cannot save incomes: No workspace selected.');
            const mapped = incomes.map((inc) => ({
              ...inc,
              householdId: activeWorkspaceId,
              workspaceId: activeWorkspaceId,
            }));
            await saveIncomesBulk(mapped);
          }}
          accounts={accounts}
          accountBalances={accountLiveBalances}
          currentPeriodId={currentPeriod?.id || ''}
          initialIncome={editingIncome}
        />

        <WorkspaceSelectorModal
          isOpen={isWorkspaceModalOpen}
          onClose={() => setIsWorkspaceModalOpen(false)}
        />

        <CategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => {
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
          }}
          onSave={(cat) => {
            if (!activeWorkspaceId) throw new Error('Cannot save category: No workspace selected.');
            saveCategory({ ...cat, householdId: activeWorkspaceId, workspaceId: activeWorkspaceId });
          }}
          onSaveBulk={async (categories) => {
            if (!activeWorkspaceId) throw new Error('Cannot save categories: No workspace selected.');
            const mapped = categories.map((cat) => ({
              ...cat,
              householdId: activeWorkspaceId,
              workspaceId: activeWorkspaceId,
            }));
            await saveCategoriesBulk(mapped);
          }}
          accounts={accounts}
          accountBalances={accountLiveBalances}
          currentPeriodId={currentPeriod?.id || ''}
          initialCategory={editingCategory}
        />

        <AccountModal
          isOpen={isAccountModalOpen}
          onClose={() => {
            setIsAccountModalOpen(false);
            setEditingAccount(null);
          }}
          onSave={(acc) => {
            if (!activeWorkspaceId) throw new Error('Cannot save account: No workspace selected.');
            saveAccount({ ...acc, householdId: activeWorkspaceId, workspaceId: activeWorkspaceId });
          }}
          initialAccount={editingAccount}
        />

        <PeriodModal
          isOpen={isPeriodModalOpen}
          onClose={() => setIsPeriodModalOpen(false)}
          onSaveNewPeriod={handleSaveNewPeriod}
          onSave={handleSaveNewPeriod}
          existingPeriods={periods}
          currentCategories={categories}
          hasExistingCategories={categories.length > 0}
          debts={debts}
          accounts={accounts}
        />

        <EditPeriodModal
          isOpen={isEditPeriodModalOpen}
          onClose={() => setIsEditPeriodModalOpen(false)}
          period={currentPeriod}
          onSavePeriod={async (updated) => {
            await saveBudgetPeriod(updated);
          }}
          onDeletePeriod={async (pId) => {
            await deleteBudgetPeriod(pId);
          }}
        />

        <AccountTransferModal
          isOpen={isTransferModalOpen}
          onClose={() => {
            setIsTransferModalOpen(false);
            setTransferSourceAccountId(undefined);
          }}
          accounts={accounts}
          accountBalances={accountLiveBalances}
          currentPeriod={currentPeriod}
          initialSourceAccountId={transferSourceAccountId}
          onExecuteTransfer={handleExecuteTransfer}
        />

        <AtmCashDepositModal
          isOpen={isAtmDepositModalOpen}
          onClose={() => {
            setIsAtmDepositModalOpen(false);
            setDepositDestinationAccountId(undefined);
          }}
          accounts={accounts}
          accountBalances={accountLiveBalances}
          currentPeriod={currentPeriod}
          initialDestinationAccountId={depositDestinationAccountId}
          onExecuteDeposit={handleExecuteDeposit}
        />

        <EmergencyFundModal
          isOpen={isEmergencyModalOpen}
          onClose={() => setIsEmergencyModalOpen(false)}
          step={emergencyModalStep}
          babyState={babyState}
          currentState={babyState}
          categories={categories}
          accounts={accounts}
          onSaveLogs={async (updatedState, newLog) => {
            if (activeWorkspaceId) {
              await saveBabyStepsState({
                ...updatedState,
                householdId: activeWorkspaceId,
              });
              await addEmergencyFundLog(newLog);

              // If withdrawal, log as an Expense transaction
              if (newLog.type === 'withdrawal' && currentPeriod) {
                const timestamp = Date.now();
                const defaultAccId = accounts.find((a) => a.isDefault)?.id || accounts[0]?.id;
                const savingsAcc = accounts.find((a) => a.babyStepAssignment === emergencyModalStep || a.type === 'savings');
                const targetAccountId = savingsAcc?.id || defaultAccId;
                const efCategory = categories.find(
                  (c) => c.group === 'savings_goals' || c.name.toLowerCase().includes('emergency')
                );

                const efExpense: Expense = {
                  id: `exp_ef_${timestamp}`,
                  periodId: currentPeriod.id,
                  categoryId: efCategory?.id || categories[0]?.id || 'cat_emergency',
                  amount: newLog.amount,
                  title: `Emergency Fund: ${newLog.description}`,
                  date: newLog.date,
                  loggedBy: 'Shared',
                  paymentMethod: 'electronic_transfer',
                  accountId: targetAccountId,
                  notes: `Step ${emergencyModalStep} Emergency Fund withdrawal: ${newLog.description}`,
                  householdId: activeWorkspaceId,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                await saveExpense(efExpense);
              }
            }
          }}
        />

        <DebtModal
          isOpen={isDebtModalOpen}
          onClose={() => {
            setIsDebtModalOpen(false);
            setEditingDebt(null);
          }}
          onSave={(d) => {
            if (!activeWorkspaceId) throw new Error('Cannot save debt: No workspace selected.');
            saveDebt({ ...d, householdId: activeWorkspaceId, workspaceId: activeWorkspaceId });
          }}
          initialDebt={editingDebt}
          accounts={accounts}
        />

        <WorkspaceGatekeeperModal isOpen={isAuthorized && !activeWorkspaceId} />

        <PaydayCalendarModal
          isOpen={isCalendarModalOpen}
          onClose={() => setIsCalendarModalOpen(false)}
        />

        <TagAnalysisModal
          isOpen={isTagAnalysisModalOpen}
          onClose={() => setIsTagAnalysisModalOpen(false)}
          categories={categories}
          expenses={expenses}
          incomes={incomes}
        />

        <ResetWorksheetModal
          isOpen={isResetWorksheetModalOpen}
          onClose={() => setIsResetWorksheetModalOpen(false)}
          onResetToScratch={handleResetToScratch}
          onResetToExampleTemplate={handleResetToExampleTemplate}
          periodName={currentPeriod?.name || 'Current Pay Period'}
          categoryCount={categories.length}
          incomeCount={incomes.length}
          expenseCount={expenses.length}
        />

        <ArchivedWorksheetsModal
          isOpen={isArchivedWorksheetsModalOpen}
          onClose={() => setIsArchivedWorksheetsModalOpen(false)}
          archives={archivedWorksheets}
          onRestoreArchive={async (arch) => {
            await restoreArchivedWorksheet(arch);
          }}
          onDeleteArchive={async (archId) => {
            await deleteArchivedWorksheet(archId);
          }}
        />

      </div>
    </IPhoneMockupFrame>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BakayiseAppContent />
    </AuthProvider>
  );
}
