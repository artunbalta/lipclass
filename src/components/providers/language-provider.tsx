'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from '@/lib/i18n/translations';

type Translations = typeof translations.tr;

// Helper to access nested properties by string path (e.g. 'common.save')
function getNestedValue(obj: any, path: string): string {
    return path.split('.').reduce((prev, curr) => {
        return prev ? prev[curr] : null;
    }, obj) || path;
}

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    favorites: Translations; // Current language translations
    t: (key: string) => string; // Helper for nested keys
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('tr');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const savedLang = localStorage.getItem('lipclass-language') as Language;
        if (savedLang && (savedLang === 'tr' || savedLang === 'en')) {
            setLanguageState(savedLang);
        }
        setMounted(true);
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('lipclass-language', lang);
    };

    const t = (key: string) => {
        return getNestedValue(translations[language], key);
    };

    const value = {
        language,
        setLanguage,
        favorites: translations[language],
        t,
    };

    if (!mounted) {
        return null; // Prevent hydration mismatch
    }

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
