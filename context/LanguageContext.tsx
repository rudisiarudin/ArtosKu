
import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from '../lib/translations';

interface LanguageContextType {
    lang: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [lang, setLang] = useState<Language>(() => {
        const saved = localStorage.getItem('artosku_lang');
        return (saved as Language) || 'id';
    });

    useEffect(() => {
        localStorage.setItem('artosku_lang', lang);
    }, [lang]);

    const t = (keyPath: string) => {
        const keys = keyPath.split('.');
        let result: any = translations[lang];

        for (const key of keys) {
            if (result && result[key] !== undefined) {
                result = result[key];
            } else {
                console.warn(`Translation key not found: ${keyPath} for language: ${lang}`);
                return keyPath;
            }
        }
        return result;
    };

    return (
        <LanguageContext.Provider value={{ lang, setLanguage: setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
