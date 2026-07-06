import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, HandCoins, Save } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { ApiClient } from '../../services/api';

function today() {
  return new Date().toISOString().slice(0, 10);
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

const blankForm = {
  partner_id: '',
  payment_date: today(),
  amount: '',
  cash_bank_account_id: '',
  notes: '',
};

const inputClass = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-widest text-slate-500';

function voucherTypeCode(isReceipt) {
  return isReceipt ? 'RECEIPT' : 'PAYMENT';
}

function voucherPrefix(isReceipt) {
  return isReceipt ? 'RV' : 'PV';
}

function voucherNumber(isReceipt, paymentDate) {
  const now = new Date();
  const datePart = (paymentDate || today()).replace(/-/g, '');
  const timePart = [
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  ].map((part) => String(part).padStart(2, '0')).join('');
  return `${voucherPrefix(isReceipt)}-${datePart}-${timePart}`;
}

function parseVoucherMeta(entry) {
  const match = String(entry.description || '').match(/\{.*\}$/);
  if (!match) return null;
  try {
    const meta = JSON.parse(match[0]);
    return meta && meta.macc_voucher ? meta : null;
  } catch {
    return null;
  }
}

function journalVoucherAmount(entry) {
  return (entry.lines || []).reduce((max, line) => {
    return Math.max(max, Number(line.debit || 0), Number(line.credit || 0));
  }, 0);
}

function journalEntriesToVouchers(entries, isReceipt, partners) {
  const expectedType = voucherTypeCode(isReceipt);
  const partnersById = new Map(partners.map((partner) => [Number(partner.id), partner]));
  return (Array.isArray(entries) ? entries : [])
    .map((entry) => {
      const meta = parseVoucherMeta(entry);
      if (!meta || meta.voucher_type !== expectedType) return null;
      const partner = partnersById.get(Number(meta.partner_id));
      return {
        id: `journal-${entry.id}`,
        company_id: entry.company_id,
        payment_number: entry.reference_doc || entry.entry_number,
        payment_type: expectedType,
        partner_id: Number(meta.partner_id),
        partner_code: meta.partner_code || partner?.code || '',
        partner_name_en: meta.partner_name_en || partner?.name_en || '',
        partner_name_ar: meta.partner_name_ar || partner?.name_ar || '',
        payment_date: entry.entry_date,
        amount: journalVoucherAmount(entry),
        cash_bank_account_id: null,
        journal_entry_id: entry.id,
        notes: meta.notes || null,
      };
    })
    .filter(Boolean);
}

function isPostingAccount(account) {
  return account && account.is_active && !account.is_group && Number(account.children_count || 0) === 0;
}

function findPostingAccountByCode(accounts, code) {
  return accounts.find((account) => account.code === code && isPostingAccount(account));
}

function selectedCashAccount(accounts, accountId) {
  if (accountId) {
    return accounts.find((account) => Number(account.id) === Number(accountId) && isPostingAccount(account));
  }
  return findPostingAccountByCode(accounts, '1111')
    || accounts.find((account) => isPostingAccount(account) && account.account_type === 'ASSET');
}

function partnerPostingAccount(partner, accounts, isReceipt) {
  const configuredId = isReceipt ? partner.receivable_account_id : partner.payable_account_id;
  if (configuredId) {
    const configured = accounts.find((account) => Number(account.id) === Number(configuredId) && isPostingAccount(account));
    if (configured) return configured;
  }
  return findPostingAccountByCode(accounts, isReceipt ? '112' : '211');
}

function buildJournalVoucherPayload({ form, isReceipt, partners, accounts, t }) {
  const partner = partners.find((item) => Number(item.id) === Number(form.partner_id));
  if (!partner) throw new Error(t('vouchers.partnerRequired'));

  const cashAccount = selectedCashAccount(accounts, form.cash_bank_account_id);
  if (!cashAccount) throw new Error(t('vouchers.cashAccountRequired'));

  const partnerAccount = partnerPostingAccount(partner, accounts, isReceipt);
  if (!partnerAccount) throw new Error(t('vouchers.partnerAccountRequired'));

  const amount = Number(form.amount || 0);
  const number = voucherNumber(isReceipt, form.payment_date);
  const meta = {
    macc_voucher: true,
    voucher_type: voucherTypeCode(isReceipt),
    partner_id: partner.id,
    partner_code: partner.code,
    partner_name_en: partner.name_en,
    partner_name_ar: partner.name_ar,
    notes: form.notes || null,
  };

  const cashLine = {
    account_id: Number(cashAccount.id),
    debit: isReceipt ? amount : 0,
    credit: isReceipt ? 0 : amount,
    description: number,
  };
  const partnerLine = {
    account_id: Number(partnerAccount.id),
    debit: isReceipt ? 0 : amount,
    credit: isReceipt ? amount : 0,
    description: number,
  };

  return {
    entry_number: number,
    entry_date: form.payment_date,
    description: JSON.stringify(meta),
    reference_doc: number,
    post: true,
    lines: isReceipt ? [cashLine, partnerLine] : [partnerLine, cashLine],
  };
}

export default function VoucherWorkspace({ token, voucherType }) {
  const { language, t } = useI18n();
  const isReceipt = voucherType === 'receipt';
  const [vouchers, setVouchers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [usesJournalFallback, setUsesJournalFallback] = useState(false);

  const load = useCallback((forceJournalFallback = false) => {
    setIsLoading(true);
    setError('');
    Promise.all([
      ApiClient.partners(token, { partner_type: isReceipt ? 'CUSTOMER' : 'VENDOR', is_active: true }),
      ApiClient.accounts(token),
    ])
      .then(async ([partnerPayload, accountPayload]) => {
        const partnerList = Array.isArray(partnerPayload) ? partnerPayload : [];
        const accountList = Array.isArray(accountPayload) ? accountPayload : [];
        const capabilities = await ApiClient.capabilities();
        let voucherPayload = [];

        if (forceJournalFallback || usesJournalFallback || !capabilities.voucherEndpoints) {
          setUsesJournalFallback(true);
          voucherPayload = journalEntriesToVouchers(await ApiClient.journalEntries(token), isReceipt, partnerList);
        } else {
          try {
            const officialVouchers = await (isReceipt ? ApiClient.receiptVouchers(token) : ApiClient.paymentVouchers(token));
            const journalVouchers = journalEntriesToVouchers(await ApiClient.journalEntries(token), isReceipt, partnerList);
            const officialNumbers = new Set((Array.isArray(officialVouchers) ? officialVouchers : []).map((voucher) => voucher.payment_number));
            voucherPayload = [
              ...(Array.isArray(officialVouchers) ? officialVouchers : []),
              ...journalVouchers.filter((voucher) => !officialNumbers.has(voucher.payment_number)),
            ];
            setUsesJournalFallback(false);
          } catch (err) {
            if (err.status !== 404) throw err;
            setUsesJournalFallback(true);
            voucherPayload = journalEntriesToVouchers(await ApiClient.journalEntries(token), isReceipt, partnerList);
          }
        }

        setVouchers(Array.isArray(voucherPayload) ? voucherPayload : []);
        setPartners(partnerList);
        setAccounts(accountList);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [isReceipt, token, usesJournalFallback]);

  useEffect(() => {
    load();
  }, [load]);

  const cashAccounts = useMemo(
    () => accounts.filter((account) => account.is_active && !account.is_group && account.account_type === 'ASSET' && Number(account.children_count || 0) === 0),
    [accounts],
  );

  const total = useMemo(() => vouchers.reduce((sum, voucher) => sum + Number(voucher.amount || 0), 0), [vouchers]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      let savedWithJournalFallback = usesJournalFallback;
      const payload = {
        partner_id: Number(form.partner_id),
        payment_date: form.payment_date,
        amount: Number(form.amount || 0),
        cash_bank_account_id: form.cash_bank_account_id ? Number(form.cash_bank_account_id) : null,
        notes: form.notes || null,
      };
      const capabilities = usesJournalFallback ? { voucherEndpoints: false } : await ApiClient.capabilities();
      if (usesJournalFallback || !capabilities.voucherEndpoints) {
        savedWithJournalFallback = true;
        setUsesJournalFallback(true);
        await ApiClient.createJournalEntry(token, buildJournalVoucherPayload({ form, isReceipt, partners, accounts, t }));
      } else {
        try {
          if (isReceipt) {
            await ApiClient.createReceiptVoucher(token, payload);
          } else {
            await ApiClient.createPaymentVoucher(token, payload);
          }
        } catch (err) {
          if (err.status !== 404) throw err;
          setUsesJournalFallback(true);
          savedWithJournalFallback = true;
          await ApiClient.createJournalEntry(token, buildJournalVoucherPayload({ form, isReceipt, partners, accounts, t }));
        }
      }
      setMessage(isReceipt ? t('vouchers.receiptSaved') : t('vouchers.paymentSaved'));
      setForm({ ...blankForm, payment_date: today() });
      load(savedWithJournalFallback);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const title = isReceipt ? t('vouchers.receiptsTitle') : t('vouchers.paymentsTitle');
  const subtitle = isReceipt ? t('vouchers.receiptsSubtitle') : t('vouchers.paymentsSubtitle');
  const canSubmit = form.partner_id && Number(form.amount || 0) > 0 && !saving;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-normal text-slate-950">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">{t('common.total')}</p>
          <p className="mt-1 font-mono text-lg font-black text-slate-950" dir="ltr">{money(total)}</p>
        </div>
      </section>

      {message && <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"><CheckCircle2 size={18} />{message}</div>}
      {error && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800"><AlertCircle size={18} />{error}</div>}

      <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <HandCoins className="text-blue-700" size={20} />
          <h3 className="font-black text-slate-950">{isReceipt ? t('vouchers.newReceipt') : t('vouchers.newPayment')}</h3>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block xl:col-span-2">
              <span className={labelClass}>{isReceipt ? t('invoices.customer') : t('invoices.vendor')}</span>
              <select value={form.partner_id} onChange={(event) => setForm((current) => ({ ...current, partner_id: event.target.value }))} className={inputClass}>
                <option value="">{t('invoices.selectPartner')}</option>
                {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.code} - {partnerName(partner, language)}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>{t('common.date')}</span>
              <input type="date" value={form.payment_date} onChange={(event) => setForm((current) => ({ ...current, payment_date: event.target.value }))} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>{t('common.amount')}</span>
              <input type="number" min="0" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} className={`${inputClass} text-end font-mono`} dir="ltr" />
            </label>
            <label className="block md:col-span-2">
              <span className={labelClass}>{t('vouchers.cashAccount')}</span>
              <select value={form.cash_bank_account_id} onChange={(event) => setForm((current) => ({ ...current, cash_bank_account_id: event.target.value }))} className={inputClass}>
                <option value="">{t('vouchers.defaultCash')}</option>
                {cashAccounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account, language)}</option>)}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className={labelClass}>{t('accounting.referenceNotes')}</span>
              <input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className={inputClass} />
            </label>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={!canSubmit} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              <Save size={16} />
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      </form>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-black text-slate-950">{t('vouchers.register')}</h3>
        </div>
        {isLoading && <div className="p-5 text-sm font-bold text-slate-500">{t('common.loading')}</div>}
        {!isLoading && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-start">{t('common.reference')}</th>
                  <th className="px-4 py-3 text-start">{isReceipt ? t('invoices.customer') : t('invoices.vendor')}</th>
                  <th className="px-4 py-3 text-start">{t('common.date')}</th>
                  <th className="px-4 py-3 text-end">{t('common.amount')}</th>
                  <th className="px-4 py-3 text-start">{t('accounting.referenceNotes')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vouchers.length === 0 && <tr><td className="px-5 py-8 text-center font-semibold text-slate-500" colSpan={5}>{t('common.empty')}</td></tr>}
                {vouchers.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-black text-blue-800" dir="ltr">{voucher.payment_number}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{language === 'ar' ? voucher.partner_name_ar : voucher.partner_name_en}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600" dir="ltr">{voucher.payment_date}</td>
                    <td className="px-4 py-3 text-end font-mono font-black" dir="ltr">{money(voucher.amount)}</td>
                    <td className="px-4 py-3 text-slate-600">{voucher.notes || '-'}</td>
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
