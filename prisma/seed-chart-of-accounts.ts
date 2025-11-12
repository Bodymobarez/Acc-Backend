import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * Complete Chart of Accounts for Travel Agency
 * Aligned with implemented modules: Bookings, Invoices, Customers, Suppliers, Files
 */

const chartOfAccounts = [
  // ============================================
  // 1000 - ASSETS
  // ============================================
  {
    code: '1000',
    name: 'Assets',
    nameAr: 'الأصول',
    type: 'ASSET',
    category: 'Main',
    parentId: null,
    allowManualEntry: false,
    description: 'All company assets'
  },

  // 1100 - Current Assets
  {
    code: '1100',
    name: 'Current Assets',
    nameAr: 'الأصول المتداولة',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1000',
    allowManualEntry: false,
    description: 'Assets expected to be converted to cash within one year'
  },
  {
    code: '1110',
    name: 'Cash and Cash Equivalents',
    nameAr: 'النقد والنقد المعادل',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1100',
    allowManualEntry: false,
    description: 'Cash and highly liquid investments'
  },
  {
    code: '1111',
    name: 'Cash on Hand - AED',
    nameAr: 'النقد في الصندوق - درهم',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1110',
    allowManualEntry: true,
    description: 'Physical cash in office safe (AED)'
  },
  {
    code: '1112',
    name: 'Cash on Hand - USD',
    nameAr: 'النقد في الصندوق - دولار',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1110',
    allowManualEntry: true,
    description: 'Physical cash in office safe (USD)'
  },
  {
    code: '1113',
    name: 'Cash on Hand - EUR',
    nameAr: 'النقد في الصندوق - يورو',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1110',
    allowManualEntry: true,
    description: 'Physical cash in office safe (EUR)'
  },
  {
    code: '1114',
    name: 'Cash on Hand - GBP',
    nameAr: 'النقد في الصندوق - جنيه إسترليني',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1110',
    allowManualEntry: true,
    description: 'Physical cash in office safe (GBP)'
  },
  {
    code: '1115',
    name: 'Cash on Hand - SAR',
    nameAr: 'النقد في الصندوق - ريال سعودي',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1110',
    allowManualEntry: true,
    description: 'Physical cash in office safe (SAR)'
  },
  {
    code: '1116',
    name: 'Bank Accounts',
    nameAr: 'الحسابات البنكية',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1110',
    allowManualEntry: false,
    description: 'All bank accounts'
  },
  {
    code: '1117',
    name: 'Bank Account - AED',
    nameAr: 'الحساب البنكي - درهم',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1116',
    allowManualEntry: true,
    description: 'Main operating bank account (AED)'
  },
  {
    code: '1118',
    name: 'Bank Account - USD',
    nameAr: 'الحساب البنكي - دولار',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1116',
    allowManualEntry: true,
    description: 'Foreign currency bank account (USD)'
  },
  {
    code: '1119',
    name: 'Bank Account - EUR',
    nameAr: 'الحساب البنكي - يورو',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1116',
    allowManualEntry: true,
    description: 'Foreign currency bank account (EUR)'
  },
  {
    code: '1120',
    name: 'Bank Account - GBP',
    nameAr: 'الحساب البنكي - جنيه إسترليني',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1116',
    allowManualEntry: true,
    description: 'Foreign currency bank account (GBP)'
  },
  {
    code: '1121',
    name: 'Bank Account - SAR',
    nameAr: 'الحساب البنكي - ريال سعودي',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1116',
    allowManualEntry: true,
    description: 'Foreign currency bank account (SAR)'
  },

  // 1130 - Accounts Receivable
  {
    code: '1130',
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
    name: 'Accounts Receivable - Customers',
    nameAr: 'الذمم المدينة - العملاء',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1120',
    allowManualEntry: true,
    description: 'Outstanding customer invoices'
  },
  {
    code: '1122',
    name: 'Allowance for Doubtful Accounts',
    nameAr: 'مخصص الديون المشكوك في تحصيلها',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1120',
    allowManualEntry: true,
    description: 'Reserve for uncollectible receivables'
  },

  // 1130 - Advances and Deposits
  {
    code: '1130',
    name: 'Advances and Deposits',
    nameAr: 'السلف والودائع',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1100',
    allowManualEntry: false,
    description: 'Prepaid expenses and supplier advances'
  },
  {
    code: '1131',
    name: 'Advances to Suppliers',
    nameAr: 'سلف الموردين',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1130',
    allowManualEntry: true,
    description: 'Prepayments to suppliers for bookings'
  },
  {
    code: '1132',
    name: 'Supplier Deposits',
    nameAr: 'ودائع الموردين',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1130',
    allowManualEntry: true,
    description: 'Security deposits with suppliers'
  },
  {
    code: '1133',
    name: 'Employee Advances',
    nameAr: 'سلف الموظفين',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1130',
    allowManualEntry: true,
    description: 'Advances given to employees'
  },
  {
    code: '1135',
    name: 'Prepaid Expenses',
    nameAr: 'المصروفات المدفوعة مقدماً',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1130',
    allowManualEntry: true,
    description: 'Expenses paid in advance'
  },

  // 1140 - Inventory & Booking Deposits
  {
    code: '1140',
    name: 'Booking Deposits & Advance Payments',
    nameAr: 'ودائع الحجوزات والدفعات المقدمة',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1100',
    allowManualEntry: false,
    description: 'Deposits for confirmed bookings'
  },
  {
    code: '1141',
    name: 'Flight Booking Deposits',
    nameAr: 'ودائع حجز الرحلات',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1140',
    allowManualEntry: true,
    description: 'Deposits paid for flight reservations'
  },
  {
    code: '1142',
    name: 'Hotel Booking Deposits',
    nameAr: 'ودائع حجز الفنادق',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1140',
    allowManualEntry: true,
    description: 'Deposits paid for hotel reservations'
  },
  {
    code: '1143',
    name: 'Tour Package Deposits',
    nameAr: 'ودائع الباقات السياحية',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1140',
    allowManualEntry: true,
    description: 'Deposits for tour packages'
  },

  // 1200 - Fixed Assets
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
    name: 'Furniture and Equipment',
    nameAr: 'الأثاث والمعدات',
    type: 'ASSET',
    category: 'Fixed',
    parentCode: '1200',
    allowManualEntry: true,
    description: 'Office furniture and equipment'
  },
  {
    code: '1220',
    name: 'Computer Equipment',
    nameAr: 'المعدات الحاسوبية',
    type: 'ASSET',
    category: 'Fixed',
    parentCode: '1200',
    allowManualEntry: true,
    description: 'Computers and IT equipment'
  },
  {
    code: '1230',
    name: 'Leasehold Improvements',
    nameAr: 'تحسينات المباني المستأجرة',
    type: 'ASSET',
    category: 'Fixed',
    parentCode: '1200',
    allowManualEntry: true,
    description: 'Improvements to leased office space'
  },
  {
    code: '1240',
    name: 'Accumulated Depreciation',
    nameAr: 'مجمع الإهلاك',
    type: 'ASSET',
    category: 'Fixed',
    parentCode: '1200',
    allowManualEntry: true,
    description: 'Accumulated depreciation on fixed assets'
  },

  // ============================================
  // 2000 - LIABILITIES
  // ============================================
  {
    code: '2000',
    name: 'Liabilities',
    nameAr: 'الالتزامات',
    type: 'LIABILITY',
    category: 'Main',
    parentId: null,
    allowManualEntry: false,
    description: 'All company liabilities'
  },

  // 2100 - Current Liabilities
  {
    code: '2100',
    name: 'Current Liabilities',
    nameAr: 'الالتزامات المتداولة',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2000',
    allowManualEntry: false,
    description: 'Liabilities due within one year'
  },
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
    name: 'Accounts Payable - Suppliers',
    nameAr: 'الذمم الدائنة - الموردين',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2110',
    allowManualEntry: true,
    description: 'Outstanding payments to suppliers'
  },
  {
    code: '2112',
    name: 'Accounts Payable - Airlines',
    nameAr: 'الذمم الدائنة - شركات الطيران',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2110',
    allowManualEntry: true,
    description: 'Amounts owed to airlines'
  },
  {
    code: '2113',
    name: 'Accounts Payable - Hotels',
    nameAr: 'الذمم الدائنة - الفنادق',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2110',
    allowManualEntry: true,
    description: 'Amounts owed to hotels'
  },

  // 2120 - Customer Deposits
  {
    code: '2120',
    name: 'Customer Deposits and Advance Payments',
    nameAr: 'ودائع العملاء والدفعات المقدمة',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2100',
    allowManualEntry: false,
    description: 'Customer prepayments and deposits'
  },
  {
    code: '2121',
    name: 'Customer Advance Payments',
    nameAr: 'دفعات العملاء المقدمة',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2120',
    allowManualEntry: true,
    description: 'Advance payments received from customers'
  },
  {
    code: '2122',
    name: 'Unearned Revenue',
    nameAr: 'الإيرادات المؤجلة',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2120',
    allowManualEntry: true,
    description: 'Revenue received but not yet earned'
  },

  // 2130 - Tax Liabilities
  {
    code: '2130',
    name: 'Tax Liabilities',
    nameAr: 'الالتزامات الضريبية',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2100',
    allowManualEntry: false,
    description: 'Taxes payable to government'
  },
  {
    code: '2131',
    name: 'VAT Payable',
    nameAr: 'ضريبة القيمة المضافة المستحقة',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2130',
    allowManualEntry: true,
    description: 'VAT collected from customers (5% UAE)'
  },
  {
    code: '2132',
    name: 'VAT Recoverable',
    nameAr: 'ضريبة القيمة المضافة القابلة للاسترداد',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1100',
    allowManualEntry: true,
    description: 'VAT paid to suppliers (reclaimable)'
  },

  // 2140 - Payroll Liabilities
  {
    code: '2140',
    name: 'Payroll Liabilities',
    nameAr: 'التزامات الرواتب',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2100',
    allowManualEntry: false,
    description: 'Employee-related liabilities'
  },
  {
    code: '2141',
    name: 'Salaries Payable',
    nameAr: 'الرواتب المستحقة',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2140',
    allowManualEntry: true,
    description: 'Accrued employee salaries'
  },
  {
    code: '2142',
    name: 'Commissions Payable',
    nameAr: 'العمولات المستحقة',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2140',
    allowManualEntry: true,
    description: 'Commission owed to sales agents'
  },

  // 2150 - Refund Liabilities
  {
    code: '2150',
    name: 'Refund Liabilities',
    nameAr: 'التزامات المردودات',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2100',
    allowManualEntry: false,
    description: 'Customer refunds pending payment'
  },
  {
    code: '2151',
    name: 'Customer Refunds Payable',
    nameAr: 'مردودات العملاء المستحقة',
    type: 'LIABILITY',
    category: 'Current',
    parentCode: '2150',
    allowManualEntry: true,
    description: 'Refunds owed to customers for cancelled bookings'
  },
  {
    code: '2152',
    name: 'Supplier Refunds Receivable',
    nameAr: 'مردودات الموردين المستحقة القبض',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1120',
    allowManualEntry: true,
    description: 'Refunds due from suppliers for cancelled bookings'
  },
  {
    code: '2153',
    name: 'Agent Commission Refunds Receivable',
    nameAr: 'مردودات عمولات الوكلاء المستحقة القبض',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1120',
    allowManualEntry: true,
    description: 'Commission refunds due from booking agents for cancelled bookings'
  },
  {
    code: '2154',
    name: 'Sales Commission Refunds Receivable',
    nameAr: 'مردودات عمولات المبيعات المستحقة القبض',
    type: 'ASSET',
    category: 'Current',
    parentCode: '1120',
    allowManualEntry: true,
    description: 'Commission refunds due from sales agents for cancelled bookings'
  },

  // ============================================
  // 3000 - EQUITY
  // ============================================
  {
    code: '3000',
    name: 'Equity',
    nameAr: 'حقوق الملكية',
    type: 'EQUITY',
    category: 'Main',
    parentId: null,
    allowManualEntry: false,
    description: 'Owner equity'
  },
  {
    code: '3100',
    name: 'Capital',
    nameAr: 'رأس المال',
    type: 'EQUITY',
    category: 'Capital',
    parentCode: '3000',
    allowManualEntry: true,
    description: 'Initial capital investment'
  },
  {
    code: '3200',
    name: 'Retained Earnings',
    nameAr: 'الأرباح المحتجزة',
    type: 'EQUITY',
    category: 'Retained',
    parentCode: '3000',
    allowManualEntry: true,
    description: 'Accumulated profits retained in business'
  },
  {
    code: '3300',
    name: 'Current Year Profit/Loss',
    nameAr: 'ربح/خسارة العام الحالي',
    type: 'EQUITY',
    category: 'Current',
    parentCode: '3000',
    allowManualEntry: true,
    description: 'Net income for current fiscal year'
  },

  // ============================================
  // 4000 - REVENUE
  // ============================================
  {
    code: '4000',
    name: 'Revenue',
    nameAr: 'الإيرادات',
    type: 'REVENUE',
    category: 'Main',
    parentId: null,
    allowManualEntry: false,
    description: 'All revenue accounts'
  },

  // 4100 - Service Revenue
  {
    code: '4100',
    name: 'Service Revenue',
    nameAr: 'إيرادات الخدمات',
    type: 'REVENUE',
    category: 'Service',
    parentCode: '4000',
    allowManualEntry: false,
    description: 'Revenue from travel services'
  },
  {
    code: '4110',
    name: 'Flight Booking Revenue',
    nameAr: 'إيرادات حجز الرحلات',
    type: 'REVENUE',
    category: 'Service',
    parentCode: '4100',
    allowManualEntry: true,
    description: 'Revenue from flight bookings and commissions'
  },
  {
    code: '4120',
    name: 'Hotel Booking Revenue',
    nameAr: 'إيرادات حجز الفنادق',
    type: 'REVENUE',
    category: 'Service',
    parentCode: '4100',
    allowManualEntry: true,
    description: 'Revenue from hotel reservations'
  },
  {
    code: '4130',
    name: 'Tour Package Revenue',
    nameAr: 'إيرادات الباقات السياحية',
    type: 'REVENUE',
    category: 'Service',
    parentCode: '4100',
    allowManualEntry: true,
    description: 'Revenue from complete tour packages'
  },
  {
    code: '4140',
    name: 'Visa Services Revenue',
    nameAr: 'إيرادات خدمات التأشيرات',
    type: 'REVENUE',
    category: 'Service',
    parentCode: '4100',
    allowManualEntry: true,
    description: 'Revenue from visa processing services'
  },
  {
    code: '4150',
    name: 'Transfer Services Revenue',
    nameAr: 'إيرادات خدمات النقل',
    type: 'REVENUE',
    category: 'Service',
    parentCode: '4100',
    allowManualEntry: true,
    description: 'Revenue from airport transfers and transportation'
  },
  {
    code: '4160',
    name: 'Cruise Booking Revenue',
    nameAr: 'إيرادات حجز الرحلات البحرية',
    type: 'REVENUE',
    category: 'Service',
    parentCode: '4100',
    allowManualEntry: true,
    description: 'Revenue from cruise reservations'
  },
  {
    code: '4170',
    name: 'Insurance Services Revenue',
    nameAr: 'إيرادات خدمات التأمين',
    type: 'REVENUE',
    category: 'Service',
    parentCode: '4100',
    allowManualEntry: true,
    description: 'Revenue from travel insurance sales'
  },

  // 4200 - Commission Revenue
  {
    code: '4200',
    name: 'Commission Revenue',
    nameAr: 'إيرادات العمولات',
    type: 'REVENUE',
    category: 'Commission',
    parentCode: '4000',
    allowManualEntry: false,
    description: 'Commission income from suppliers'
  },
  {
    code: '4210',
    name: 'Airline Commissions',
    nameAr: 'عمولات شركات الطيران',
    type: 'REVENUE',
    category: 'Commission',
    parentCode: '4200',
    allowManualEntry: true,
    description: 'Commissions earned from airlines'
  },
  {
    code: '4220',
    name: 'Hotel Commissions',
    nameAr: 'عمولات الفنادق',
    type: 'REVENUE',
    category: 'Commission',
    parentCode: '4200',
    allowManualEntry: true,
    description: 'Commissions earned from hotels'
  },

  // 4300 - Other Revenue
  {
    code: '4300',
    name: 'Other Revenue',
    nameAr: 'إيرادات أخرى',
    type: 'REVENUE',
    category: 'Other',
    parentCode: '4000',
    allowManualEntry: false,
    description: 'Miscellaneous revenue'
  },
  {
    code: '4310',
    name: 'Service Charges',
    nameAr: 'رسوم الخدمة',
    type: 'REVENUE',
    category: 'Other',
    parentCode: '4300',
    allowManualEntry: true,
    description: 'Administrative and service charges'
  },
  {
    code: '4320',
    name: 'Cancellation Fees',
    nameAr: 'رسوم الإلغاء',
    type: 'REVENUE',
    category: 'Other',
    parentCode: '4300',
    allowManualEntry: true,
    description: 'Fees charged for booking cancellations'
  },
  {
    code: '4330',
    name: 'Change Fees',
    nameAr: 'رسوم التعديل',
    type: 'REVENUE',
    category: 'Other',
    parentCode: '4300',
    allowManualEntry: true,
    description: 'Fees for booking modifications'
  },

  // 4400 - Refund and Credit Note Accounts
  {
    code: '4400',
    name: 'Refunds and Credit Notes',
    nameAr: 'المردودات والمذكرات الدائنة',
    type: 'REVENUE',
    category: 'Refund',
    parentCode: '4000',
    allowManualEntry: false,
    description: 'Refund transactions and credit note reversals'
  },
  {
    code: '4410',
    name: 'Flight Booking Refunds',
    nameAr: 'مردودات حجز الرحلات',
    type: 'REVENUE',
    category: 'Refund',
    parentCode: '4400',
    allowManualEntry: true,
    description: 'Refunds for cancelled flight bookings (Contra Revenue)'
  },
  {
    code: '4420',
    name: 'Hotel Booking Refunds',
    nameAr: 'مردودات حجز الفنادق',
    type: 'REVENUE',
    category: 'Refund',
    parentCode: '4400',
    allowManualEntry: true,
    description: 'Refunds for cancelled hotel reservations (Contra Revenue)'
  },
  {
    code: '4430',
    name: 'Tour Package Refunds',
    nameAr: 'مردودات الباقات السياحية',
    type: 'REVENUE',
    category: 'Refund',
    parentCode: '4400',
    allowManualEntry: true,
    description: 'Refunds for cancelled tour packages (Contra Revenue)'
  },
  {
    code: '4440',
    name: 'Visa Services Refunds',
    nameAr: 'مردودات خدمات التأشيرات',
    type: 'REVENUE',
    category: 'Refund',
    parentCode: '4400',
    allowManualEntry: true,
    description: 'Refunds for visa processing services (Contra Revenue)'
  },
  {
    code: '4450',
    name: 'Transfer Services Refunds',
    nameAr: 'مردودات خدمات النقل',
    type: 'REVENUE',
    category: 'Refund',
    parentCode: '4400',
    allowManualEntry: true,
    description: 'Refunds for transportation services (Contra Revenue)'
  },
  {
    code: '4460',
    name: 'Cruise Booking Refunds',
    nameAr: 'مردودات حجز الرحلات البحرية',
    type: 'REVENUE',
    category: 'Refund',
    parentCode: '4400',
    allowManualEntry: true,
    description: 'Refunds for cancelled cruise reservations (Contra Revenue)'
  },

  // ============================================
  // 5000 - EXPENSES
  // ============================================
  {
    code: '5000',
    name: 'Cost of Services',
    nameAr: 'تكلفة الخدمات',
    type: 'EXPENSE',
    category: 'Main',
    parentId: null,
    allowManualEntry: false,
    description: 'Direct costs of services sold'
  },

  // 5100 - Direct Costs
  {
    code: '5100',
    name: 'Direct Service Costs',
    nameAr: 'تكاليف الخدمات المباشرة',
    type: 'EXPENSE',
    category: 'Direct',
    parentCode: '5000',
    allowManualEntry: false,
    description: 'Direct costs of travel services'
  },
  {
    code: '5110',
    name: 'Flight Costs',
    nameAr: 'تكاليف الرحلات',
    type: 'EXPENSE',
    category: 'Direct',
    parentCode: '5100',
    allowManualEntry: true,
    description: 'Cost of airline tickets and services'
  },
  {
    code: '5120',
    name: 'Hotel Costs',
    nameAr: 'تكاليف الفنادق',
    type: 'EXPENSE',
    category: 'Direct',
    parentCode: '5100',
    allowManualEntry: true,
    description: 'Cost of hotel accommodations'
  },
  {
    code: '5130',
    name: 'Tour Package Costs',
    nameAr: 'تكاليف الباقات السياحية',
    type: 'EXPENSE',
    category: 'Direct',
    parentCode: '5100',
    allowManualEntry: true,
    description: 'Cost of tour packages from suppliers'
  },
  {
    code: '5140',
    name: 'Visa Processing Costs',
    nameAr: 'تكاليف معالجة التأشيرات',
    type: 'EXPENSE',
    category: 'Direct',
    parentCode: '5100',
    allowManualEntry: true,
    description: 'Fees paid for visa processing'
  },
  {
    code: '5150',
    name: 'Transfer Service Costs',
    nameAr: 'تكاليف خدمات النقل',
    type: 'EXPENSE',
    category: 'Direct',
    parentCode: '5100',
    allowManualEntry: true,
    description: 'Cost of transportation services'
  },
  {
    code: '5160',
    name: 'Cruise Costs',
    nameAr: 'تكاليف الرحلات البحرية',
    type: 'EXPENSE',
    category: 'Direct',
    parentCode: '5100',
    allowManualEntry: true,
    description: 'Cost of cruise bookings'
  },

  // 6000 - Operating Expenses
  {
    code: '6000',
    name: 'Operating Expenses',
    nameAr: 'المصروفات التشغيلية',
    type: 'EXPENSE',
    category: 'Operating',
    parentId: null,
    allowManualEntry: false,
    description: 'General business operating expenses'
  },

  // 6100 - Personnel Expenses
  {
    code: '6100',
    name: 'Personnel Expenses',
    nameAr: 'مصروفات الموظفين',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6000',
    allowManualEntry: false,
    description: 'Employee-related expenses'
  },
  {
    code: '6110',
    name: 'Salaries and Wages',
    nameAr: 'الرواتب والأجور',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6100',
    allowManualEntry: true,
    description: 'Employee salaries and wages'
  },
  {
    code: '6120',
    name: 'Sales Commissions',
    nameAr: 'عمولات المبيعات',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6100',
    allowManualEntry: true,
    description: 'Commissions paid to sales agents'
  },
  {
    code: '6130',
    name: 'Employee Benefits',
    nameAr: 'مزايا الموظفين',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6100',
    allowManualEntry: true,
    description: 'Health insurance, bonuses, etc.'
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

  // 6200 - Office Expenses
  {
    code: '6200',
    name: 'Office and Administrative Expenses',
    nameAr: 'المصروفات الإدارية والمكتبية',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6000',
    allowManualEntry: false,
    description: 'Office operation costs'
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
    nameAr: 'اللوازم المكتبية',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6200',
    allowManualEntry: true,
    description: 'Stationery and office supplies'
  },
  {
    code: '6240',
    name: 'Telephone and Communication',
    nameAr: 'الهاتف والاتصالات',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6200',
    allowManualEntry: true,
    description: 'Phone, internet, communication costs'
  },

  // 6300 - Technology Expenses
  {
    code: '6300',
    name: 'Technology and Software',
    nameAr: 'التكنولوجيا والبرمجيات',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6000',
    allowManualEntry: false,
    description: 'IT and software expenses'
  },
  {
    code: '6310',
    name: 'Software Subscriptions',
    nameAr: 'اشتراكات البرمجيات',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6300',
    allowManualEntry: true,
    description: 'Booking systems, CRM, accounting software'
  },
  {
    code: '6320',
    name: 'IT Support and Maintenance',
    nameAr: 'دعم وصيانة تكنولوجيا المعلومات',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6300',
    allowManualEntry: true,
    description: 'Technical support and IT maintenance'
  },
  {
    code: '6330',
    name: 'Website and Domain',
    nameAr: 'الموقع الإلكتروني والنطاق',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6300',
    allowManualEntry: true,
    description: 'Website hosting and domain fees'
  },

  // 6400 - Marketing Expenses
  {
    code: '6400',
    name: 'Marketing and Advertising',
    nameAr: 'التسويق والإعلان',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6000',
    allowManualEntry: false,
    description: 'Marketing and promotional expenses'
  },
  {
    code: '6410',
    name: 'Digital Marketing',
    nameAr: 'التسويق الرقمي',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6400',
    allowManualEntry: true,
    description: 'Online advertising, social media'
  },
  {
    code: '6420',
    name: 'Traditional Advertising',
    nameAr: 'الإعلان التقليدي',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6400',
    allowManualEntry: true,
    description: 'Print, radio, TV advertising'
  },
  {
    code: '6430',
    name: 'Promotional Materials',
    nameAr: 'المواد الترويجية',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6400',
    allowManualEntry: true,
    description: 'Brochures, business cards, promotional items'
  },

  // 6500 - Professional Services
  {
    code: '6500',
    name: 'Professional Services',
    nameAr: 'الخدمات المهنية',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6000',
    allowManualEntry: false,
    description: 'External professional services'
  },
  {
    code: '6510',
    name: 'Legal Fees',
    nameAr: 'الرسوم القانونية',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6500',
    allowManualEntry: true,
    description: 'Legal consultation and services'
  },
  {
    code: '6520',
    name: 'Accounting and Audit Fees',
    nameAr: 'رسوم المحاسبة والتدقيق',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6500',
    allowManualEntry: true,
    description: 'External accounting and audit services'
  },
  {
    code: '6530',
    name: 'Consulting Fees',
    nameAr: 'رسوم الاستشارات',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6500',
    allowManualEntry: true,
    description: 'Business consulting services'
  },

  // 6600 - Travel and Entertainment
  {
    code: '6600',
    name: 'Travel and Entertainment',
    nameAr: 'السفر والترفيه',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6000',
    allowManualEntry: false,
    description: 'Business travel and client entertainment'
  },
  {
    code: '6610',
    name: 'Business Travel',
    nameAr: 'سفر العمل',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6600',
    allowManualEntry: true,
    description: 'Employee business travel expenses'
  },
  {
    code: '6620',
    name: 'Client Entertainment',
    nameAr: 'ترفيه العملاء',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6600',
    allowManualEntry: true,
    description: 'Client meals and entertainment'
  },

  // 6700 - Other Operating Expenses
  {
    code: '6700',
    name: 'Other Operating Expenses',
    nameAr: 'مصروفات تشغيلية أخرى',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6000',
    allowManualEntry: false,
    description: 'Miscellaneous operating expenses'
  },
  {
    code: '6710',
    name: 'Bank Charges',
    nameAr: 'رسوم البنك',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6700',
    allowManualEntry: true,
    description: 'Bank fees and charges'
  },
  {
    code: '6720',
    name: 'Insurance',
    nameAr: 'التأمين',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6700',
    allowManualEntry: true,
    description: 'Business insurance premiums'
  },
  {
    code: '6730',
    name: 'License and Permits',
    nameAr: 'الرخص والتصاريح',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6700',
    allowManualEntry: true,
    description: 'Business licenses and permits'
  },
  {
    code: '6740',
    name: 'Depreciation Expense',
    nameAr: 'مصروف الإهلاك',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6700',
    allowManualEntry: true,
    description: 'Depreciation of fixed assets'
  },
  {
    code: '6750',
    name: 'Bad Debt Expense',
    nameAr: 'مصروف الديون المعدومة',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6700',
    allowManualEntry: true,
    description: 'Uncollectible customer receivables'
  },

  // 6760 - Refund Processing Expenses
  {
    code: '6760',
    name: 'Refund Processing Expenses',
    nameAr: 'مصاريف معالجة المردودات',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6700',
    allowManualEntry: false,
    description: 'Costs associated with processing refunds'
  },
  {
    code: '6761',
    name: 'Cancellation Processing Fees',
    nameAr: 'رسوم معالجة الإلغاء',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6760',
    allowManualEntry: true,
    description: 'Internal costs for processing booking cancellations'
  },
  {
    code: '6762',
    name: 'Supplier Cancellation Charges',
    nameAr: 'رسوم إلغاء الموردين',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6760',
    allowManualEntry: true,
    description: 'Charges imposed by suppliers for cancellations'
  },
  {
    code: '6763',
    name: 'Agent Commission Refund Processing',
    nameAr: 'معالجة مردودات عمولات الوكلاء',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6760',
    allowManualEntry: true,
    description: 'Processing expenses for agent commission refunds'
  },
  {
    code: '6764',
    name: 'Sales Commission Refund Processing',
    nameAr: 'معالجة مردودات عمولات المبيعات',
    type: 'EXPENSE',
    category: 'Operating',
    parentCode: '6760',
    allowManualEntry: true,
    description: 'Processing expenses for sales commission refunds'
  },

  // 6800 - Financial Expenses
  {
    code: '6800',
    name: 'Financial Expenses',
    nameAr: 'المصروفات المالية',
    type: 'EXPENSE',
    category: 'Financial',
    parentCode: '6000',
    allowManualEntry: false,
    description: 'Interest and financing costs'
  },
  {
    code: '6810',
    name: 'Interest Expense',
    nameAr: 'مصروف الفائدة',
    type: 'EXPENSE',
    category: 'Financial',
    parentCode: '6800',
    allowManualEntry: true,
    description: 'Interest on loans and credit'
  },
  {
    code: '6820',
    name: 'Foreign Exchange Loss',
    nameAr: 'خسارة صرف العملات',
    type: 'EXPENSE',
    category: 'Financial',
    parentCode: '6800',
    allowManualEntry: true,
    description: 'Losses from currency exchange'
  },
];

async function seedChartOfAccounts() {
  console.log('🌱 Seeding Chart of Accounts...');

  try {
    // Create a map to store account IDs by code
    const accountMap = new Map<string, string>();

    // First pass: Create or update all accounts without parent relationships
    for (const account of chartOfAccounts) {
      const { parentCode, ...accountData } = account as any;
      
      const upserted = await prisma.accounts.upsert({
        where: { code: account.code },
        update: {
          name: account.name,
          nameAr: account.nameAr,
          type: account.type,
          category: account.category,
          allowManualEntry: account.allowManualEntry,
          description: account.description,
          updatedAt: new Date(),
        },
        create: {
          id: crypto.randomUUID(),
          code: account.code,
          name: account.name,
          nameAr: account.nameAr,
          type: account.type,
          category: account.category,
          allowManualEntry: account.allowManualEntry,
          description: account.description,
          updatedAt: new Date(),
        },
      });

      accountMap.set(account.code, upserted.id);
      console.log(`✓ ${account.code} - ${account.name}`);
    }

    // Second pass: Update parent relationships
    for (const account of chartOfAccounts) {
      const accountData = account as any;
      if (accountData.parentCode) {
        const parentId = accountMap.get(accountData.parentCode);
        if (parentId) {
          await prisma.accounts.update({
            where: { code: account.code },
            data: { parentId },
          });
          console.log(`  ↳ Linked ${account.code} to parent ${accountData.parentCode}`);
        }
      }
    }

    const totalAccounts = await prisma.accounts.count();
    console.log(`\n✅ Chart of Accounts seeded successfully!`);
    console.log(`📊 Total accounts: ${totalAccounts}`);
    console.log(`\n📋 Account Structure:`);
    console.log(`   • Assets: ${chartOfAccounts.filter(a => a.type === 'ASSET').length} accounts`);
    console.log(`   • Liabilities: ${chartOfAccounts.filter(a => a.type === 'LIABILITY').length} accounts`);
    console.log(`   • Equity: ${chartOfAccounts.filter(a => a.type === 'EQUITY').length} accounts`);
    console.log(`   • Revenue: ${chartOfAccounts.filter(a => a.type === 'REVENUE').length} accounts`);
    console.log(`   • Expenses: ${chartOfAccounts.filter(a => a.type === 'EXPENSE').length} accounts`);

  } catch (error) {
    console.error('❌ Error seeding chart of accounts:', error);
    throw error;
  }
}

async function main() {
  await seedChartOfAccounts();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
