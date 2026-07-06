import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Plus, RadioTower, Workflow } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { ApiClient } from '../../services/api';

const statusTone = {
  active: 'bg-emerald-50 text-emerald-700',
  posted: 'bg-blue-50 text-blue-700',
  POSTED: 'bg-blue-50 text-blue-700',
  pending: 'bg-amber-50 text-amber-700',
  draft: 'bg-slate-100 text-slate-700',
  DRAFT: 'bg-slate-100 text-slate-700',
};

const workflows = {
  sales: ['Customer order', 'Tax invoice', 'Receipt voucher', 'Posted journal'],
  purchases: ['Purchase request', 'Vendor invoice', 'Stock receipt', 'Payable entry'],
  inventory: ['Item master', 'Warehouse', 'Movement', 'Cost posting'],
  partners: ['Partner profile', 'Credit limits', 'Statement', 'Aging'],
  hr: ['Employee file', 'Department', 'Payroll draft', 'Accounting accrual'],
  reports: ['Data source', 'Filters', 'Preview', 'Export'],
  settings: ['Company', 'Roles', 'Permissions', 'Audit log'],
};

const workflowAr = {
  sales: ['طلب العميل', 'فاتورة ضريبية', 'سند قبض', 'قيد مرحل'],
  purchases: ['طلب شراء', 'فاتورة مورد', 'استلام مخزون', 'قيد ذمم دائنة'],
  inventory: ['بطاقة المادة', 'مستودع', 'حركة مخزون', 'ترحيل التكلفة'],
  partners: ['ملف الشريك', 'حدود الائتمان', 'كشف حساب', 'أعمار الديون'],
  hr: ['ملف الموظف', 'القسم', 'مسودة الرواتب', 'استحقاق محاسبي'],
  reports: ['مصدر البيانات', 'الفلاتر', 'المعاينة', 'التصدير'],
  settings: ['الشركة', 'الأدوار', 'الصلاحيات', 'سجل النشاط'],
};

function rowValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function mapRows(moduleId, payload, language) {
  if (moduleId === 'sales' || moduleId === 'purchases') {
    return asArray(payload).map((row) => ({
      code: row.invoice_number,
      description: row.invoice_type,
      detail: row.grand_total,
      status: row.status,
    }));
  }

  if (moduleId === 'inventory') {
    const items = asArray(payload?.items).map((row) => ({
      code: row.sku,
      description: language === 'ar' ? row.name_ar : row.name_en,
      detail: 'Item',
      status: 'active',
    }));
    const warehouses = asArray(payload?.warehouses).map((row) => ({
      code: row.code,
      description: language === 'ar' ? row.name_ar : row.name_en,
      detail: 'Warehouse',
      status: 'active',
    }));
    return [...items, ...warehouses];
  }

  if (moduleId === 'partners') {
    return asArray(payload).map((row) => ({
      code: row.code,
      description: language === 'ar' ? row.name_ar : row.name_en,
      detail: row.type,
      status: row.is_active ? 'active' : 'draft',
    }));
  }

  if (moduleId === 'hr') {
    return asArray(payload).map((row) => ({
      code: row.employee_number,
      description: language === 'ar' ? row.full_name_ar : row.full_name_en,
      detail: 'Employee',
      status: 'active',
    }));
  }

  if (moduleId === 'reports') {
    const trialBalanceRows = asArray(payload?.trial_balance);
    return asArray(payload?.available_reports).map((row) => ({
      code: row.code,
      description: language === 'ar' ? row.name_ar : row.name_en,
      detail: `${trialBalanceRows.length} trial balance rows`,
      status: 'active',
    }));
  }

  return asArray(payload).map((row) => ({
    code: row.code,
    description: row.status,
    detail: (row.dependencies || []).join(', ') || '-',
    status: row.status,
  }));
}

async function fetchModule(moduleId, token) {
  if (moduleId === 'sales') return ApiClient.salesInvoices(token);
  if (moduleId === 'purchases') return ApiClient.purchaseInvoices(token);
  if (moduleId === 'inventory') {
    const [items, warehouses] = await Promise.all([ApiClient.items(token), ApiClient.warehouses(token)]);
    return { items, warehouses };
  }
  if (moduleId === 'partners') return ApiClient.partners(token);
  if (moduleId === 'hr') return ApiClient.employees(token);
  if (moduleId === 'reports') return ApiClient.reportsOverview(token);
  return ApiClient.systemModules();
}

export default function ModuleWorkspace({ moduleId, token }) {
  const { language, t } = useI18n();
  const [payload, setPayload] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const titleKey = `modules.${moduleId}.title`;
  const subtitleKey = `modules.${moduleId}.subtitle`;
  const primaryKey = `modules.${moduleId}.primary`;
  const steps = language === 'ar' ? workflowAr[moduleId] || workflowAr.reports : workflows[moduleId] || workflows.reports;
  const rows = useMemo(() => (payload ? mapRows(moduleId, payload, language) : []), [language, moduleId, payload]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');

    fetchModule(moduleId, token)
      .then((data) => {
        if (active) setPayload(data);
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
  }, [moduleId, token]);

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

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <Workflow className="text-blue-700" size={20} />
            <h3 className="font-black text-slate-950">{t('modules.workflow')}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center gap-3 px-5 py-4">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-slate-100 text-xs font-black text-slate-700">{index + 1}</span>
                <p className="flex-1 font-bold text-slate-800">{step}</p>
                <CheckCircle2 className="text-emerald-600" size={18} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-black text-slate-950">{t('modules.registers')}</h3>
          </div>
          {isLoading && <div className="p-5 text-sm font-bold text-slate-500">{t('common.loading', 'Loading live data...')}</div>}
          {!isLoading && !error && (
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
                  {rows.length === 0 && (
                    <tr>
                      <td className="px-5 py-6 text-center font-semibold text-slate-500" colSpan={4}>{t('common.empty', 'No records yet')}</td>
                    </tr>
                  )}
                  {rows.map((row) => (
                    <tr key={`${row.code}-${row.description}`} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono font-black text-blue-800" dir="ltr">{rowValue(row.code)}</td>
                      <td className="px-5 py-3 font-bold text-slate-800">{rowValue(row.description)}</td>
                      <td className="px-5 py-3 text-slate-600" dir="ltr">{rowValue(row.detail)}</td>
                      <td className="px-5 py-3 text-end">
                        <span className={`rounded-md px-2 py-1 text-xs font-black ${statusTone[row.status] || statusTone.active}`}>{t(`common.${String(row.status).toLowerCase()}`, row.status)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <RadioTower className="text-emerald-700" size={20} />
          <h3 className="font-black text-slate-950">{t('modules.integrations')}</h3>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[ApiClient.baseUrl, 'PostgreSQL', 'Bearer auth'].map((item) => (
            <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="break-all font-bold text-slate-800">{item}</p>
              <p className="mt-1 text-sm font-semibold text-emerald-700">{t('common.live', 'Live')}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
