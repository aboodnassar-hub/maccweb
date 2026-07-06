import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Edit3, Package, Plus, Power, Save, Search, Trash2, XCircle } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { ApiClient } from '../../services/api';

const blankForm = {
  sku: '',
  item_type: 'SERVICE',
  name_en: '',
  name_ar: '',
  unit: 'pcs',
  sales_account_id: '',
  inventory_account_id: '',
  cogs_account_id: '',
};

const inputClass = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-widest text-slate-500';

function clean(value) {
  return String(value || '').trim();
}

function nullableNumber(value) {
  return value ? Number(value) : null;
}

function itemName(item, language) {
  return language === 'ar' ? item.name_ar || item.name_en : item.name_en || item.name_ar;
}

function accountLabel(account, language) {
  const name = language === 'ar' ? account.name_ar || account.name_en : account.name_en || account.name_ar;
  return `${account.code} - ${name}`;
}

export default function ProductsServicesWorkspace({ token }) {
  const { language, t } = useI18n();
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [filters, setFilters] = useState({ search: '', is_active: '' });
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);
    setError('');
    Promise.all([ApiClient.items(token, filters), ApiClient.accounts(token)])
      .then(([itemPayload, accountPayload]) => {
        setItems(Array.isArray(itemPayload) ? itemPayload : []);
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

  const stats = useMemo(() => ({
    total: items.length,
    services: items.filter((item) => item.item_type === 'SERVICE').length,
    stock: items.filter((item) => item.item_type === 'STOCK').length,
    active: items.filter((item) => item.is_active).length,
  }), [items]);

  const resetForm = () => {
    setForm(blankForm);
    setEditingId(null);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      sku: item.sku || '',
      item_type: item.item_type || 'SERVICE',
      name_en: item.name_en || '',
      name_ar: item.name_ar || '',
      unit: item.unit || 'pcs',
      sales_account_id: item.sales_account_id ? String(item.sales_account_id) : '',
      inventory_account_id: item.inventory_account_id ? String(item.inventory_account_id) : '',
      cogs_account_id: item.cogs_account_id ? String(item.cogs_account_id) : '',
    });
    setMessage('');
    setError('');
  };

  const buildPayload = () => ({
    sku: clean(form.sku).toUpperCase(),
    item_type: form.item_type,
    name_en: clean(form.name_en),
    name_ar: clean(form.name_ar),
    unit: clean(form.unit) || 'pcs',
    sales_account_id: nullableNumber(form.sales_account_id),
    inventory_account_id: form.item_type === 'STOCK' ? nullableNumber(form.inventory_account_id) : null,
    cogs_account_id: form.item_type === 'STOCK' ? nullableNumber(form.cogs_account_id) : null,
  });

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const payload = buildPayload();
      if (editingId) {
        const { sku, ...updatePayload } = payload;
        await ApiClient.updateItem(token, editingId, updatePayload);
        setMessage(t('products.updated'));
      } else {
        await ApiClient.createItem(token, payload);
        setMessage(t('products.saved'));
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

  const removeItem = (item) => {
    if (!window.confirm(t('products.confirmDelete'))) return;
    runAction(() => ApiClient.deleteItem(token, item.id), t('products.deleted'));
  };

  const canSubmit = clean(form.sku) && clean(form.name_en) && clean(form.name_ar) && !saving;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-normal text-slate-950">{t('products.title')}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t('products.subtitle')}</p>
        </div>
        <button type="button" onClick={resetForm} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800">
          <Plus size={16} />
          {t('products.newItem')}
        </button>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [t('common.total'), stats.total],
          [t('products.services'), stats.services],
          [t('products.stockItems'), stats.stock],
          [t('common.active'), stats.active],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</p>
            <p className="mt-1 font-mono text-lg font-black text-slate-950" dir="ltr">{value}</p>
          </div>
        ))}
      </section>

      {message && <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"><CheckCircle2 size={18} />{message}</div>}
      {error && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800"><AlertCircle size={18} />{error}</div>}

      <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <Package className="text-blue-700" size={20} />
          <h3 className="font-black text-slate-950">{editingId ? t('products.editItem') : t('products.newItem')}</h3>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className={labelClass}>{t('products.code')}</span>
              <input value={form.sku} disabled={Boolean(editingId)} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value.toUpperCase() }))} className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-500`} dir="ltr" />
            </label>
            <label className="block">
              <span className={labelClass}>{t('common.type')}</span>
              <select value={form.item_type} onChange={(event) => setForm((current) => ({ ...current, item_type: event.target.value }))} className={inputClass}>
                <option value="SERVICE">{t('products.service')}</option>
                <option value="STOCK">{t('products.stock')}</option>
              </select>
            </label>
            <label className="block xl:col-span-2">
              <span className={labelClass}>{t('partners.nameEn')}</span>
              <input value={form.name_en} onChange={(event) => setForm((current) => ({ ...current, name_en: event.target.value }))} className={inputClass} />
            </label>
            <label className="block xl:col-span-2">
              <span className={labelClass}>{t('partners.nameAr')}</span>
              <input value={form.name_ar} onChange={(event) => setForm((current) => ({ ...current, name_ar: event.target.value }))} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>{t('products.unit')}</span>
              <input value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} className={inputClass} />
            </label>
            <label className="block md:col-span-2 xl:col-span-1">
              <span className={labelClass}>{t('products.salesAccount')}</span>
              <select value={form.sales_account_id} onChange={(event) => setForm((current) => ({ ...current, sales_account_id: event.target.value }))} className={inputClass}>
                <option value="">{t('partners.selectAccount')}</option>
                {postingAccounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account, language)}</option>)}
              </select>
            </label>
            {form.item_type === 'STOCK' && (
              <>
                <label className="block md:col-span-2 xl:col-span-1">
                  <span className={labelClass}>{t('products.inventoryAccount')}</span>
                  <select value={form.inventory_account_id} onChange={(event) => setForm((current) => ({ ...current, inventory_account_id: event.target.value }))} className={inputClass}>
                    <option value="">{t('partners.selectAccount')}</option>
                    {postingAccounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account, language)}</option>)}
                  </select>
                </label>
                <label className="block md:col-span-2 xl:col-span-1">
                  <span className={labelClass}>{t('products.cogsAccount')}</span>
                  <select value={form.cogs_account_id} onChange={(event) => setForm((current) => ({ ...current, cogs_account_id: event.target.value }))} className={inputClass}>
                    <option value="">{t('partners.selectAccount')}</option>
                    {postingAccounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account, language)}</option>)}
                  </select>
                </label>
              </>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            {editingId && <button type="button" onClick={resetForm} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"><XCircle size={16} />{t('partners.cancelEdit')}</button>}
            <button type="submit" disabled={!canSubmit} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              <Save size={16} />
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      </form>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-black text-slate-950">{t('products.register')}</h3>
        </div>
        <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[1fr_180px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder={t('products.searchPlaceholder')} className="h-10 w-full rounded-md border border-slate-300 bg-white px-10 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500" />
          </label>
          <select value={filters.is_active} onChange={(event) => setFilters((current) => ({ ...current, is_active: event.target.value }))} className={inputClass}>
            <option value="">{t('partners.allStatuses')}</option>
            <option value="true">{t('common.active')}</option>
            <option value="false">{t('common.inactive')}</option>
          </select>
        </div>
        {isLoading && <div className="p-5 text-sm font-bold text-slate-500">{t('common.loading')}</div>}
        {!isLoading && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-start">{t('products.code')}</th>
                  <th className="px-4 py-3 text-start">{t('products.item')}</th>
                  <th className="px-4 py-3 text-start">{t('common.type')}</th>
                  <th className="px-4 py-3 text-start">{t('products.unit')}</th>
                  <th className="px-4 py-3 text-end">{t('common.status')}</th>
                  <th className="px-4 py-3 text-end">{t('systemAdmin.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 && <tr><td className="px-5 py-8 text-center font-semibold text-slate-500" colSpan={6}>{t('common.empty')}</td></tr>}
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-black text-blue-800" dir="ltr">{item.sku}</td>
                    <td className="px-4 py-3 font-black text-slate-900">{itemName(item, language)}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{item.item_type === 'STOCK' ? t('products.stock') : t('products.service')}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{item.unit}</td>
                    <td className="px-4 py-3 text-end"><span className={`rounded-md px-2 py-1 text-xs font-black ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.is_active ? t('common.active') : t('common.inactive')}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" title={t('products.editItem')} onClick={() => startEdit(item)} className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><Edit3 size={15} /></button>
                        <button type="button" title={item.is_active ? t('systemAdmin.deactivate') : t('systemAdmin.activate')} onClick={() => runAction(() => (item.is_active ? ApiClient.deactivateItem(token, item.id) : ApiClient.activateItem(token, item.id)), item.is_active ? t('products.deactivated') : t('products.activated'))} className="rounded-md border border-amber-200 p-2 text-amber-700 hover:bg-amber-50"><Power size={15} /></button>
                        <button type="button" title={t('systemAdmin.delete')} onClick={() => removeItem(item)} className="rounded-md border border-rose-200 p-2 text-rose-700 hover:bg-rose-50"><Trash2 size={15} /></button>
                      </div>
                    </td>
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
