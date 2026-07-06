import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, File, Folder, FolderOpen, Plus, Search, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { ApiClient } from '../../services/api';

function buildAccountTree(accounts) {
  const nodes = accounts.map((account) => ({
    ...account,
    isGroup: account.is_group,
    name: { en: account.name_en, ar: account.name_ar },
    children: [],
  }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const roots = [];

  nodes.forEach((node) => {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function flatten(nodes) {
  return nodes.flatMap((node) => [node, ...(node.children ? flatten(node.children) : [])]);
}

function nodeMatches(node, query, localize) {
  if (!query) return true;
  const ownMatch = `${node.code} ${localize(node.name)}`.toLowerCase().includes(query.toLowerCase());
  return ownMatch || node.children?.some((child) => nodeMatches(child, query, localize));
}

const normalBalanceByType = {
  ASSET: 'DEBIT',
  LIABILITY: 'CREDIT',
  EQUITY: 'CREDIT',
  REVENUE: 'CREDIT',
  EXPENSE: 'DEBIT',
};

const blankAccount = {
  code: '',
  name_en: '',
  name_ar: '',
  account_type: 'ASSET',
  normal_balance: 'DEBIT',
  parent_id: '',
  is_group: false,
};

function AccountNode({ node, depth = 0, query, onDelete }) {
  const { dir, localize, t } = useI18n();
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = Boolean(node.children?.length);
  const matches = `${node.code} ${localize(node.name)}`.toLowerCase().includes(query.toLowerCase());
  const Arrow = open ? ChevronDown : dir === 'rtl' ? ChevronLeft : ChevronRight;

  if (!nodeMatches(node, query, localize)) {
    return null;
  }

  return (
    <div>
      <div
        className={`flex min-h-11 w-full items-center gap-3 border-b border-slate-100 px-4 text-start hover:bg-blue-50 ${query && matches ? 'bg-amber-50' : ''}`}
        style={{ paddingInlineStart: `${16 + depth * 24}px` }}
      >
        <button type="button" onClick={() => hasChildren && setOpen((current) => !current)} className="w-4 text-slate-400">
          {hasChildren ? <Arrow size={16} /> : null}
        </button>
        <span className="text-blue-700">
          {hasChildren ? (open ? <FolderOpen size={18} /> : <Folder size={18} />) : <File size={17} />}
        </span>
        <span className="font-mono text-xs font-black text-slate-500" dir="ltr">{node.code}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{localize(node.name)}</span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
          {node.isGroup ? t('accounting.group') : t('accounting.leaf')}
        </span>
        <span className="hidden rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200 sm:inline">{node.account_type}</span>
        <button
          type="button"
          title={t('systemAdmin.delete')}
          disabled={node.children_count > 0 || node.transaction_count > 0}
          onClick={() => onDelete(node)}
          className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {open && hasChildren && node.children.map((child) => (
        <AccountNode key={child.id} node={child} depth={depth + 1} query={query} onDelete={onDelete} />
      ))}
    </div>
  );
}

export default function ChartOfAccounts({ token }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blankAccount);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const accountTree = useMemo(() => buildAccountTree(accounts), [accounts]);
  const groupAccounts = useMemo(() => accounts.filter((account) => account.is_group), [accounts]);
  const count = useMemo(() => flatten(accountTree).length, [accountTree]);
  const accountStats = useMemo(() => {
    const byType = accounts.reduce((sum, account) => ({
      ...sum,
      [account.account_type]: (sum[account.account_type] || 0) + 1,
    }), {});
    return {
      total: accounts.length,
      groups: accounts.filter((account) => account.is_group).length,
      posting: accounts.filter((account) => !account.is_group).length,
      byType,
    };
  }, [accounts]);

  const loadAccounts = useCallback(() => {
    setIsLoading(true);
    setError('');

    ApiClient.accounts(token)
      .then((payload) => {
        setAccounts(payload);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const updateForm = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'account_type') {
        next.normal_balance = normalBalanceByType[value];
      }
      return next;
    });
  };

  const submitAccount = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      await ApiClient.createAccount(token, {
        ...form,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
      });
      setMessage(t('accounting.accountCreated'));
      setForm(blankAccount);
      setShowForm(false);
      loadAccounts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async (account) => {
    if (!window.confirm(t('accounting.confirmDeleteAccount'))) return;
    setMessage('');
    setError('');
    try {
      await ApiClient.deleteAccount(token, account.id);
      setMessage(t('accounting.accountDeleted'));
      loadAccounts();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="font-black text-slate-950">{t('accounting.tabs.accounts')}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{count} {t('accounting.account')}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('accounting.accountSearch')}
              className="w-56 bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
            />
          </label>
          <button type="button" onClick={() => setShowForm((current) => !current)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800">
            <Plus size={16} />
            {t('accounting.newAccount')}
          </button>
        </div>
      </div>

      {!isLoading && !error && (
        <div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {[
            [t('common.total'), accountStats.total],
            [t('accounting.groupAccounts'), accountStats.groups],
            [t('accounting.postingAccounts'), accountStats.posting],
            [t('accounting.assets'), accountStats.byType.ASSET || 0],
            [t('accounting.liabilities'), accountStats.byType.LIABILITY || 0],
            [t('accounting.revenue'), accountStats.byType.REVENUE || 0],
            [t('accounting.expenses'), accountStats.byType.EXPENSE || 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</p>
              <p className="mt-1 font-mono text-lg font-black text-slate-950" dir="ltr">{value}</p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form onSubmit={submitAccount} className="border-b border-slate-200 bg-slate-50 p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input value={form.code} onChange={(event) => updateForm('code', event.target.value)} required placeholder={t('accounting.accountCode')} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500" dir="ltr" />
            <input value={form.name_en} onChange={(event) => updateForm('name_en', event.target.value)} required placeholder={t('accounting.accountNameEn')} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500" />
            <input value={form.name_ar} onChange={(event) => updateForm('name_ar', event.target.value)} required placeholder={t('accounting.accountNameAr')} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500" />
            <select value={form.parent_id} onChange={(event) => updateForm('parent_id', event.target.value)} className="h-10 rounded-md border border-slate-300 px-3 text-sm font-bold outline-none focus:border-blue-500">
              <option value="">{t('accounting.noParent')}</option>
              {groupAccounts.map((account) => (
                <option key={account.id} value={account.id}>{account.code} · {account.name_en}</option>
              ))}
            </select>
            <select value={form.account_type} onChange={(event) => updateForm('account_type', event.target.value)} className="h-10 rounded-md border border-slate-300 px-3 text-sm font-bold outline-none focus:border-blue-500">
              {Object.keys(normalBalanceByType).map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <input readOnly value={form.normal_balance} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600" />
            <label className="flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={form.is_group} onChange={(event) => updateForm('is_group', event.target.checked)} />
              {t('accounting.group')}
            </label>
            <button type="submit" disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              <Plus size={16} />
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      )}

      {message && (
        <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}
      {isLoading && <div className="p-5 text-sm font-bold text-slate-500">{t('common.loading', 'Loading data...')}</div>}
      {error && (
        <div className="flex items-center gap-2 p-5 text-sm font-bold text-rose-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {!isLoading && !error && (
        <div className="max-h-[560px] overflow-y-auto">
          {accountTree.length === 0 && <div className="p-5 text-sm font-semibold text-slate-500">{t('common.empty', 'No records yet')}</div>}
          {accountTree.map((node) => (
            <AccountNode key={node.id} node={node} query={query} onDelete={deleteAccount} />
          ))}
        </div>
      )}
    </section>
  );
}
