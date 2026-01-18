import React, { useState } from 'react';
import { UserProfile, Wallet } from '../types';
import { updateSecurityPin, signOut } from '../lib/supabase';

interface ProfileProps {
  userName: string;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  profile: UserProfile | null;
  onUpdateProfile: () => void;
  wallets: Wallet[];
}

const Profile: React.FC<ProfileProps> = React.memo(({ userName, theme, setTheme, profile, onUpdateProfile, wallets }) => {
  const isDark = theme === 'dark';
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [loading, setLoading] = useState(false);

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
      alert('Failed to update PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePin = async () => {
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


  return (
    <div className="flex flex-col min-h-screen pb-32 animate-in fade-in duration-700 font-['Inter']">
      {/* Profile Header - Scrollable */}
      <header className="px-8 pt-8 mb-4 relative overflow-hidden text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#00d293]/10 blur-[100px] rounded-full -mt-32 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 rounded-[2.5rem] overflow-hidden border border-[#00d293]/20 p-1.5 mb-4 shadow-2xl relative group animate-float">
            <div className="absolute inset-0 bg-[#00d293]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-full h-full rounded-[2rem] overflow-hidden bg-zinc-900 border border-white/10 relative z-10">
              <img src="https://avatar.stockbit.com/male/ToyFaces_Colored_BG_105-min.png" alt="profile" className="w-full h-full object-cover" />
            </div>
          </div>
          <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight mb-1">{userName}</h2>
          <p className="text-[10px] font-black text-[#00d293] uppercase tracking-[0.3em] opacity-80">ArtosKu Member</p>
        </div>
      </header>

      <div className="px-6 space-y-8">
        {/* User Stats V3 - Dynamic Calculation */}
        <section className="grid grid-cols-3 gap-3">
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
            <div key={i} className="premium-card p-3 flex flex-col items-center gap-1.5 glass-morphism elite-glow rounded-2xl border border-white/5 bg-zinc-900/40">
              <div className={`w-8 h-8 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center ${stat.color} shadow-inner`}>
                <i className={`fa-solid ${stat.icon} text-[10px]`}></i>
              </div>
              <p className="text-[12px] font-black text-[var(--text-primary)] tracking-tight truncate w-full text-center">{stat.val}</p>
              <p className="text-[8px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em] opacity-60">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* Categories V3 */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.25em] px-4">System Settings</h3>
          <div className="premium-card overflow-hidden glass-morphism border border-white/5 rounded-[2rem] bg-zinc-900/40">
            <div className="divide-y divide-white/5">
              {/* Theme Toggle */}
              <div className="p-4 flex items-center justify-between group hover:bg-emerald-500/[0.03] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
                    <i className="fa-solid fa-moon text-[12px]"></i>
                  </div>
                  <div>
                    <span className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-wider block">Appearance</span>
                    <span className="text-[9px] font-medium text-zinc-500">Dark mode enabled</span>
                  </div>
                </div>
                <button
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className={`w-10 h-5.5 rounded-full transition-all duration-500 relative ${isDark ? 'bg-[#00d293]' : 'bg-zinc-700'}`}
                >
                  <div className={`absolute top-1 w-3.5 h-3.5 rounded-full bg-white shadow-lg transition-all duration-500 ${isDark ? 'left-5.5' : 'left-1'}`}></div>
                </button>
              </div>

              {/* PIN Security */}
              <div className="p-4 flex items-center justify-between group hover:bg-emerald-500/[0.03] transition-colors">
                <div className="flex items-center gap-3" onClick={() => setIsPinModalOpen(true)}>
                  <div className={`w-9 h-9 rounded-xl ${profile?.pin_enabled && profile?.security_pin ? 'bg-[#00d293]/10 border-[#00d293]/20 text-[#00d293]' : 'bg-blue-500/10 border-blue-500/20 text-blue-500'} border flex items-center justify-center transition-colors`}>
                    <i className="fa-solid fa-key text-[12px]"></i>
                  </div>
                  <div className="cursor-pointer">
                    <span className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-wider block">Security PIN</span>
                    <span className="text-[9px] font-medium text-zinc-500">
                      {profile?.pin_enabled && profile?.security_pin ? 'Encrypted Protection Active' : 'Basic Mode (Tap to setup)'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleTogglePin}
                  className={`w-10 h-5.5 rounded-full transition-all duration-500 relative ${profile?.pin_enabled && profile?.security_pin ? 'bg-[#00d293]' : 'bg-zinc-700'}`}
                >
                  <div className={`absolute top-1 w-3.5 h-3.5 rounded-full bg-white shadow-lg transition-all duration-500 ${profile?.pin_enabled && profile?.security_pin ? 'left-5.5' : 'left-1'}`}></div>
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-rose-500/10 to-rose-600/10 border border-rose-500/20 text-[11px] font-black text-rose-500 uppercase tracking-[0.2em] hover:from-rose-500/20 hover:to-rose-600/20 hover:border-rose-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg"
          >
            <i className="fa-solid fa-right-from-bracket text-[13px]"></i>
            Keluar Akun
          </button>
        </section>
      </div>

      {/* PIN Setup Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-full max-w-[320px] bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00d293]/50 to-transparent"></div>

            <h3 className="text-lg font-black text-white mb-2 text-center">Set Security PIN</h3>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center mb-8">Choose a 6-digit access key</p>

            <div className="space-y-6">
              <input
                type="text"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full h-16 bg-black rounded-2xl text-center text-3xl font-bold tracking-[0.4em] text-[#00d293] border border-white/5 focus:border-[#00d293]/40 outline-none transition-all"
                placeholder="••••••"
                autoFocus
              />

              <div className="flex gap-3">
                <button
                  onClick={() => { setIsPinModalOpen(false); setNewPin(''); }}
                  className="flex-1 h-12 rounded-xl text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-white transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={handleUpdatePin}
                  disabled={loading || newPin.length !== 6}
                  className="flex-1 h-12 bg-[#00d293] text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#00d293]/20 disabled:opacity-50 transition-all active:scale-95"
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
          <div className="w-full max-w-[340px] bg-zinc-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent"></div>

            {/* Glow effect */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-rose-500/20 blur-[80px] rounded-full pointer-events-none"></div>

            <div className="text-center mb-8 relative z-10">
              {/* Icon */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-600/20 border border-rose-500/30 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-rose-500/10">
                <i className="fa-solid fa-right-from-bracket text-3xl text-rose-500"></i>
              </div>

              {/* Title */}
              <h3 className="text-xl font-black text-white mb-3 tracking-tight">Keluar Akun?</h3>

              {/* Description */}
              <p className="text-[12px] font-medium text-zinc-400 leading-relaxed px-2">
                Anda yakin ingin keluar dari akun <span className="text-emerald-500 font-bold">ArtosKu</span>?
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 relative z-10">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 h-12 rounded-xl bg-zinc-800 border border-white/5 text-[11px] font-black text-zinc-300 uppercase tracking-widest hover:bg-zinc-700 hover:text-white hover:border-white/10 transition-all active:scale-95"
              >
                Batal
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 h-12 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/30 hover:shadow-rose-500/40 hover:from-rose-600 hover:to-rose-700 transition-all active:scale-95"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default Profile;
