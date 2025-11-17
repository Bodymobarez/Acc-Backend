import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * ✅ CORRECT Chart of Accounts for Travel Agency
 * No duplicate codes, proper hierarchy
 */

const chartOfAccounts = [
  // ============================================
  // 1000 - ASSETS (الأصول)
  // ============================================
  {
    code: '1000',
    name: 'Assets',
    nameAr: 'الأصول',
    type: 'ASSET',
    category: 'Main',
    parentCode: null,
    allowManualEntry: false,
    description: 'All company assets'
  },

  // 1100 - Current Assets (الأصول المتداولة)
  {
    code: '1100',
    name: 'Current Assets',
    nameAr: 'الأصول المتداولة',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1000',
    allowManualEntry: false,
    description: 'Assets convertible to cash within one year'
  },

  // 1110 - Cash and Bank (النقد والبنوك)
  {
    code: '1110',
    name: 'Cash and Bank',
    nameAr: 'النقد والبنوك',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1100',
    allowManualEntry: false,
    description: 'Cash and bank accounts'
  },
  {
    code: '1111',
    name: 'Cash on Hand - AED',
    nameAr: 'النقد في الصندوق - درهم',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1110',
    allowManualEntry: true,
    description: 'Physical cash in office (AED)'
  },
  {
    code: '1112',
    name: 'Cash on Hand - USD',
    nameAr: 'النقد في الصندوق - دولار',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1110',
    allowManualEntry: true,
    description: 'Physical cash in office (USD)'
  },
  {
    code: '1113',
    name: 'Cash on Hand - EUR',
    nameAr: 'النقد في الصندوق - يورو',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1110',
    allowManualEntry: true,
    description: 'Physical cash in office (EUR)'
  },
  {
    code: '1114',
    name: 'Bank Account - Main AED',
    nameAr: 'الحساب البنكي الرئيسي - درهم',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1110',
    allowManualEntry: true,
    description: 'Main operating bank account'
  },
  {
    code: '1115',
    name: 'Bank Account - USD',
    nameAr: 'الحساب البنكي - دولار',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1110',
    allowManualEntry: true,
    description: 'Foreign currency account (USD)'
  },

  // 1120 - Accounts Receivable (الذمم المدينة)
  {
    code: '1120',
    name: 'Accounts Receivable',
    nameAr: 'الذمم المدينة',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1100',
    allowManualEntry: false,
    description: 'Money owed by customers'
  },
  {
    code: '1121',
    name: 'Customers - Trade Receivables',
    nameAr: 'العملاء - ذمم تجارية',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1120',
    allowManualEntry: true,
    description: 'Outstanding customer invoices'
  },
  {
    code: '1122',
    name: 'Allowance for Doubtful Debts',
    nameAr: 'مخصص الديون المشكوك فيها',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1120',
    allowManualEntry: true,
    description: 'Reserve for bad debts'
  },

  // 1130 - Prepayments and Advances (المصروفات المدفوعة مقدماً)
  {
    code: '1130',
    name: 'Prepayments',
    nameAr: 'المصروفات المدفوعة مقدماً',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1100',
    allowManualEntry: false,
    description: 'Prepaid expenses'
  },
  {
    code: '1131',
    name: 'Prepaid Rent',
    nameAr: 'الإيجار المدفوع مقدماً',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1130',
    allowManualEntry: true,
    description: 'Prepaid office rent'
  },
  {
    code: '1132',
    name: 'Prepaid Insurance',
    nameAr: 'التأمين المدفوع مقدماً',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1130',
    allowManualEntry: true,
    description: 'Prepaid insurance premiums'
  },

  // 1140 - Other Current Assets
  {
    code: '1140',
    name: 'Other Current Assets',
    nameAr: 'أصول متداولة أخرى',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1100',
    allowManualEntry: false,
    description: 'Other short-term assets'
  },
  {
    code: '1141',
    name: 'VAT Receivable',
    nameAr: 'ضريبة القيمة المضافة المستحقة',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1140',
    allowManualEntry: true,
    description: 'VAT to be recovered from tax authority'
  },
  {
    code: '1142',
    name: 'Employee Advances',
    nameAr: 'سلف الموظفين',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1140',
    allowManualEntry: true,
    description: 'Cash advances to employees'
  },

  // 1200 - Fixed Assets (الأصول الثابتة)
  {
    code: '1200',
    name: 'Fixed Assets',
    nameAr: 'الأصول الثابتة',
    type: 'ASSET',
    category: 'Fixed',
    parentCode: '1000',
    allowManualEntry: false,
    description: 'Long-term tangible assets'
  },
  {
    code: '1210',
    name: 'Office Equipment',
    nameAr: 'معدات المكتب',
    type: 'ASSET',
    category: 'Fixed',
    parentCode: '1200',
    allowManualEntry: true,
    description: 'Office furniture and equipment'
  },
  {
    code: '1211',
    name: 'Computer Equipment',
    nameAr: 'معدات الحاسب الآلي',
    type: 'ASSET',
    category: 'Fixed',
    parentCode: '1200',
    allowManualEntry: true,
    description: 'Computers and IT equipment'
  },
  {
    code: '1220',
    name: 'Accumulated Depreciation',
    nameAr: 'مجمع الإهلاك',
    type: 'ASSET',
    category: 'Fixed',
    parentCode: '1200',
    allowManualEntry: true,
    description: 'Total depreciation of fixed assets'
  },

  // ============================================
  // 2000 - LIABILITIES (الالتزامات)
  // ============================================
  {
    code: '2000',
    name: 'Liabilities',
    nameAr: 'الالتزامات',
    type: 'LIABILITY',
    category: 'Main',
    parentCode: null,
    allowManualEntry: false,
    description: 'All company liabilities'
  },

  // 2100 - Current Liabilities (الالتزامات المتداولة)
  {
    code: '2100',
    name: 'Current Liabilities',
    nameAr: 'الالتزامات المتداولة',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2000',
    allowManualEntry: false,
    description: 'Short-term obligations'
  },

  // 2110 - Accounts Payable (الذمم الدائنة)
  {
    code: '2110',
    name: 'Accounts Payable',
    nameAr: 'الذمم الدائنة',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2100',
    allowManualEntry: false,
    description: 'Money owed to suppliers'
  },
  {
    code: '2111',
    name: 'Suppliers - Trade Payables',
    nameAr: 'الموردون - ذمم تجارية',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2110',
    allowManualEntry: true,
    description: 'Outstanding supplier invoices'
  },

  // 2120 - Tax Payable (الضرائب المستحقة)
  {
    code: '2120',
    name: 'Taxes Payable',
    nameAr: 'الضرائب المستحقة',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2100',
    allowManualEntry: false,
    description: 'Taxes owed to authorities'
  },
  {
    code: '2121',
    name: 'VAT Payable',
    nameAr: 'ضريبة القيمة المضافة المستحقة',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2120',
    allowManualEntry: true,
    description: 'VAT collected and payable to tax authority'
  },

  // 2130 - Accrued Expenses (المصروفات المستحقة)
  {
    code: '2130',
    name: 'Accrued Expenses',
    nameAr: 'المصروفات المستحقة',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2100',
    allowManualEntry: false,
    description: 'Expenses incurred but not yet paid'
  },
  {
    code: '2131',
    name: 'Salaries Payable',
    nameAr: 'الرواتب المستحقة',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2130',
    allowManualEntry: true,
    description: 'Unpaid employee salaries'
  },
  {
    code: '2132',
    name: 'Commissions Payable',
    nameAr: 'العمولات المستحقة',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2130',
    allowManualEntry: true,
    description: 'Unpaid employee commissions'
  },

  // 2140 - Customer Deposits (ودائع العملاء)
  {
    code: '2140',
    name: 'Customer Deposits',
    nameAr: 'ودائع العملاء',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2100',
    allowManualEntry: true,
    description: 'Advance payments from customers'
  },

  // ============================================
  // 3000 - EQUITY (حقوق الملكية)
  // ============================================
  {
    code: '3000',
    name: 'Equity',
    nameAr: 'حقوق الملكية',
    type: 'EQUITY',
    category: 'Main',
    parentCode: null,
    allowManualEntry: false,
    description: 'Owner equity and retained earnings'
  },
  {
    code: '3100',
    name: 'Capital',
    nameAr: 'رأس المال',
    type: 'EQUITY',
    category: 'Capital',
    parentCode: '3000',
    allowManualEntry: true,
    description: 'Owner invested capital'
  },
  {
    code: '3200',
    name: 'Retained Earnings',
    nameAr: 'الأرباح المحتجزة',
    type: 'EQUITY',
    category: 'Retained',
    parentCode: '3000',
    allowManualEntry: true,
    description: 'Accumulated profits'
  },
  {
    code: '3300',
    name: 'Current Year Profit/Loss',
    nameAr: 'أرباح/خسائر السنة الجارية',
    type: 'EQUITY',
    category: 'Current',
    parentCode: '3000',
    allowManualEntry: false,
    description: 'Current year net income'
  },

  // ============================================
  // 4000 - REVENUE (الإيرادات)
  // ============================================
  {
    code: '4000',
    name: 'Revenue',
    nameAr: 'الإيرادات',
    type: 'REVENUE',
    category: 'Main',
    parentCode: null,
    allowManualEntry: false,
    description: 'All company revenue'
  },

  // 4100 - Service Revenue (إيرادات الخدمات)
  {
    code: '4100',
    name: 'Travel Services Revenue',
    nameAr: 'إيرادات الخدمات السياحية',
    type: 'REVENUE',
    category: 'Operating',
    parentCode: '4000',
    allowManualEntry: false,
    description: 'Revenue from travel services'
  },
  {
    code: '4110',
    name: 'Flight Booking Revenue',
    nameAr: 'إيرادات حجز الطيران',
    type: 'REVENUE',
    category: 'Operating',
    parentCode: '4100',
    allowManualEntry: true,
    description: 'Revenue from flight bookings'
  },
  {
    code: '4120',
    name: 'Hotel Booking Revenue',
    nameAr: 'إيرادات حجز الفنادق',
    type: 'REVENUE',
    category: 'Operating',
    parentCode: '4100',
    allowManualEntry: true,
    description: 'Revenue from hotel bookings'
  },
  {
    code: '4130',
    name: 'Visa Services Revenue',
    nameAr: 'إيرادات خدمات التأشيرات',
    type: 'REVENUE',
    category: 'Operating',
    parentCode: '4100',
    allowManualEntry: true,
    description: 'Revenue from visa services'
  },
  {
    code: '4140',
    name: 'Umrah Package Revenue',
    nameAr: 'إيرادات باقات العمرة',
    type: 'REVENUE',
    category: 'Operating',
    parentCode: '4100',
    allowManualEntry: true,
    description: 'Revenue from Umrah packages'
  },
  {
    code: '4150',
    name: 'Hajj Package Revenue',
    nameAr: 'إيرادات باقات الحج',
    type: 'REVENUE',
    category: 'Operating',
    parentCode: '4100',
    allowManualEntry: true,
    description: 'Revenue from Hajj packages'
  },
  {
    code: '4160',
    name: 'Tourism Package Revenue',
    nameAr: 'إيرادات الباقات السياحية',
    type: 'REVENUE',
    category: 'Operating',
    parentCode: '4100',
    allowManualEntry: true,
    description: 'Revenue from tourism packages'
  },
  {
    code: '4170',
    name: 'Insurance Revenue',
    nameAr: 'إيرادات التأمين',
    type: 'REVENUE',
    category: 'Operating',
    parentCode: '4100',
    allowManualEntry: true,
    description: 'Revenue from travel insurance'
  },
  {
    code: '4180',
    name: 'Other Services Revenue',
    nameAr: 'إيرادات خدمات أخرى',
    type: 'REVENUE',
    category: 'Operating',
    parentCode: '4100',
    allowManualEntry: true,
    description: 'Revenue from miscellaneous services'
  },

  // 4900 - Other Income (إيرادات أخرى)
  {
    code: '4900',
    name: 'Other Income',
    nameAr: 'إيرادات أخرى',
    type: 'REVENUE',
    category: 'Other',
    parentCode: '4000',
    allowManualEntry: false,
    description: 'Non-operating income'
  },
  {
    code: '4910',
    name: 'Foreign Exchange Gain',
    nameAr: 'أرباح فروقات العملة',
    type: 'REVENUE',
    category: 'Other',
    parentCode: '4900',
    allowManualEntry: true,
    description: 'Gains from currency exchange'
  },
  {
    code: '4920',
    name: 'Interest Income',
    nameAr: 'إيرادات الفوائد',
    type: 'REVENUE',
    category: 'Other',
    parentCode: '4900',
    allowManualEntry: true,
    description: 'Interest earned on deposits'
  },

  // ============================================
  // 5000 - COST OF SERVICES (تكلفة الخدمات)
  // ============================================
  {
    code: '5000',
    name: 'Cost of Services',
    nameAr: 'تكلفة الخدمات',
    type: 'EXPENSE',
    category: 'COS',
    parentCode: null,
    allowManualEntry: false,
    description: 'Direct costs of services sold'
  },
  {
    code: '5100',
    name: 'Supplier Costs',
    nameAr: 'تكاليف الموردين',
    type: 'EXPENSE',
    category: 'COS',
    parentCode: '5000',
    allowManualEntry: false,
    description: 'Costs paid to service suppliers'
  },
  {
    code: '5110',
    name: 'Flight Ticket Costs',
    nameAr: 'تكلفة تذاكر الطيران',
    type: 'EXPENSE',
    category: 'COS',
    parentCode: '5100',
    allowManualEntry: true,
    description: 'Cost of flight tickets from suppliers'
  },
  {
    code: '5120',
    name: 'Hotel Accommodation Costs',
    nameAr: 'تكلفة الإقامة الفندقية',
    type: 'EXPENSE',
    category: 'COS',
    parentCode: '5100',
    allowManualEntry: true,
    description: 'Cost of hotel bookings from suppliers'
  },
  {
    code: '5130',
    name: 'Visa Processing Costs',
    nameAr: 'تكلفة معالجة التأشيرات',
    type: 'EXPENSE',
    category: 'COS',
    parentCode: '5100',
    allowManualEntry: true,
    description: 'Cost of visa processing'
  },
  {
    code: '5140',
    name: 'Ground Services Costs',
    nameAr: 'تكلفة الخدمات الأرضية',
    type: 'EXPENSE',
    category: 'COS',
    parentCode: '5100',
    allowManualEntry: true,
    description: 'Transportation and ground handling'
  },
  {
    code: '5150',
    name: 'Transfer Service Costs',
    nameAr: 'تكلفة خدمات النقل',
    type: 'EXPENSE',
    category: 'COS',
    parentCode: '5100',
    allowManualEntry: true,
    description: 'Transfer and transportation service costs'
  },

  // 5200 - Cost Adjustments & Refunds
  {
    code: '5200',
    name: 'Cost Refunds and Adjustments',
    nameAr: 'استردادات وتعديلات التكلفة',
    type: 'EXPENSE',
    category: 'COS',
    parentCode: '5000',
    allowManualEntry: false,
    description: 'Refunds and adjustments to cost of services'
  },
  {
    code: '5210',
    name: 'Flight Booking Cost Refunds',
    nameAr: 'استرداد تكلفة حجز الطيران',
    type: 'EXPENSE',
    category: 'COS',
    parentCode: '5200',
    allowManualEntry: true,
    description: 'Refunds on flight ticket costs'
  },
  {
    code: '5220',
    name: 'Hotel Booking Cost Refunds',
    nameAr: 'استرداد تكلفة حجز الفندق',
    type: 'EXPENSE',
    category: 'COS',
    parentCode: '5200',
    allowManualEntry: true,
    description: 'Refunds on hotel booking costs'
  },
  {
    code: '5230',
    name: 'Visa Services Cost Refunds',
    nameAr: 'استرداد تكلفة خدمات التأشيرات',
    type: 'EXPENSE',
    category: 'COS',
    parentCode: '5200',
    allowManualEntry: true,
    description: 'Refunds on visa processing costs'
  },
  {
    code: '5240',
    name: 'Ground Services Cost Refunds',
    nameAr: 'استرداد تكلفة الخدمات الأرضية',
    type: 'EXPENSE',
    category: 'COS',
    parentCode: '5200',
    allowManualEntry: true,
    description: 'Refunds on ground service costs'
  },
  {
    code: '5250',
    name: 'Transfer Service Cost Refunds',
    nameAr: 'استرداد تكلفة خدمات النقل',
    type: 'EXPENSE',
    category: 'COS',
    parentCode: '5200',
    allowManualEntry: true,
    description: 'Refunds on transfer service costs'
  },

  // ============================================
  // 6000 - OPERATING EXPENSES (المصروفات التشغيلية)
  // ============================================
  {
    code: '6000',
    name: 'Operating Expenses',
    nameAr: 'المصروفات التشغيلية',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: null,
    allowManualEntry: false,
    description: 'Business operating expenses'
  },

  // 6100 - Employee Expenses (مصروفات الموظفين)
  {
    code: '6100',
    name: 'Employee Expenses',
    nameAr: 'مصروفات الموظفين',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6000',
    allowManualEntry: false,
    description: 'All employee-related costs'
  },
  {
    code: '6110',
    name: 'Salaries and Wages',
    nameAr: 'الرواتب والأجور',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6100',
    allowManualEntry: true,
    description: 'Employee salaries'
  },
  {
    code: '6120',
    name: 'Employee Commissions',
    nameAr: 'عمولات الموظفين',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6100',
    allowManualEntry: true,
    description: 'Sales commissions paid to employees'
  },
  {
    code: '6130',
    name: 'Employee Benefits',
    nameAr: 'مزايا الموظفين',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6100',
    allowManualEntry: true,
    description: 'Health insurance, end of service, etc.'
  },
  {
    code: '6140',
    name: 'Training and Development',
    nameAr: 'التدريب والتطوير',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6100',
    allowManualEntry: true,
    description: 'Employee training costs'
  },

  // 6200 - Office Expenses (مصروفات المكتب)
  {
    code: '6200',
    name: 'Office Expenses',
    nameAr: 'مصروفات المكتب',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6000',
    allowManualEntry: false,
    description: 'Office operating costs'
  },
  {
    code: '6210',
    name: 'Rent Expense',
    nameAr: 'مصروف الإيجار',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6200',
    allowManualEntry: true,
    description: 'Office rent'
  },
  {
    code: '6220',
    name: 'Utilities',
    nameAr: 'المرافق',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6200',
    allowManualEntry: true,
    description: 'Electricity, water, internet'
  },
  {
    code: '6230',
    name: 'Office Supplies',
    nameAr: 'مستلزمات المكتب',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6200',
    allowManualEntry: true,
    description: 'Stationery and office supplies'
  },
  {
    code: '6240',
    name: 'Maintenance and Repairs',
    nameAr: 'الصيانة والإصلاحات',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6200',
    allowManualEntry: true,
    description: 'Office maintenance'
  },

  // 6300 - Marketing Expenses (مصروفات التسويق)
  {
    code: '6300',
    name: 'Marketing Expenses',
    nameAr: 'مصروفات التسويق',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6000',
    allowManualEntry: false,
    description: 'Marketing and advertising costs'
  },
  {
    code: '6310',
    name: 'Advertising',
    nameAr: 'الإعلانات',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6300',
    allowManualEntry: true,
    description: 'Online and offline advertising'
  },
  {
    code: '6320',
    name: 'Website and Digital Marketing',
    nameAr: 'الموقع والتسويق الإلكتروني',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6300',
    allowManualEntry: true,
    description: 'Website hosting, SEO, social media'
  },
  {
    code: '6330',
    name: 'Promotional Materials',
    nameAr: 'المواد الترويجية',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6300',
    allowManualEntry: true,
    description: 'Brochures, banners, gifts'
  },

  // 6400 - Administrative Expenses (المصروفات الإدارية)
  {
    code: '6400',
    name: 'Administrative Expenses',
    nameAr: 'المصروفات الإدارية',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6000',
    allowManualEntry: false,
    description: 'General administrative costs'
  },
  {
    code: '6410',
    name: 'Professional Fees',
    nameAr: 'أتعاب المهنيين',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6400',
    allowManualEntry: true,
    description: 'Legal, accounting, consulting fees'
  },
  {
    code: '6420',
    name: 'Insurance',
    nameAr: 'التأمين',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6400',
    allowManualEntry: true,
    description: 'Business insurance premiums'
  },
  {
    code: '6430',
    name: 'License and Permits',
    nameAr: 'الرخص والتصاريح',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6400',
    allowManualEntry: true,
    description: 'Business licenses and renewals'
  },
  {
    code: '6440',
    name: 'Bank Charges',
    nameAr: 'رسوم البنوك',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6400',
    allowManualEntry: true,
    description: 'Bank fees and charges'
  },
  {
    code: '6450',
    name: 'Depreciation',
    nameAr: 'الإهلاك',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6400',
    allowManualEntry: true,
    description: 'Depreciation of fixed assets'
  },

  // 6500 - Technology Expenses (مصروفات التقنية)
  {
    code: '6500',
    name: 'Technology Expenses',
    nameAr: 'مصروفات التقنية',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6000',
    allowManualEntry: false,
    description: 'IT and software costs'
  },
  {
    code: '6510',
    name: 'Software Subscriptions',
    nameAr: 'اشتراكات البرامج',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6500',
    allowManualEntry: true,
    description: 'CRM, booking systems, etc.'
  },
  {
    code: '6520',
    name: 'IT Support and Maintenance',
    nameAr: 'دعم وصيانة تقنية المعلومات',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6500',
    allowManualEntry: true,
    description: 'IT support services'
  },

  // 6900 - Other Expenses (مصروفات أخرى)
  {
    code: '6900',
    name: 'Other Expenses',
    nameAr: 'مصروفات أخرى',
    type: 'EXPENSE',
    category: 'Other',
    parentCode: '6000',
    allowManualEntry: false,
    description: 'Miscellaneous expenses'
  },
  {
    code: '6910',
    name: 'Foreign Exchange Loss',
    nameAr: 'خسائر فروقات العملة',
    type: 'EXPENSE',
    category: 'Other',
    parentCode: '6900',
    allowManualEntry: true,
    description: 'Losses from currency exchange'
  },
  {
    code: '6920',
    name: 'Bad Debt Expense',
    nameAr: 'مصروف الديون المعدومة',
    type: 'EXPENSE',
    category: 'Other',
    parentCode: '6900',
    allowManualEntry: true,
    description: 'Written-off uncollectible debts'
  },
  {
    code: '6930',
    name: 'Miscellaneous Expenses',
    nameAr: 'مصروفات متنوعة',
    type: 'EXPENSE',
    category: 'Other',
    parentCode: '6900',
    allowManualEntry: true,
    description: 'Other small expenses'
  }
];

async function seedCorrectChartOfAccounts() {
  console.log('🌱 Seeding CORRECT Chart of Accounts...\n');

  try {
    // Clear existing accounts
    console.log('🗑️  Clearing old accounts...');
    await prisma.journal_entries.deleteMany({});
    await prisma.accounts.deleteMany({});
    console.log('✅ Old accounts cleared\n');

    // Create accounts map for parent relationships
    const accountsMap = new Map<string, string>();

    // First pass: Create all accounts without parent relationships
    console.log('📝 Creating accounts (pass 1 - no parents)...');
    for (const account of chartOfAccounts) {
      const id = crypto.randomUUID();
      accountsMap.set(account.code, id);
      
      await prisma.accounts.create({
        data: {
          id,
          code: account.code,
          name: account.name,
          nameAr: account.nameAr,
          type: account.type,
          category: account.category || null,
          parentId: null, // Will update in second pass
          balance: 0,
          debitBalance: 0,
          creditBalance: 0,
          isActive: true,
          allowManualEntry: account.allowManualEntry,
          description: account.description || null,
          updatedAt: new Date()
        }
      });
    }
    console.log('✅ All accounts created\n');

    // Second pass: Update parent relationships
    console.log('🔗 Updating parent relationships (pass 2)...');
    for (const account of chartOfAccounts) {
      if (account.parentCode) {
        const accountId = accountsMap.get(account.code);
        const parentId = accountsMap.get(account.parentCode);
        
        if (accountId && parentId) {
          await prisma.accounts.update({
            where: { id: accountId },
            data: { parentId }
          });
        }
      }
    }
    console.log('✅ Parent relationships updated\n');

    // Summary
    const stats = {
      assets: chartOfAccounts.filter(a => a.type === 'ASSET').length,
      liabilities: chartOfAccounts.filter(a => a.type === 'LIABILITY').length,
      equity: chartOfAccounts.filter(a => a.type === 'EQUITY').length,
      revenue: chartOfAccounts.filter(a => a.type === 'REVENUE').length,
      expenses: chartOfAccounts.filter(a => a.type === 'EXPENSE').length,
      total: chartOfAccounts.length
    };

    console.log('\n✅ Chart of Accounts seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`   • Total Accounts: ${stats.total}`);
    console.log(`   • Assets: ${stats.assets} accounts`);
    console.log(`   • Liabilities: ${stats.liabilities} accounts`);
    console.log(`   • Equity: ${stats.equity} accounts`);
    console.log(`   • Revenue: ${stats.revenue} accounts`);
    console.log(`   • Expenses: ${stats.expenses} accounts\n`);

  } catch (error) {
    console.error('❌ Error seeding chart of accounts:', error);
    throw error;
  }
}

// Run the seed
seedCorrectChartOfAccounts()
  .then(() => {
    console.log('✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
