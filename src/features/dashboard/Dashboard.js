import React from 'react';
import { ArrowDownRight, ArrowUpRight, CircleCheck, Clock3 } from 'lucide-react';
import { businessCycle, dashboardKpis, moduleReadiness, recentActivity } from '../../data/erpData';
import { useI18n } from '../../i18n/I18nProvider';

const toneClasses = {
  blue: 'border-blue-200 bg-blue-50 text-blue-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rose: 'border-rose-200 bg-rose-50 text-rose-800',
};

export default function Dashboard() {
  const { language, localize, t } = useI18n();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-2xl font-black tracking-normal text-slate-950">{t('dashboard.title')}</h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">{t('dashboard.subtitle')}</p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardKpis.map((item) => {
          const positive = item.delta.startsWith('+');
          const TrendIcon = positive ? ArrowUpRight : ArrowDownRight;
          return (
            <article key={item.key} className={`rounded-lg border p-4 ${toneClasses[item.tone]}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold">{t(item.key)}</p>
                <TrendIcon size={18} />
              </div>
              <p className="mt-5 text-2xl font-black tracking-normal" dir="ltr">{item.value}</p>
              <p className="mt-2 text-sm font-bold" dir="ltr">{item.delta}</p>
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-black text-slate-950">{t('dashboard.businessCycle')}</h3>
          </div>
          <div className="grid gap-3 p-5 md:grid-cols-5">
            {businessCycle.map((step, index) => (
              <div key={step.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-white text-xs font-black text-slate-700 ring-1 ring-slate-200">
                    {index + 1}
                  </span>
                  {step.status === 'active' ? <CircleCheck className="text-emerald-600" size={18} /> : <Clock3 className="text-amber-600" size={18} />}
                </div>
                <p className="mt-4 text-sm font-black text-slate-800">{localize(step.label)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-black text-slate-950">{t('dashboard.moduleReadiness')}</h3>
          </div>
          <div className="space-y-4 p-5">
            {moduleReadiness.map((item) => (
              <div key={item.module}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-slate-700">{language === 'ar' ? item.moduleAr : item.module}</span>
                  <span className="font-black text-slate-950" dir="ltr">{item.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${item.value}%` }} />
                </div>
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
                <th className="px-5 py-3 text-end">{t('common.amount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentActivity.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-600" dir="ltr">{row.date}</td>
                  <td className="px-5 py-3 font-bold text-slate-800">{t(row.key)}</td>
                  <td className="px-5 py-3 font-mono text-slate-600" dir="ltr">{row.ref}</td>
                  <td className="px-5 py-3 text-end font-mono font-bold text-slate-800" dir="ltr">{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
