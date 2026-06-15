import React, { useState, useEffect } from 'react';
import { NativeBiometric } from 'capacitor-native-biometric';

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
    const [biometricAvailable, setBiometricAvailable] = useState(false);

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
        checkBiometricAvailability();
    }, []);

    const checkBiometricAvailability = async () => {
        try {
            const result = await NativeBiometric.isAvailable();
            if (result.isAvailable) {
                setBiometricAvailable(true);
                const isEnabled = localStorage.getItem('biometric_enabled') === 'true';
                if (isEnabled) {
                    performBiometricVerification();
                }
            }
        } catch (error) {
            console.error('Biometric not available', error);
        }
    };

    const performBiometricVerification = async () => {
        try {
            const verified = await NativeBiometric.verifyIdentity({
                reason: "Log in with your biometric credential",
                title: "Security Check",
                subtitle: "Confirm identity",
                description: "Touch the sensor to continue",
            }).then(() => true).catch(() => false);

            if (verified) {
                // Signal success to App.tsx via a special token
                onVerify('BIOMETRIC_PASS');
            }
        } catch (error) {
            console.error("Biometric failed", error);
        }
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
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-[var(--bg-deep)] flex flex-col items-center justify-center p-6 select-none">
            {/* Background Glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#00d293]/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-[360px] relative z-10 flex flex-col items-center text-center">
                {/* Header */}
                <div className="mb-10">
                    <div className="w-16 h-16 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center mb-6 shadow-2xl relative group mx-auto"
                        onClick={() => biometricAvailable && performBiometricVerification()}>
                        <div className="absolute inset-0 bg-[#00d293]/10 blur-xl rounded-full opacity-50"></div>
                        <i className={`fa-solid ${error ? 'fa-lock-open text-rose-500' : 'fa-lock text-[#00d293]'} text-xl z-10 transition-colors`}></i>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2">{title}</h1>
                    <p className={`text-xs font-medium px-4 transition-colors ${error ? 'text-rose-500' : 'text-[var(--text-muted)] opacity-60'}`}>
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
                                    : 'bg-[rgba(var(--bg-inner-rgb),0.5)] border-[var(--border-subtle)] scale-100'
                                }
                                ${error ? 'bg-rose-500 border-rose-500 animate-shake' : ''}
                            `}
                        />
                    ))}
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-y-4 gap-x-8 w-full max-w-[280px] items-center justify-items-center">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                        <button
                            key={num}
                            onClick={() => handleKeyClick(num)}
                            disabled={loading}
                            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-medium text-[var(--text-primary)] hover:bg-[var(--bg-card)] active:bg-[var(--bg-inner)] active:scale-95 transition-all"
                        >
                            {num}
                        </button>
                    ))}

                    {biometricAvailable ? (
                        <button
                            onClick={performBiometricVerification}
                            className="w-16 h-16 rounded-full flex items-center justify-center text-emerald-500 hover:text-emerald-400 hover:bg-white/5 active:bg-white/10 active:scale-95 transition-all"
                        >
                            <i className="fa-solid fa-fingerprint text-3xl"></i>
                        </button>
                    ) : (
                        <button
                            onClick={onLogout}
                            className="w-16 h-16 rounded-full flex flex-col items-center justify-center text-[10px] font-bold tracking-widest text-[var(--text-muted)] opacity-50 hover:text-[var(--text-primary)] hover:opacity-100 hover:bg-[var(--bg-card)] active:bg-[var(--bg-inner)] active:scale-95 transition-all text-center leading-tight gap-0.5"
                        >
                            <span>Sign</span>
                            <span>out</span>
                        </button>
                    )}

                    <button
                        onClick={() => handleKeyClick('0')}
                        disabled={loading}
                        className="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-medium text-[var(--text-primary)] hover:bg-[var(--bg-card)] active:bg-[var(--bg-inner)] active:scale-95 transition-all"
                    >
                        0
                    </button>
                    <button
                        onClick={handleDelete}
                        className="w-16 h-16 rounded-full flex items-center justify-center text-[var(--text-muted)] opacity-50 hover:opacity-100 hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] active:bg-[var(--bg-inner)] active:scale-95 transition-all"
                    >
                        <i className="fa-solid fa-delete-left text-2xl"></i>
                    </button>
                </div>

                {/* Footer Actions */}
                {biometricAvailable && (
                    <button onClick={onLogout} className="mt-12 text-[10px] font-bold tracking-widest text-zinc-600 hover:text-rose-500">
                        Sign out
                    </button>
                )}

                {/* Status Bar Indicator */}
                <div className="mt-6 text-[9px] font-bold text-[var(--text-muted)] tracking-[0.3em] opacity-50">
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
