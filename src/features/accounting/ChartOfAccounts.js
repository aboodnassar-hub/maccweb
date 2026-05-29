import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, File, Folder, FolderOpen, Plus, Search } from 'lucide-react';
import { accountTree } from '../../data/erpData';
import { useI18n } from '../../i18n/I18nProvider';

function flatten(nodes) {
  return nodes.flatMap((node) => [node, ...(node.children ? flatten(node.children) : [])]);
}

function AccountNode({ node, depth = 0, query }) {
  const { dir, localize, t } = useI18n();
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = Boolean(node.children?.length);
  const matches = `${node.code} ${localize(node.name)}`.toLowerCase().includes(query.toLowerCase());
  const Arrow = open ? ChevronDown : dir === 'rtl' ? ChevronLeft : ChevronRight;

  if (query && !matches && !hasChildren) {
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
        <span className="hidden rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200 sm:inline">{node.type}</span>
      </button>

      {open && hasChildren && node.children.map((child) => (
        <AccountNode key={child.id} node={child} depth={depth + 1} query={query} />
      ))}
    </div>
  );
}

export default function ChartOfAccounts() {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const count = useMemo(() => flatten(accountTree).length, []);

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

      <div className="max-h-[560px] overflow-y-auto">
        {accountTree.map((node) => (
          <AccountNode key={node.id} node={node} query={query} />
        ))}
      </div>
    </section>
  );
}
