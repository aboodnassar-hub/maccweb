import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GitBranch,
  LockKeyhole,
  PenLine,
  Scale,
} from 'lucide-react';
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

function money(value) {
  return Number(value || 0).toFixed(3);
}

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
        value: money(summary.opening_balance),
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
        hint: `${t('common.difference')}: ${money(summary.difference)}`,
      },
    ];
  }, [summary, t]);

  const quickActions = useMemo(() => [
    {
      icon: BookOpen,
      tab: 'accounts',
      title: t('accounting.actionAccounts'),
      hint: t('accounting.actionAccountsHint'),
    },
    {
      icon: PenLine,
      tab: 'journal',
      title: t('accounting.actionJournal'),
      hint: t('accounting.actionJournalHint'),
    },
    {
      icon: Scale,
      tab: 'ledger',
      title: t('accounting.actionTrial'),
      hint: t('accounting.actionTrialHint'),
    },
    {
      icon: CalendarDays,
      tab: 'periods',
      title: t('accounting.actionPeriods'),
      hint: t('accounting.actionPeriodsHint'),
    },
  ], [t]);

  const readiness = useMemo(() => {
    if (!summary) return [];
    const balanced = Math.abs(Number(summary.difference || 0)) < 0.001;
    return [
      {
        label: t('accounting.readyChart'),
        ok: Number(summary.posting_accounts || 0) > 0,
        detail: `${summary.posting_accounts || 0} ${t('accounting.postingAccounts')}`,
      },
      {
        label: t('accounting.readyPeriod'),
        ok: summary.current_period_status === 'OPEN',
        detail: summary.current_period_code ? `${summary.current_period_code} / ${summary.current_period_status}` : t('accounting.noCurrentPeriod'),
      },
      {
        label: t('accounting.readyBalance'),
        ok: balanced,
        detail: `${t('common.difference')}: ${money(summary.difference)}`,
      },
      {
        label: t('accounting.readyDrafts'),
        ok: Number(summary.draft_entries || 0) === 0,
        detail: `${summary.draft_entries || 0} ${t('accounting.draftEntries')}`,
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
        <section className="space-y-4">
          {isLoading && <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-bold text-slate-500 lg:col-span-3">{t('common.loading')}</div>}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700 lg:col-span-3">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {summary && (
            <>
              <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <article className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">{t('accounting.controlCenter')}</p>
                      <h3 className="mt-2 text-xl font-black text-slate-950">{t('accounting.overviewHeadline')}</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t('accounting.overviewHelp')}</p>
                    </div>
                    <span className={`inline-flex h-9 items-center justify-center rounded-md px-3 text-xs font-black ${
                      summary.health_status === 'BALANCED' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {summary.health_status === 'BALANCED' ? t('common.balanced') : t('common.attention')}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {insightCards.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Icon size={18} />
                            <p className="text-xs font-black uppercase tracking-widest">{item.label}</p>
                          </div>
                          <p className="mt-3 font-mono text-xl font-black text-slate-950" dir="ltr">{item.value}</p>
                          <p className="mt-1 text-xs font-bold text-slate-500">{item.hint}</p>
                        </div>
                      );
                    })}
                  </div>
                </article>

                <article className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="text-blue-700" size={20} />
                    <h3 className="font-black text-slate-950">{t('accounting.readinessChecklist')}</h3>
                  </div>
                  <div className="mt-4 space-y-3">
                    {readiness.map((item) => (
                      <div key={item.label} className="flex items-start gap-3">
                        <span className={`mt-0.5 grid h-6 w-6 place-items-center rounded-md ${item.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {item.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900">{item.label}</p>
                          <p className="text-xs font-semibold text-slate-500">{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </div>

              <article className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-black text-slate-950">{t('accounting.quickActions')}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{t('accounting.quickActionsHint')}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.tab}
                        type="button"
                        onClick={() => setActiveTab(action.tab)}
                        className="flex min-h-[112px] flex-col items-start rounded-lg border border-slate-200 bg-slate-50 p-4 text-start transition hover:border-blue-200 hover:bg-blue-50"
                      >
                        <Icon className="text-blue-700" size={20} />
                        <span className="mt-3 font-black text-slate-950">{action.title}</span>
                        <span className="mt-1 text-sm font-semibold leading-5 text-slate-600">{action.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </article>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
              </section>

              <article className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="grid gap-4 md:grid-cols-4">
                  {[
                    { label: t('accounting.totalAccounts'), value: summary.accounts_total },
                    { label: t('accounting.postingAccounts'), value: summary.posting_accounts },
                    { label: t('accounting.draftEntries'), value: summary.draft_entries },
                    { label: t('accounting.postedEntries'), value: summary.posted_entries },
                    { label: t('accounting.openPeriods'), value: summary.open_periods },
                    { label: t('accounting.restrictedPeriods'), value: summary.restricted_periods },
                    { label: t('common.debit'), value: money(summary.posted_debit) },
                    { label: t('common.credit'), value: money(summary.posted_credit) },
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
