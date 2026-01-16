import React, { useState, useEffect } from 'react';

interface PinScreenProps {
    onVerify: (pin: string) => Promise<boolean>;
    onLogout: () => void;
    title?: string;
    description?: string;
}

const PinScreen: React.FC<PinScreenProps> = ({
    onVerify,
    onLogout,
    title = "Input PIN Keamanan",
    description = "Masukkan 6 digit PIN untuk mengakses akun"
}) => {
    const [pin, setPin] = useState<string[]>([]);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleKeyClick = (num: string) => {
        if (pin.length < 6) {
            setPin(prev => [...prev, num]);
            setError(false);
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
        setError(false);
    };

    useEffect(() => {
        if (pin.length === 6) {
            verifyPin();
        }
    }, [pin]);

    const verifyPin = async () => {
        setLoading(true);
        const isValid = await onVerify(pin.join(''));
        if (!isValid) {
            setError(true);
            setPin([]);
            // Haptic-like feedback could be added here
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-6 select-none font-['Inter']">
            {/* Background Glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#00d293]/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-[360px] relative z-10 flex flex-col items-center text-center">
                {/* Header */}
                <div className="mb-12">
                    <div className="w-20 h-20 rounded-[2rem] bg-zinc-900 border border-white/5 flex items-center justify-center mb-6 shadow-2xl relative group lg:animate-float">
                        <div className="absolute inset-0 bg-[#00d293]/10 blur-2xl rounded-full opacity-50"></div>
                        <i className={`fa-solid ${error ? 'fa-lock-open text-rose-500' : 'fa-lock text-[#00d293]'} text-2xl z-10 transition-colors`}></i>
                    </div>
                    <h1 className="text-[24px] font-black tracking-tighter text-white mb-2">{title}</h1>
                    <p className={`text-[9px] font-bold uppercase tracking-[0.2em] px-4 transition-colors ${error ? 'text-rose-500' : 'text-zinc-500'}`}>
                        {error ? "PIN Salah. Silakan coba lagi." : description}
                    </p>
                </div>

                {/* PIN Indicators */}
                <div className="flex gap-4 mb-16 h-4 items-center">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-3.5 h-3.5 rounded-full transition-all duration-300 border shadow-[0_0_10px_rgba(0,0,0,0.5)]
                                ${pin.length > i
                                    ? 'bg-[#00d293] border-[#00d293] scale-125 shadow-[0_0_15px_rgba(0,210,147,0.4)]'
                                    : 'bg-zinc-800 border-white/5 scale-100'
                                }
                                ${error ? 'bg-rose-500 border-rose-500 animate-shake' : ''}
                            `}
                        />
                    ))}
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                        <button
                            key={num}
                            onClick={() => handleKeyClick(num)}
                            disabled={loading}
                            className="aspect-square rounded-full flex flex-col items-center justify-center text-2xl font-bold border border-white/5 bg-zinc-900/40 hover:bg-zinc-800 active:scale-90 active:bg-[#00d293] active:text-black transition-all backdrop-blur-md"
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        onClick={onLogout}
                        className="aspect-square rounded-full flex flex-col items-center justify-center text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-rose-500 transition-colors"
                    >
                        Sign Out
                    </button>
                    <button
                        onClick={() => handleKeyClick('0')}
                        disabled={loading}
                        className="aspect-square rounded-full flex flex-col items-center justify-center text-2xl font-bold border border-white/5 bg-zinc-900/40 hover:bg-zinc-800 active:scale-90 active:bg-[#00d293] active:text-black transition-all backdrop-blur-md"
                    >
                        0
                    </button>
                    <button
                        onClick={handleDelete}
                        className="aspect-square rounded-full flex flex-col items-center justify-center text-zinc-500 hover:text-white active:scale-90 transition-all"
                    >
                        <i className="fa-solid fa-backspace"></i>
                    </button>
                </div>

                {/* Status Bar Indicator */}
                <div className="mt-16 text-[9px] font-bold text-zinc-700 uppercase tracking-[0.3em]">
                    Secured by ArtosKu
                </div>
            </div>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.2s cubic-bezier(.36,.07,.19,.97) both;
                    transform: translate3d(0, 0, 0);
                }
            `}</style>
        </div>
    );
};

export default PinScreen;
