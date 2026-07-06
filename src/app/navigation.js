import {
  BarChart3,
  CreditCard,
  FileText,
  HandCoins,
  LayoutDashboard,
  Package,
  ReceiptText,
  ShoppingBag,
  Users,
} from 'lucide-react';

export const NAVIGATION_GROUPS = [
  {
    titleKey: 'nav.groups.workspace',
    items: [
      { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
      { id: 'accounting', labelKey: 'nav.accounting', icon: FileText },
    ],
  },
  {
    titleKey: 'nav.groups.masters',
    items: [
      { id: 'customers', labelKey: 'nav.customers', icon: Users },
      { id: 'suppliers', labelKey: 'nav.suppliers', icon: Users },
      { id: 'products', labelKey: 'nav.products', icon: Package },
    ],
  },
  {
    titleKey: 'nav.groups.transactions',
    items: [
      { id: 'sales', labelKey: 'nav.sales', icon: ReceiptText },
      { id: 'purchases', labelKey: 'nav.purchases', icon: ShoppingBag },
      { id: 'receipts', labelKey: 'nav.receipts', icon: HandCoins },
      { id: 'payments', labelKey: 'nav.payments', icon: CreditCard },
    ],
  },
  {
    titleKey: 'nav.groups.reports',
    items: [
      { id: 'statements', labelKey: 'nav.statements', icon: FileText },
      { id: 'profitLoss', labelKey: 'nav.profitLoss', icon: BarChart3 },
    ],
  },
];

export const MODULE_ICONS = {
  dashboard: BarChart3,
  accounting: FileText,
  sales: ReceiptText,
  purchases: ShoppingBag,
  customers: Users,
  suppliers: Users,
  products: Package,
  receipts: HandCoins,
  payments: CreditCard,
  statements: FileText,
  profitLoss: BarChart3,
};
