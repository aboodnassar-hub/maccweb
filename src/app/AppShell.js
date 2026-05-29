import React, { useMemo, useState } from 'react';
import { Bell, Languages, LogOut, Menu, Search, X } from 'lucide-react';
import { NAVIGATION_GROUPS } from './navigation';
import AuthScreen from '../features/auth/AuthScreen';
import Dashboard from '../features/dashboard/Dashboard';
import AccountingWorkspace from '../features/accounting/AccountingWorkspace';
import ModuleWorkspace from '../features/modules/ModuleWorkspace';
import { useI18n } from '../i18n/I18nProvider';

function SidebarItem({ item, activeModule, onSelect }) {
  const { t } = useI18n();
  const Icon = item.icon;
  const active = activeModule === item.id;

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={`flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold transition ${
        active ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
      }`}
    >
      <Icon size={18} />
      <span className="truncate">{t(item.labelKey)}</span>
    </button>
  );
}

function Sidebar({ activeModule, onSelect, onClose }) {
  const { t } = useI18n();

  return (
    <aside className="flex h-full w-72 flex-col border-e border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-950 font-black text-white">M</div>
        <div className="min-w-0">
          <p className="text-lg font-black leading-5 text-slate-950">{t('app.name')}</p>
          <p className="truncate text-xs font-semibold text-slate-500">{t('app.subtitle')}</p>
        </div>
        <button type="button" onClick={onClose} className="ms-auto rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto px-4 py-5">
        {NAVIGATION_GROUPS.map((group) => (
          <div key={group.titleKey}>
            <p className="mb-2 px-3 text-xs font-black uppercase tracking-widest text-slate-400">{t(group.titleKey)}</p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <SidebarItem key={item.id} item={item} activeModule={activeModule} onSelect={onSelect} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default function AppShell() {
  const { dir, language, t, toggleLanguage } = useI18n();
  const [user, setUser] = useState(null);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeItem = useMemo(
    () => NAVIGATION_GROUPS.flatMap((group) => group.items).find((item) => item.id === activeModule),
    [activeModule],
  );

  if (!user) {
    return <AuthScreen onAuthenticated={setUser} />;
  }

  const selectModule = (moduleId) => {
    setActiveModule(moduleId);
    setMobileOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 text-slate-950" dir={dir}>
      <div className="hidden lg:block">
        <Sidebar activeModule={activeModule} onSelect={selectModule} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-slate-950/50" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full">
            <Sidebar activeModule={activeModule} onSelect={selectModule} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm md:px-6">
          <button type="button" onClick={() => setMobileOpen(true)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
            <Menu size={22} />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-black tracking-normal text-slate-950">
              {activeModule === 'dashboard' ? t('dashboard.title') : t(activeItem?.labelKey || 'nav.dashboard')}
            </h1>
            <p className="hidden text-xs font-semibold text-slate-500 sm:block">
              {t('app.company')} · {t('app.financialYear')} · {t('app.demo')}
            </p>
          </div>

          <div className="hidden h-10 min-w-[220px] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 md:flex">
            <Search size={16} />
            <span className="truncate">{t('app.search')}</span>
          </div>

          <button type="button" title={t('app.switchLanguage')} onClick={toggleLanguage} className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
            <Languages size={19} />
          </button>
          <button type="button" title="Notifications" className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
            <Bell size={19} />
          </button>

          <div className="hidden text-end sm:block">
            <p className="text-sm font-bold text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-500">{user.role}</p>
          </div>
          <button
            type="button"
            title={t('app.logout')}
            onClick={() => setUser(null)}
            className="grid h-10 w-10 place-items-center rounded-md bg-slate-950 text-sm font-black text-white"
          >
            {language === 'ar' ? <LogOut size={18} /> : user.name.charAt(0)}
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          {activeModule === 'dashboard' && <Dashboard />}
          {activeModule === 'accounting' && <AccountingWorkspace />}
          {!['dashboard', 'accounting'].includes(activeModule) && <ModuleWorkspace moduleId={activeModule} />}
        </main>
      </div>
    </div>
  );
}
