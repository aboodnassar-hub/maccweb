import React from 'react';
import { trialBalance } from '../../data/erpData';
import { useI18n } from '../../i18n/I18nProvider';

export default function TrialBalance() {
  const { localize, t } = useI18n();
  const totals = trialBalance.reduce(
    (sum, row) => ({
      debit: sum.debit + row.debit,
      credit: sum.credit + row.credit,
    }),
    { debit: 0, credit: 0 },
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="font-black text-slate-950">{t('accounting.trialBalance')}</h3>
      </div>
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
            {trialBalance.map((row) => (
              <tr key={row.code} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-mono font-black text-blue-800" dir="ltr">{row.code}</td>
                <td className="px-5 py-3 font-bold text-slate-800">{localize(row.name)}</td>
                <td className="px-5 py-3 text-end font-mono" dir="ltr">{row.debit.toFixed(3)}</td>
                <td className="px-5 py-3 text-end font-mono" dir="ltr">{row.credit.toFixed(3)}</td>
                <td className="px-5 py-3 text-end font-mono font-black" dir="ltr">{(row.debit - row.credit).toFixed(3)}</td>
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
    </section>
  );
}
