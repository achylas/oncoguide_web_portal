import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUpRadiologist } from '../services/authService';
import { useTheme } from '../context/ThemeContext';

export default function SignupPage() {
  const navigate         = useNavigate();
  const { dark, toggle } = useTheme();
  const [form,    setForm]    = useState({ name: '', email: '', password: '', confirm: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 6)       { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await signUpRadiologist({ name: form.name, email: form.email, password: form.password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { label: 'Full Name',        key: 'name',     type: 'text',                       placeholder: 'Dr. Sarah Ahmed',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { label: 'Email Address',    key: 'email',    type: 'email',                      placeholder: 'radiologist@hospital.com',
      icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { label: 'Password',         key: 'password', type: showPw ? 'text' : 'password', placeholder: 'Min. 6 characters',
      icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    { label: 'Confirm Password', key: 'confirm',  type: showPw ? 'text' : 'password', placeholder: 'Repeat password',
      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  ];

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950 transition-colors">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full" />
          <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-white/10 rounded-full" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-white font-bold text-xl">OncoGuide</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Join the<br />Clinical Network
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            Create your radiologist account to start managing patient imaging records and collaborating with the oncology team.
          </p>
        </div>
        <div className="relative z-10 bg-white/10 rounded-2xl p-5 border border-white/20">
          <p className="text-white font-semibold mb-1">Secure & Compliant</p>
          <p className="text-white/70 text-sm">All patient data is encrypted and stored in compliance with medical data regulations.</p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#f4f6fb] dark:bg-[#0f1117] transition-colors relative">

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="absolute top-5 right-5 w-9 h-9 rounded-xl flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-lg">OncoGuide</span>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-card dark:shadow-dark-card p-8 border border-gray-100 dark:border-gray-800">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create account</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Register as a radiologist</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {fields.map(({ label, key, type, placeholder, icon }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                      </svg>
                    </div>
                    <input
                      type={type} required
                      value={form[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="input pl-10"
                      placeholder={placeholder}
                    />
                    {(key === 'password' || key === 'confirm') && (
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d={showPw
                              ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21'
                              : 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                            }
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base shadow-glow-rose mt-2">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account…</>
                ) : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-rose-500 font-semibold hover:text-rose-600 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
