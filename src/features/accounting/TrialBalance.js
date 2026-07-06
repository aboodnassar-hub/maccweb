import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Filter } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { ApiClient } from '../../services/api';

function toNumber(value) {
  return Number(value || 0);
}

export default function TrialBalance({ token }) {
  const { language, t } = useI18n();
  const [trialBalance, setTrialBalance] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [filters, setFilters] = useState({ from_date: '', to_date: '', period_id: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    ApiClient.fiscalPeriods(token)
      .then((payload) => {
        if (active) setPeriods(payload);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');

    ApiClient.trialBalance(token, filters)
      .then((payload) => {
        if (active) setTrialBalance(payload);
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
  }, [token, filters]);

  const totals = useMemo(() => trialBalance.reduce(
    (sum, row) => ({
      debit: sum.debit + toNumber(row.debit),
      credit: sum.credit + toNumber(row.credit),
    }),
    { debit: 0, credit: 0 },
  ), [trialBalance]);

  const difference = totals.debit - totals.credit;
  const balanced = Math.abs(difference) < 0.001;

  const updateFilter = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
      ...(field === 'period_id' && value ? { from_date: '', to_date: '' } : {}),
      ...((field === 'from_date' || field === 'to_date') && value ? { period_id: '' } : {}),
    }));
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="font-black text-slate-950">{t('accounting.trialBalance')}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{t('accounting.postedEntriesOnly')}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
            <Filter size={16} />
            <select value={filters.period_id} onChange={(event) => updateFilter('period_id', event.target.value)} className="bg-transparent text-sm font-bold text-slate-800 outline-none">
              <option value="">{t('accounting.allPeriods')}</option>
              {periods.map((period) => (
                <option key={period.id} value={period.id}>{period.code} - {period.status}</option>
              ))}
            </select>
          </label>
          <input type="date" value={filters.from_date} onChange={(event) => updateFilter('from_date', event.target.value)} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500" />
          <input type="date" value={filters.to_date} onChange={(event) => updateFilter('to_date', event.target.value)} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500" />
        </div>
      </div>
      {isLoading && <div className="p-5 text-sm font-bold text-slate-500">{t('common.loading')}</div>}
      {error && (
        <div className="flex items-center gap-2 p-5 text-sm font-bold text-rose-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {!isLoading && !error && (
        <>
          <div className={`mx-5 mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-black ${
            balanced ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}>
            {balanced ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {balanced ? t('common.balanced') : `${t('common.difference')}: ${difference.toFixed(3)}`}
          </div>
          <div className="mx-5 mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [t('accounting.accountsShown'), trialBalance.length],
              [t('common.debit'), totals.debit.toFixed(3)],
              [t('common.credit'), totals.credit.toFixed(3)],
              [t('common.difference'), difference.toFixed(3)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</p>
                <p className="mt-1 font-mono text-lg font-black text-slate-950" dir="ltr">{value}</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="mt-4 w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-start">{t('common.code')}</th>
                  <th className="px-5 py-3 text-start">{t('accounting.account')}</th>
                  <th className="px-5 py-3 text-end">{t('common.debit')}</th>
                  <th className="px-5 py-3 text-end">{t('common.credit')}</th>
                  <th className="px-5 py-3 text-end">{t('accounting.balance')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trialBalance.length === 0 && (
                  <tr>
                    <td className="px-5 py-6 text-center font-semibold text-slate-500" colSpan={5}>{t('common.empty')}</td>
                  </tr>
                )}
                {trialBalance.map((row) => (
                  <tr key={row.account_code} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono font-black text-blue-800" dir="ltr">{row.account_code}</td>
                    <td className="px-5 py-3 font-bold text-slate-800">{language === 'ar' ? row.name_ar : row.name_en}</td>
                    <td className="px-5 py-3 text-end font-mono" dir="ltr">{toNumber(row.debit).toFixed(3)}</td>
                    <td className="px-5 py-3 text-end font-mono" dir="ltr">{toNumber(row.credit).toFixed(3)}</td>
                    <td className="px-5 py-3 text-end font-mono font-black" dir="ltr">{toNumber(row.balance).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50">
                <tr>
                  <td className="px-5 py-3 font-black" colSpan={2}>{t('common.total')}</td>
                  <td className="px-5 py-3 text-end font-mono font-black" dir="ltr">{totals.debit.toFixed(3)}</td>
                  <td className="px-5 py-3 text-end font-mono font-black" dir="ltr">{totals.credit.toFixed(3)}</td>
                  <td className="px-5 py-3 text-end font-mono font-black" dir="ltr">{difference.toFixed(3)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
