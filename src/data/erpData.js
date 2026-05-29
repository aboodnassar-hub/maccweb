export const accountTree = [
  {
    id: 1,
    code: '1',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    isGroup: true,
    name: { en: 'Assets', ar: 'الأصول' },
    children: [
      {
        id: 11,
        code: '11',
        type: 'ASSET',
        normalBalance: 'DEBIT',
        isGroup: true,
        name: { en: 'Current Assets', ar: 'الأصول المتداولة' },
        children: [
          {
            id: 111,
            code: '111',
            type: 'ASSET',
            normalBalance: 'DEBIT',
            isGroup: true,
            name: { en: 'Cash and Banks', ar: 'النقد والبنوك' },
            children: [
              { id: 1111, code: '1111', type: 'ASSET', normalBalance: 'DEBIT', isGroup: false, name: { en: 'Main Cash Box', ar: 'الصندوق الرئيسي' } },
              { id: 1112, code: '1112', type: 'ASSET', normalBalance: 'DEBIT', isGroup: false, name: { en: 'Petty Cash', ar: 'العهدة النقدية' } },
              { id: 1113, code: '1113', type: 'ASSET', normalBalance: 'DEBIT', isGroup: false, name: { en: 'Bank Account', ar: 'الحساب البنكي' } },
            ],
          },
          { id: 112, code: '112', type: 'ASSET', normalBalance: 'DEBIT', isGroup: false, name: { en: 'Accounts Receivable', ar: 'الذمم المدينة' } },
          { id: 113, code: '113', type: 'ASSET', normalBalance: 'DEBIT', isGroup: false, name: { en: 'Inventory', ar: 'المخزون' } },
        ],
      },
      {
        id: 12,
        code: '12',
        type: 'ASSET',
        normalBalance: 'DEBIT',
        isGroup: true,
        name: { en: 'Fixed Assets', ar: 'الأصول الثابتة' },
        children: [
          { id: 121, code: '121', type: 'ASSET', normalBalance: 'DEBIT', isGroup: false, name: { en: 'Equipment', ar: 'المعدات' } },
          { id: 122, code: '122', type: 'ASSET', normalBalance: 'DEBIT', isGroup: false, name: { en: 'Vehicles', ar: 'المركبات' } },
        ],
      },
    ],
  },
  {
    id: 2,
    code: '2',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    isGroup: true,
    name: { en: 'Liabilities', ar: 'الخصوم' },
    children: [
      { id: 211, code: '211', type: 'LIABILITY', normalBalance: 'CREDIT', isGroup: false, name: { en: 'Accounts Payable', ar: 'الذمم الدائنة' } },
      { id: 212, code: '212', type: 'LIABILITY', normalBalance: 'CREDIT', isGroup: false, name: { en: 'Sales Tax Payable', ar: 'ضريبة المبيعات المستحقة' } },
    ],
  },
  {
    id: 3,
    code: '3',
    type: 'EQUITY',
    normalBalance: 'CREDIT',
    isGroup: true,
    name: { en: 'Equity', ar: 'حقوق الملكية' },
    children: [
      { id: 311, code: '311', type: 'EQUITY', normalBalance: 'CREDIT', isGroup: false, name: { en: 'Capital', ar: 'رأس المال' } },
    ],
  },
  {
    id: 4,
    code: '4',
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    isGroup: true,
    name: { en: 'Revenue', ar: 'الإيرادات' },
    children: [
      { id: 411, code: '411', type: 'REVENUE', normalBalance: 'CREDIT', isGroup: false, name: { en: 'Sales Revenue', ar: 'إيرادات المبيعات' } },
    ],
  },
  {
    id: 5,
    code: '5',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    isGroup: true,
    name: { en: 'Expenses', ar: 'المصروفات' },
    children: [
      { id: 511, code: '511', type: 'EXPENSE', normalBalance: 'DEBIT', isGroup: false, name: { en: 'Rent Expense', ar: 'مصروف الإيجار' } },
      { id: 512, code: '512', type: 'EXPENSE', normalBalance: 'DEBIT', isGroup: false, name: { en: 'Utilities Expense', ar: 'مصروف الخدمات' } },
    ],
  },
];

export const dashboardKpis = [
  { key: 'dashboard.netCash', value: 'JOD 84,250', delta: '+12.4%', tone: 'blue' },
  { key: 'dashboard.receivables', value: 'JOD 31,780', delta: '-4.8%', tone: 'amber' },
  { key: 'dashboard.inventoryValue', value: 'JOD 146,900', delta: '+7.1%', tone: 'emerald' },
  { key: 'dashboard.monthlyRevenue', value: 'JOD 62,430', delta: '+18.2%', tone: 'rose' },
];

export const recentActivity = [
  { id: 1, date: '2026-05-28', key: 'dashboard.salesInvoice', ref: 'SIN-2026-0048', amount: 'JOD 2,450.000' },
  { id: 2, date: '2026-05-28', key: 'dashboard.stockReceipt', ref: 'GRN-2026-0019', amount: 'JOD 8,120.000' },
  { id: 3, date: '2026-05-27', key: 'dashboard.payrollAccrual', ref: 'JE-2026-0061', amount: 'JOD 14,700.000' },
  { id: 4, date: '2026-05-27', key: 'dashboard.purchaseOrder', ref: 'PO-2026-0032', amount: 'JOD 5,680.000' },
];

export const businessCycle = [
  { id: 'quote', label: { en: 'Quote', ar: 'عرض سعر' }, status: 'active' },
  { id: 'invoice', label: { en: 'Invoice', ar: 'فاتورة' }, status: 'active' },
  { id: 'payment', label: { en: 'Payment', ar: 'قبض/دفع' }, status: 'pending' },
  { id: 'journal', label: { en: 'Journal', ar: 'قيد' }, status: 'active' },
  { id: 'report', label: { en: 'Report', ar: 'تقرير' }, status: 'active' },
];

export const moduleReadiness = [
  { module: 'Accounting', moduleAr: 'المحاسبة', value: 72, statusKey: 'common.foundation' },
  { module: 'Inventory', moduleAr: 'المخزون', value: 48, statusKey: 'common.foundation' },
  { module: 'Sales', moduleAr: 'المبيعات', value: 44, statusKey: 'common.foundation' },
  { module: 'HR', moduleAr: 'الموارد البشرية', value: 30, statusKey: 'common.foundation' },
];

export const trialBalance = [
  { code: '1111', name: { en: 'Main Cash Box', ar: 'الصندوق الرئيسي' }, debit: 12500, credit: 0 },
  { code: '112', name: { en: 'Accounts Receivable', ar: 'الذمم المدينة' }, debit: 31780, credit: 0 },
  { code: '211', name: { en: 'Accounts Payable', ar: 'الذمم الدائنة' }, debit: 0, credit: 18620 },
  { code: '411', name: { en: 'Sales Revenue', ar: 'إيرادات المبيعات' }, debit: 0, credit: 62430 },
  { code: '511', name: { en: 'Rent Expense', ar: 'مصروف الإيجار' }, debit: 4600, credit: 0 },
];

export const moduleWorkspaces = {
  sales: {
    workflow: [
      { en: 'Customer order', ar: 'طلب العميل' },
      { en: 'Tax invoice', ar: 'فاتورة ضريبية' },
      { en: 'Receipt voucher', ar: 'سند قبض' },
      { en: 'Posted journal', ar: 'قيد مرحل' },
    ],
    records: [
      ['SIN-2026-0048', 'Arabian Supplies', 'JOD 2,450.000', 'posted'],
      ['SIN-2026-0047', 'Levant Retail', 'JOD 1,120.000', 'draft'],
      ['RCV-2026-0020', 'Cash receipt', 'JOD 900.000', 'posted'],
    ],
  },
  purchases: {
    workflow: [
      { en: 'Purchase request', ar: 'طلب شراء' },
      { en: 'Vendor invoice', ar: 'فاتورة مورد' },
      { en: 'Stock receipt', ar: 'استلام مخزون' },
      { en: 'Payable entry', ar: 'قيد ذمم دائنة' },
    ],
    records: [
      ['PIN-2026-0031', 'Delta Trading', 'JOD 5,680.000', 'posted'],
      ['PO-2026-0032', 'Stationery order', 'JOD 740.000', 'pending'],
      ['PAY-2026-0014', 'Vendor payment', 'JOD 1,500.000', 'posted'],
    ],
  },
  inventory: {
    workflow: [
      { en: 'Item master', ar: 'بطاقة المادة' },
      { en: 'Warehouse', ar: 'مستودع' },
      { en: 'Movement', ar: 'حركة مخزون' },
      { en: 'Cost posting', ar: 'ترحيل التكلفة' },
    ],
    records: [
      ['ITM-10024', 'Thermal printer', '42 pcs', 'active'],
      ['WH-MAIN', 'Main warehouse', '1 branch', 'active'],
      ['MOV-2026-0118', 'Transfer to showroom', '12 pcs', 'posted'],
    ],
  },
  partners: {
    workflow: [
      { en: 'Partner profile', ar: 'ملف الشريك' },
      { en: 'Credit limits', ar: 'حدود الائتمان' },
      { en: 'Statement', ar: 'كشف حساب' },
      { en: 'Aging', ar: 'أعمار الديون' },
    ],
    records: [
      ['CUS-0008', 'Arabian Supplies', 'Customer', 'active'],
      ['VEN-0012', 'Delta Trading', 'Vendor', 'active'],
      ['CUS-0010', 'Levant Retail', 'Customer', 'pending'],
    ],
  },
  hr: {
    workflow: [
      { en: 'Employee file', ar: 'ملف الموظف' },
      { en: 'Department', ar: 'القسم' },
      { en: 'Payroll draft', ar: 'مسودة الرواتب' },
      { en: 'Accounting accrual', ar: 'استحقاق محاسبي' },
    ],
    records: [
      ['EMP-0001', 'Mona Haddad', 'Finance', 'active'],
      ['EMP-0002', 'Omar Saleh', 'Warehouse', 'active'],
      ['PAY-2026-05', 'May payroll', 'JOD 14,700.000', 'pending'],
    ],
  },
  reports: {
    workflow: [
      { en: 'Data source', ar: 'مصدر البيانات' },
      { en: 'Filters', ar: 'الفلاتر' },
      { en: 'Preview', ar: 'المعاينة' },
      { en: 'Export', ar: 'التصدير' },
    ],
    records: [
      ['RPT-GL', 'General ledger', 'Accounting', 'active'],
      ['RPT-INV', 'Inventory movement', 'Warehouse', 'active'],
      ['RPT-AR', 'Customer aging', 'Receivables', 'active'],
    ],
  },
  settings: {
    workflow: [
      { en: 'Company', ar: 'الشركة' },
      { en: 'Roles', ar: 'الأدوار' },
      { en: 'Permissions', ar: 'الصلاحيات' },
      { en: 'Audit log', ar: 'سجل النشاط' },
    ],
    records: [
      ['MAIN', 'Main Company', 'JOD', 'active'],
      ['admin', 'Administrator', '8 permissions', 'active'],
      ['head_accountant', 'Head Accountant', '5 permissions', 'active'],
    ],
  },
};
