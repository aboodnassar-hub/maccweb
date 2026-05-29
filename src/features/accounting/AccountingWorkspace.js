import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, FileText, GitBranch, LockKeyhole, Scale } from 'lucide-react';
import ChartOfAccounts from './ChartOfAccounts';
import FiscalPeriods from './FiscalPeriods';
import JournalEntry from './JournalEntry';
import TrialBalance from './TrialBalance';
import { useI18n } from '../../i18n/I18nProvider';
import { ApiClient } from '../../services/api';

const tabs = [
  { id: 'overview', key: 'accounting.tabs.overview' },
  { id: 'accounts', key: 'accounting.tabs.accounts' },
  { id: 'journal', key: 'accounting.tabs.journal' },
  { id: 'ledger', key: 'accounting.tabs.ledger' },
  { id: 'periods', key: 'accounting.tabs.periods' },
];

export default function AccountingWorkspace({ token }) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');

    ApiClient.accountingSummary(token)
      .then((payload) => {
        if (active) setSummary(payload);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const insightCards = useMemo(() => {
    if (!summary) return [];
    return [
      {
        icon: FileText,
        label: t('accounting.openingBalance'),
        value: Number(summary.opening_balance || 0).toFixed(3),
        hint: t('accounting.priorYearCarry'),
      },
      {
        icon: CalendarDays,
        label: t('accounting.fiscalStatus'),
        value: summary.fiscal_year_code || t('common.pending'),
        hint: summary.current_period_code ? `${summary.current_period_code} · ${summary.current_period_status}` : t('accounting.noCurrentPeriod'),
      },
      {
        icon: CheckCircle2,
        label: t('accounting.accountingHealth'),
        value: summary.health_status === 'BALANCED' ? t('common.balanced') : t('common.attention'),
        hint: `${t('common.difference')}: ${Number(summary.difference || 0).toFixed(3)}`,
      },
    ];
  }, [summary, t]);

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
          {isLoading && <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-bold text-slate-500 lg:col-span-3">{t('common.loading')}</div>}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700 lg:col-span-3">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          {[
            { icon: Scale, key: 'accounting.controlDoubleEntry', state: 'common.enabled' },
            { icon: GitBranch, key: 'accounting.controlLeafOnly', state: 'common.enabled' },
            { icon: LockKeyhole, key: 'accounting.controlPeriodLock', state: 'common.enabled' },
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

          {summary && (
            <>
              <article className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-3">
                <div className="grid gap-4 md:grid-cols-3">
                  {insightCards.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <Icon className="text-slate-500" size={22} />
                        <div>
                          <p className="text-sm font-bold text-slate-500">{item.label}</p>
                          <p className="font-mono text-xl font-black text-slate-950" dir="ltr">{item.value}</p>
                          <p className="mt-1 text-xs font-bold text-slate-500">{item.hint}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-3">
                <div className="grid gap-4 md:grid-cols-4">
                  {[
                    { label: t('accounting.totalAccounts'), value: summary.accounts_total },
                    { label: t('accounting.postingAccounts'), value: summary.posting_accounts },
                    { label: t('accounting.draftEntries'), value: summary.draft_entries },
                    { label: t('accounting.postedEntries'), value: summary.posted_entries },
                    { label: t('accounting.openPeriods'), value: summary.open_periods },
                    { label: t('accounting.restrictedPeriods'), value: summary.restricted_periods },
                    { label: t('common.debit'), value: Number(summary.posted_debit || 0).toFixed(3) },
                    { label: t('common.credit'), value: Number(summary.posted_credit || 0).toFixed(3) },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">{metric.label}</p>
                      <p className="mt-2 font-mono text-xl font-black text-slate-950" dir="ltr">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </article>
            </>
          )}
        </section>
      )}

      {activeTab === 'accounts' && <ChartOfAccounts token={token} />}
      {activeTab === 'journal' && <JournalEntry token={token} />}
      {activeTab === 'ledger' && <TrialBalance token={token} />}
      {activeTab === 'periods' && <FiscalPeriods token={token} />}
    </div>
  );
}
