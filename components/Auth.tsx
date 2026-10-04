import React, { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { resetPasswordForEmail, signIn, signUp, updateUserPassword } from '../lib/supabase';
import { vibrate } from '../lib/utils';

interface AuthProps {
  onSuccess: () => void;
}

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) setMode('reset');
  }, []);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
    setSuccessMsg('');
    setPassword('');
    vibrate(2);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    vibrate(5);

    try {
      if (mode === 'login') {
        const { error: authError } = await signIn(email, password);
        if (authError) throw authError;
        onSuccess();
      } else if (mode === 'signup') {
        const { error: authError } = await signUp(email, password, fullName);
        if (authError) throw authError;
        setSuccessMsg('Tautan verifikasi telah dikirim ke email Anda.');
      } else if (mode === 'forgot') {
        const { error: authError } = await resetPasswordForEmail(email);
        if (authError) throw authError;
        setSuccessMsg('Instruksi pemulihan telah dikirim ke email Anda.');
      } else {
        const { error: authError } = await updateUserPassword(password);
        if (authError) throw authError;
        setSuccessMsg('Kata sandi berhasil diperbarui. Silakan masuk kembali.');
        window.setTimeout(() => changeMode('login'), 1800);
      }
    } catch (err: any) {
      setError(err.message || 'Permintaan tidak dapat diproses.');
      vibrate([10, 50, 10]);
    } finally {
      setLoading(false);
    }
  };

  const showEmail = mode !== 'reset';
  const showPasswordField = mode !== 'forgot';
  const titles: Record<AuthMode, { title: string; subtitle: string; action: string }> = {
    login: { title: 'Selamat datang', subtitle: 'Masuk untuk melanjutkan ke keuangan Anda.', action: 'Masuk' },
    signup: { title: 'Buat akun', subtitle: 'Mulai kelola keuangan dalam satu tempat.', action: 'Daftar' },
    forgot: { title: 'Pulihkan akun', subtitle: 'Kami akan mengirim tautan pemulihan ke email Anda.', action: 'Kirim Instruksi' },
    reset: { title: 'Buat kata sandi baru', subtitle: 'Gunakan kata sandi yang kuat dan mudah Anda ingat.', action: 'Simpan Kata Sandi' },
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 p-5 font-sans text-white selection:bg-emerald-500/20">
      <div className="pointer-events-none absolute -right-40 -top-40 size-[32rem] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-52 -left-40 size-[30rem] rounded-full bg-cyan-500/5 blur-[120px]" />

      <div className="relative w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
            <img src="/pwa-192x192.png" alt="" className="size-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">ArtosKu</h1>
          <p className="mt-2 text-sm text-zinc-400">Keuangan pribadi, lebih teratur.</p>
        </div>

        <section className="rounded-3xl border border-white/10 bg-zinc-900/75 p-7 shadow-2xl backdrop-blur-xl sm:p-8" aria-labelledby="auth-title">
          {(mode === 'login' || mode === 'signup') ? (
            <div className="mb-7 grid grid-cols-2 rounded-xl border border-white/5 bg-zinc-950 p-1">
              <button type="button" onClick={() => changeMode('login')} aria-pressed={mode === 'login'} className={`h-10 rounded-lg text-xs font-semibold transition-colors ${mode === 'login' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>Masuk</button>
              <button type="button" onClick={() => changeMode('signup')} aria-pressed={mode === 'signup'} className={`h-10 rounded-lg text-xs font-semibold transition-colors ${mode === 'signup' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>Daftar</button>
            </div>
          ) : (
            <button type="button" onClick={() => changeMode('login')} className="mb-6 flex items-center gap-2 text-xs font-semibold text-zinc-400 transition-colors hover:text-white">
              <ChevronLeft size={16} aria-hidden="true" /> Kembali ke halaman masuk
            </button>
          )}

          <div className="mb-7">
            <h2 id="auth-title" className="text-xl font-bold">{titles[mode].title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{titles[mode].subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <label className="block space-y-2 text-xs font-semibold text-zinc-400">
                Nama lengkap
                <span className="flex h-12 items-center rounded-xl border border-white/10 bg-zinc-950 px-4 transition-colors focus-within:border-emerald-500/50">
                  <User className="size-4 shrink-0" aria-hidden="true" />
                  <input type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} className="h-full w-full bg-transparent pl-3 text-sm text-white outline-none placeholder:text-zinc-700" placeholder="Nama Anda" autoComplete="name" required />
                </span>
              </label>
            )}

            {showEmail && (
              <label className="block space-y-2 text-xs font-semibold text-zinc-400">
                Email
                <span className="flex h-12 items-center rounded-xl border border-white/10 bg-zinc-950 px-4 transition-colors focus-within:border-emerald-500/50">
                  <Mail className="size-4 shrink-0" aria-hidden="true" />
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-full w-full bg-transparent pl-3 text-sm text-white outline-none placeholder:text-zinc-700" placeholder="nama@email.com" autoComplete="email" required />
                </span>
              </label>
            )}

            {showPasswordField && (
              <label className="block space-y-2 text-xs font-semibold text-zinc-400">
                Kata sandi
                <span className="flex h-12 items-center rounded-xl border border-white/10 bg-zinc-950 px-4 transition-colors focus-within:border-emerald-500/50">
                  <Lock className="size-4 shrink-0" aria-hidden="true" />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="h-full w-full bg-transparent px-3 text-sm text-white outline-none placeholder:text-zinc-700" placeholder="Minimal 6 karakter" autoComplete={mode === 'reset' ? 'new-password' : 'current-password'} minLength={6} required />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="flex size-8 items-center justify-center text-zinc-500 transition-colors hover:text-emerald-400" aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
                {mode === 'login' && (
                  <button type="button" onClick={() => changeMode('forgot')} className="mt-2 block text-xs font-semibold text-emerald-400 transition-colors hover:text-emerald-300">Lupa kata sandi?</button>
                )}
              </label>
            )}

            <div aria-live="polite">
              {error && <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-center text-xs font-medium text-rose-400">{error}</p>}
              {successMsg && <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center text-xs font-medium text-emerald-400">{successMsg}</p>}
            </div>

            <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-bold text-zinc-950 shadow-lg shadow-emerald-500/10 transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? <Loader2 className="size-5 animate-spin" aria-label="Memproses" /> : <>{titles[mode].action}<ArrowRight size={16} aria-hidden="true" /></>}
            </button>
          </form>
        </section>

        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
          <ShieldCheck size={13} className="text-emerald-500" aria-hidden="true" /> Data Anda dilindungi
        </div>
      </div>
    </main>
  );
};

export default Auth;
