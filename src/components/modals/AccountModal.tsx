import React, { useState, useEffect } from 'react';
import { FinancialAccount, AccountType } from '../../types';
import { ACCOUNT_TYPES, SOUTH_AFRICAN_INSTITUTIONS } from '../../utils/budgetConstants';
import {
  evaluateMathExpression,
  formatMathLivePreview,
  isMathExpression,
  calculateMonthlyInstallment,
  calculateBondInstallment,
} from '../../utils/mathEvaluator';
import { formatZAR, formatZARCompact } from '../../utils/southAfricaHolidays';
import { FigmaIcon } from '../ui/FigmaIcon';
import {
  X,
  Calculator,
  CreditCard,
  PiggyBank,
  Sparkles,
  TrendingUp,
  Banknote,
  Home,
  Wallet,
  Car,
  AlertCircle,
  Percent,
  Flame,
  Info,
  Trophy,
  ShieldCheck,
  Building2,
  Calendar,
} from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: FinancialAccount) => void;
  initialAccount?: FinancialAccount | null;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialAccount,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cheque');
  const [institution, setInstitution] = useState('Capitec Bank');
  const [accountNumberMask, setAccountNumberMask] = useState('');
  const [color, setColor] = useState('#30D158');
  const [isDefault, setIsDefault] = useState(false);
  const [notes, setNotes] = useState('');

  // Baby Step Assignment (1 = Starter Emergency, 3 = 3-6mo Emergency, 4 = Investing, 5 = College, 6 = Bond)
  const [babyStepAssignment, setBabyStepAssignment] = useState<number | null>(null);

  // Standard balance (for cash, cheque, savings, standard loan)
  const [openingBalance, setOpeningBalance] = useState('0');

  // Credit Card specific fields
  const [creditLimit, setCreditLimit] = useState('');
  const [balanceOwed, setBalanceOwed] = useState('');
  const [availableCredit, setAvailableCredit] = useState('');
  const [interestRate, setInterestRate] = useState('21.75');
  const [monthlyFee, setMonthlyFee] = useState('0.00');
  const [minimumPaymentPercentage, setMinimumPaymentPercentage] = useState('3.0');

  // Investment & TFSA specific fields
  const [expectedAnnualReturn, setExpectedAnnualReturn] = useState('11.5');
  const [managementFeePercentage, setManagementFeePercentage] = useState('0.45');
  const [monthlyContribution, setMonthlyContribution] = useState('0');
  const [ytdContribution, setYtdContribution] = useState('0');
  const [lifetimeContribution, setLifetimeContribution] = useState('0');

  // Home Loan / Bond specific fields
  const [purchasePrice, setPurchasePrice] = useState('');
  const [marketValue, setMarketValue] = useState('');
  const [totalTermYears, setTotalTermYears] = useState('20');
  const [remainingTermMonths, setRemainingTermMonths] = useState('240');
  const [manualMonthlyInstallment, setManualMonthlyInstallment] = useState('');

  // Loan / Debt & Vehicle specific fields
  const [originalLoanAmount, setOriginalLoanAmount] = useState('');
  const [creditLifeInsurance, setCreditLifeInsurance] = useState('0.00');
  const [totalTermMonths, setTotalTermMonths] = useState('60');

  // Vehicle Finance specific fields
  const [vehicleMakeModel, setVehicleMakeModel] = useState('');
  const [balloonPaymentPercentage, setBalloonPaymentPercentage] = useState('0');
  const [balloonAmount, setBalloonAmount] = useState('0');

  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialAccount) {
      setName(initialAccount.name);
      setType(initialAccount.type);
      setInstitution(initialAccount.institution || 'Capitec Bank');
      setAccountNumberMask(initialAccount.accountNumberMask || '');
      setOpeningBalance(
        initialAccount.openingBalance !== undefined ? initialAccount.openingBalance.toString() : '0'
      );
      setColor(initialAccount.color || '#30D158');
      setIsDefault(Boolean(initialAccount.isDefault));
      setNotes(initialAccount.notes || '');
      setBabyStepAssignment(
        initialAccount.babyStepAssignment !== undefined ? initialAccount.babyStepAssignment : null
      );

      // Credit card
      setCreditLimit(initialAccount.creditLimit !== undefined ? initialAccount.creditLimit.toString() : '');
      setBalanceOwed(
        initialAccount.balanceOwed !== undefined
          ? initialAccount.balanceOwed.toString()
          : initialAccount.type === 'credit_card' ||
            initialAccount.type === 'loan' ||
            initialAccount.type === 'vehicle_loan' ||
            initialAccount.type === 'home_loan'
          ? initialAccount.openingBalance.toString()
          : ''
      );
      setAvailableCredit(
        initialAccount.availableCredit !== undefined ? initialAccount.availableCredit.toString() : ''
      );
      setInterestRate(
        initialAccount.interestRate !== undefined
          ? initialAccount.interestRate.toString()
          : initialAccount.type === 'credit_card'
          ? '21.75'
          : initialAccount.type === 'home_loan'
          ? '11.75'
          : initialAccount.type === 'vehicle_loan'
          ? '12.50'
          : '18.50'
      );
      setMonthlyFee(
        initialAccount.monthlyFee !== undefined ? initialAccount.monthlyFee.toString() : '0.00'
      );
      setMinimumPaymentPercentage(
        initialAccount.minimumPaymentPercentage !== undefined
          ? initialAccount.minimumPaymentPercentage.toString()
          : '3.0'
      );

      // Investments & TFSA
      setExpectedAnnualReturn(
        initialAccount.expectedAnnualReturn !== undefined
          ? initialAccount.expectedAnnualReturn.toString()
          : '11.5'
      );
      setManagementFeePercentage(
        initialAccount.managementFeePercentage !== undefined
          ? initialAccount.managementFeePercentage.toString()
          : '0.45'
      );
      setMonthlyContribution(
        initialAccount.monthlyContribution !== undefined
          ? initialAccount.monthlyContribution.toString()
          : '0'
      );
      setYtdContribution(
        initialAccount.ytdContribution !== undefined ? initialAccount.ytdContribution.toString() : '0'
      );
      setLifetimeContribution(
        initialAccount.lifetimeContribution !== undefined
          ? initialAccount.lifetimeContribution.toString()
          : '0'
      );

      // Home Loan / Bond
      setPurchasePrice(
        initialAccount.purchasePrice !== undefined ? initialAccount.purchasePrice.toString() : ''
      );
      setMarketValue(
        initialAccount.marketValue !== undefined ? initialAccount.marketValue.toString() : ''
      );
      setTotalTermYears(
        initialAccount.totalTermYears !== undefined ? initialAccount.totalTermYears.toString() : '20'
      );
      setRemainingTermMonths(
        initialAccount.remainingTermMonths !== undefined
          ? initialAccount.remainingTermMonths.toString()
          : '240'
      );
      setManualMonthlyInstallment(
        initialAccount.manualMonthlyInstallment !== undefined
          ? initialAccount.manualMonthlyInstallment.toString()
          : ''
      );

      // Loans & Vehicle
      setOriginalLoanAmount(
        initialAccount.originalLoanAmount !== undefined
          ? initialAccount.originalLoanAmount.toString()
          : initialAccount.purchasePrice !== undefined
          ? initialAccount.purchasePrice.toString()
          : ''
      );
      setCreditLifeInsurance(
        initialAccount.creditLifeInsurance !== undefined
          ? initialAccount.creditLifeInsurance.toString()
          : '0.00'
      );
      setTotalTermMonths(
        initialAccount.totalTermMonths !== undefined
          ? initialAccount.totalTermMonths.toString()
          : '60'
      );

      // Vehicle specific
      setVehicleMakeModel(initialAccount.vehicleMakeModel || '');
      setBalloonPaymentPercentage(
        initialAccount.balloonPaymentPercentage !== undefined
          ? initialAccount.balloonPaymentPercentage.toString()
          : '0'
      );
      setBalloonAmount(
        initialAccount.balloonAmount !== undefined ? initialAccount.balloonAmount.toString() : '0'
      );
    } else {
      setName('');
      setType('cheque');
      setInstitution('Capitec Bank');
      setAccountNumberMask('');
      setOpeningBalance('0');
      setColor('#30D158');
      setIsDefault(false);
      setNotes('');
      setBabyStepAssignment(null);

      // Credit card defaults
      setCreditLimit('25000');
      setBalanceOwed('5000');
      setAvailableCredit('20000');
      setInterestRate('21.75');
      setMonthlyFee('0.00');
      setMinimumPaymentPercentage('3.0');

      // Investment defaults
      setExpectedAnnualReturn('11.5');
      setManagementFeePercentage('0.45');
      setMonthlyContribution('2500');
      setYtdContribution('0');
      setLifetimeContribution('0');

      // Home Loan defaults
      setPurchasePrice('1500000');
      setMarketValue('1650000');
      setTotalTermYears('20');
      setRemainingTermMonths('216');
      setManualMonthlyInstallment('');

      // Loan & Vehicle defaults
      setOriginalLoanAmount('50000');
      setCreditLifeInsurance('0.00');
      setTotalTermMonths('60');

      // Vehicle defaults
      setVehicleMakeModel('');
      setBalloonPaymentPercentage('0');
      setBalloonAmount('0');
    }
    setErrorMessage('');
  }, [initialAccount, isOpen]);

  if (!isOpen) return null;

  // Real-time helper calculations for credit card
  const numCreditLimit = evaluateMathExpression(creditLimit) || 0;
  const numBalanceOwed = evaluateMathExpression(balanceOwed) || 0;
  const numInterestRate = parseFloat(interestRate) || 0;
  const numMonthlyFee = evaluateMathExpression(monthlyFee) !== null ? (evaluateMathExpression(monthlyFee) as number) : 0;
  const numMinPercentage = parseFloat(minimumPaymentPercentage) || 3.0;

  // Estimated monthly minimum required payment for credit card
  const estimatedMinPayment =
    numBalanceOwed > 0
      ? Math.round(Math.max(100, numBalanceOwed * (numMinPercentage / 100) + numMonthlyFee))
      : 0;

  // Bond Amortization calculations
  const numBondBalance = evaluateMathExpression(balanceOwed) || evaluateMathExpression(openingBalance) || 0;
  const numBondMarketValue = evaluateMathExpression(marketValue) || 0;
  const numBondPurchasePrice = evaluateMathExpression(purchasePrice) || 0;
  const numBondTermYears = parseFloat(totalTermYears) || 20;
  const numBondRemainingMonths = parseInt(remainingTermMonths) || numBondTermYears * 12;
  const numBondInterestRate = parseFloat(interestRate) || 11.75;
  const numBondCalculatedInstallment = calculateMonthlyInstallment(
    numBondBalance,
    numBondInterestRate,
    numBondRemainingMonths,
    0
  );
  const bondHomeEquity = Math.max(0, numBondMarketValue - numBondBalance);
  const bondLTV = numBondMarketValue > 0 ? (numBondBalance / numBondMarketValue) * 100 : 0;

  // Vehicle calculations
  const numVehicleBalance = evaluateMathExpression(balanceOwed) || evaluateMathExpression(openingBalance) || 0;
  const numVehicleMarketValue = evaluateMathExpression(marketValue) || 0;
  const numVehiclePurchasePrice = evaluateMathExpression(purchasePrice) || 0;
  const numVehicleBalloon = evaluateMathExpression(balloonAmount) || 0;
  const numVehicleTermMonths = parseInt(totalTermMonths) || 60;
  const numVehicleRemainingMonths = parseInt(remainingTermMonths) || numVehicleTermMonths;
  const numVehicleInterestRate = parseFloat(interestRate) || 12.5;
  const numVehicleCLI = evaluateMathExpression(creditLifeInsurance) || 0;
  const numVehicleCalculatedInstallment =
    calculateMonthlyInstallment(
      numVehicleBalance,
      numVehicleInterestRate,
      numVehicleRemainingMonths,
      numVehicleBalloon
    ) +
    numMonthlyFee +
    numVehicleCLI;
  const vehicleEquity = numVehicleMarketValue - numVehicleBalance;

  // Loan calculations
  const numLoanBalance = evaluateMathExpression(balanceOwed) || evaluateMathExpression(openingBalance) || 0;
  const numLoanInterestRate = parseFloat(interestRate) || 18.5;
  const numLoanRemainingMonths = parseInt(remainingTermMonths) || 36;
  const numLoanCLI = evaluateMathExpression(creditLifeInsurance) || 0;
  const numLoanCalculatedInstallment =
    calculateMonthlyInstallment(numLoanBalance, numLoanInterestRate, numLoanRemainingMonths, 0) +
    numMonthlyFee +
    numLoanCLI;

  // Handle auto-calculating Credit Card Available vs Borrowed
  const handleCreditLimitChange = (val: string) => {
    setCreditLimit(val);
    const limit = evaluateMathExpression(val);
    const owed = evaluateMathExpression(balanceOwed);
    if (limit !== null && owed !== null) {
      setAvailableCredit(Math.max(0, limit - owed).toString());
    }
  };

  const handleBalanceOwedChange = (val: string) => {
    setBalanceOwed(val);
    const owed = evaluateMathExpression(val);
    const limit = evaluateMathExpression(creditLimit);
    if (owed !== null && limit !== null) {
      setAvailableCredit(Math.max(0, limit - owed).toString());
    }
  };

  const handleAvailableCreditChange = (val: string) => {
    setAvailableCredit(val);
    const avail = evaluateMathExpression(val);
    const limit = evaluateMathExpression(creditLimit);
    if (avail !== null && limit !== null) {
      setBalanceOwed(Math.max(0, limit - avail).toString());
    }
  };

  const handleTypeSelect = (newType: AccountType) => {
    setType(newType);
    const typeConf = ACCOUNT_TYPES.find((t) => t.id === newType);
    if (typeConf && !initialAccount) {
      setColor(typeConf.color);
    }
    // Set appropriate interest rate default
    if (newType === 'credit_card') {
      setInterestRate('21.75');
      setMonthlyFee('0.00');
    } else if (newType === 'home_loan') {
      setInterestRate('11.75');
      setMonthlyFee('69.00');
      setBabyStepAssignment(6);
    } else if (newType === 'vehicle_loan') {
      setInterestRate('12.50');
      setMonthlyFee('69.00');
      setInstitution('WesBank (Vehicle Finance)');
    } else if (newType === 'loan') {
      setInterestRate('18.50');
      setMonthlyFee('69.00');
    } else if (newType === 'savings') {
      setBabyStepAssignment(1);
    } else if (newType === 'tax_free' || newType === 'investment') {
      setBabyStepAssignment(4);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Please enter an account name.');
      return;
    }

    let finalOpeningBalance = 0;
    let finalCreditLimit: number | undefined = undefined;
    let finalAvailableCredit: number | undefined = undefined;
    let finalBalanceOwed: number | undefined = undefined;
    let finalInterestRate: number | undefined = undefined;
    let finalMonthlyFee: number | undefined = undefined;
    let finalMinPercent: number | undefined = undefined;
    let finalMinPayment: number | undefined = undefined;

    let finalExpectedReturn: number | undefined = undefined;
    let finalMgmtFee: number | undefined = undefined;
    let finalMonthlyContribution: number | undefined = undefined;
    let finalYtdContribution: number | undefined = undefined;
    let finalLifetimeContribution: number | undefined = undefined;

    let finalPurchasePrice: number | undefined = undefined;
    let finalMarketValue: number | undefined = undefined;
    let finalTotalTermYears: number | undefined = undefined;
    let finalTotalTermMonths: number | undefined = undefined;
    let finalRemainingTermMonths: number | undefined = undefined;
    let finalMonthlyInstallment: number | undefined = undefined;
    let finalManualMonthlyInstallment: number | undefined = undefined;

    let finalOriginalLoanAmount: number | undefined = undefined;
    let finalCreditLifeInsurance: number | undefined = undefined;
    let finalVehicleMakeModel: string | undefined = undefined;
    let finalBalloonPaymentPercentage: number | undefined = undefined;
    let finalBalloonAmount: number | undefined = undefined;

    // Parse monthly fee (crucial: 0 must be 0, not replaced)
    const evalFee = evaluateMathExpression(monthlyFee);
    finalMonthlyFee = evalFee !== null ? evalFee : 0;

    if (type === 'credit_card') {
      const evalLimit = evaluateMathExpression(creditLimit);
      const evalOwed = evaluateMathExpression(balanceOwed);
      const evalAvail = evaluateMathExpression(availableCredit);

      if (evalLimit === null || evalLimit < 0) {
        setErrorMessage('Please enter a valid credit limit.');
        return;
      }

      finalCreditLimit = evalLimit;
      finalBalanceOwed = evalOwed !== null ? evalOwed : 0;
      finalAvailableCredit =
        evalAvail !== null ? evalAvail : Math.max(0, evalLimit - finalBalanceOwed);
      finalOpeningBalance = finalBalanceOwed;
      finalInterestRate = parseFloat(interestRate) || 21.75;
      finalMinPercent = parseFloat(minimumPaymentPercentage) || 3.0;
      finalMinPayment = estimatedMinPayment;
    } else if (type === 'home_loan') {
      const evalBal = evaluateMathExpression(balanceOwed) || evaluateMathExpression(openingBalance) || 0;
      finalBalanceOwed = evalBal;
      finalOpeningBalance = evalBal;
      finalPurchasePrice = evaluateMathExpression(purchasePrice) || 0;
      finalMarketValue = evaluateMathExpression(marketValue) || finalPurchasePrice;
      finalTotalTermYears = parseFloat(totalTermYears) || 20;
      finalRemainingTermMonths = parseInt(remainingTermMonths) || finalTotalTermYears * 12;
      finalInterestRate = parseFloat(interestRate) || 11.75;
      finalMonthlyInstallment = numBondCalculatedInstallment;
      const evalManual = evaluateMathExpression(manualMonthlyInstallment);
      finalManualMonthlyInstallment = evalManual !== null ? evalManual : undefined;
    } else if (type === 'vehicle_loan') {
      const evalBal = evaluateMathExpression(balanceOwed) || evaluateMathExpression(openingBalance) || 0;
      finalBalanceOwed = evalBal;
      finalOpeningBalance = evalBal;
      finalVehicleMakeModel = vehicleMakeModel.trim() || undefined;
      finalPurchasePrice = evaluateMathExpression(purchasePrice) || 0;
      finalMarketValue = evaluateMathExpression(marketValue) || finalPurchasePrice;
      finalTotalTermMonths = parseInt(totalTermMonths) || 60;
      finalRemainingTermMonths = parseInt(remainingTermMonths) || finalTotalTermMonths;
      finalInterestRate = parseFloat(interestRate) || 12.5;
      finalCreditLifeInsurance = evaluateMathExpression(creditLifeInsurance) || 0;
      finalBalloonPaymentPercentage = parseFloat(balloonPaymentPercentage) || 0;
      finalBalloonAmount = evaluateMathExpression(balloonAmount) || 0;
      finalMonthlyInstallment = numVehicleCalculatedInstallment;
      const evalManual = evaluateMathExpression(manualMonthlyInstallment);
      finalManualMonthlyInstallment = evalManual !== null ? evalManual : undefined;
    } else if (type === 'loan') {
      const evalBal = evaluateMathExpression(balanceOwed) || evaluateMathExpression(openingBalance) || 0;
      finalBalanceOwed = evalBal;
      finalOpeningBalance = evalBal;
      finalOriginalLoanAmount = evaluateMathExpression(originalLoanAmount) || evalBal;
      finalTotalTermMonths = parseInt(totalTermMonths) || 36;
      finalRemainingTermMonths = parseInt(remainingTermMonths) || finalTotalTermMonths;
      finalInterestRate = parseFloat(interestRate) || 18.5;
      finalCreditLifeInsurance = evaluateMathExpression(creditLifeInsurance) || 0;
      finalMonthlyInstallment = numLoanCalculatedInstallment;
      const evalManual = evaluateMathExpression(manualMonthlyInstallment);
      finalManualMonthlyInstallment = evalManual !== null ? evalManual : undefined;
    } else if (type === 'tax_free' || type === 'investment') {
      const evalBal = evaluateMathExpression(openingBalance);
      finalOpeningBalance = evalBal !== null ? evalBal : 0;
      finalExpectedReturn = parseFloat(expectedAnnualReturn) || 0;
      finalMgmtFee = parseFloat(managementFeePercentage) || 0;
      finalMonthlyContribution = evaluateMathExpression(monthlyContribution) || 0;

      if (type === 'tax_free') {
        finalYtdContribution = evaluateMathExpression(ytdContribution) || 0;
        finalLifetimeContribution = evaluateMathExpression(lifetimeContribution) || 0;
      }
    } else {
      // Cash, Cheque, Savings, Other
      const evalBal = evaluateMathExpression(openingBalance);
      finalOpeningBalance = evalBal !== null ? evalBal : 0;
    }

    const accountData: FinancialAccount = {
      id: initialAccount?.id || `acc_${Date.now()}`,
      name: name.trim(),
      type,
      institution: institution.trim() || undefined,
      accountNumberMask: accountNumberMask.trim() || undefined,
      openingBalance: finalOpeningBalance,
      color,
      isDefault,
      notes: notes.trim() || undefined,

      // Baby Step Assignment
      babyStepAssignment: babyStepAssignment,

      // Credit card details
      creditLimit: finalCreditLimit,
      availableCredit: finalAvailableCredit,
      balanceOwed: finalBalanceOwed,
      interestRate: finalInterestRate,
      monthlyFee: finalMonthlyFee,
      minimumPaymentPercentage: finalMinPercent,
      minimumPaymentAmount: finalMinPayment,

      // Investment details
      expectedAnnualReturn: finalExpectedReturn,
      managementFeePercentage: finalMgmtFee,
      monthlyContribution: finalMonthlyContribution,
      ytdContribution: finalYtdContribution,
      lifetimeContribution: finalLifetimeContribution,

      // Home Loan details
      purchasePrice: finalPurchasePrice,
      marketValue: finalMarketValue,
      totalTermYears: finalTotalTermYears,
      totalTermMonths: finalTotalTermMonths,
      remainingTermMonths: finalRemainingTermMonths,
      monthlyInstallment: finalMonthlyInstallment,
      manualMonthlyInstallment: finalManualMonthlyInstallment,

      // Personal Loan & Vehicle details
      originalLoanAmount: finalOriginalLoanAmount,
      creditLifeInsurance: finalCreditLifeInsurance,
      vehicleMakeModel: finalVehicleMakeModel,
      balloonPaymentPercentage: finalBalloonPaymentPercentage,
      balloonAmount: finalBalloonAmount,

      createdAt: initialAccount?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(accountData);
    onClose();
  };

  const selectedTypeConfig = ACCOUNT_TYPES.find((t) => t.id === type) || ACCOUNT_TYPES[0];

  // Helper for SARS TFSA limits
  const numYtd = evaluateMathExpression(ytdContribution) || 0;
  const sarsAnnualLimit = 36000;
  const remainingTfsaRoom = Math.max(0, sarsAnnualLimit - numYtd);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[#1C1C1E] border border-white/10 rounded-[24px] max-w-xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#252528]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[14px] flex items-center justify-center text-white shadow-md shrink-0"
              style={{ backgroundColor: color || selectedTypeConfig.color }}
            >
              {type === 'cash' && <Banknote className="w-5 h-5" />}
              {type === 'cheque' && <CreditCard className="w-5 h-5" />}
              {type === 'savings' && <PiggyBank className="w-5 h-5" />}
              {type === 'tax_free' && <Sparkles className="w-5 h-5" />}
              {type === 'investment' && <TrendingUp className="w-5 h-5" />}
              {type === 'credit_card' && <CreditCard className="w-5 h-5" />}
              {type === 'loan' && <Wallet className="w-5 h-5" />}
              {type === 'vehicle_loan' && <Car className="w-5 h-5" />}
              {type === 'home_loan' && <Home className="w-5 h-5" />}
              {type === 'other' && <Wallet className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                {initialAccount ? 'Edit Account' : 'Create Financial Account'}
              </h2>
              <p className="text-xs text-slate-400">
                {selectedTypeConfig.label} · South African Multi-account Ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-white">
          {errorMessage && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-[12px] flex items-center gap-2 text-xs text-red-300 font-semibold">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Account Category / Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Account Category & Type *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ACCOUNT_TYPES.map((t) => {
                const isSelected = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTypeSelect(t.id)}
                    className={`p-2.5 rounded-[12px] border text-left transition flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#2C2C2E] border-[#30D158] ring-1 ring-[#30D158] text-white shadow-md'
                        : 'bg-[#252528] border-white/5 text-slate-400 hover:text-slate-200 hover:bg-[#2A2A2D]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                      {t.isLiability && (
                        <span className="text-[9px] px-1 py-0.2 bg-red-500/20 text-red-400 rounded font-semibold">
                          Liability
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-100 leading-tight">
                      {t.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {selectedTypeConfig.description}
            </p>
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Account Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Family Cheque, Discovery Platinum CC, 32-Day Notice, WesBank Vehicle, Home Bond"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2.5 rounded-[14px] text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
            />
          </div>

          {/* Bank / Institution (Free text with quick datalist & quick suggestion chips) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Bank / Financial Institution
            </label>
            <input
              type="text"
              list="sa-institutions-list"
              placeholder="e.g. Capitec, FNB, Standard Bank, WesBank, MFC, SA Home Loans, EasyEquities"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2 rounded-[12px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
            />
            <datalist id="sa-institutions-list">
              {SOUTH_AFRICAN_INSTITUTIONS.map((inst) => (
                <option key={inst.name} value={inst.name} />
              ))}
            </datalist>

            {/* Quick selection chips */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {SOUTH_AFRICAN_INSTITUTIONS.slice(0, 8).map((inst) => (
                <button
                  key={inst.shortName}
                  type="button"
                  onClick={() => {
                    setInstitution(inst.name);
                    if (inst.badgeColor) setColor(inst.badgeColor);
                  }}
                  className="text-[10px] px-2 py-0.5 rounded-[6px] bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  {inst.shortName}
                </button>
              ))}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BABY STEPS ASSIGNMENT (For Savings, TFSA, Investments, Cash, Cheque)      */}
          {/* ========================================================================= */}
          {(type === 'savings' ||
            type === 'investment' ||
            type === 'tax_free' ||
            type === 'cheque' ||
            type === 'cash' ||
            type === 'other') && (
            <div className="p-3.5 rounded-[16px] bg-[#252528] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-[#FF9F0A]" />
                  <span>Assign to Dave Ramsey Baby Step (Optional)</span>
                </label>
                {babyStepAssignment && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                    Step {babyStepAssignment} Linked
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Link this account so its live balance automatically tracks your progress against the required target for that step.
              </p>
              <select
                value={babyStepAssignment !== null && babyStepAssignment !== undefined ? babyStepAssignment.toString() : ''}
                onChange={(e) =>
                  setBabyStepAssignment(e.target.value ? parseInt(e.target.value) : null)
                }
                className="w-full bg-[#1C1C1E] border border-white/10 text-white rounded-[10px] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#30D158]"
              >
                <option value="">None (Everyday Liquidity / General Account)</option>
                <option value="1">Baby Step 1: Starter Emergency Fund (R20,000 Target)</option>
                <option value="3">Baby Step 3: Fully Funded 3–6 Months Emergency Fund</option>
                <option value="4">Baby Step 4: 15% Retirement & Long-Term Wealth</option>
                <option value="5">Baby Step 5: Children's College / Education Fund</option>
                <option value="6">Baby Step 6: Pay Off Primary Home Bond Early</option>
              </select>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DYNAMIC SECTION 1: CREDIT CARD DETAILS                                    */}
          {/* ========================================================================= */}
          {type === 'credit_card' && (
            <div className="p-4 rounded-[16px] bg-red-500/5 border border-red-500/20 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-red-500/15">
                <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                  <CreditCard className="w-4 h-4" />
                  <span>Credit Facility & Debt Snowball Integration</span>
                </div>
                <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-semibold">
                  Negative Liability
                </span>
              </div>

              {/* Limit, Owed, and Available Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Total Credit Limit */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Total Credit Limit (R) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">
                      R
                    </span>
                    <input
                      type="text"
                      placeholder="25000"
                      value={creditLimit}
                      onChange={(e) => handleCreditLimitChange(e.target.value)}
                      required
                      className="w-full bg-[#1C1C1E] border border-white/10 text-white pl-7 pr-2 py-2 rounded-[10px] text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-red-400"
                    />
                  </div>
                </div>

                {/* Amount Currently Borrowed / Owed */}
                <div>
                  <label className="block text-[11px] font-semibold text-rose-300 mb-1">
                    Amount Borrowed / Owed (R) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-400 text-xs font-bold pointer-events-none">
                      R
                    </span>
                    <input
                      type="text"
                      placeholder="5000"
                      value={balanceOwed}
                      onChange={(e) => handleBalanceOwedChange(e.target.value)}
                      required
                      className="w-full bg-[#1C1C1E] border border-rose-500/40 text-rose-300 pl-7 pr-2 py-2 rounded-[10px] text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>
                </div>

                {/* Available Credit to Use */}
                <div>
                  <label className="block text-[11px] font-semibold text-emerald-300 mb-1">
                    Available Credit (R)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-400 text-xs font-bold pointer-events-none">
                      R
                    </span>
                    <input
                      type="text"
                      placeholder="20000"
                      value={availableCredit}
                      onChange={(e) => handleAvailableCreditChange(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-emerald-500/30 text-emerald-300 pl-7 pr-2 py-2 rounded-[10px] text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* Interest Rate, Monthly NCA Admin Fee, and Min Payment % */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Interest Rate (% p.a.)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="21.75"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2.5 py-2 rounded-[10px] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-red-400"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                      %
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Monthly Admin Fee (R)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">
                      R
                    </span>
                    <input
                      type="text"
                      placeholder="0.00"
                      value={monthlyFee}
                      onChange={(e) => setMonthlyFee(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-white/10 text-white pl-7 pr-2 py-2 rounded-[10px] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-red-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Min Required % (p.a.)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="3.0"
                      value={minimumPaymentPercentage}
                      onChange={(e) => setMinimumPaymentPercentage(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2.5 py-2 rounded-[10px] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-red-400"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Estimated Monthly Minimum Payment Live Card */}
              <div className="p-3 rounded-[12px] bg-[#1C1C1E] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">
                    Estimated Monthly Minimum Required Payment:
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Calculated as {numMinPercentage}% of balance owed + {formatZAR(numMonthlyFee)} fee (min R100)
                  </span>
                </div>
                <span className="text-sm sm:text-base font-black text-rose-400 font-mono">
                  {formatZAR(estimatedMinPayment)}/mo
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>
                  This credit card is automatically populated into your <strong>Baby Step 2 Debt Snowball</strong>!
                </span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DYNAMIC SECTION 2: HOME LOAN / MORTGAGE BOND (BABY STEP 6)                */}
          {/* ========================================================================= */}
          {type === 'home_loan' && (
            <div className="p-4 rounded-[16px] bg-indigo-500/5 border border-indigo-500/20 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-500/15">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                  <Home className="w-4 h-4" />
                  <span>Primary Home Loan & Property Equity (Baby Step 6)</span>
                </div>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-semibold">
                  Step 6 Mortgage
                </span>
              </div>

              {/* Purchase Price & Current Market Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Original Purchase Price (R) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                      R
                    </span>
                    <input
                      type="text"
                      placeholder="1500000"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      required
                      className="w-full bg-[#1C1C1E] border border-white/10 text-white pl-7 pr-2 py-2 rounded-[10px] text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-emerald-300 mb-1">
                    Current Property Value if Sold Now (R) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-400 text-xs font-bold">
                      R
                    </span>
                    <input
                      type="text"
                      placeholder="1750000"
                      value={marketValue}
                      onChange={(e) => setMarketValue(e.target.value)}
                      required
                      className="w-full bg-[#1C1C1E] border border-emerald-500/30 text-emerald-300 pl-7 pr-2 py-2 rounded-[10px] text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Outstanding Bond Balance & Interest Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-rose-300 mb-1">
                    Current Outstanding Bond Balance (R) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-400 text-xs font-bold">
                      R
                    </span>
                    <input
                      type="text"
                      placeholder="1200000"
                      value={balanceOwed || openingBalance}
                      onChange={(e) => {
                        setBalanceOwed(e.target.value);
                        setOpeningBalance(e.target.value);
                      }}
                      required
                      className="w-full bg-[#1C1C1E] border border-rose-500/30 text-rose-300 pl-7 pr-2 py-2 rounded-[10px] text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Bond Interest Rate (% p.a.)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="11.75"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2.5 py-2 rounded-[10px] text-xs font-mono"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Years, Remaining Months, and Admin Fee */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Total Bond Term (Years)
                  </label>
                  <input
                    type="number"
                    placeholder="20"
                    value={totalTermYears}
                    onChange={(e) => setTotalTermYears(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2.5 py-2 rounded-[10px] text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Remaining Term (Months left)
                  </label>
                  <input
                    type="number"
                    placeholder="216"
                    value={remainingTermMonths}
                    onChange={(e) => setRemainingTermMonths(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2.5 py-2 rounded-[10px] text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Monthly Bank Fee (R)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                      R
                    </span>
                    <input
                      type="text"
                      placeholder="69.00"
                      value={monthlyFee}
                      onChange={(e) => setMonthlyFee(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-white/10 text-white pl-7 pr-2 py-2 rounded-[10px] text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Manual vs Calculated Monthly Installment */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Actual Debit Order / Monthly Installment Paid (R)</span>
                  <span className="text-[10px] text-slate-400">Leave blank to use calculated</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-400 text-xs font-bold">
                    R
                  </span>
                  <input
                    type="text"
                    placeholder={`Calculated: ${formatZAR(numBondCalculatedInstallment)}`}
                    value={manualMonthlyInstallment}
                    onChange={(e) => setManualMonthlyInstallment(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-indigo-500/30 text-white pl-7 pr-2 py-2 rounded-[10px] text-xs font-mono"
                  />
                </div>
              </div>

              {/* Real-time Bond Metrics Preview */}
              <div className="p-3 rounded-[12px] bg-[#1C1C1E] border border-white/10 space-y-2 text-xs">
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Home Equity Built:</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {formatZAR(bondHomeEquity)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Loan-to-Value (LTV):</span>
                    <span className="font-bold text-indigo-300 font-mono">
                      {bondLTV.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Amortized Installment:</span>
                    <span className="font-bold text-white font-mono">
                      {formatZAR(numBondCalculatedInstallment)}/mo
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-white/5">
                  Home equity counts positively towards your Total Net Worth! As per Dave Ramsey rules, primary mortgage is addressed in <strong>Baby Step 6</strong>.
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DYNAMIC SECTION 3: VEHICLE FINANCE / CAR LOAN                             */}
          {/* ========================================================================= */}
          {type === 'vehicle_loan' && (
            <div className="p-4 rounded-[16px] bg-rose-500/5 border border-rose-500/20 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-rose-500/15">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                  <Car className="w-4 h-4" />
                  <span>Vehicle Asset Finance (WesBank, MFC, ABSA, etc.)</span>
                </div>
                <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-semibold">
                  Step 2 Snowball
                </span>
              </div>

              {/* Vehicle Make/Model */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Vehicle Make, Model & Year *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2022 Volkswagen Polo GTI / 2021 Toyota Hilux 2.8 GD-6"
                  value={vehicleMakeModel}
                  onChange={(e) => setVehicleMakeModel(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-white/10 text-white px-3 py-2 rounded-[10px] text-xs"
                />
              </div>

              {/* Purchase Price & Selling Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Purchase Price / Original Financed (R) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                      R
                    </span>
                    <input
                      type="text"
                      placeholder="350000"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      required
                      className="w-full bg-[#1C1C1E] border border-white/10 text-white pl-7 pr-2 py-2 rounded-[10px] text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-emerald-300 mb-1">
                    Current Selling / Trade-In Value (R) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-400 text-xs font-bold">
                      R
                    </span>
                    <input
                      type="text"
                      placeholder="310000"
                      value={marketValue}
                      onChange={(e) => setMarketValue(e.target.value)}
                      required
                      className="w-full bg-[#1C1C1E] border border-emerald-500/30 text-emerald-300 pl-7 pr-2 py-2 rounded-[10px] text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Current Settlement Balance & Interest Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-rose-300 mb-1">
                    Current Outstanding Settlement Balance (R) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-400 text-xs font-bold">
                      R
                    </span>
                    <input
                      type="text"
                      placeholder="280000"
                      value={balanceOwed || openingBalance}
                      onChange={(e) => {
                        setBalanceOwed(e.target.value);
                        setOpeningBalance(e.target.value);
                      }}
                      required
                      className="w-full bg-[#1C1C1E] border border-rose-500/30 text-rose-300 pl-7 pr-2 py-2 rounded-[10px] text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Interest Rate (% p.a.)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="12.50"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2.5 py-2 rounded-[10px] text-xs font-mono"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Balloon / Residual details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Balloon / Residual (%) (e.g. 20% or 0%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="0"
                    value={balloonPaymentPercentage}
                    onChange={(e) => {
                      setBalloonPaymentPercentage(e.target.value);
                      const p = parseFloat(e.target.value) || 0;
                      if (numVehiclePurchasePrice > 0) {
                        setBalloonAmount(Math.round(numVehiclePurchasePrice * (p / 100)).toString());
                      }
                    }}
                    className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2.5 py-2 rounded-[10px] text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                    Balloon Amount Due at End (R)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-400 text-xs font-bold">
                      R
                    </span>
                    <input
                      type="text"
                      placeholder="0"
                      value={balloonAmount}
                      onChange={(e) => setBalloonAmount(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-white/10 text-white pl-7 pr-2 py-2 rounded-[10px] text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Term, Fees & CLI */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                    Total Term (Mos)
                  </label>
                  <input
                    type="number"
                    placeholder="72"
                    value={totalTermMonths}
                    onChange={(e) => setTotalTermMonths(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2 py-1.5 rounded-[8px] text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                    Months Left
                  </label>
                  <input
                    type="number"
                    placeholder="48"
                    value={remainingTermMonths}
                    onChange={(e) => setRemainingTermMonths(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2 py-1.5 rounded-[8px] text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                    Monthly Fee (R)
                  </label>
                  <input
                    type="text"
                    placeholder="69.00"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2 py-1.5 rounded-[8px] text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                    Credit Life Ins (R)
                  </label>
                  <input
                    type="text"
                    placeholder="150.00"
                    value={creditLifeInsurance}
                    onChange={(e) => setCreditLifeInsurance(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2 py-1.5 rounded-[8px] text-xs font-mono"
                  />
                </div>
              </div>

              {/* Actual vs Calculated Installment */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Actual Monthly Debit Order (R)</span>
                  <span className="text-[10px] text-slate-400">Leave blank to use calculated</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-400 text-xs font-bold">
                    R
                  </span>
                  <input
                    type="text"
                    placeholder={`Calculated: ${formatZAR(numVehicleCalculatedInstallment)}`}
                    value={manualMonthlyInstallment}
                    onChange={(e) => setManualMonthlyInstallment(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-rose-500/30 text-white pl-7 pr-2 py-2 rounded-[10px] text-xs font-mono"
                  />
                </div>
              </div>

              {/* Real-time Vehicle Metrics */}
              <div className="p-3 rounded-[12px] bg-[#1C1C1E] border border-white/10 space-y-2 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Vehicle Equity:</span>
                    <span
                      className={`font-bold font-mono ${
                        vehicleEquity >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {vehicleEquity >= 0
                        ? `+${formatZAR(vehicleEquity)}`
                        : `-${formatZAR(Math.abs(vehicleEquity))} (Underwater)`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Calculated Installment:</span>
                    <span className="font-bold text-white font-mono">
                      {formatZAR(numVehicleCalculatedInstallment)}/mo
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Balloon Due:</span>
                    <span className="font-bold text-amber-400 font-mono">
                      {numVehicleBalloon > 0 ? formatZAR(numVehicleBalloon) : 'None'}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-white/5 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>Automatically synced to your <strong>Baby Step 2 Debt Snowball</strong>.</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DYNAMIC SECTION 4: PERSONAL LOAN / OVERDRAFT / DEBT                       */}
          {/* ========================================================================= */}
          {type === 'loan' && (
            <div className="p-4 rounded-[16px] bg-pink-500/5 border border-pink-500/20 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-pink-500/15">
                <div className="flex items-center gap-2 text-pink-400 font-bold text-xs">
                  <Wallet className="w-4 h-4" />
                  <span>Personal Loan / Store Card / Overdraft</span>
                </div>
                <span className="text-[10px] bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded font-semibold">
                  Step 2 Snowball
                </span>
              </div>

              {/* Original Principal & Current Outstanding */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Original Loan Amount (R)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                      R
                    </span>
                    <input
                      type="text"
                      placeholder="50000"
                      value={originalLoanAmount}
                      onChange={(e) => setOriginalLoanAmount(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-white/10 text-white pl-7 pr-2 py-2 rounded-[10px] text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-rose-300 mb-1">
                    Current Outstanding Balance (R) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-400 text-xs font-bold">
                      R
                    </span>
                    <input
                      type="text"
                      placeholder="35000"
                      value={balanceOwed || openingBalance}
                      onChange={(e) => {
                        setBalanceOwed(e.target.value);
                        setOpeningBalance(e.target.value);
                      }}
                      required
                      className="w-full bg-[#1C1C1E] border border-rose-500/30 text-rose-300 pl-7 pr-2 py-2 rounded-[10px] text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Interest Rate, Term, Fees */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                    Interest (% p.a.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="18.50"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2 py-1.5 rounded-[8px] text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                    Months Left
                  </label>
                  <input
                    type="number"
                    placeholder="36"
                    value={remainingTermMonths}
                    onChange={(e) => setRemainingTermMonths(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2 py-1.5 rounded-[8px] text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                    Monthly Fee (R)
                  </label>
                  <input
                    type="text"
                    placeholder="69.00"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2 py-1.5 rounded-[8px] text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                    Credit Life Ins (R)
                  </label>
                  <input
                    type="text"
                    placeholder="95.00"
                    value={creditLifeInsurance}
                    onChange={(e) => setCreditLifeInsurance(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2 py-1.5 rounded-[8px] text-xs font-mono"
                  />
                </div>
              </div>

              {/* Actual Monthly Installment */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Actual Monthly Debit Order / Repayment (R)</span>
                  <span className="text-[10px] text-slate-400">Leave blank to use calculated</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-pink-400 text-xs font-bold">
                    R
                  </span>
                  <input
                    type="text"
                    placeholder={`Calculated: ${formatZAR(numLoanCalculatedInstallment)}`}
                    value={manualMonthlyInstallment}
                    onChange={(e) => setManualMonthlyInstallment(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-pink-500/30 text-white pl-7 pr-2 py-2 rounded-[10px] text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>
                  Automatically integrated into your <strong>Baby Step 2 Debt Snowball</strong>.
                </span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DYNAMIC SECTION 5: INVESTMENT & TAX-FREE (TFSA)                           */}
          {/* ========================================================================= */}
          {(type === 'tax_free' || type === 'investment') && (
            <div className="p-4 rounded-[16px] bg-purple-500/5 border border-purple-500/20 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-purple-500/15">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {type === 'tax_free' ? 'SARS Tax-Free Savings Account (TFSA)' : 'Investment Portfolio'}
                  </span>
                </div>
                {type === 'tax_free' && (
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-semibold">
                    R36,000 / Year SARS Cap
                  </span>
                )}
              </div>

              {/* Current Invested Balance */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Current Invested Capital / Value (ZAR) *</span>
                  <span className="text-[10px] text-slate-400">Supports Math</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400 font-bold text-base pointer-events-none">
                    R
                  </span>
                  <input
                    type="text"
                    placeholder="36000"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    required
                    className="w-full bg-[#1C1C1E] border border-purple-500/30 text-white pl-8 pr-3 py-2.5 rounded-[12px] font-bold text-base font-mono focus:outline-none focus:ring-1 focus:ring-purple-400"
                  />
                </div>
              </div>

              {/* Growth rate, TER Management fee, Monthly contribution */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Expected Return (% p.a.)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="11.5"
                      value={expectedAnnualReturn}
                      onChange={(e) => setExpectedAnnualReturn(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2.5 py-2 rounded-[10px] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                      %
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Annual Fee / TER (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.45"
                      value={managementFeePercentage}
                      onChange={(e) => setManagementFeePercentage(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-white/10 text-white px-2.5 py-2 rounded-[10px] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                      %
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Monthly Contribution (R)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">
                      R
                    </span>
                    <input
                      type="text"
                      placeholder="3000"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-white/10 text-white pl-7 pr-2 py-2 rounded-[10px] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                  </div>
                </div>
              </div>

              {/* TFSA Statutory Limits */}
              {type === 'tax_free' && (
                <div className="p-3 rounded-[12px] bg-[#1C1C1E] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold">
                      YTD Contributed this Tax Year:
                    </span>
                    <div className="w-32 relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">
                        R
                      </span>
                      <input
                        type="text"
                        placeholder="15000"
                        value={ytdContribution}
                        onChange={(e) => setYtdContribution(e.target.value)}
                        className="w-full bg-[#252528] border border-white/10 text-white pl-6 pr-2 py-1 rounded-[8px] text-xs font-mono text-right"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-purple-300 pt-1 border-t border-white/5">
                    <span>Remaining Tax-Free Allowance:</span>
                    <span className="font-bold font-mono text-emerald-400">
                      {formatZAR(remainingTfsaRoom)} / R36,000
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STANDARD SECTION: CASH, CHEQUE, SAVINGS, OTHER                            */}
          {/* ========================================================================= */}
          {type !== 'credit_card' &&
            type !== 'tax_free' &&
            type !== 'investment' &&
            type !== 'home_loan' &&
            type !== 'vehicle_loan' &&
            type !== 'loan' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Opening / Starting Balance (ZAR) *</span>
                  <span className="text-[11px] text-slate-400 font-normal">Supports +, -, *, /</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg pointer-events-none">
                    R
                  </span>
                  <input
                    type="text"
                    placeholder="0.00"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    onBlur={() => {
                      if (isMathExpression(openingBalance)) {
                        const res = evaluateMathExpression(openingBalance);
                        if (res !== null) setOpeningBalance(res.toString());
                      }
                    }}
                    required
                    className="w-full bg-[#2C2C2E] border border-white/10 text-white pl-10 pr-10 py-2.5 rounded-[14px] font-bold text-lg focus:outline-none focus:ring-2 focus:ring-[#30D158]"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                    <Calculator className="w-4 h-4" />
                  </div>
                </div>
              </div>
            )}

          {/* Account Mask / Digits & Color Tag */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Account Number Mask (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. ••• 8492"
                value={accountNumberMask}
                onChange={(e) => setAccountNumberMask(e.target.value)}
                className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2 rounded-[12px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Color Badge
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-9 h-9 rounded-[10px] bg-transparent border border-white/10 cursor-pointer p-0.5"
                />
                <span className="text-xs font-mono text-slate-400">{color}</span>
              </div>
            </div>
          </div>

          {/* Primary Default Account Toggle */}
          <div className="flex items-center gap-3 p-3 rounded-[14px] bg-[#252528] border border-white/5">
            <input
              type="checkbox"
              id="isDefaultAccount"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded text-[#30D158] focus:ring-[#30D158] accent-[#30D158] cursor-pointer"
            />
            <label htmlFor="isDefaultAccount" className="text-xs text-slate-300 cursor-pointer select-none">
              <span className="font-semibold block text-white">Default Primary Account</span>
              Pre-select this account automatically for new expenses and incomes
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Salary debit orders, balloon payoff date, 32-day notice period"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#2C2C2E] border border-white/10 text-white px-3.5 py-2 rounded-[12px] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#30D158]"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[12px] bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-[12px] bg-[#30D158] hover:bg-[#34C759] text-black text-xs sm:text-sm font-bold shadow-md shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
            >
              {initialAccount ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
