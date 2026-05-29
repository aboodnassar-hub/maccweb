import React from 'react';
import { CheckCircle2, Plus, RadioTower, Workflow } from 'lucide-react';
import { moduleWorkspaces } from '../../data/erpData';
import { useI18n } from '../../i18n/I18nProvider';

const statusTone = {
  active: 'bg-emerald-50 text-emerald-700',
  posted: 'bg-blue-50 text-blue-700',
  pending: 'bg-amber-50 text-amber-700',
  draft: 'bg-slate-100 text-slate-700',
};

export default function ModuleWorkspace({ moduleId }) {
  const { localize, t } = useI18n();
  const workspace = moduleWorkspaces[moduleId] || moduleWorkspaces.reports;
  const titleKey = `modules.${moduleId}.title`;
  const subtitleKey = `modules.${moduleId}.subtitle`;
  const primaryKey = `modules.${moduleId}.primary`;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-normal text-slate-950">{t(titleKey)}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t(subtitleKey)}</p>
        </div>
        <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800">
          <Plus size={16} />
          {t(primaryKey)}
        </button>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <Workflow className="text-blue-700" size={20} />
            <h3 className="font-black text-slate-950">{t('modules.workflow')}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {workspace.workflow.map((step, index) => (
              <div key={localize(step)} className="flex items-center gap-3 px-5 py-4">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-slate-100 text-xs font-black text-slate-700">{index + 1}</span>
                <p className="flex-1 font-bold text-slate-800">{localize(step)}</p>
                <CheckCircle2 className="text-emerald-600" size={18} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-black text-slate-950">{t('modules.registers')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-start">{t('common.code')}</th>
                  <th className="px-5 py-3 text-start">{t('common.description')}</th>
                  <th className="px-5 py-3 text-start">{t('common.amount')}</th>
                  <th className="px-5 py-3 text-end">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workspace.records.map((row) => (
                  <tr key={row[0]} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono font-black text-blue-800" dir="ltr">{row[0]}</td>
                    <td className="px-5 py-3 font-bold text-slate-800">{row[1]}</td>
                    <td className="px-5 py-3 text-slate-600" dir="ltr">{row[2]}</td>
                    <td className="px-5 py-3 text-end">
                      <span className={`rounded-md px-2 py-1 text-xs font-black ${statusTone[row[3]] || statusTone.active}`}>{t(`common.${row[3]}`, row[3])}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <RadioTower className="text-emerald-700" size={20} />
          <h3 className="font-black text-slate-950">{t('modules.integrations')}</h3>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {['API', 'Audit log', 'Notifications'].map((item) => (
            <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="font-bold text-slate-800">{item}</p>
              <p className="mt-1 text-sm font-semibold text-emerald-700">{t('common.foundation')}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
