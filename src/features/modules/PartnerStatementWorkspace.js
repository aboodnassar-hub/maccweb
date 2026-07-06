import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, FileText, Search } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { ApiClient } from '../../services/api';

function money(value) {
  return Number(value || 0).toFixed(3);
}

function partnerName(partner, language) {
  return language === 'ar' ? partner.name_ar || partner.name_en : partner.name_en || partner.name_ar;
}

const inputClass = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500';
const labelClass = 'mb-1 block text-xs font-black uppercase tracking-widest text-slate-500';

export default function PartnerStatementWorkspace({ token }) {
  const { language, t } = useI18n();
  const [partners, setPartners] = useState([]);
  const [filters, setFilters] = useState({ partner_id: '', date_from: '', date_to: '' });
  const [statement, setStatement] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLoading(true);
    setError('');
    ApiClient.partners(token, { is_active: true })
      .then((payload) => setPartners(Array.isArray(payload) ? payload : []))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [token]);

  const selectedPartner = useMemo(
    () => partners.find((partner) => String(partner.id) === String(filters.partner_id)),
    [filters.partner_id, partners],
  );

  const loadStatement = useCallback(() => {
    if (!filters.partner_id) {
      setStatement(null);
      return;
    }
    setIsLoading(true);
    setError('');
    ApiClient.partnerStatement(token, filters)
      .then((payload) => setStatement(payload))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [filters, token]);

  useEffect(() => {
    loadStatement();
  }, [loadStatement]);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-black tracking-normal text-slate-950">{t('statements.title')}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t('statements.subtitle')}</p>
      </section>

      {error && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800"><AlertCircle size={18} />{error}</div>}

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <Search className="text-blue-700" size={20} />
          <h3 className="font-black text-slate-950">{t('statements.filters')}</h3>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-4">
          <label className="block md:col-span-2">
            <span className={labelClass}>{t('statements.partner')}</span>
            <select value={filters.partner_id} onChange={(event) => setFilters((current) => ({ ...current, partner_id: event.target.value }))} className={inputClass}>
              <option value="">{t('invoices.selectPartner')}</option>
              {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.code} - {partnerName(partner, language)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>{t('accounting.startsOn')}</span>
            <input type="date" value={filters.date_from} onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))} className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>{t('accounting.endsOn')}</span>
            <input type="date" value={filters.date_to} onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))} className={inputClass} />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <FileText className="text-blue-700" size={20} />
            <h3 className="font-black text-slate-950">{selectedPartner ? partnerName(selectedPartner, language) : t('statements.statement')}</h3>
          </div>
          {statement && <p className="font-mono text-lg font-black text-slate-950" dir="ltr">{money(statement.closing_balance)}</p>}
        </div>
        {isLoading && <div className="p-5 text-sm font-bold text-slate-500">{t('common.loading')}</div>}
        {!isLoading && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-start">{t('common.date')}</th>
                  <th className="px-4 py-3 text-start">{t('common.reference')}</th>
                  <th className="px-4 py-3 text-start">{t('common.description')}</th>
                  <th className="px-4 py-3 text-end">{t('common.debit')}</th>
                  <th className="px-4 py-3 text-end">{t('common.credit')}</th>
                  <th className="px-4 py-3 text-end">{t('accounting.balance')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!statement || statement.lines.length === 0) && <tr><td className="px-5 py-8 text-center font-semibold text-slate-500" colSpan={6}>{t('common.empty')}</td></tr>}
                {statement?.lines.map((line) => (
                  <tr key={`${line.date}-${line.reference}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-600" dir="ltr">{line.date}</td>
                    <td className="px-4 py-3 font-mono font-black text-blue-800" dir="ltr">{line.reference}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{line.description}</td>
                    <td className="px-4 py-3 text-end font-mono" dir="ltr">{money(line.debit)}</td>
                    <td className="px-4 py-3 text-end font-mono" dir="ltr">{money(line.credit)}</td>
                    <td className="px-4 py-3 text-end font-mono font-black" dir="ltr">{money(line.balance)}</td>
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
