import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Plus, RotateCcw, Save, Send, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { ApiClient } from '../../services/api';

function newEntryNumber() {
  return `JE-${Date.now()}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const blankRows = [
  { id: 1, account_id: '', description: '', debit: 0, credit: 0 },
  { id: 2, account_id: '', description: '', debit: 0, credit: 0 },
];

export default function JournalEntry({ token }) {
  const { language, t } = useI18n();
  const [accounts, setAccounts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [entryNumber, setEntryNumber] = useState(newEntryNumber());
  const [entryDate, setEntryDate] = useState(today());
  const [reference, setReference] = useState('');
  const [rows, setRows] = useState(blankRows);
  const [saving, setSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const reloadEntries = async () => {
    const payload = await ApiClient.journalEntries(token);
    setEntries(payload);
  };

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');

    Promise.all([ApiClient.accounts(token), ApiClient.journalEntries(token)])
      .then(([accountPayload, entryPayload]) => {
        if (!active) return;
        setAccounts(accountPayload.filter((account) => !account.is_group && account.children_count === 0));
        setEntries(entryPayload);
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

  const totals = useMemo(() => {
    const debit = rows.reduce((sum, row) => sum + Number(row.debit || 0), 0);
    const credit = rows.reduce((sum, row) => sum + Number(row.credit || 0), 0);
    return { debit, credit, diff: debit - credit, balanced: Math.abs(debit - credit) < 0.001 };
  }, [rows]);

  const updateRow = (id, field, value) => {
    setRows((current) => current.map((row) => {
      if (row.id !== id) return row;
      const next = { ...row, [field]: field === 'debit' || field === 'credit' ? Number(value) : value };
      if (field === 'debit' && Number(value) > 0) next.credit = 0;
      if (field === 'credit' && Number(value) > 0) next.debit = 0;
      return next;
    }));
  };

  const addRow = () => {
    setRows((current) => [...current, { id: Date.now(), account_id: '', description: '', debit: 0, credit: 0 }]);
  };

  const removeRow = (id) => {
    setRows((current) => (current.length > 2 ? current.filter((row) => row.id !== id) : current));
  };

  const submitEntry = async (post) => {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      await ApiClient.createJournalEntry(token, {
        entry_number: entryNumber,
        entry_date: entryDate,
        description: reference,
        reference_doc: reference,
        post,
        lines: rows.map((row) => ({
          account_id: Number(row.account_id),
          description: row.description || reference,
          debit: Number(row.debit || 0),
          credit: Number(row.credit || 0),
        })),
      });
      setMessage(post ? t('accounting.postedMessage') : t('accounting.draftSavedMessage'));
      setEntryNumber(newEntryNumber());
      setRows(blankRows.map((row) => ({ ...row })));
      await reloadEntries();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const postDraft = async (entryId) => {
    setMessage('');
    setError('');
    try {
      await ApiClient.postJournalEntry(token, entryId);
      setMessage(t('accounting.postedMessage'));
      await reloadEntries();
    } catch (err) {
      setError(err.message);
    }
  };

  const reverseEntry = async (entry) => {
    setMessage('');
    setError('');
    try {
      await ApiClient.reverseJournalEntry(token, entry.id, {
        entry_date: today(),
        description: `${t('accounting.reversalOf')} ${entry.entry_number}`,
      });
      setMessage(t('accounting.reversalCreated'));
      await reloadEntries();
    } catch (err) {
      setError(err.message);
    }
  };

  const canSave = totals.balanced && totals.debit > 0 && rows.every((row) => row.account_id && (Number(row.debit) > 0 || Number(row.credit) > 0));

  return (
    <section className="space-y-4">
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

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-500">{t('accounting.entryNumber')}</span>
            <input readOnly value={entryNumber} className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 font-mono text-sm font-bold text-slate-700" dir="ltr" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-500">{t('accounting.journalDate')}</span>
            <input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-500">{t('accounting.referenceNotes')}</span>
            <input value={reference} onChange={(event) => setReference(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-3 text-start">{t('accounting.account')}</th>
                <th className="px-4 py-3 text-start">{t('common.description')}</th>
                <th className="px-4 py-3 text-end">{t('common.debit')}</th>
                <th className="px-4 py-3 text-end">{t('common.credit')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td className="px-4 py-6 font-bold text-slate-500" colSpan={5}>{t('common.loading')}</td>
                </tr>
              )}
              {!isLoading && rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="p-2">
                    <select value={row.account_id} onChange={(event) => updateRow(row.id, 'account_id', event.target.value)} className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500">
                      <option value="">{t('accounting.accountSearch')}</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {language === 'ar' ? account.name_ar : account.name_en}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input value={row.description} onChange={(event) => updateRow(row.id, 'description', event.target.value)} className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 outline-none hover:border-slate-200 focus:border-blue-500 focus:bg-white" />
                  </td>
                  <td className="p-2">
                    <input type="number" min="0" value={row.debit || ''} onChange={(event) => updateRow(row.id, 'debit', event.target.value)} className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-end font-mono outline-none hover:border-slate-200 focus:border-blue-500 focus:bg-white" dir="ltr" />
                  </td>
                  <td className="p-2">
                    <input type="number" min="0" value={row.credit || ''} onChange={(event) => updateRow(row.id, 'credit', event.target.value)} className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-end font-mono outline-none hover:border-slate-200 focus:border-blue-500 focus:bg-white" dir="ltr" />
                  </td>
                  <td className="p-2 text-center">
                    <button type="button" title={t('systemAdmin.delete')} onClick={() => removeRow(row.id)} className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50">
              <tr>
                <td colSpan={2} className="px-4 py-3">
                  <button type="button" onClick={addRow} className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-bold text-blue-700 hover:bg-blue-50">
                    <Plus size={16} />
                    {t('accounting.addLine')}
                  </button>
                </td>
                <td className="px-4 py-3 text-end font-mono font-black" dir="ltr">{totals.debit.toFixed(3)}</td>
                <td className="px-4 py-3 text-end font-mono font-black" dir="ltr">{totals.credit.toFixed(3)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-black ${
          totals.balanced ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
        }`}>
          {totals.balanced ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {totals.balanced ? t('common.balanced') : `${t('common.difference')}: ${totals.diff.toFixed(3)}`}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={() => submitEntry(false)}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <Save size={16} />
            {t('common.draft')}
          </button>
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={() => submitEntry(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <Send size={16} />
            {saving ? t('accounting.posting') : t('accounting.postEntry')}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-black text-slate-950">{t('accounting.recentEntries')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-5 py-3 text-start">{t('accounting.entryNumber')}</th>
                <th className="px-5 py-3 text-start">{t('common.date')}</th>
                <th className="px-5 py-3 text-start">{t('common.description')}</th>
                <th className="px-5 py-3 text-start">{t('common.status')}</th>
                <th className="px-5 py-3 text-end">{t('systemAdmin.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.length === 0 && (
                <tr>
                  <td className="px-5 py-6 text-center font-semibold text-slate-500" colSpan={5}>{t('common.empty')}</td>
                </tr>
              )}
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono font-black text-blue-800" dir="ltr">{entry.entry_number}</td>
                  <td className="px-5 py-3 font-bold text-slate-700" dir="ltr">{entry.entry_date}</td>
                  <td className="px-5 py-3 font-semibold text-slate-700">{entry.description || entry.reference_doc || entry.source_module}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-black ${entry.status === 'POSTED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      {entry.status === 'DRAFT' && (
                        <button type="button" onClick={() => postDraft(entry.id)} className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-700 px-3 text-xs font-bold text-white hover:bg-blue-800">
                          <Send size={14} />
                          {t('common.post')}
                        </button>
                      )}
                      {entry.status === 'POSTED' && !entry.reversal_of_id && (
                        <button type="button" onClick={() => reverseEntry(entry)} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
                          <RotateCcw size={14} />
                          {t('accounting.reverse')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
