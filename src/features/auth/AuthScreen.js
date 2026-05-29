import React, { useState } from 'react';
import { Globe2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useI18n } from '../../i18n/I18nProvider';

export default function AuthScreen({ onAuthenticated }) {
  const { language, t, toggleLanguage } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await ApiClient.login(formData.email, formData.password);
      const profile = ApiClient.saveSession(response);
      onAuthenticated(profile);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_440px]">
        <section className="hidden bg-slate-950 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-white text-lg font-black text-slate-950">M</div>
              <div>
                <p className="text-2xl font-black tracking-normal">{t('app.name')}</p>
                <p className="text-sm text-slate-300">{t('app.subtitle')}</p>
              </div>
            </div>

            <div className="mt-16 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">{t('auth.systemAdminPortal')}</p>
              <h1 className="mt-4 text-4xl font-black leading-tight tracking-normal">{t('auth.welcome')}</h1>
              <p className="mt-5 text-base leading-7 text-slate-300">{t('auth.adminPortalNote')}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            {['auth.companyControl', 'auth.accountMonitoring', 'auth.secureAccess'].map((key) => (
              <div key={key} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <ShieldCheck className="mb-3 text-emerald-300" size={20} />
                <p className="font-semibold">{t(key)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-8">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-8 flex items-center justify-between">
              <div className="lg:hidden">
                <p className="text-2xl font-black text-slate-950">{t('app.name')}</p>
                <p className="text-sm text-slate-500">{t('auth.systemAdminPortal')}</p>
              </div>
              <button
                type="button"
                onClick={toggleLanguage}
                title={t('app.switchLanguage')}
                className="ms-auto inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Globe2 size={16} />
                {language === 'en' ? 'العربية' : 'English'}
              </button>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-black tracking-normal text-slate-950">{t('auth.signIn')}</h2>
              <p className="mt-2 text-sm text-slate-500">{t('auth.noPublicSignup')}</p>
            </div>

            {error && (
              <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">{t('auth.email')}</span>
                <span className="relative block">
                  <Mail className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    className="h-11 w-full rounded-md border border-slate-300 bg-white ps-10 pe-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    dir="ltr"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">{t('auth.password')}</span>
                <span className="relative block">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(event) => updateField('password', event.target.value)}
                    className="h-11 w-full rounded-md border border-slate-300 bg-white ps-10 pe-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    dir="ltr"
                  />
                </span>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="h-11 w-full rounded-md bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isLoading ? t('auth.signingIn') : t('auth.signIn')}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
