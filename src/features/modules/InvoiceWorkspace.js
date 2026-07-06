import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Percent, Plus, RotateCcw, Send, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { ApiClient } from '../../services/api';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(value) {
  return Number(value || 0);
}

function money(value) {
  return toNumber(value).toFixed(3);
}

function blankLine() {
  return {
    id: Date.now() + Math.random(),
    item_id: '',
    warehouse_id: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    discount_rate: 0,
    discount_amount: 0,
    tax_rate: 0,
  };
}

const blankForm = {
  partner_id: '',
  warehouse_id: '',
  invoice_date: today(),
  due_date: today(),
  currency: 'JOD',
  tax_inclusive: false,
  notes: '',
};

function calculateLine(line, taxInclusive) {
  const gross = toNumber(line.quantity) * toNumber(line.unit_price);
  const rateDiscount = gross * (toNumber(line.discount_rate) / 100);
  const discount = Math.min(gross, rateDiscount + toNumber(line.discount_amount));
  const taxable = Math.max(0, gross - discount);
  const taxRate = toNumber(line.tax_rate);

  if (taxInclusive && taxRate > 0) {
    const net = taxable / (1 + taxRate / 100);
    const tax = taxable - net;
    return { gross, discount, net, tax, total: taxable };
  }

  const net = taxable;
  const tax = net * (taxRate / 100);
  return { gross, discount, net, tax, total: net + tax };
}

export default function InvoiceWorkspace({ moduleId, token }) {
  const { language, t } = useI18n();
  const isSales = moduleId === 'sales';
  const [invoices, setInvoices] = useState([]);
  const [partners, setPartners] = useState([]);
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [lines, setLines] = useState([blankLine()]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const titleKey = isSales ? 'modules.sales.title' : 'modules.purchases.title';
  const subtitleKey = isSales ? 'modules.sales.subtitle' : 'modules.purchases.subtitle';

  const load = useCallback(() => {
    setIsLoading(true);
    setError('');
    Promise.all([
      isSales ? ApiClient.salesInvoices(token) : ApiClient.purchaseInvoices(token),
      ApiClient.partners(token),
      ApiClient.items(token),
      ApiClient.warehouses(token),
    ])
      .then(([invoicePayload, partnerPayload, itemPayload, warehousePayload]) => {
        setInvoices(Array.isArray(invoicePayload) ? invoicePayload : []);
        setPartners(Array.isArray(partnerPayload) ? partnerPayload : []);
        setItems(Array.isArray(itemPayload) ? itemPayload : []);
        setWarehouses(Array.isArray(warehousePayload) ? warehousePayload : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [isSales, token]);

  useEffect(() => {
    load();
  }, [load]);

  const eligiblePartners = useMemo(() => {
    const allowed = isSales ? ['CUSTOMER', 'BOTH'] : ['VENDOR', 'SUPPLIER', 'BOTH'];
    const filtered = partners.filter((partner) => allowed.includes(String(partner.type || '').toUpperCase()));
    return filtered.length ? filtered : partners;
  }, [isSales, partners]);

  const totals = useMemo(() => lines.reduce(
    (sum, line) => {
      const calc = calculateLine(line, form.tax_inclusive);
      return {
        subtotal: sum.subtotal + calc.net,
        tax: sum.tax + calc.tax,
        discount: sum.discount + calc.discount,
        total: sum.total + calc.total,
      };
    },
    { subtotal: 0, tax: 0, discount: 0, total: 0 },
  ), [form.tax_inclusive, lines]);

  const updateLine = (id, field, value) => {
    setLines((current) => current.map((line) => {
      if (line.id !== id) return line;
      const next = { ...line, [field]: ['description', 'item_id', 'warehouse_id'].includes(field) ? value : Number(value) };
      if (field === 'item_id') {
        const selected = items.find((item) => String(item.id) === String(value));
        if (selected && !line.description) {
          next.description = language === 'ar' ? selected.name_ar : selected.name_en;
        }
      }
      return next;
    }));
  };

  const submit = async (post) => {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const payload = {
        ...form,
        partner_id: Number(form.partner_id),
        warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null,
        due_date: form.due_date || null,
        post,
        lines: lines.map((line) => ({
          item_id: line.item_id ? Number(line.item_id) : null,
          warehouse_id: line.warehouse_id ? Number(line.warehouse_id) : null,
          description: line.description,
          quantity: Number(line.quantity || 0),
          unit_price: Number(line.unit_price || 0),
          discount_rate: Number(line.discount_rate || 0),
          discount_amount: Number(line.discount_amount || 0),
          tax_rate: Number(line.tax_rate || 0),
        })),
      };
      if (isSales) {
        await ApiClient.createSalesInvoice(token, payload);
      } else {
        await ApiClient.createPurchaseInvoice(token, payload);
      }
      setMessage(post ? t('invoices.posted') : t('invoices.saved'));
      setForm({ ...blankForm, invoice_date: today(), due_date: today() });
      setLines([blankLine()]);
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

  const canSubmit = form.partner_id && totals.total > 0 && lines.every((line) => line.description && toNumber(line.quantity) > 0);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-normal text-slate-950">{t(titleKey)}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t(subtitleKey)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            [t('invoices.drafts'), invoices.filter((row) => row.status === 'DRAFT').length],
            [t('common.posted'), invoices.filter((row) => row.status === 'POSTED').length],
            [t('invoices.totalTax'), money(invoices.reduce((sum, row) => sum + toNumber(row.tax_total), 0))],
            [t('common.total'), money(invoices.reduce((sum, row) => sum + toNumber(row.grand_total), 0))],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</p>
              <p className="mt-1 font-mono text-lg font-black text-slate-950" dir="ltr">{value}</p>
            </div>
          ))}
        </div>
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

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <FileText className="text-blue-700" size={20} />
          <h3 className="font-black text-slate-950">{isSales ? t('invoices.newSales') : t('invoices.newPurchase')}</h3>
        </div>
        <div className="space-y-5 p-5">
          <div className="grid gap-4 lg:grid-cols-5">
            <label className="block lg:col-span-2">
              <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-500">{isSales ? t('invoices.customer') : t('invoices.vendor')}</span>
              <select value={form.partner_id} onChange={(event) => setForm({ ...form, partner_id: event.target.value })} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500">
                <option value="">{t('invoices.selectPartner')}</option>
                {eligiblePartners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.code} - {language === 'ar' ? partner.name_ar : partner.name_en}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-500">{t('common.date')}</span>
              <input type="date" value={form.invoice_date} onChange={(event) => setForm({ ...form, invoice_date: event.target.value })} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-500">{t('invoices.dueDate')}</span>
              <input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-500">{t('systemAdmin.currency')}</span>
              <input value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase().slice(0, 3) })} className="h-10 w-full rounded-md border border-slate-300 px-3 font-mono text-sm font-bold outline-none focus:border-blue-500" dir="ltr" />
            </label>
            <label className="block lg:col-span-2">
              <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-500">{t('invoices.defaultWarehouse')}</span>
              <select value={form.warehouse_id} onChange={(event) => setForm({ ...form, warehouse_id: event.target.value })} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500">
                <option value="">{t('invoices.noWarehouse')}</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {language === 'ar' ? warehouse.name_ar : warehouse.name_en}</option>
                ))}
              </select>
            </label>
            <label className="flex h-10 items-center gap-2 self-end rounded-md border border-slate-300 bg-slate-50 px-3 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={form.tax_inclusive} onChange={(event) => setForm({ ...form, tax_inclusive: event.target.checked })} />
              <Percent size={16} />
              {t('invoices.taxInclusive')}
            </label>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-3 py-3 text-start">{t('nav.inventory')}</th>
                  <th className="px-3 py-3 text-start">{t('common.description')}</th>
                  <th className="px-3 py-3 text-end">{t('invoices.qty')}</th>
                  <th className="px-3 py-3 text-end">{t('invoices.unitPrice')}</th>
                  <th className="px-3 py-3 text-end">{t('invoices.discount')}</th>
                  <th className="px-3 py-3 text-end">{t('invoices.tax')}</th>
                  <th className="px-3 py-3 text-end">{t('common.total')}</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line) => {
                  const calc = calculateLine(line, form.tax_inclusive);
                  return (
                    <tr key={line.id} className="hover:bg-slate-50">
                      <td className="p-2">
                        <select value={line.item_id} onChange={(event) => updateLine(line.id, 'item_id', event.target.value)} className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500">
                          <option value="">{t('invoices.serviceLine')}</option>
                          {items.map((item) => (
                            <option key={item.id} value={item.id}>{item.sku} - {language === 'ar' ? item.name_ar : item.name_en}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input value={line.description} onChange={(event) => updateLine(line.id, 'description', event.target.value)} className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 outline-none hover:border-slate-200 focus:border-blue-500 focus:bg-white" />
                      </td>
                      <td className="p-2"><input type="number" min="0" value={line.quantity} onChange={(event) => updateLine(line.id, 'quantity', event.target.value)} className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-end font-mono outline-none hover:border-slate-200 focus:border-blue-500 focus:bg-white" dir="ltr" /></td>
                      <td className="p-2"><input type="number" min="0" value={line.unit_price} onChange={(event) => updateLine(line.id, 'unit_price', event.target.value)} className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-end font-mono outline-none hover:border-slate-200 focus:border-blue-500 focus:bg-white" dir="ltr" /></td>
                      <td className="p-2"><input type="number" min="0" value={line.discount_rate} onChange={(event) => updateLine(line.id, 'discount_rate', event.target.value)} className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-end font-mono outline-none hover:border-slate-200 focus:border-blue-500 focus:bg-white" dir="ltr" /></td>
                      <td className="p-2"><input type="number" min="0" value={line.tax_rate} onChange={(event) => updateLine(line.id, 'tax_rate', event.target.value)} className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-end font-mono outline-none hover:border-slate-200 focus:border-blue-500 focus:bg-white" dir="ltr" /></td>
                      <td className="px-3 py-2 text-end font-mono font-black" dir="ltr">{money(calc.total)}</td>
                      <td className="p-2 text-center">
                        <button type="button" onClick={() => setLines((current) => (current.length > 1 ? current.filter((row) => row.id !== line.id) : current))} className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <button type="button" onClick={() => setLines((current) => [...current, blankLine()])} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
              <Plus size={16} />
              {t('accounting.addLine')}
            </button>
            <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-slate-50 p-4">
              {[
                [t('invoices.subtotal'), totals.subtotal],
                [t('invoices.discount'), totals.discount],
                [t('invoices.tax'), totals.tax],
                [t('common.total'), totals.total],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-1 text-sm">
                  <span className="font-bold text-slate-600">{label}</span>
                  <span className="font-mono font-black text-slate-950" dir="ltr">{money(value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" disabled={!canSubmit || saving} onClick={() => submit(false)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
              <FileText size={16} />
              {t('invoices.saveDraft')}
            </button>
            <button type="button" disabled={!canSubmit || saving} onClick={() => submit(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              <Send size={16} />
              {saving ? t('accounting.posting') : t('invoices.postInvoice')}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-black text-slate-950">{t('invoices.register')}</h3>
        </div>
        {isLoading && <div className="p-5 text-sm font-bold text-slate-500">{t('common.loading')}</div>}
        {!isLoading && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-start">{t('invoices.invoiceNo')}</th>
                  <th className="px-5 py-3 text-start">{isSales ? t('invoices.customer') : t('invoices.vendor')}</th>
                  <th className="px-5 py-3 text-start">{t('common.date')}</th>
                  <th className="px-5 py-3 text-end">{t('invoices.tax')}</th>
                  <th className="px-5 py-3 text-end">{t('common.total')}</th>
                  <th className="px-5 py-3 text-end">{t('common.status')}</th>
                  <th className="px-5 py-3 text-end">{t('systemAdmin.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.length === 0 && (
                  <tr>
                    <td className="px-5 py-6 text-center font-semibold text-slate-500" colSpan={7}>{t('common.empty')}</td>
                  </tr>
                )}
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono font-black text-blue-800" dir="ltr">{invoice.invoice_number}</td>
                    <td className="px-5 py-3 font-bold text-slate-800">{language === 'ar' ? invoice.partner_name_ar : invoice.partner_name_en}</td>
                    <td className="px-5 py-3 font-bold text-slate-600" dir="ltr">{invoice.invoice_date}</td>
                    <td className="px-5 py-3 text-end font-mono" dir="ltr">{money(invoice.tax_total)}</td>
                    <td className="px-5 py-3 text-end font-mono font-black" dir="ltr">{money(invoice.grand_total)}</td>
                    <td className="px-5 py-3 text-end">
                      <span className={`rounded-md px-2 py-1 text-xs font-black ${invoice.status === 'POSTED' ? 'bg-blue-50 text-blue-700' : invoice.status === 'CANCELED' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        {invoice.status === 'DRAFT' && (
                          <button type="button" onClick={() => runAction(() => (isSales ? ApiClient.postSalesInvoice(token, invoice.id) : ApiClient.postPurchaseInvoice(token, invoice.id)), t('invoices.posted'))} className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-700 px-3 text-xs font-bold text-white hover:bg-blue-800">
                            <Send size={14} />
                            {t('common.post')}
                          </button>
                        )}
                        {invoice.status !== 'CANCELED' && (
                          <button type="button" onClick={() => runAction(() => (isSales ? ApiClient.cancelSalesInvoice(token, invoice.id) : ApiClient.cancelPurchaseInvoice(token, invoice.id)), t('invoices.canceled'))} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
                            <RotateCcw size={14} />
                            {t('invoices.cancel')}
                          </button>
                        )}
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
