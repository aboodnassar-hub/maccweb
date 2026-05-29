import React, { useState } from 'react';
import { CalendarDays, CheckCircle2, FileText, GitBranch, LockKeyhole, Scale } from 'lucide-react';
import ChartOfAccounts from './ChartOfAccounts';
import JournalEntry from './JournalEntry';
import TrialBalance from './TrialBalance';
import { useI18n } from '../../i18n/I18nProvider';

const tabs = [
  { id: 'overview', key: 'accounting.tabs.overview' },
  { id: 'accounts', key: 'accounting.tabs.accounts' },
  { id: 'journal', key: 'accounting.tabs.journal' },
  { id: 'ledger', key: 'accounting.tabs.ledger' },
  { id: 'periods', key: 'accounting.tabs.periods' },
];

export default function AccountingWorkspace() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-2xl font-black tracking-normal text-slate-950">{t('accounting.title')}</h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">{t('accounting.subtitle')}</p>
      </section>

      <div className="overflow-x-auto">
        <div className="inline-flex min-w-max rounded-lg border border-slate-200 bg-white p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`h-10 rounded-md px-4 text-sm font-bold ${
                activeTab === tab.id ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t(tab.key)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[
            { icon: Scale, key: 'accounting.controlDoubleEntry', state: 'common.enabled' },
            { icon: GitBranch, key: 'accounting.controlLeafOnly', state: 'common.enabled' },
            { icon: LockKeyhole, key: 'accounting.controlPeriodLock', state: 'common.foundation' },
          ].map((control) => {
            const Icon = control.icon;
            return (
              <article key={control.key} className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <Icon className="text-blue-700" size={22} />
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">{t(control.state)}</span>
                </div>
                <p className="mt-5 text-base font-black text-slate-900">{t(control.key)}</p>
              </article>
            );
          })}

          <article className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-3">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3">
                <FileText className="text-slate-500" size={22} />
                <div>
                  <p className="text-sm font-bold text-slate-500">{t('accounting.openingBalance')}</p>
                  <p className="font-mono text-xl font-black text-slate-950" dir="ltr">JOD 0.000</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CalendarDays className="text-slate-500" size={22} />
                <div>
                  <p className="text-sm font-bold text-slate-500">{t('accounting.fiscalStatus')}</p>
                  <p className="text-xl font-black text-slate-950">{t('common.active')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-emerald-600" size={22} />
                <div>
                  <p className="text-sm font-bold text-slate-500">{t('common.status')}</p>
                  <p className="text-xl font-black text-slate-950">{t('common.foundation')}</p>
                </div>
              </div>
            </div>
          </article>
        </section>
      )}

      {activeTab === 'accounts' && <ChartOfAccounts />}
      {activeTab === 'journal' && <JournalEntry />}
      {activeTab === 'ledger' && <TrialBalance />}
      {activeTab === 'periods' && (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="font-black text-slate-950">{t('accounting.fiscalStatus')}</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {['Q1', 'Q2', 'Q3', 'Q4'].map((period, index) => (
              <div key={period} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="font-mono text-lg font-black text-slate-950" dir="ltr">2026-{period}</p>
                <p className="mt-2 text-sm font-bold text-slate-500">{index < 2 ? t('common.active') : t('common.pending')}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
