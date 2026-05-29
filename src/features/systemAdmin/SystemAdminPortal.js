import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Building2, CheckCircle2, LogOut, Plus, ShieldCheck, UserCheck, UserX, Trash2 } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useI18n } from '../../i18n/I18nProvider';

const initialForm = {
  company_code: '',
  company_name_en: '',
  company_name_ar: '',
  base_currency: 'JOD',
  admin_full_name: '',
  admin_email: '',
  admin_password: '',
};

function StatusBadge({ active }) {
  const { t } = useI18n();
  return (
    <span className={`rounded-md px-2 py-1 text-xs font-black ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
      {active ? t('common.active') : t('common.inactive', 'Inactive')}
    </span>
  );
}

export default function SystemAdminPortal({ user, onLogout }) {
  const { language, t } = useI18n();
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [companyRows, userRows] = await Promise.all([
        ApiClient.systemAdminCompanies(user.token),
        ApiClient.systemAdminUsers(user.token),
      ]);
      setCompanies(companyRows);
      setUsers(userRows);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user.token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: field === 'company_code' || field === 'base_currency' ? value.toUpperCase() : value }));
  };

  const createCompany = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setMessage('');
    try {
      await ApiClient.createCompanyAccount(user.token, form);
      setForm(initialForm);
      setMessage(t('systemAdmin.created'));
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const runAction = async (action, successMessage) => {
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(successMessage);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="border-b border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 font-black text-white">SA</div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black tracking-normal text-slate-950">{t('systemAdmin.title')}</h1>
            <p className="text-sm font-semibold text-slate-500">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <LogOut size={17} />
            {t('app.logout')}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <section className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Building2, label: t('systemAdmin.companyAccounts'), value: companies.length },
            { icon: ShieldCheck, label: t('systemAdmin.activeCompanies'), value: companies.filter((company) => company.is_active).length },
            { icon: UserCheck, label: t('systemAdmin.users'), value: users.length },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-slate-600">{item.label}</p>
                  <Icon className="text-blue-700" size={22} />
                </div>
                <p className="mt-5 font-mono text-3xl font-black text-slate-950" dir="ltr">{item.value}</p>
              </article>
            );
          })}
        </section>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
            <AlertCircle size={18} />
            {error}
          </div>
        )}
        {message && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            <CheckCircle2 size={18} />
            {message}
          </div>
        )}

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-black text-slate-950">{t('systemAdmin.createCompany')}</h2>
          </div>
          <form className="grid gap-4 p-5 md:grid-cols-3" onSubmit={createCompany}>
            {[
              ['company_code', t('systemAdmin.companyCode'), 'ACME'],
              ['company_name_en', t('systemAdmin.companyNameEn'), 'Acme Company'],
              ['company_name_ar', t('systemAdmin.companyNameAr'), 'شركة أكمي'],
              ['base_currency', t('systemAdmin.currency'), 'JOD'],
              ['admin_full_name', t('systemAdmin.adminName'), 'Head Accountant'],
              ['admin_email', t('systemAdmin.adminEmail'), 'accounting@example.com'],
              ['admin_password', t('systemAdmin.adminPassword'), ''],
            ].map(([field, label, placeholder]) => (
              <label key={field} className="block">
                <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
                <input
                  type={field === 'admin_password' ? 'password' : field === 'admin_email' ? 'email' : 'text'}
                  required
                  minLength={field === 'admin_password' ? 8 : undefined}
                  value={form[field]}
                  onChange={(event) => updateForm(field, event.target.value)}
                  placeholder={placeholder}
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  dir={field.includes('email') || field.includes('password') || field.includes('code') || field === 'base_currency' ? 'ltr' : undefined}
                />
              </label>
            ))}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:bg-slate-400"
              >
                <Plus size={16} />
                {isSubmitting ? t('common.loading') : t('systemAdmin.createCompany')}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-black text-slate-950">{t('systemAdmin.companyAccounts')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-start">{t('common.code')}</th>
                  <th className="px-5 py-3 text-start">{t('common.description')}</th>
                  <th className="px-5 py-3 text-end">{t('systemAdmin.users')}</th>
                  <th className="px-5 py-3 text-end">{t('common.status')}</th>
                  <th className="px-5 py-3 text-end">{t('systemAdmin.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && (
                  <tr>
                    <td className="px-5 py-6 text-center font-bold text-slate-500" colSpan={5}>{t('common.loading')}</td>
                  </tr>
                )}
                {!isLoading && companies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono font-black text-blue-800" dir="ltr">{company.code}</td>
                    <td className="px-5 py-3 font-bold text-slate-800">{language === 'ar' ? company.name_ar : company.name_en}</td>
                    <td className="px-5 py-3 text-end font-mono" dir="ltr">{company.active_users_count}/{company.users_count}</td>
                    <td className="px-5 py-3 text-end"><StatusBadge active={company.is_active} /></td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => runAction(
                            () => (company.is_active ? ApiClient.deactivateCompany(user.token, company.id) : ApiClient.activateCompany(user.token, company.id)),
                            company.is_active ? t('systemAdmin.deactivated') : t('systemAdmin.activated'),
                          )}
                          className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                          title={company.is_active ? t('systemAdmin.deactivate') : t('systemAdmin.activate')}
                        >
                          {company.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(t('systemAdmin.confirmDelete'))) {
                              runAction(() => ApiClient.deleteCompany(user.token, company.id), t('systemAdmin.deleted'));
                            }
                          }}
                          className="rounded-md border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                          title={t('systemAdmin.delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-black text-slate-950">{t('systemAdmin.userAccounts')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-start">{t('auth.email')}</th>
                  <th className="px-5 py-3 text-start">{t('auth.fullName')}</th>
                  <th className="px-5 py-3 text-start">{t('systemAdmin.companyCode')}</th>
                  <th className="px-5 py-3 text-start">{t('systemAdmin.roles')}</th>
                  <th className="px-5 py-3 text-end">{t('common.status')}</th>
                  <th className="px-5 py-3 text-end">{t('systemAdmin.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-blue-800" dir="ltr">{row.email}</td>
                    <td className="px-5 py-3 font-bold text-slate-800">{row.full_name}</td>
                    <td className="px-5 py-3 font-mono" dir="ltr">{row.company_code}</td>
                    <td className="px-5 py-3 text-slate-600">{row.roles.join(', ')}</td>
                    <td className="px-5 py-3 text-end"><StatusBadge active={row.is_active} /></td>
                    <td className="px-5 py-3 text-end">
                      <button
                        type="button"
                        onClick={() => runAction(
                          () => (row.is_active ? ApiClient.deactivateUser(user.token, row.id) : ApiClient.activateUser(user.token, row.id)),
                          row.is_active ? t('systemAdmin.deactivated') : t('systemAdmin.activated'),
                        )}
                        className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                        title={row.is_active ? t('systemAdmin.deactivate') : t('systemAdmin.activate')}
                      >
                        {row.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
