
import React, { useState } from 'react';
import { UserProfile, Wallet } from '../types';
import { updateSecurityPin, signOut, uploadAvatar } from '../lib/supabase';
import ChangePasswordModal from './ChangePasswordModal';
import TelegramConnect from './TelegramConnect';
import { useLanguage } from '../context/LanguageContext';
import { 
  Camera, 
  Check, 
  ShieldCheck, 
  Crown, 
  Globe, 
  Moon, 
  Sun, 
  Key, 
  ChevronRight, 
  Fingerprint, 
  Smartphone, 
  LogOut, 
  ShieldAlert,
  Zap,
  RefreshCw
} from 'lucide-react';

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
    <div className="flex flex-col min-h-screen pb-32 animate-in fade-in duration-500 selection:bg-primary/20 bg-background">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarUpload}
        accept="image/*"
        className="hidden"
      />

      <header className="px-6 pt-[calc(4rem+env(safe-area-inset-top))] pb-10 flex flex-col items-center">
        <div className="relative group mb-8" onClick={handleAvatarClick}>
          {/* High-End Avatar Glow */}
          <div className="absolute -inset-4 bg-primary/5 blur-[32px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="size-24 rounded-full p-1 bg-gradient-to-tr from-primary/20 via-transparent to-transparent relative z-10 group-active:scale-95 transition-transform duration-500">
            <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 flex items-center justify-center relative border border-white/5 shadow-2xl">
              {isUploading ? (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-10">
                  <RefreshCw className="size-6 text-primary animate-spin" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                  <Camera className="text-white" size={20} strokeWidth={1.5} />
                </div>
              )}
              <img
                src={profile?.avatar_url || "https://avatar.stockbit.com/male/ToyFaces_Colored_BG_105-min.png"}
                alt="profile"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          {/* Institutional Badge */}
          <div className="absolute -bottom-0.5 -right-0.5 size-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/20 z-20 border-[3px] border-background">
            <Check size={12} strokeWidth={4} />
          </div>
        </div>

        <h2 className="text-[28px] font-black text-foreground tracking-tight mb-2 uppercase text-center">{userName}</h2>
        <div className="flex items-center gap-2 group cursor-default">
          <div className="size-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-black text-primary tracking-[0.4em] uppercase">{t('profile.elite_member')}</span>
        </div>
      </header>

      <div className="px-6 space-y-12">
        <section className="grid grid-cols-3 gap-0 px-2">
          {[
            {
              label: 'Institutional Assets',
              val: `${(wallets.reduce((sum, w) => sum + Number(w.balance), 0) / 1000000).toFixed(1)}M`,
              icon: ShieldCheck,
              color: 'text-emerald-500'
            },
            { label: 'Uptime Connection', val: '100%', icon: Check, color: 'text-blue-500' },
            { label: 'Security Tier', val: 'Elite', icon: Crown, color: 'text-amber-500' },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center py-4 border-r border-white/5 last:border-0">
              <p className="text-[18px] font-bold text-foreground tabular-nums tracking-tighter mb-0.5">{stat.val}</p>
              <p className="text-[8px] font-black text-muted-foreground/20 tracking-[0.2em] uppercase text-center leading-tight">{stat.label}</p>
            </div>
          ))}
        </section>

        <section className="space-y-0.5">
          <h3 className="text-[9px] font-black text-muted-foreground/20 tracking-[0.5em] uppercase px-6 mb-4">{t('profile.general')}</h3>
          
          <div className="space-y-0.5">
            {/* Language Toggle */}
            <div className="px-6 py-4 flex items-center justify-between active:bg-white/[0.03] transition-colors group" onClick={() => setLanguage(lang === 'id' ? 'en' : 'id')}>
              <div className="flex items-center gap-5">
                <div className="size-10 rounded-2xl bg-zinc-900 flex items-center justify-center text-muted-foreground group-active:scale-95 transition-transform">
                  <Globe size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[14px] font-black text-foreground tracking-tight mb-0.5">{t('profile.language')}</p>
                  <p className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.1em]">{t('profile.select_language')}</p>
                </div>
              </div>
              <div className="flex items-center bg-zinc-900 p-1 rounded-xl">
                <div className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${lang === 'id' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground/30'}`}>ID</div>
                <div className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${lang === 'en' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground/30'}`}>EN</div>
              </div>
            </div>

            {/* Theme Toggle */}
            <div className="px-6 py-4 flex items-center justify-between active:bg-white/[0.03] transition-colors group" onClick={() => setTheme(isDark ? 'light' : 'dark')}>
              <div className="flex items-center gap-5">
                <div className="size-10 rounded-2xl bg-zinc-900 flex items-center justify-center text-muted-foreground group-active:scale-95 transition-transform">
                  {isDark ? <Moon size={18} strokeWidth={1.5} /> : <Sun size={18} strokeWidth={1.5} className="text-amber-500" />}
                </div>
                <div>
                  <p className="text-[14px] font-black text-foreground tracking-tight mb-0.5">{t('profile.appearance')}</p>
                  <p className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.1em]">{t('profile.interface_style')}</p>
                </div>
              </div>
              <div className={`w-10 h-5.5 rounded-full transition-all duration-500 relative ${isDark ? 'bg-primary/40' : 'bg-muted/40'}`}>
                <div className={`absolute top-1 size-3.5 rounded-full transition-all duration-500 shadow-lg ${isDark ? 'left-5.5 bg-primary' : 'left-1 bg-white'}`}></div>
              </div>
            </div>

            {/* Change Password */}
            <div className="px-6 py-4 flex items-center justify-between active:bg-white/[0.03] transition-colors group" onClick={() => setIsPasswordModalOpen(true)}>
              <div className="flex items-center gap-5">
                <div className="size-10 rounded-2xl bg-zinc-900 flex items-center justify-center text-muted-foreground group-active:scale-95 transition-transform">
                  <Key size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[14px] font-black text-foreground tracking-tight mb-0.5">{t('profile.password')}</p>
                  <p className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.1em]">{t('profile.auth_credentials')}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground/20" />
            </div>
          </div>
        </section>

        <section className="space-y-0.5">
          <h3 className="text-[9px] font-black text-muted-foreground/20 tracking-[0.5em] uppercase px-6 mb-4">{t('profile.security')}</h3>
          
          <div className="space-y-0.5">
            {/* PIN Security */}
            <div className="px-6 py-4 flex items-center justify-between active:bg-white/[0.03] transition-colors group" onClick={handleTogglePin}>
              <div className="flex items-center gap-5">
                <div className="size-10 rounded-2xl bg-zinc-900 flex items-center justify-center text-muted-foreground group-active:scale-95 transition-transform">
                  <ShieldCheck size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[14px] font-black text-foreground tracking-tight mb-0.5">{t('profile.security_pin')}</p>
                  <p className="text-[9px] font-black uppercase tracking-[0.1em] text-primary">
                    {profile?.pin_enabled ? t('profile.active') : t('profile.disabled')}
                  </p>
                </div>
              </div>
              <div className={`w-10 h-5.5 rounded-full transition-all duration-500 relative ${profile?.pin_enabled ? 'bg-primary/40' : 'bg-muted/40'}`}>
                <div className={`absolute top-1 size-3.5 rounded-full transition-all duration-500 shadow-lg ${profile?.pin_enabled ? 'left-5.5 bg-primary' : 'left-1 bg-muted-foreground/30'}`}></div>
              </div>
            </div>

            {/* Biometric Security */}
            <div className="px-6 py-4 flex items-center justify-between active:bg-white/[0.03] transition-colors group"
              onClick={(e) => {
                e.stopPropagation();
                const current = localStorage.getItem('biometric_enabled') === 'true';
                localStorage.setItem('biometric_enabled', (!current).toString());
                onUpdateProfile();
              }}>
              <div className="flex items-center gap-5">
                <div className="size-10 rounded-2xl bg-zinc-900 flex items-center justify-center text-muted-foreground group-active:scale-95 transition-transform">
                  <Fingerprint size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[14px] font-black text-foreground tracking-tight mb-0.5">{t('profile.biometric')}</p>
                  <p className="text-[9px] font-black uppercase tracking-[0.1em] text-primary">
                    {localStorage.getItem('biometric_enabled') === 'true' ? t('profile.active') : t('profile.disabled')}
                  </p>
                </div>
              </div>
              <div className={`w-10 h-5.5 rounded-full transition-all duration-500 relative ${localStorage.getItem('biometric_enabled') === 'true' ? 'bg-primary/40' : 'bg-muted/40'}`}>
                <div className={`absolute top-1 size-3.5 rounded-full transition-all duration-500 shadow-lg ${localStorage.getItem('biometric_enabled') === 'true' ? 'left-5.5 bg-primary' : 'left-1 bg-muted-foreground/30'}`}></div>
              </div>
            </div>
          </div>
        </section>

          {/* App Experience & Integrations */}
        <section className="space-y-8">
          {deferredPrompt && (
            <div className="px-2">
              <div className="bg-primary/10 rounded-[32px] p-6 flex items-center justify-between group active:scale-95 transition-all" onClick={handleInstallApp}>
                <div className="flex items-center gap-5">
                  <div className="size-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <p className="text-[15px] font-black text-foreground tracking-tight mb-0.5">{t('profile.install_app')}</p>
                    <p className="text-[10px] font-black text-primary tracking-widest uppercase">{t('profile.install_desc')}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-primary/40" />
              </div>
            </div>
          )}

          <TelegramConnect
            profile={profile}
            onUpdateProfile={onUpdateProfile}
            botUsername="ArtoskuBot"
          />

          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full py-8 text-[11px] font-black text-rose-500/40 tracking-[0.4em] uppercase hover:text-rose-500 transition-all active:scale-95"
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
        <div className="fixed inset-0 z-[1100] bg-background/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="w-full max-w-[340px] bg-card rounded-[32px] p-8 shadow-2xl relative animate-in zoom-in-95 duration-300 shadow-black/40">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

            <h3 className="text-xl font-black text-foreground mb-2 text-center uppercase">Secure Access</h3>
            <p className="text-[10px] font-black text-muted-foreground/30 tracking-[0.2em] text-center mb-8 uppercase">Choose your 6-digit signature key</p>

            <div className="space-y-8">
              <input
                type="text"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full h-20 bg-muted/20 rounded-[24px] text-center text-4xl font-black tracking-[0.4em] text-primary border border-border/10 focus:border-primary/50 outline-none transition-all tabular-nums placeholder:text-muted/10"
                placeholder="••••••"
                autoFocus
              />

              <div className="flex gap-4">
                <button
                  onClick={() => { setIsPinModalOpen(false); setNewPin(''); }}
                  className="flex-1 h-14 rounded-2xl text-[11px] font-black text-muted-foreground/40 tracking-widest hover:text-foreground transition-all uppercase"
                >
                  Dismiss
                </button>
                <button
                  onClick={handleUpdatePin}
                  disabled={loading || newPin.length !== 6}
                  className="flex-1 h-14 bg-primary text-primary-foreground rounded-2xl text-[11px] font-black tracking-widest shadow-xl shadow-primary/20 disabled:opacity-30 transition-all active:scale-95 uppercase"
                >
                  {loading ? 'Encrypting...' : 'Verify'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setIsLogoutModalOpen(false)} />
          
          <div className="relative w-full max-w-[320px] bg-zinc-950 border border-white/5 rounded-[28px] p-8 shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="text-center mb-8">
              <div className="size-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-6">
                <LogOut size={24} className="text-rose-500" strokeWidth={1.5} />
              </div>

              <h3 className="text-lg font-black text-foreground mb-2 tracking-tight uppercase">Security Terminal</h3>
              <p className="text-[10px] font-black text-muted-foreground/30 leading-relaxed px-4 uppercase tracking-[0.2em]">
                Terminate active <span className="text-primary/40">ArtosKu</span> session?
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleLogout}
                className="w-full h-12 bg-rose-500 text-white rounded-xl text-[11px] font-black tracking-[0.2em] shadow-lg shadow-rose-500/20 active:scale-95 transition-all uppercase"
              >
                Sign Out
              </button>
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="w-full h-12 rounded-xl text-[10px] font-black text-muted-foreground/30 tracking-[0.2em] hover:text-muted-foreground transition-all uppercase"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default Profile;
