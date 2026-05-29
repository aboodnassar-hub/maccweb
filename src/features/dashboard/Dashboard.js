import React, { useEffect, useState } from 'react';
import { AlertCircle, CircleCheck, Database } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { ApiClient } from '../../services/api';

const toneClasses = {
  blue: 'border-blue-200 bg-blue-50 text-blue-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rose: 'border-rose-200 bg-rose-50 text-rose-800',
};

function localLabel(row, language) {
  return language === 'ar' ? row.label_ar || row.name_ar || row.label_en : row.label_en || row.name_en || row.code;
}

export default function Dashboard({ token }) {
  const { language, t } = useI18n();
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');

    ApiClient.dashboardSummary(token)
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

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-2xl font-black tracking-normal text-slate-950">{t('dashboard.title')}</h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">{t('dashboard.subtitle')}</p>
      </section>

      {isLoading && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-bold text-slate-600">
          {t('common.loading', 'Loading live data...')}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {summary && (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summary.kpis.map((item) => (
              <article key={item.code} className={`rounded-lg border p-4 ${toneClasses[item.tone] || toneClasses.blue}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold">{localLabel(item, language)}</p>
                  <Database size={18} />
                </div>
                <p className="mt-5 text-2xl font-black tracking-normal" dir="ltr">{item.value}</p>
                <p className="mt-2 text-sm font-bold">{t('common.live', 'Live')}</p>
              </article>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="font-black text-slate-950">{t('dashboard.moduleReadiness')}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {summary.module_counts.map((item) => (
                  <div key={item.code} className="flex items-center gap-3 px-5 py-4">
                    <CircleCheck className="text-emerald-600" size={18} />
                    <p className="flex-1 font-bold text-slate-800">{localLabel(item, language)}</p>
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-sm font-black text-slate-700" dir="ltr">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="font-black text-slate-950">{t('accounting.trialBalance')}</h3>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-3">
                {['debit', 'credit', 'difference'].map((key) => (
                  <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-500">{t(`common.${key}`, key)}</p>
                    <p className="mt-3 font-mono text-lg font-black text-slate-950" dir="ltr">{summary.financial_totals[key]}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="font-black text-slate-950">{t('dashboard.recentActivity')}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-start">{t('common.date')}</th>
                    <th className="px-5 py-3 text-start">{t('common.description')}</th>
                    <th className="px-5 py-3 text-start">{t('common.code')}</th>
                    <th className="px-5 py-3 text-end">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.recent_activity.length === 0 && (
                    <tr>
                      <td className="px-5 py-6 text-center font-semibold text-slate-500" colSpan={4}>{t('common.empty', 'No records yet')}</td>
                    </tr>
                  )}
                  {summary.recent_activity.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-600" dir="ltr">{row.date}</td>
                      <td className="px-5 py-3 font-bold text-slate-800">{row.description}</td>
                      <td className="px-5 py-3 font-mono text-slate-600" dir="ltr">{row.reference}</td>
                      <td className="px-5 py-3 text-end font-bold text-slate-700">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
