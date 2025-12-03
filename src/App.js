import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  Settings, 
  ChevronRight, 
  ChevronDown, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  Loader, 
  TrendingUp, 
  TrendingDown, 
  Folder, 
  FolderOpen, 
  File, 
  Globe, 
  LogOut, 
  User, 
  Mail, 
  Lock, 
  ArrowRight,
  Menu,
  X
} from 'lucide-react';

// --- API SERVICE (Backend Connection) ---
const ApiService = {
  baseUrl: 'http://127.0.0.1:8000', 

  async login(email, password) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  async register(name, email, password) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, email, password }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  }
};

// --- MOCK DATA (Fixed: Added here to ensure availability) ---
const ACCOUNTS_DATA = [
  { id: 1, code: '1', name: 'Assets', nameKey: 'assets', type: 'ASSET', is_group: true, children: [
    { id: 11, code: '11', name: 'Current Assets', nameKey: 'currentAssets', type: 'ASSET', is_group: true, children: [
      { id: 111, code: '111', name: 'Cash & Banks', nameKey: 'cashBanks', type: 'ASSET', is_group: true, children: [
        { id: 1111, code: '1111', name: 'Main Cash Box', nameKey: 'mainCashBox', type: 'ASSET', is_group: false },
        { id: 1112, code: '1112', name: 'Petty Cash', nameKey: 'pettyCash', type: 'ASSET', is_group: false },
        { id: 1113, code: '1113', name: 'Bank Al Etihad', nameKey: 'bankEtihad', type: 'ASSET', is_group: false },
      ]},
      { id: 112, code: '112', name: 'Accounts Receivable', nameKey: 'accountsReceivable', type: 'ASSET', is_group: false },
    ]},
    { id: 12, code: '12', name: 'Fixed Assets', nameKey: 'fixedAssets', type: 'ASSET', is_group: true, children: [
      { id: 121, code: '121', name: 'Furniture', nameKey: 'furniture', type: 'ASSET', is_group: false },
      { id: 122, code: '122', name: 'Vehicles', nameKey: 'vehicles', type: 'ASSET', is_group: false },
    ]}
  ]},
  { id: 2, code: '2', name: 'Liabilities', nameKey: 'liabilities', type: 'LIABILITY', is_group: true, children: [
    { id: 21, code: '21', name: 'Current Liabilities', nameKey: 'currentLiabilities', type: 'LIABILITY', is_group: true, children: [
      { id: 211, code: '211', name: 'Accounts Payable', nameKey: 'accountsPayable', type: 'LIABILITY', is_group: false },
    ]}
  ]},
  { id: 4, code: '4', name: 'Revenue', nameKey: 'revenue', type: 'REVENUE', is_group: true, children: []},
  { id: 5, code: '5', name: 'Expenses', nameKey: 'expenses', type: 'EXPENSE', is_group: true, children: [
     { id: 51, code: '51', name: 'Operating Expenses', nameKey: 'operatingExpenses', type: 'EXPENSE', is_group: true, children: [
        { id: 511, code: '511', name: 'Rent', nameKey: 'rent', type: 'EXPENSE', is_group: false },
        { id: 512, code: '512', name: 'Electricity', nameKey: 'electricity', type: 'EXPENSE', is_group: false },
     ]}
  ]},
];

// --- TRANSLATIONS ---
const TRANSLATIONS = {
  en: {
    dashboard: "Dashboard",
    chartOfAccounts: "Chart of Accounts",
    journalEntries: "Journal Entries",
    inventory: "Inventory",
    invoices: "Invoices",
    settings: "Settings",
    general: "General",
    trading: "Trading",
    system: "System",
    demoMode: "Demo Mode",
    financialOverview: "Financial Overview",
    newJournalEntry: "New Journal Entry",
    financialYear: "Financial Year 2025 • Q1",
    adminUser: "Admin User",
    headAccountant: "Head Accountant",
    totalAssets: "Total Assets",
    totalLiabilities: "Total Liabilities",
    netProfit: "Net Profit (YTD)",
    cashOnHand: "Cash on Hand",
    recentTransactions: "Recent Transactions",
    viewAll: "View All",
    date: "Date",
    description: "Description",
    ref: "Ref",
    amount: "Amount",
    updatedToday: "Updated: Today",
    newAccount: "New Account",
    entryNumber: "Entry Number",
    reference: "Reference / Notes",
    accountCode: "Account Code",
    debit: "Debit",
    credit: "Credit",
    addLine: "Add Line",
    difference: "Difference",
    balanced: "Balanced",
    draft: "Draft",
    postEntry: "Post Entry",
    posting: "Posting...",
    successMessage: "Transaction posted successfully",
    searchPlaceholder: "Search...",
    officeRent: "Office Rent - Nov 2025",
    salesInvoice: "Sales Invoice",
    assets: "Assets",
    liabilities: "Liabilities",
    revenue: "Revenue",
    expenses: "Expenses",
    currentAssets: "Current Assets",
    cashBanks: "Cash & Banks",
    mainCashBox: "Main Cash Box",
    pettyCash: "Petty Cash",
    bankEtihad: "Bank Al Etihad",
    accountsReceivable: "Accounts Receivable",
    fixedAssets: "Fixed Assets",
    furniture: "Furniture",
    vehicles: "Vehicles",
    currentLiabilities: "Current Liabilities",
    accountsPayable: "Accounts Payable",
    operatingExpenses: "Operating Expenses",
    rent: "Rent",
    electricity: "Electricity",
    welcomeBack: "Welcome Back",
    signInToContinue: "Sign in to continue to macc",
    email: "Email Address",
    password: "Password",
    signIn: "Sign In",
    signingIn: "Signing In...",
    dontHaveAccount: "Don't have an account?",
    createAccount: "Create Account",
    fullName: "Full Name",
    signUp: "Sign Up",
    alreadyHaveAccount: "Already have an account?",
    logout: "Logout",
    companyTitle: "Future of Accounting",
    companyDesc: "Macc is the next-generation financial ecosystem replacing legacy desktop software. We combine strict double-entry accounting with the flexibility of the cloud, giving you real-time control over your assets.",
    feature1: "Smart Double-Entry Validation",
    feature2: "Real-time Financial Reporting",
    feature3: "Secure Cloud Infrastructure",
    subBrand: "Mohammad Accounting"
  },
  ar: {
    dashboard: "لوحة التحكم",
    chartOfAccounts: "دليل الحسابات",
    journalEntries: "قيود اليومية",
    inventory: "المخزون",
    invoices: "الفواتير",
    settings: "الإعدادات",
    general: "عام",
    trading: "تجارية",
    system: "النظام",
    demoMode: "وضع العرض",
    financialOverview: "نظرة مالية عامة",
    newJournalEntry: "قيد يومية جديد",
    financialYear: "السنة المالية 2025 • الربع الأول",
    adminUser: "المدير العام",
    headAccountant: "رئيس الحسابات",
    totalAssets: "إجمالي الأصول",
    totalLiabilities: "إجمالي الخصوم",
    netProfit: "صافي الربح (حتى الآن)",
    cashOnHand: "النقد في الصندوق",
    recentTransactions: "المعاملات الأخيرة",
    viewAll: "عرض الكل",
    date: "التاريخ",
    description: "البيان",
    ref: "المرجع",
    amount: "المبلغ",
    updatedToday: "محدث: اليوم",
    newAccount: "حساب جديد",
    entryNumber: "رقم القيد",
    reference: "ملاحظات / مرجع",
    accountCode: "رمز الحساب",
    debit: "مدين",
    credit: "دائن",
    addLine: "إضافة سطر",
    difference: "الفرق",
    balanced: "متوازن",
    draft: "مسودة",
    postEntry: "ترحيل القيد",
    posting: "جاري الترحيل...",
    successMessage: "تم ترحيل المعاملة بنجاح",
    searchPlaceholder: "بحث...",
    officeRent: "إيجار مكتب - نوفمبر 2025",
    salesInvoice: "فاتورة مبيعات",
    assets: "الأصول",
    liabilities: "الخصوم",
    revenue: "الإيرادات",
    expenses: "المصروفات",
    currentAssets: "الأصول المتداولة",
    cashBanks: "النقد والبنوك",
    mainCashBox: "الصندوق الرئيسي",
    pettyCash: "نثرية",
    bankEtihad: "بنك الاتحاد",
    accountsReceivable: "الذمم المدينة",
    fixedAssets: "الأصول الثابتة",
    furniture: "أثاث ومفروشات",
    vehicles: "مركبات",
    currentLiabilities: "الخصوم المتداولة",
    accountsPayable: "الذمم الدائنة",
    operatingExpenses: "المصاريف التشغيلية",
    rent: "الإيجار",
    electricity: "الكهرباء",
    welcomeBack: "مرحباً بعودتك",
    signInToContinue: "سجل الدخول للمتابعة إلى ماك",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    signIn: "تسجيل الدخول",
    signingIn: "جاري الدخول...",
    dontHaveAccount: "ليس لديك حساب؟",
    createAccount: "إنشاء حساب",
    fullName: "الاسم الكامل",
    signUp: "تسجيل جديد",
    alreadyHaveAccount: "لديك حساب بالفعل؟",
    logout: "تسجيل الخروج",
    companyTitle: "مستقبل المحاسبة الحديثة",
    companyDesc: "ماك هو الجيل الجديد من الأنظمة المالية المصمم لاستبدال البرامج التقليدية. نجمع بين دقة القيد المزدوج ومرونة السحابة، لنمنحك تحكماً فورياً في أصولك المالية.",
    feature1: "تحقق ذكي من القيد المزدوج",
    feature2: "تقارير مالية فورية",
    feature3: "بنية تحتية سحابية آمنة",
    subBrand: "محمد للمحاسبة"
  }
};

// --- COMPONENTS ---

const SidebarItem = ({ icon: Icon, label, active, onClick, hasSubmenu, lang }) => (
  <div 
    onClick={onClick}
    className={`
      flex items-center justify-between px-4 py-3 cursor-pointer transition-colors duration-200 group
      ${active ? 'bg-blue-50 text-blue-700 border-e-4 border-blue-600' : 'text-slate-600 hover:bg-slate-50'}
    `}
  >
    <div className="flex items-center gap-3">
      <Icon size={18} className={`transform ${lang === 'ar' && hasSubmenu ? 'rotate-180' : ''} ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} transition-transform duration-200`} />
      <span className="font-medium text-sm">{label}</span>
    </div>
    {hasSubmenu && (
      lang === 'ar' 
        ? <ChevronLeft size={14} className="text-slate-300 group-hover:text-slate-500" />
        : <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500" />
    )}
  </div>
);

const Notification = ({ type, message, onClose }) => {
  if (!message) return null;
  const bgColor = type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800';
  const Icon = type === 'success' ? CheckCircle : AlertCircle;
  return (
    <div className={`fixed top-4 end-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${bgColor} animate-in slide-in-from-top-2`}>
      <Icon size={20} />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

// --- AUTH SCREEN COMPONENT ---
const AuthScreen = ({ onLogin, lang, t, setLang }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Simulation
      await new Promise(resolve => setTimeout(resolve, 1500));
      onLogin({
        name: isLogin ? "Admin User" : formData.name, 
        email: formData.email,
        role: "Head Accountant"
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen flex bg-slate-50 overflow-hidden">
      {/* LEFT PANEL - Hidden on Mobile */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-700 to-indigo-900 relative overflow-hidden flex-col justify-between p-16 text-white">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
             <div className="absolute top-[-100px] left-[-100px] w-96 h-96 rounded-full bg-blue-400 blur-[100px] animate-pulse"></div>
             <div className="absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] rounded-full bg-purple-500 blur-[120px] animate-pulse delay-700"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-inner border border-white/20">M</div>
            <div>
              <span className="text-3xl font-bold tracking-tight text-white block leading-none">macc</span>
              <span className="text-xs text-blue-200 font-medium tracking-widest uppercase block mt-1">{t('subBrand')}</span>
            </div>
          </div>
          
          <div className="space-y-6 mt-12">
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight max-w-lg tracking-tight">{t('companyTitle')}</h1>
            <p className="text-blue-100/90 text-lg leading-relaxed max-w-md font-light">{t('companyDesc')}</p>
          </div>

          <div className="mt-16 space-y-5">
            {[t('feature1'), t('feature2'), t('feature3')].map((feature, idx) => (
               <div key={idx} className="flex items-center gap-4 text-white group">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:bg-white/20 transition-all">
                  <CheckCircle size={18} className="text-green-300" />
                </div>
                <span className="font-medium text-lg tracking-wide">{feature}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-xs text-blue-200/60 font-medium tracking-widest uppercase mt-12">© 2025 Macc Accounting Systems</div>
      </div>

      {/* RIGHT PANEL - LOGIN FORM */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-8 relative bg-white overflow-y-auto">
        <div className="absolute top-6 end-6 z-20">
            <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-sm font-medium shadow-sm hover:shadow-md">
                <Globe size={16} />
                {lang === 'en' ? 'العربية' : 'English'}
            </button>
        </div>

        <div className="max-w-md w-full">
          <div className="mb-10 text-center lg:text-start">
             <div className="lg:hidden flex flex-col items-center mb-6">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-blue-200 shadow-xl mb-2">M</div>
                <span className="text-2xl font-bold text-blue-900">macc</span>
                <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">{t('subBrand')}</span>
             </div>
             <h2 className="text-3xl font-bold text-slate-900 mb-3">{isLogin ? t('welcomeBack') : t('createAccount')}</h2>
             <p className="text-slate-500 text-base">{t('signInToContinue')}</p>
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('fullName')}</label>
                <div className="relative group">
                  <User className="absolute top-3.5 start-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                  <input type="text" required className="w-full ps-12 pe-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium" placeholder="John Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('email')}</label>
              <div className="relative group">
                <Mail className="absolute top-3.5 start-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input type="email" required className="w-full ps-12 pe-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium" placeholder="name@company.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('password')}</label>
              <div className="relative group">
                <Lock className="absolute top-3.5 start-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input type="password" required className="w-full ps-12 pe-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-3 mt-8 transform active:scale-[0.98] duration-200 text-base">
              {isLoading ? <Loader size={20} className="animate-spin" /> : (isLogin ? <ArrowRight size={20} /> : <Plus size={20} />)}
              {isLoading ? t('signingIn') : (isLogin ? t('signIn') : t('signUp'))}
            </button>
          </form>
          <div className="mt-10 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500 font-medium">
              {isLogin ? t('dontHaveAccount') : t('alreadyHaveAccount')}
              <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 font-bold hover:text-blue-800 hover:underline ms-2 transition-colors">{isLogin ? t('createAccount') : t('signIn')}</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- VIEW 1: DASHBOARD ---
const Dashboard = ({ t }) => {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Metric Cards */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('totalAssets')}</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-2xl font-bold text-slate-800" dir="ltr">$1,240,500</h3>
            <span className="text-xs font-bold text-green-600 flex items-center bg-green-50 px-2 py-1 rounded" dir="ltr">
              <TrendingUp size={14} className="me-1" /> +12%
            </span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('totalLiabilities')}</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-2xl font-bold text-slate-800" dir="ltr">$420,100</h3>
            <span className="text-xs font-bold text-red-500 flex items-center bg-red-50 px-2 py-1 rounded" dir="ltr">
              <TrendingDown size={14} className="me-1" /> +2%
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('netProfit')}</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-2xl font-bold text-slate-800" dir="ltr">$185,400</h3>
            <span className="text-xs font-bold text-green-600 flex items-center bg-green-50 px-2 py-1 rounded" dir="ltr">
              <TrendingUp size={14} className="me-1" /> +8%
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('cashOnHand')}</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-2xl font-bold text-slate-800" dir="ltr">$54,200</h3>
            <span className="text-xs text-slate-400">{t('updatedToday')}</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">{t('recentTransactions')}</h3>
          <button className="text-sm text-blue-600 font-medium hover:underline">{t('viewAll')}</button>
        </div>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-3 text-start">{t('date')}</th>
              <th className="px-6 py-3 text-start">{t('description')}</th>
              <th className="px-6 py-3 text-start">{t('ref')}</th>
              <th className="px-6 py-3 text-end">{t('amount')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="hover:bg-slate-50/50">
                <td className="px-6 py-3 text-slate-600" dir="ltr">Nov {20 + i}, 2025</td>
                <td className="px-6 py-3 font-medium text-slate-800">{t('salesInvoice')} #{1020 + i}</td>
                <td className="px-6 py-3 text-slate-500" dir="ltr">INV-{1020+i}</td>
                <td className="px-6 py-3 text-end font-mono text-slate-700" dir="ltr">$1,250.00</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- VIEW 2: CHART OF ACCOUNTS (TREE) ---
const TreeNode = ({ node, level = 0, lang, t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  
  // Choose icon based on direction
  const ArrowIcon = lang === 'ar' 
    ? (isOpen ? ChevronDown : ChevronLeft)
    : (isOpen ? ChevronDown : ChevronRight);

  return (
    <div>
      <div 
        className={`flex items-center py-2 px-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 transition-colors`}
        style={{ paddingInlineStart: `${level * 24 + 12}px` }} // Logical padding for indentation
        onClick={() => hasChildren && setIsOpen(!isOpen)}
      >
        <div className="me-2 text-slate-400">
          {hasChildren ? <ArrowIcon size={14} /> : <div className="w-[14px]" />}
        </div>
        
        <div className="me-3 text-blue-500">
          {node.is_group ? (isOpen ? <FolderOpen size={18} /> : <Folder size={18} />) : <File size={16} className="text-slate-400" />}
        </div>
        
        <div className="flex-1 flex items-center justify-between">
            <div>
                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded me-3" dir="ltr">{node.code}</span>
                <span className={`text-sm ${node.is_group ? 'font-bold text-slate-700' : 'text-slate-600'}`}>{t(node.nameKey) || node.name}</span>
            </div>
            {!node.is_group && (
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{node.type}</span>
            )}
        </div>
      </div>
      {isOpen && hasChildren && (
        <div className={`border-s border-slate-100 ${lang === 'ar' ? 'mr-[23px]' : 'ml-[23px]'}`}>
          {node.children.map(child => <TreeNode key={child.id} node={child} level={level + 1} lang={lang} t={t} />)}
        </div>
      )}
    </div>
  );
};

const AccountTree = ({ t, lang, data }) => {
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800">{t('chartOfAccounts')}</h3>
        <button className="flex items-center gap-2 text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors">
            <Plus size={14} /> {t('newAccount')}
        </button>
      </div>
      <div className="py-2">
        {data.map(node => <TreeNode key={node.id} node={node} lang={lang} t={t} />)}
      </div>
    </div>
  );
};

// --- VIEW 3: JOURNAL ENTRY ---
const JournalEntry = ({ isDemoMode, t, lang }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [entryNumber, setEntryNumber] = useState('JE-2025-0042');
  const [rows, setRows] = useState([
    { id: 1, account_id: '511', description: t('officeRent'), debit: 1500.00, credit: 0 },
    { id: 2, account_id: '1111', description: t('officeRent'), debit: 0, credit: 1500.00 },
  ]);

  const totalDebit = rows.reduce((sum, row) => sum + Number(row.debit || 0), 0);
  const totalCredit = rows.reduce((sum, row) => sum + Number(row.credit || 0), 0);
  const diff = totalDebit - totalCredit;
  const isBalanced = Math.abs(diff) < 0.01;

  const addRow = () => setRows([...rows, { id: Date.now(), account_id: '', description: '', debit: 0, credit: 0 }]);
  
  const updateRow = (id, field, value) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        const newRow = { ...row, [field]: value };
        if (field === 'debit' && Number(value) > 0) newRow.credit = 0;
        if (field === 'credit' && Number(value) > 0) newRow.debit = 0;
        return newRow;
      }
      return row;
    }));
  };

  const removeRow = (id) => {
    if (rows.length > 2) setRows(rows.filter(row => row.id !== id));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    setIsSubmitting(false);
    setNotification({ type: 'success', message: t('successMessage') });
    setTimeout(() => setNotification({ type: '', message: '' }), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Notification type={notification.type} message={notification.message} />
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('entryNumber')}</label>
            <input type="text" value={entryNumber} readOnly className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-mono text-sm font-semibold" dir="ltr" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('date')}</label>
            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('reference')}</label>
            <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Inv-1023" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
                <th className="px-4 py-3 w-[15%] text-start">{t('accountCode')}</th>
                <th className="px-4 py-3 w-[40%] text-start">{t('description')}</th>
                <th className="px-4 py-3 text-end w-[20%]">{t('debit')}</th>
                <th className="px-4 py-3 text-end w-[20%]">{t('credit')}</th>
                <th className="px-2 py-3 w-[5%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-blue-50/50 group transition-colors">
                  <td className="p-2">
                    <input type="text" placeholder={t('searchPlaceholder')} className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-500 rounded px-2 py-1.5 outline-none text-sm font-mono text-blue-800 font-medium" value={row.account_id} onChange={(e) => updateRow(row.id, 'account_id', e.target.value)} dir="ltr" />
                  </td>
                  <td className="p-2">
                    <input type="text" className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-500 rounded px-2 py-1.5 outline-none text-sm" value={row.description} onChange={(e) => updateRow(row.id, 'description', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <input type="number" className="w-full text-end bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-500 rounded px-2 py-1.5 outline-none text-sm font-mono text-slate-700 placeholder-slate-200" value={row.debit || ''} placeholder="0.00" onChange={(e) => updateRow(row.id, 'debit', e.target.value)} dir="ltr" />
                  </td>
                  <td className="p-2">
                    <input type="number" className="w-full text-end bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-500 rounded px-2 py-1.5 outline-none text-sm font-mono text-slate-700 placeholder-slate-200" value={row.credit || ''} placeholder="0.00" onChange={(e) => updateRow(row.id, 'credit', e.target.value)} dir="ltr" />
                  </td>
                  <td className="p-2 text-center">
                    <button onClick={() => removeRow(row.id)} className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colSpan={2} className="px-4 py-3">
                  <button onClick={addRow} className="flex items-center gap-2 text-sm text-blue-600 font-bold hover:text-blue-800 transition-colors px-2 py-1 rounded hover:bg-blue-100/50"><Plus size={16} /> {t('addLine')}</button>
                </td>
                <td className={`px-4 py-3 text-end font-mono font-bold text-sm border-t-2 ${!isBalanced ? 'border-red-300 text-red-600 bg-red-50' : 'border-slate-300 text-slate-800'}`} dir="ltr">{totalDebit.toFixed(2)}</td>
                <td className={`px-4 py-3 text-end font-mono font-bold text-sm border-t-2 ${!isBalanced ? 'border-red-300 text-red-600 bg-red-50' : 'border-slate-300 text-slate-800'}`} dir="ltr">{totalCredit.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
         <div className="flex items-center gap-4">
           {!isBalanced && <div className="text-red-600 text-sm font-bold flex items-center gap-2 bg-red-50 px-4 py-2 rounded-lg border border-red-100"><AlertCircle size={16} /> {t('difference')}: <span dir="ltr">{diff.toFixed(2)}</span></div>}
           {isBalanced && <div className="text-green-600 text-sm font-bold flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg border border-green-100"><CheckCircle size={16} /> {t('balanced')}</div>}
         </div>
         <div className="flex items-center gap-3">
           <button className="px-6 py-2.5 rounded-lg text-slate-600 font-medium hover:bg-slate-200 transition-colors text-sm">{t('draft')}</button>
           <button onClick={handleSave} disabled={!isBalanced || totalDebit === 0 || isSubmitting} className={`px-6 py-2.5 rounded-lg text-white font-medium flex items-center gap-2 shadow-sm transition-all text-sm ${isBalanced && totalDebit > 0 && !isSubmitting ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'}`}>
             {isSubmitting ? <Loader size={18} className="animate-spin" /> : <Save size={18} />} {isSubmitting ? t('posting') : t('postEntry')}
           </button>
         </div>
      </div>
    </div>
  );
};

// --- APP SHELL ---

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [lang, setLang] = useState('en');
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // New Mobile State

  const t = (key) => TRANSLATIONS[lang][key] || key;

  // Auto-close menu when view changes on mobile
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeView]);

  if (!user) {
    return <AuthScreen onLogin={setUser} lang={lang} t={t} setLang={setLang} />;
  }

  // Common Sidebar Content
  const SidebarContent = () => (
    <>
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold me-3 shadow-blue-200 shadow-lg">M</div>
        <div>
          <span className="text-xl font-bold text-slate-800 tracking-tight block leading-none">macc</span>
          <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase block mt-0.5">{t('subBrand')}</span>
        </div>
        {/* Mobile Close Button */}
        <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden ms-auto text-slate-400 hover:text-slate-600">
          <X size={24} />
        </button>
      </div>

      <nav className="flex-1 py-6 overflow-y-auto">
        <div className="px-6 mb-3 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('general')}</div>
        <SidebarItem icon={LayoutDashboard} label={t('dashboard')} active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} lang={lang} />
        <SidebarItem icon={Folder} label={t('chartOfAccounts')} active={activeView === 'accounts'} onClick={() => setActiveView('accounts')} lang={lang} />
        <SidebarItem icon={FileText} label={t('journalEntries')} active={activeView === 'journal'} onClick={() => setActiveView('journal')} lang={lang} />
        
        <div className="px-6 mt-8 mb-3 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('trading')}</div>
        <SidebarItem icon={Package} label={t('inventory')} hasSubmenu lang={lang} />
        <SidebarItem icon={FileText} label={t('invoices')} hasSubmenu lang={lang} />
        
        <div className="px-6 mt-8 mb-3 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('system')}</div>
        <SidebarItem icon={Settings} label={t('settings')} lang={lang} />
      </nav>
      
      <div className="p-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-xs font-medium text-slate-600">{t('demoMode')}</span>
            <button onClick={() => setIsDemoMode(!isDemoMode)} className={`w-10 h-5 rounded-full relative transition-colors ${isDemoMode ? 'bg-blue-500' : 'bg-slate-300'}`}>
              <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${isDemoMode ? (lang === 'ar' ? 'right-6' : 'left-6') : (lang === 'ar' ? 'right-1' : 'left-1')}`} />
            </button>
        </div>
        <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="flex items-center justify-center gap-2 w-full p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium">
          <Globe size={16} /> {lang === 'en' ? 'العربية' : 'English'}
        </button>
        <button onClick={() => setUser(null)} className="flex items-center justify-center gap-2 w-full p-2 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 transition-colors text-sm font-medium">
          <LogOut size={16} /> {t('logout')}
        </button>
      </div>
    </>
  );

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="flex h-screen bg-slate-100 font-sans text-slate-900 relative">
      
      {/* SIDEBAR - DESKTOP (Hidden on Mobile) */}
      <div className="hidden lg:flex w-64 bg-white border-e border-slate-200 flex-col shadow-sm z-20">
        <SidebarContent />
      </div>

      {/* SIDEBAR - MOBILE (Slide-over) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
          {/* Drawer */}
          <div className={`relative w-64 h-full bg-white shadow-xl flex flex-col transition-transform duration-300 ${lang === 'ar' ? 'translate-x-0' : 'translate-x-0'}`}>
             <SidebarContent />
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shadow-sm z-10">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden text-slate-600 hover:bg-slate-100 p-2 rounded-lg">
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-800 hidden md:block">
                {activeView === 'dashboard' && t('financialOverview')}
                {activeView === 'accounts' && t('chartOfAccounts')}
                {activeView === 'journal' && t('newJournalEntry')}
              </h2>
              <h2 className="text-lg font-bold text-slate-800 md:hidden">macc</h2>
              <p className="text-xs text-slate-400 font-medium hidden md:block">{t('financialYear')}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-end hidden sm:block">
              <p className="text-sm font-bold text-slate-700">{user.name}</p>
              <p className="text-xs text-slate-500">{user.role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow flex items-center justify-center text-slate-500 font-bold uppercase">
              {user.name.charAt(0)}
            </div>
          </div>
        </header>

        {/* WORKSPACE */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
          {activeView === 'dashboard' && <Dashboard t={t} />}
          {activeView === 'accounts' && <AccountTree t={t} lang={lang} data={ACCOUNTS_DATA} />}
          {activeView === 'journal' && <JournalEntry isDemoMode={isDemoMode} t={t} lang={lang} />}
        </main>
      </div>
    </div>
  );
}