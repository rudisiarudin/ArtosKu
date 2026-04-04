import React, { useState } from 'react';
import { UserProfile, Wallet } from '../types';
import { updateSecurityPin, signOut, uploadAvatar } from '../lib/supabase';
import ChangePasswordModal from './ChangePasswordModal';
import TelegramConnect from './TelegramConnect';
import { useLanguage } from '../context/LanguageContext';

interface ProfileProps {
  userName: string;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  profile: UserProfile | null;
  onUpdateProfile: () => void;
  wallets: Wallet[];
  deferredPrompt?: any;
  onInstallSuccess?: () => void;
}

const Profile: React.FC<ProfileProps> = React.memo(({ userName, theme, setTheme, profile, onUpdateProfile, wallets, deferredPrompt, onInstallSuccess }) => {
  const isDark = theme === 'dark';
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { lang, setLanguage, t } = useLanguage();

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setIsUploading(true);
    try {
      const { error } = await uploadAvatar(profile.id, file);
      if (error) throw error;
      onUpdateProfile();
    } catch (err) {
      console.error('Error uploading avatar:', err);
      alert('Gagal mengupload foto profil.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdatePin = async () => {
    if (!profile || newPin.length !== 6) return;
    setLoading(true);
    try {
      const { error } = await updateSecurityPin(profile.id, newPin, true);
      if (error) throw error;
      setIsPinModalOpen(false);
      setNewPin('');
      onUpdateProfile();
    } catch (err) {
      console.error('Error updating PIN:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile) return;
    if (!profile.security_pin) {
      setIsPinModalOpen(true);
      return;
    }

    try {
      const { error } = await updateSecurityPin(profile.id, profile.security_pin || null, !profile.pin_enabled);
      if (error) throw error;
      onUpdateProfile();
    } catch (err) {
      console.error('Error toggling PIN:', err);
    }
  };

  const handleLogout = async () => {
    await signOut();
    window.location.reload();
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      onInstallSuccess?.();
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-32 page-enter selection:bg-emerald-500/20 bg-[var(--bg-deep)]">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Profile Header */}
      <header className="px-6 pb-2 pt-[calc(3rem+env(safe-area-inset-top))] mb-4">
        <div className="bg-[rgba(var(--bg-card-rgb),0.5)] border border-[var(--border-subtle)] rounded-2xl p-5 relative overflow-hidden text-center glass-morphism">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/[0.03] blur-[80px] rounded-full pointer-events-none"></div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <div className="w-16 h-16 rounded-xl p-0.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] mb-3 shadow-xl group-active:scale-95 transition-all">
                <div className="w-full h-full rounded-xl overflow-hidden bg-[var(--bg-inner)] flex items-center justify-center relative">
                  {isUploading ? (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                      <div className="w-6 h-6 border-2 border-[#00d293]/20 border-t-[#00d293] rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                      <i className="fa-solid fa-camera text-white text-xs"></i>
                    </div>
                  )}
                  <img
                    src={profile?.avatar_url || "https://avatar.stockbit.com/male/ToyFaces_Colored_BG_105-min.png"}
                    alt="profile"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="absolute bottom-3 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-[3px] border-zinc-900 flex items-center justify-center text-black shadow-lg">
                <i className="fa-solid fa-check text-[8px]"></i>
              </div>
            </div>

            <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight mb-1">{userName}</h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/10">
              <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
              <span className="text-[8px] font-bold text-emerald-500 tracking-wider uppercase">Elite Member</span>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 space-y-5">
        {/* User Stats Grid */}
        <section className="grid grid-cols-3 gap-2.5">
          {[
            {
              label: 'Assets',
              val: `Rp${(wallets.reduce((sum, w) => sum + Number(w.balance), 0) / 1000000).toFixed(1)}M`,
              icon: 'fa-shield-halved',
              color: 'text-[#00d293]'
            },
            { label: 'Reliability', val: '99%', icon: 'fa-check-double', color: 'text-blue-500' },
            { label: 'Tier', val: 'Elite', icon: 'fa-crown', color: 'text-amber-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-[rgba(var(--bg-card-rgb),0.4)] border border-[var(--border-subtle)] rounded-2xl p-3 flex flex-col items-center gap-2 hover:bg-[rgba(var(--bg-card-rgb),0.6)] transition-all group">
              <div className={`w-7 h-7 rounded-lg bg-[rgba(var(--bg-deep-rgb),0.4)] border border-[var(--border-subtle)] flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform`}>
                <i className={`fa-solid ${stat.icon} text-[9px]`}></i>
              </div>
              <div className="text-center min-w-0 w-full">
                <p className="text-[12px] font-bold text-[var(--text-primary)] tracking-tight mb-0.5 truncate">{stat.val}</p>
                <p className="text-[7px] font-semibold text-[var(--text-muted)] tracking-widest uppercase truncate">{stat.label}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Account Settings */}
        <section className="space-y-4">
          <div className="bg-[rgba(var(--bg-card-rgb),0.4)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden glass-morphism">
            <div className="px-5 py-2.5 border-b border-[var(--border-subtle)] bg-white/[0.01]">
              <h3 className="text-[7.5px] font-semibold text-[var(--text-muted)] tracking-[0.25em] uppercase">{t('profile.general')}</h3>
            </div>

            {/* Language Toggle */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-[var(--border-subtle)] active:bg-white/5 transition-colors group" onClick={() => setLanguage(lang === 'id' ? 'en' : 'id')}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[rgba(var(--bg-inner-rgb),0.5)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] group-active:scale-95 transition-transform text-[9px]">
                  <i className="fa-solid fa-earth-asia"></i>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-primary)] tracking-tight leading-none mb-1">{t('profile.language')}</p>
                  <p className="text-[8px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">{t('profile.select_language')}</p>
                </div>
              </div>
              <div className="flex items-center bg-[rgba(var(--bg-deep-rgb),0.3)] p-0.5 rounded-full border border-[var(--border-subtle)]">
                <button
                  className={`px-3 py-1 rounded-full text-[8px] font-semibold transition-all ${lang === 'id' ? 'bg-[#00d293] text-black shadow-sm' : 'text-zinc-600'}`}
                  onClick={(e) => { e.stopPropagation(); setLanguage('id'); }}
                >
                  ID
                </button>
                <button
                  className={`px-3 py-1 rounded-full text-[8px] font-semibold transition-all ${lang === 'en' ? 'bg-[#00d293] text-black shadow-sm' : 'text-zinc-600'}`}
                  onClick={(e) => { e.stopPropagation(); setLanguage('en'); }}
                >
                  EN
                </button>
              </div>
            </div>

            {/* Theme Toggle */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-[var(--border-subtle)] active:bg-white/5 transition-colors group" onClick={() => setTheme(isDark ? 'light' : 'dark')}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[rgba(var(--bg-inner-rgb),0.5)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] group-active:scale-95 transition-transform text-[9px]">
                  <i className={`fa-solid ${isDark ? 'fa-moon' : 'fa-sun text-amber-500'}`}></i>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-primary)] tracking-tight leading-none mb-1">{t('profile.appearance')}</p>
                  <p className="text-[8px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">{t('profile.interface_style')}</p>
                </div>
              </div>
              <div className={`w-8 h-4 rounded-full transition-all duration-300 relative ${isDark ? 'bg-emerald-500/50' : 'bg-zinc-300'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300 ${isDark ? 'left-4.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'left-0.5 bg-white'}`}></div>
              </div>
            </div>

            {/* Change Password */}
            <div className="px-5 py-3 flex items-center justify-between active:bg-white/5 transition-colors group" onClick={() => setIsPasswordModalOpen(true)}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[rgba(var(--bg-inner-rgb),0.5)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] group-active:scale-95 transition-transform text-[9px]">
                  <i className="fa-solid fa-key"></i>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-primary)] tracking-tight leading-none mb-1">{t('profile.password')}</p>
                  <p className="text-[8px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">{t('profile.auth_credentials')}</p>
                </div>
              </div>
              <i className="fa-solid fa-chevron-right text-[8px] text-[var(--text-muted)] mr-1 group-hover:text-[var(--text-primary)] transition-colors"></i>
            </div>
          </div>

          <div className="bg-[rgba(var(--bg-card-rgb),0.4)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden glass-morphism">
            <div className="px-5 py-2.5 border-b border-[var(--border-subtle)] bg-[rgba(var(--text-primary-rgb),0.01)]">
              <h3 className="text-[7.5px] font-semibold text-[var(--text-muted)] tracking-[0.25em] uppercase opacity-50">{t('profile.security')}</h3>
            </div>

            {/* PIN Security */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-[var(--border-subtle)] active:bg-[rgba(var(--text-primary-rgb),0.05)] transition-colors group" onClick={handleTogglePin}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[rgba(var(--bg-inner-rgb),0.5)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] group-active:scale-95 transition-transform text-[9px]">
                  <i className="fa-solid fa-shield-cat"></i>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-primary)] tracking-tight leading-none mb-1">{t('profile.security_pin')}</p>
                  <p className="text-[8px] font-semibold text-[var(--text-muted)] uppercase tracking-wider opacity-60">
                    {profile?.pin_enabled ? t('profile.active') : t('profile.disabled')}
                  </p>
                </div>
              </div>
              <div className={`w-8 h-4 rounded-full transition-all duration-300 relative ${profile?.pin_enabled ? 'bg-emerald-500/50' : 'bg-[var(--bg-inner)]'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300 ${profile?.pin_enabled ? 'left-4.5 bg-emerald-400' : 'left-0.5 bg-[var(--text-muted)] opacity-50'}`}></div>
              </div>
            </div>

            {/* Biometric Security */}
            <div className="px-5 py-3 flex items-center justify-between active:bg-[rgba(var(--text-primary-rgb),0.05)] transition-colors group"
              onClick={(e) => {
                e.stopPropagation();
                const current = localStorage.getItem('biometric_enabled') === 'true';
                localStorage.setItem('biometric_enabled', (!current).toString());
                onUpdateProfile();
              }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[rgba(var(--bg-inner-rgb),0.5)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] group-active:scale-95 transition-transform text-[9px]">
                  <i className="fa-solid fa-fingerprint"></i>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-primary)] tracking-tight leading-none mb-1">{t('profile.biometric')}</p>
                  <p className="text-[8px] font-semibold text-[var(--text-muted)] uppercase tracking-wider opacity-60">
                    {localStorage.getItem('biometric_enabled') === 'true' ? t('profile.active') : t('profile.disabled')}
                  </p>
                </div>
              </div>
              <div className={`w-8 h-4 rounded-full transition-all duration-300 relative ${localStorage.getItem('biometric_enabled') === 'true' ? 'bg-emerald-500/50' : 'bg-[var(--bg-inner)]'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300 ${localStorage.getItem('biometric_enabled') === 'true' ? 'left-4.5 bg-emerald-400' : 'left-0.5 bg-[var(--text-muted)] opacity-50'}`}></div>
              </div>
            </div>
          </div>

          {/* App Experience */}
          {deferredPrompt && (
            <div className="bg-[rgba(var(--bg-card-rgb),0.4)] border border-emerald-500/20 rounded-2xl overflow-hidden glass-morphism animate-fade-up">
              <div className="px-5 py-2.5 border-b border-emerald-500/10 bg-emerald-500/5">
                <h3 className="text-[7.5px] font-semibold text-emerald-500 tracking-[0.25em] uppercase">{t('profile.experience')}</h3>
              </div>
              <div className="px-5 py-4 flex items-center justify-between active:bg-emerald-500/5 transition-colors group" onClick={handleInstallApp}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-active:scale-95 transition-transform text-lg shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <i className="fa-solid fa-mobile-screen-button"></i>
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-[var(--text-primary)] tracking-tight leading-none mb-1">{t('profile.install_app')}</p>
                    <p className="text-[9px] font-semibold text-emerald-500/60 uppercase tracking-wider">{t('profile.install_desc')}</p>
                  </div>
                </div>
                <div className="bg-emerald-500 text-black px-3 py-1.5 rounded-lg text-[9px] font-semibold uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-90 transition-all cursor-pointer">
                  {t('common.install')}
                </div>
              </div>
            </div>
          )}

          {/* Telegram Integration */}
          <TelegramConnect
            profile={profile}
            onUpdateProfile={onUpdateProfile}
            botUsername="ArtoskuBot"
          />

          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full py-4 text-[10px] font-semibold text-rose-500/60 tracking-[0.3em] uppercase hover:text-rose-500 transition-colors active:scale-95 transition-all"
          >
            {t('profile.sign_out')}
          </button>
        </section>
      </div>

      {/* Modals */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      {/* PIN Setup Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-[1100] bg-[rgba(var(--bg-deep-rgb),0.8)] backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-full max-w-[320px] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-8 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00d293]/50 to-transparent"></div>

            <h3 className="text-lg font-bold text-white mb-2 text-center">Set Security PIN</h3>
            <p className="text-[10px] font-semibold text-zinc-500 tracking-widest text-center mb-8 uppercase">Choose a 6-digit access key</p>

            <div className="space-y-6">
              <input
                type="text"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full h-16 bg-black rounded-2xl text-center text-3xl font-bold tracking-[0.4em] text-[#00d293] border border-white/5 focus:border-[#00d293]/40 outline-none transition-all tabular-nums placeholder:text-zinc-900"
                placeholder="••••••"
                autoFocus
              />

              <div className="flex gap-3">
                <button
                  onClick={() => { setIsPinModalOpen(false); setNewPin(''); }}
                  className="flex-1 h-12 rounded-xl text-[10px] font-semibold text-zinc-500 tracking-widest hover:text-white transition-colors uppercase"
                >
                  Dismiss
                </button>
                <button
                  onClick={handleUpdatePin}
                  disabled={loading || newPin.length !== 6}
                  className="flex-1 h-12 bg-[#00d293] text-black rounded-xl text-[10px] font-semibold tracking-widest shadow-lg shadow-[#00d293]/20 disabled:opacity-50 transition-all active:scale-95 uppercase"
                >
                  {loading ? 'Securing...' : 'Verify'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[1100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-[340px] bg-zinc-900 border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent"></div>
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-rose-500/20 blur-[80px] rounded-full pointer-events-none"></div>

            <div className="text-center mb-8 relative z-10">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-600/20 border border-rose-500/30 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-rose-500/10 active:scale-95 transition-transform">
                <i className="fa-solid fa-right-from-bracket text-3xl text-rose-500"></i>
              </div>

              <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Sign Out Account?</h3>
              <p className="text-[12px] font-semibold text-zinc-400 leading-relaxed px-2">
                Are you sure you want to end your <span className="text-emerald-500 font-bold">ArtosKu</span> session?
              </p>
            </div>

            <div className="flex gap-3 relative z-10">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 h-12 rounded-xl bg-zinc-800 border border-white/5 text-[11px] font-semibold text-zinc-300 tracking-widest hover:bg-zinc-700 hover:text-white transition-all active:scale-95 uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 h-12 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl text-[11px] font-semibold tracking-widest shadow-xl shadow-rose-500/30 hover:from-rose-600 hover:to-rose-700 transition-all active:scale-95 uppercase"
              >
                Ya, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default Profile;
