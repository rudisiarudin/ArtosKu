import React, { useState } from 'react';
import { Dream, Wallet } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Target, CheckCircle2, MoreVertical, Trash2, Edit3, Heart, X } from 'lucide-react';
import { createDream, updateDream, deleteDream } from '../lib/database';

const ICONS = ['star', 'plane', 'car', 'house', 'ring', 'graduation-cap', 'heart', 'baby'];
const COLORS = ['#10b981', '#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899'];

interface DreamsManagementProps {
  dreams: Dream[];
  setDreams: React.Dispatch<React.SetStateAction<Dream[]>>;
  theme: 'light' | 'dark';
  isMobile: boolean;
  session: any;
  wallets: Wallet[];
}

const DreamsManagement: React.FC<DreamsManagementProps> = ({ dreams, setDreams, theme, isMobile, session, wallets }) => {
  const { lang } = useLanguage();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const text = {
    title: 'Financial Dreams',
    subtitle: lang === 'id' ? 'Alokasikan asetmu untuk target masa depan. Uangmu tetap di dompet, tapi secara virtual sudah ter-booking untuk mimpimu.' : 'Allocate your assets for future goals. Your money stays in your wallet, but is virtually booked for your dreams.',
    btnNew: lang === 'id' ? 'Buat Target Baru' : 'Create New Dream',
    totalAvail: lang === 'id' ? 'Total Aset Tersedia (Belum Dialokasikan)' : 'Total Available Assets (Unallocated)',
    totalAlloc: lang === 'id' ? 'Total Teralokasi ke Dreams' : 'Total Allocated to Dreams',
    emptyTitle: lang === 'id' ? 'Belum ada target' : 'No dreams yet',
    emptySub: lang === 'id' ? 'Mulai rencanakan masa depanmu, seperti biaya menikah atau liburan.' : 'Start planning your future, like wedding costs or vacations.',
    deadline: lang === 'id' ? 'Tenggat' : 'Deadline',
    collected: lang === 'id' ? 'Terkumpul' : 'Collected',
    from: lang === 'id' ? 'dari' : 'of',
    add: lang === 'id' ? '+ Tambah' : '+ Add',
    confirmDelete: lang === 'id' ? 'Apakah Anda yakin ingin menghapus target ini?' : 'Are you sure you want to delete this dream?',
    promptAdd: lang === 'id' ? 'Berapa dana yang ingin ditambahkan ke' : 'How much funds do you want to add to',
    promptSub: lang === 'id' ? 'Berapa dana yang ingin ditarik dari' : 'How much funds do you want to withdraw from',
    errNotEnough: lang === 'id' ? 'Dana tersedia tidak cukup! Kamu hanya bisa mengalokasikan maksimal' : 'Not enough funds available! You can only allocate a maximum of',
    errMax: lang === 'id' ? 'Tidak bisa menarik lebih dari yang terkumpul!' : 'Cannot withdraw more than collected!',
    modalTitle: lang === 'id' ? 'Target Baru' : 'New Dream',
    modalName: lang === 'id' ? 'Nama Target' : 'Dream Name',
    modalTarget: lang === 'id' ? 'Jumlah Target (Rp)' : 'Target Amount (Rp)',
    modalDeadline: lang === 'id' ? 'Tenggat Waktu' : 'Deadline',
    modalColor: lang === 'id' ? 'Pilih Warna' : 'Select Color',
    modalIcon: lang === 'id' ? 'Pilih Icon' : 'Select Icon',
    modalCancel: lang === 'id' ? 'Batal' : 'Cancel',
    modalSave: lang === 'id' ? 'Simpan Target' : 'Save Dream',
  };
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [targetAmountStr, setTargetAmountStr] = useState('');
  
  // Custom Modals State
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; dreamId: string | null }>({ isOpen: false, dreamId: null });
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setTargetAmountStr('');
      return;
    }
    const formatted = new Intl.NumberFormat('id-ID').format(Number(rawValue));
    setTargetAmountStr(formatted);
  };

  // Calculate total net worth
  const totalNetWorth = wallets.reduce((sum, w) => sum + Number(w.balance), 0);
  
  // Auto-allocate logic (Waterfall based on array order)
  let remainingAssetForAllocation = totalNetWorth;
  const autoAllocatedDreams = dreams.map(dream => {
    const target = Number(dream.target_amount);
    const allocated = Math.min(Math.max(0, remainingAssetForAllocation), target);
    remainingAssetForAllocation -= allocated;
    return { ...dream, auto_current_amount: allocated };
  });

  const totalAllocated = dreams.reduce((sum, d) => sum + Number(d.target_amount), 0);
  const availableToAllocate = totalNetWorth - totalAllocated;

  const handleAddDream = async (dreamData: any) => {
    try {
      const newDream = await createDream(session.user.id, dreamData);
      setDreams(prev => [newDream, ...prev]);
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error creating dream:', error);
      alert('Failed to create dream');
    }
  };

  const handleUpdateDream = async (id: string, updates: Partial<Dream>) => {
    try {
      const updated = await updateDream(id, updates);
      setDreams(prev => prev.map(d => d.id === id ? updated : d));
      setSelectedDream(null);
    } catch (error) {
      console.error('Error updating dream:', error);
      alert('Failed to update dream');
    }
  };

  const handleDeleteDream = async (id: string) => {
    try {
      await deleteDream(id);
      setDreams(prev => prev.filter(d => d.id !== id));
      setDeleteModal({ isOpen: false, dreamId: null });
    } catch (error) {
      console.error('Error deleting dream:', error);
      setErrorModal({ isOpen: true, message: 'Failed to delete dream' });
    }
  };

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className={`flex flex-col min-h-screen pb-36 bg-background animate-in fade-in duration-500`}>
      <header className="sticky top-0 left-0 right-0 z-50 px-6 pt-[calc(1.5rem+env(safe-area-inset-top,24px))] pb-4 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em]">Target Masa Depan</p>
            <h2 className="text-[20px] font-bold text-foreground tracking-tight flex items-center gap-2">
              <Target className="w-5 h-5" />
              {text.title}
            </h2>
          </div>
          <button 
            onClick={() => {
              setSelectedDream(null);
              setTargetAmountStr('');
              setIsAddModalOpen(true);
            }}
            className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-5 h-5 font-black" />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto w-full px-5">
        <div className="mt-6 mb-8 grid grid-cols-2 gap-3">
          <div className="bg-card p-4 rounded-2xl border border-border shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl -mr-10 -mt-10 pointer-events-none"></div>
            <p className="text-[9px] font-bold tracking-[0.1em] text-muted-foreground mb-1 uppercase">{text.totalAvail}</p>
            <p className={`text-lg font-black tracking-tight ${availableToAllocate < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {formatIDR(availableToAllocate)}
            </p>
          </div>
          <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
            <p className="text-[9px] font-bold tracking-[0.1em] text-muted-foreground mb-1 uppercase">{text.totalAlloc}</p>
            <p className="text-lg font-black tracking-tight text-foreground">
              {formatIDR(totalAllocated)}
            </p>
          </div>
        </div>

        {/* Dreams List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dreams.length === 0 ? (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-3xl bg-muted/20">
              <Heart className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-black mb-2 text-foreground">{text.emptyTitle}</h3>
              <p className="text-muted-foreground">{text.emptySub}</p>
            </div>
          ) : (
            autoAllocatedDreams.map(dream => {
              const progress = Math.min((dream.auto_current_amount / Number(dream.target_amount)) * 100, 100);
              const isCompleted = progress >= 100;
              
              return (
                <div key={dream.id} className={`bg-card border ${isCompleted ? 'border-emerald-500/50' : 'border-border'} rounded-[24px] p-5 shadow-sm relative overflow-hidden group`}>
                  {isCompleted && (
                    <div className="absolute inset-0 bg-emerald-500/5 z-0 pointer-events-none"></div>
                  )}

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm border border-border/50" style={{ backgroundColor: `${dream.color}15`, color: dream.color }}>
                          <i className={`fa-solid fa-${dream.icon}`}></i>
                        </div>
                        <div>
                          <h3 className="text-sm font-black flex items-center gap-1.5 text-foreground tracking-tight">
                            {dream.title}
                            {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          </h3>
                          {dream.deadline && (
                            <p className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase mt-0.5">
                              {text.deadline}: {new Date(dream.deadline).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
                        <button 
                          onClick={() => {
                            setSelectedDream(dream);
                            setTargetAmountStr(new Intl.NumberFormat('id-ID').format(Number(dream.target_amount)));
                            setSelectedIcon(dream.icon);
                            setSelectedColor(dream.color);
                            setIsAddModalOpen(true);
                          }}
                          className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
                        >
                          Edit
                        </button>
                        <div className="w-px h-3 bg-border"></div>
                        <button 
                          onClick={() => setDeleteModal({ isOpen: true, dreamId: dream.id })}
                          className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-wider"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 bg-muted/10 rounded-2xl p-4 border border-border/30">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-1">Otomatis Terisi</p>
                          <p className="text-xl font-black text-emerald-500 tracking-tight leading-none">{formatIDR(dream.auto_current_amount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-1">Target Total</p>
                          <p className="text-sm font-black text-foreground tracking-tight leading-none">{formatIDR(Number(dream.target_amount))}</p>
                        </div>
                      </div>
                      
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden shadow-inner border border-border/50">
                        <div 
                          className="h-full rounded-full transition-all duration-1000 relative"
                          style={{ 
                            width: `${progress}%`,
                            backgroundColor: dream.color,
                            boxShadow: `0 0 10px ${dream.color}40`
                          }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] font-bold tracking-wider mt-3">
                        <span className="text-muted-foreground uppercase">{progress.toFixed(1)}% Tercapai</span>
                        {Number(dream.target_amount) > dream.auto_current_amount && (
                          <span className="text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">
                            Kurang: -{formatIDR(Number(dream.target_amount) - dream.auto_current_amount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Simple Add Dream Modal - normally extracted to separate component */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-[32px] p-6 md:p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 fade-in duration-500 relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-[60px] rounded-full -mr-24 -mt-24 pointer-events-none transition-colors duration-1000" style={{ backgroundColor: `${selectedColor}20` }}></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 blur-[40px] rounded-full -ml-16 -mb-16 pointer-events-none transition-colors duration-1000" style={{ backgroundColor: `${selectedColor}10` }}></div>
            
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h2 className="text-2xl font-black tracking-tighter text-foreground">{selectedDream ? 'Edit Target' : text.modalTitle}</h2>
              <button type="button" aria-label="Tutup" onClick={() => setIsAddModalOpen(false)} className="size-8 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const data = {
                title: fd.get('title') as string,
                target_amount: Number(targetAmountStr.replace(/\D/g, '')),
                deadline: fd.get('deadline') as string,
                color: selectedColor,
                icon: selectedIcon
              };
              if (selectedDream) {
                handleUpdateDream(selectedDream.id, data);
              } else {
                handleAddDream(data);
              }
              setIsAddModalOpen(false);
            }} className="space-y-5 relative z-10">
              
              <div>
                <label className="block text-[9px] font-black text-muted-foreground mb-2 uppercase tracking-[0.2em] ml-1">{text.modalName}</label>
                <input required name="title" defaultValue={selectedDream?.title || ''} type="text" placeholder={lang === 'id' ? "Contoh: Biaya Menikah" : "e.g. Wedding Cost"} className="w-full bg-muted/40 border border-border hover:border-primary/30 rounded-2xl px-5 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm text-foreground placeholder:text-muted-foreground" />
              </div>

              <div>
                <label className="block text-[9px] font-black text-muted-foreground mb-2 uppercase tracking-[0.2em] ml-1">{text.modalTarget}</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-sm">Rp</span>
                  <input 
                    required 
                    name="target" 
                    type="text" 
                    value={targetAmountStr}
                    onChange={handleTargetChange}
                    placeholder="25.000.000" 
                    className="w-full bg-muted/40 border border-border hover:border-primary/30 rounded-2xl pl-12 pr-5 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-black text-lg tracking-wider text-foreground placeholder:text-muted-foreground" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-muted-foreground mb-2 uppercase tracking-[0.2em] ml-1">{text.modalDeadline}</label>
                <input required name="deadline" defaultValue={selectedDream?.deadline ? new Date(selectedDream.deadline).toISOString().split('T')[0] : ''} type="date" className="w-full bg-muted/40 border border-border hover:border-primary/30 rounded-2xl px-5 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark]" />
              </div>
              
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-[9px] font-black text-muted-foreground mb-2 uppercase tracking-[0.2em] ml-1">{text.modalIcon}</label>
                  <div className="flex gap-3 overflow-x-auto py-2 px-2 -mx-2 no-scrollbar">
                    {ICONS.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setSelectedIcon(icon)}
                        className={`size-10 shrink-0 rounded-[14px] flex items-center justify-center text-sm transition-all border ${
                          selectedIcon === icon 
                            ? 'bg-primary/10 border-primary text-primary scale-110 shadow-sm' 
                            : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <i className={`fa-solid fa-${icon}`}></i>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-muted-foreground mb-2 uppercase tracking-[0.2em] ml-1">{text.modalColor}</label>
                  <div className="flex gap-3 overflow-x-auto py-2 px-2 -mx-2 no-scrollbar">
                    {COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`size-8 shrink-0 rounded-full transition-all border-2 relative ${
                          selectedColor === color 
                            ? 'border-foreground scale-110 shadow-md' 
                            : 'border-transparent hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                         {selectedColor === color && (
                           <div className="absolute inset-0 m-auto size-2 rounded-full bg-white"></div>
                         )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  type="submit" 
                  className="w-full py-4 rounded-2xl text-white font-black transition-all active:scale-95 uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 overflow-hidden relative group"
                  style={{ backgroundColor: selectedColor }}
                >
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                  <span className="relative z-10 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> {text.modalSave}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto-allocated dreams no longer require manual allocation modals */}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-[32px] p-6 md:p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 fade-in duration-300 relative overflow-hidden text-center">
             <div className="w-16 h-16 mx-auto bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6">
                <Trash2 className="w-8 h-8" />
             </div>
             <h2 className="text-xl font-black tracking-tighter text-foreground mb-2">Hapus Target?</h2>
             <p className="text-muted-foreground text-sm mb-8">{text.confirmDelete}</p>
             <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setDeleteModal({ isOpen: false, dreamId: null })}
                  className="flex-1 py-4 rounded-2xl bg-muted hover:bg-muted/70 text-foreground font-bold transition-all uppercase tracking-[0.1em] text-[10px]"
                >
                  Batal
                </button>
                <button 
                  onClick={() => deleteModal.dreamId && handleDeleteDream(deleteModal.dreamId)}
                  className="flex-1 py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)] font-black transition-all active:scale-95 uppercase tracking-[0.1em] text-[10px]"
                >
                  Hapus
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Error Alert Modal */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[300] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-[32px] p-6 md:p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 fade-in duration-300 relative overflow-hidden text-center">
             <div className="w-16 h-16 mx-auto bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-6">
                <i className="fa-solid fa-triangle-exclamation text-3xl"></i>
             </div>
             <h2 className="text-xl font-black tracking-tighter text-foreground mb-2">Oops!</h2>
             <p className="text-muted-foreground text-sm mb-8">{errorModal.message}</p>
             <button 
               type="button"
               onClick={() => setErrorModal({ isOpen: false, message: '' })}
               className="w-full py-4 rounded-2xl bg-muted hover:bg-muted/70 text-foreground font-black transition-all active:scale-95 uppercase tracking-[0.1em] text-[10px]"
             >
               Mengerti
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DreamsManagement;
