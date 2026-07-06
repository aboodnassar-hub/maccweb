import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, BarChart3 } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { ApiClient } from '../../services/api';

function money(value) {
  return Number(value || 0).toFixed(3);
}

function localLabel(row, language) {
  return language === 'ar' ? row.label_ar || row.label_en : row.label_en || row.code;
}

const inputClass = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-widest text-slate-500';

export default function ProfitLossWorkspace({ token }) {
  const { language, t } = useI18n();
  const [filters, setFilters] = useState({ date_from: '', date_to: '' });
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);
    setError('');
    ApiClient.profitLoss(token, filters)
      .then((payload) => setReport(payload))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [filters, token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-normal text-slate-950">{t('profitLoss.title')}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t('profitLoss.subtitle')}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">{t('profitLoss.netProfit')}</p>
          <p className="mt-1 font-mono text-lg font-black text-slate-950" dir="ltr">{money(report?.net_profit)}</p>
        </div>
      </section>

      {error && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800"><AlertCircle size={18} />{error}</div>}

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <label className="block">
            <span className={labelClass}>{t('accounting.startsOn')}</span>
            <input type="date" value={filters.date_from} onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))} className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>{t('accounting.endsOn')}</span>
            <input type="date" value={filters.date_to} onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))} className={inputClass} />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <BarChart3 className="text-blue-700" size={20} />
          <h3 className="font-black text-slate-950">{t('profitLoss.report')}</h3>
        </div>
        {isLoading && <div className="p-5 text-sm font-bold text-slate-500">{t('common.loading')}</div>}
        {!isLoading && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <tbody className="divide-y divide-slate-100">
                {report?.lines?.map((line) => (
                  <tr key={line.code} className={line.code === 'net_profit' ? 'bg-slate-50' : ''}>
                    <td className="px-5 py-4 font-black text-slate-900">{localLabel(line, language)}</td>
                    <td className="px-5 py-4 text-end font-mono font-black text-slate-950" dir="ltr">{money(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
