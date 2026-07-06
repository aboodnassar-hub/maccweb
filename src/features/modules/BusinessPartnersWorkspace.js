import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Edit3, Plus, Power, Save, Search, Trash2, Users, XCircle } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { ApiClient } from '../../services/api';

const blankForm = {
  code: '',
  partner_type: 'CUSTOMER',
  name_en: '',
  name_ar: '',
  tax_number: '',
  phone: '',
  email: '',
  address: '',
  receivable_account_id: '',
  payable_account_id: '',
};

const blankFilters = {
  search: '',
  partner_type: '',
  is_active: '',
};

const inputClass = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500';
const textareaClass = 'min-h-[84px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-widest text-slate-500';

function normalizeType(value) {
  const type = String(value || 'CUSTOMER').toUpperCase();
  return type === 'SUPPLIER' ? 'VENDOR' : type;
}

function money(value) {
  return Number(value || 0).toFixed(3);
}

function partnerName(partner, language) {
  return language === 'ar' ? partner.name_ar || partner.name_en : partner.name_en || partner.name_ar;
}

function accountLabel(account, language) {
  const name = language === 'ar' ? account.name_ar || account.name_en : account.name_en || account.name_ar;
  return `${account.code} - ${name}`;
}

function cleanString(value) {
  return String(value || '').trim();
}

function nullableNumber(value) {
  return value ? Number(value) : null;
}

function partnerTypeLabel(t, type) {
  const normalized = normalizeType(type);
  if (normalized === 'VENDOR') return t('partners.vendor');
  if (normalized === 'BOTH') return t('partners.both');
  return t('partners.customer');
}

export default function BusinessPartnersWorkspace({ token }) {
  const { language, t } = useI18n();
  const [partners, setPartners] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [filters, setFilters] = useState(blankFilters);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);
    setError('');

    Promise.all([
      ApiClient.partners(token, filters),
      ApiClient.accounts(token),
    ])
      .then(([partnerPayload, accountPayload]) => {
        setPartners(Array.isArray(partnerPayload) ? partnerPayload : []);
        setAccounts(Array.isArray(accountPayload) ? accountPayload : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [filters, token]);

  useEffect(() => {
    load();
  }, [load]);

  const postingAccounts = useMemo(
    () => accounts.filter((account) => account.is_active && !account.is_group && Number(account.children_count || 0) === 0),
    [accounts],
  );

  const receivableAccounts = useMemo(() => {
    const filtered = postingAccounts.filter((account) => account.account_type === 'ASSET');
    return filtered.length ? filtered : postingAccounts;
  }, [postingAccounts]);

  const payableAccounts = useMemo(() => {
    const filtered = postingAccounts.filter((account) => account.account_type === 'LIABILITY');
    return filtered.length ? filtered : postingAccounts;
  }, [postingAccounts]);

  const stats = useMemo(() => {
    const active = partners.filter((partner) => partner.is_active);
    return {
      total: partners.length,
      active: active.length,
      customers: partners.filter((partner) => ['CUSTOMER', 'BOTH'].includes(normalizeType(partner.partner_type || partner.type))).length,
      vendors: partners.filter((partner) => ['VENDOR', 'BOTH'].includes(normalizeType(partner.partner_type || partner.type))).length,
      sales: partners.reduce((sum, partner) => sum + Number(partner.sales_total || 0), 0),
      purchases: partners.reduce((sum, partner) => sum + Number(partner.purchase_total || 0), 0),
    };
  }, [partners]);

  const resetForm = () => {
    setForm(blankForm);
    setEditingId(null);
  };

  const startEdit = (partner) => {
    setEditingId(partner.id);
    setForm({
      code: partner.code || '',
      partner_type: normalizeType(partner.partner_type || partner.type),
      name_en: partner.name_en || '',
      name_ar: partner.name_ar || '',
      tax_number: partner.tax_number || '',
      phone: partner.phone || '',
      email: partner.email || '',
      address: partner.address || '',
      receivable_account_id: partner.receivable_account_id ? String(partner.receivable_account_id) : '',
      payable_account_id: partner.payable_account_id ? String(partner.payable_account_id) : '',
    });
    setMessage('');
    setError('');
  };

  const buildPayload = () => ({
    code: cleanString(form.code).toUpperCase(),
    partner_type: normalizeType(form.partner_type),
    name_en: cleanString(form.name_en),
    name_ar: cleanString(form.name_ar),
    tax_number: cleanString(form.tax_number) || null,
    phone: cleanString(form.phone) || null,
    email: cleanString(form.email).toLowerCase() || null,
    address: cleanString(form.address) || null,
    receivable_account_id: nullableNumber(form.receivable_account_id),
    payable_account_id: nullableNumber(form.payable_account_id),
  });

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const payload = buildPayload();
      if (editingId) {
        const { code, ...updatePayload } = payload;
        await ApiClient.updatePartner(token, editingId, updatePayload);
        setMessage(t('partners.updated'));
      } else {
        await ApiClient.createPartner(token, payload);
        setMessage(t('partners.saved'));
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action, successMessage) => {
    setMessage('');
    setError('');
    try {
      await action();
      setMessage(successMessage);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const removePartner = (partner) => {
    if (!window.confirm(t('partners.confirmDelete'))) return;
    runAction(() => ApiClient.deletePartner(token, partner.id), t('partners.deleted'));
  };

  const canSubmit = cleanString(form.code) && cleanString(form.name_en) && cleanString(form.name_ar) && !saving;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-normal text-slate-950">{t('partners.title')}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t('partners.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800"
        >
          <Plus size={16} />
          {t('partners.newPartner')}
        </button>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {[
          [t('partners.totalPartners'), stats.total],
          [t('common.active'), stats.active],
          [t('partners.customers'), stats.customers],
          [t('partners.vendors'), stats.vendors],
          [t('partners.salesTotal'), money(stats.sales)],
          [t('partners.purchaseTotal'), money(stats.purchases)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</p>
            <p className="mt-1 font-mono text-lg font-black text-slate-950" dir="ltr">{value}</p>
          </div>
        ))}
      </section>

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <Users className="text-blue-700" size={20} />
            <h3 className="font-black text-slate-950">{editingId ? t('partners.editPartner') : t('partners.newPartner')}</h3>
          </div>

          <div className="space-y-4 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className={labelClass}>{t('common.code')}</span>
                <input
                  value={form.code}
                  disabled={Boolean(editingId)}
                  onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                  className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-500`}
                  dir="ltr"
                />
              </label>
              <label className="block">
                <span className={labelClass}>{t('partners.partnerType')}</span>
                <select
                  value={form.partner_type}
                  onChange={(event) => setForm((current) => ({ ...current, partner_type: event.target.value }))}
                  className={inputClass}
                >
                  <option value="CUSTOMER">{t('partners.customer')}</option>
                  <option value="VENDOR">{t('partners.vendor')}</option>
                  <option value="BOTH">{t('partners.both')}</option>
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>{t('partners.nameEn')}</span>
                <input
                  value={form.name_en}
                  onChange={(event) => setForm((current) => ({ ...current, name_en: event.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>{t('partners.nameAr')}</span>
                <input
                  value={form.name_ar}
                  onChange={(event) => setForm((current) => ({ ...current, name_ar: event.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>{t('partners.taxNumber')}</span>
                <input
                  value={form.tax_number}
                  onChange={(event) => setForm((current) => ({ ...current, tax_number: event.target.value }))}
                  className={inputClass}
                  dir="ltr"
                />
              </label>
              <label className="block">
                <span className={labelClass}>{t('partners.phone')}</span>
                <input
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className={inputClass}
                  dir="ltr"
                />
              </label>
              <label className="block md:col-span-2">
                <span className={labelClass}>{t('partners.email')}</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className={inputClass}
                  dir="ltr"
                />
              </label>
              <label className="block">
                <span className={labelClass}>{t('partners.receivableAccount')}</span>
                <select
                  value={form.receivable_account_id}
                  onChange={(event) => setForm((current) => ({ ...current, receivable_account_id: event.target.value }))}
                  className={inputClass}
                >
                  <option value="">{t('partners.selectAccount')}</option>
                  {receivableAccounts.map((account) => (
                    <option key={account.id} value={account.id}>{accountLabel(account, language)}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>{t('partners.payableAccount')}</span>
                <select
                  value={form.payable_account_id}
                  onChange={(event) => setForm((current) => ({ ...current, payable_account_id: event.target.value }))}
                  className={inputClass}
                >
                  <option value="">{t('partners.selectAccount')}</option>
                  {payableAccounts.map((account) => (
                    <option key={account.id} value={account.id}>{accountLabel(account, language)}</option>
                  ))}
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className={labelClass}>{t('partners.address')}</span>
                <textarea
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                  className={textareaClass}
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <XCircle size={16} />
                  {t('partners.cancelEdit')}
                </button>
              )}
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <Save size={16} />
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-black text-slate-950">{t('partners.register')}</h3>
          </div>

          <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-[1fr_160px_160px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder={t('partners.searchPlaceholder')}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-10 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500"
              />
            </label>
            <select
              value={filters.partner_type}
              onChange={(event) => setFilters((current) => ({ ...current, partner_type: event.target.value }))}
              className={inputClass}
            >
              <option value="">{t('partners.allTypes')}</option>
              <option value="CUSTOMER">{t('partners.customer')}</option>
              <option value="VENDOR">{t('partners.vendor')}</option>
              <option value="BOTH">{t('partners.both')}</option>
            </select>
            <select
              value={filters.is_active}
              onChange={(event) => setFilters((current) => ({ ...current, is_active: event.target.value }))}
              className={inputClass}
            >
              <option value="">{t('partners.allStatuses')}</option>
              <option value="true">{t('common.active')}</option>
              <option value="false">{t('common.inactive')}</option>
            </select>
          </div>

          {isLoading && <div className="p-5 text-sm font-bold text-slate-500">{t('common.loading')}</div>}
          {!isLoading && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-start">{t('common.code')}</th>
                    <th className="px-4 py-3 text-start">{t('partners.partner')}</th>
                    <th className="px-4 py-3 text-start">{t('common.type')}</th>
                    <th className="px-4 py-3 text-start">{t('partners.contact')}</th>
                    <th className="px-4 py-3 text-end">{t('partners.invoices')}</th>
                    <th className="px-4 py-3 text-end">{t('partners.salesTotal')}</th>
                    <th className="px-4 py-3 text-end">{t('partners.purchaseTotal')}</th>
                    <th className="px-4 py-3 text-end">{t('common.status')}</th>
                    <th className="px-4 py-3 text-end">{t('systemAdmin.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {partners.length === 0 && (
                    <tr>
                      <td className="px-5 py-8 text-center font-semibold text-slate-500" colSpan={9}>{t('common.empty')}</td>
                    </tr>
                  )}
                  {partners.map((partner) => (
                    <tr key={partner.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-black text-blue-800" dir="ltr">{partner.code}</td>
                      <td className="px-4 py-3">
                        <p className="font-black text-slate-900">{partnerName(partner, language)}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500" dir="ltr">{partner.tax_number || '-'}</p>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">{partnerTypeLabel(t, partner.partner_type || partner.type)}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-700" dir="ltr">{partner.phone || '-'}</p>
                        <p className="mt-1 text-xs text-slate-500" dir="ltr">{partner.email || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-end font-mono font-bold" dir="ltr">{partner.invoice_count || 0}</td>
                      <td className="px-4 py-3 text-end font-mono" dir="ltr">{money(partner.sales_total)}</td>
                      <td className="px-4 py-3 text-end font-mono" dir="ltr">{money(partner.purchase_total)}</td>
                      <td className="px-4 py-3 text-end">
                        <span className={`rounded-md px-2 py-1 text-xs font-black ${partner.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {partner.is_active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            title={t('partners.editPartner')}
                            onClick={() => startEdit(partner)}
                            className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            title={partner.is_active ? t('systemAdmin.deactivate') : t('systemAdmin.activate')}
                            onClick={() => runAction(
                              () => (partner.is_active ? ApiClient.deactivatePartner(token, partner.id) : ApiClient.activatePartner(token, partner.id)),
                              partner.is_active ? t('partners.deactivated') : t('partners.activated'),
                            )}
                            className={`rounded-md border p-2 ${
                              partner.is_active
                                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            <Power size={15} />
                          </button>
                          <button
                            type="button"
                            title={t('systemAdmin.delete')}
                            onClick={() => removePartner(partner)}
                            className="rounded-md border border-rose-200 p-2 text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
