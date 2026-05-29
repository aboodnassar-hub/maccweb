import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronLeft, ChevronRight, File, Folder, FolderOpen, Plus, Search } from 'lucide-react';
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

function AccountNode({ node, depth = 0, query }) {
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
      <button
        type="button"
        onClick={() => hasChildren && setOpen((current) => !current)}
        className={`flex min-h-11 w-full items-center gap-3 border-b border-slate-100 px-4 text-start hover:bg-blue-50 ${query && matches ? 'bg-amber-50' : ''}`}
        style={{ paddingInlineStart: `${16 + depth * 24}px` }}
      >
        <span className="w-4 text-slate-400">{hasChildren ? <Arrow size={16} /> : null}</span>
        <span className="text-blue-700">
          {hasChildren ? (open ? <FolderOpen size={18} /> : <Folder size={18} />) : <File size={17} />}
        </span>
        <span className="font-mono text-xs font-black text-slate-500" dir="ltr">{node.code}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{localize(node.name)}</span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
          {node.isGroup ? t('accounting.group') : t('accounting.leaf')}
        </span>
        <span className="hidden rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200 sm:inline">{node.account_type}</span>
      </button>

      {open && hasChildren && node.children.map((child) => (
        <AccountNode key={child.id} node={child} depth={depth + 1} query={query} />
      ))}
    </div>
  );
}

export default function ChartOfAccounts({ token }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const accountTree = useMemo(() => buildAccountTree(accounts), [accounts]);
  const count = useMemo(() => flatten(accountTree).length, [accountTree]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');

    ApiClient.accounts(token)
      .then((payload) => {
        if (active) setAccounts(payload);
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
          <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800">
            <Plus size={16} />
            {t('accounting.newAccount')}
          </button>
        </div>
      </div>

      {isLoading && <div className="p-5 text-sm font-bold text-slate-500">{t('common.loading', 'Loading live data...')}</div>}
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
            <AccountNode key={node.id} node={node} query={query} />
          ))}
        </div>
      )}
    </section>
  );
}
