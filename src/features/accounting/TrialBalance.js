import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { ApiClient } from '../../services/api';

function toNumber(value) {
  return Number(value || 0);
}

export default function TrialBalance({ token }) {
  const { language, t } = useI18n();
  const [trialBalance, setTrialBalance] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');

    ApiClient.trialBalance(token)
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
  }, [token]);

  const totals = trialBalance.reduce(
    (sum, row) => ({
      debit: sum.debit + toNumber(row.debit),
      credit: sum.credit + toNumber(row.credit),
    }),
    { debit: 0, credit: 0 },
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="font-black text-slate-950">{t('accounting.trialBalance')}</h3>
      </div>
      {isLoading && <div className="p-5 text-sm font-bold text-slate-500">{t('common.loading', 'Loading live data...')}</div>}
      {error && (
        <div className="flex items-center gap-2 p-5 text-sm font-bold text-rose-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {!isLoading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
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
                  <td className="px-5 py-6 text-center font-semibold text-slate-500" colSpan={5}>{t('common.empty', 'No records yet')}</td>
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
                <td className="px-5 py-3 text-end font-mono font-black" dir="ltr">{(totals.debit - totals.credit).toFixed(3)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
