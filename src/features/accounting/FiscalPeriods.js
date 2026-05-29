import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarPlus, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { ApiClient } from '../../services/api';

function currentYear() {
  return new Date().getFullYear();
}

const blankYear = {
  code: `FY${currentYear() + 1}`,
  starts_on: `${currentYear() + 1}-01-01`,
  ends_on: `${currentYear() + 1}-12-31`,
  status: 'OPEN',
  generate_periods: true,
};

export default function FiscalPeriods({ token }) {
  const { t } = useI18n();
  const [years, setYears] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [form, setForm] = useState(blankYear);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setIsLoading(true);
    setError('');
    Promise.all([ApiClient.fiscalYears(token), ApiClient.fiscalPeriods(token)])
      .then(([yearPayload, periodPayload]) => {
        setYears(yearPayload);
        setPeriods(periodPayload);
        setSelectedYear((current) => current || String(yearPayload[0]?.id || ''));
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');
    Promise.all([ApiClient.fiscalYears(token), ApiClient.fiscalPeriods(token)])
      .then(([yearPayload, periodPayload]) => {
        if (!active) return;
        setYears(yearPayload);
        setPeriods(periodPayload);
        setSelectedYear((current) => current || String(yearPayload[0]?.id || ''));
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

  const visiblePeriods = useMemo(() => (
    selectedYear ? periods.filter((period) => String(period.financial_year_id) === String(selectedYear)) : periods
  ), [periods, selectedYear]);

  const createYear = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const created = await ApiClient.createFiscalYear(token, form);
      setMessage(t('accounting.fiscalYearCreated'));
      setForm({ ...blankYear, code: `FY${currentYear() + years.length + 2}` });
      setSelectedYear(String(created.id));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (periodId, status) => {
    setMessage('');
    setError('');
    try {
      await ApiClient.updateFiscalPeriod(token, periodId, { status });
      setMessage(t('accounting.periodUpdated'));
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <form onSubmit={createYear} className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <CalendarPlus size={20} className="text-blue-700" />
          <h3 className="font-black text-slate-950">{t('accounting.newFiscalYear')}</h3>
        </div>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-500">{t('common.code')}</span>
            <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} className="h-10 w-full rounded-md border border-slate-300 px-3 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" dir="ltr" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-500">{t('accounting.startsOn')}</span>
              <input type="date" value={form.starts_on} onChange={(event) => setForm({ ...form, starts_on: event.target.value })} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-500">{t('accounting.endsOn')}</span>
              <input type="date" value={form.ends_on} onChange={(event) => setForm({ ...form, ends_on: event.target.value })} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={form.generate_periods} onChange={(event) => setForm({ ...form, generate_periods: event.target.checked })} />
            {t('accounting.generateMonthlyPeriods')}
          </label>
          <button type="submit" disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            <CalendarPlus size={16} />
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-black text-slate-950">{t('accounting.tabs.periods')}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">{visiblePeriods.length} {t('accounting.periods')}</p>
          </div>
          <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} className="h-10 rounded-md border border-slate-300 px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500">
            <option value="">{t('common.total')}</option>
            {years.map((year) => (
              <option key={year.id} value={year.id}>{year.code} · {year.status}</option>
            ))}
          </select>
        </div>

        {message && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            <CheckCircle2 size={18} />
            {message}
          </div>
        )}
        {error && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {isLoading && <div className="p-5 text-sm font-bold text-slate-500">{t('common.loading')}</div>}
        {!isLoading && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-start">{t('common.code')}</th>
                  <th className="px-5 py-3 text-start">{t('common.date')}</th>
                  <th className="px-5 py-3 text-start">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visiblePeriods.length === 0 && (
                  <tr>
                    <td className="px-5 py-6 text-center font-semibold text-slate-500" colSpan={3}>{t('common.empty')}</td>
                  </tr>
                )}
                {visiblePeriods.map((period) => (
                  <tr key={period.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono font-black text-blue-800" dir="ltr">{period.code}</td>
                    <td className="px-5 py-3 font-bold text-slate-700" dir="ltr">{period.starts_on} - {period.ends_on}</td>
                    <td className="px-5 py-3">
                      <select value={period.status} onChange={(event) => updateStatus(period.id, event.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500">
                        <option value="OPEN">{t('accounting.statusOpen')}</option>
                        <option value="CLOSED">{t('accounting.statusClosed')}</option>
                        <option value="LOCKED">{t('accounting.statusLocked')}</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
