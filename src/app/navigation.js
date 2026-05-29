import {
  BarChart3,
  Boxes,
  Building2,
  FileBarChart2,
  FileText,
  LayoutDashboard,
  ReceiptText,
  Settings,
  ShoppingBag,
  Truck,
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
    titleKey: 'nav.groups.operations',
    items: [
      { id: 'sales', labelKey: 'nav.sales', icon: ReceiptText },
      { id: 'purchases', labelKey: 'nav.purchases', icon: ShoppingBag },
      { id: 'inventory', labelKey: 'nav.inventory', icon: Boxes },
      { id: 'partners', labelKey: 'nav.partners', icon: Building2 },
    ],
  },
  {
    titleKey: 'nav.groups.management',
    items: [
      { id: 'hr', labelKey: 'nav.hr', icon: Users },
      { id: 'reports', labelKey: 'nav.reports', icon: FileBarChart2 },
    ],
  },
  {
    titleKey: 'nav.groups.system',
    items: [
      { id: 'settings', labelKey: 'nav.settings', icon: Settings },
    ],
  },
];

export const MODULE_ICONS = {
  dashboard: BarChart3,
  accounting: FileText,
  sales: ReceiptText,
  purchases: Truck,
  inventory: Boxes,
  partners: Building2,
  hr: Users,
  reports: FileBarChart2,
  settings: Settings,
};
