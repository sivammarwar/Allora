import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { en } from "./translations/en";
import { hi } from "./translations/hi";
import { storage } from "./storage";

export type Lang = "en" | "hi";

const translations = { en, hi };

type ContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<ContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

function resolve(obj: Record<string, any>, path: string): string {
  const result = path.split(".").reduce<any>((acc, k) => acc?.[k], obj);
  return typeof result === "string" ? result : path;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    storage.get("bharat_lang").then((stored) => {
      if (stored === "hi" || stored === "en") setLangState(stored as Lang);
    });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    storage.set("bharat_lang", l);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let str = resolve(translations[lang] as any, key);
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(`{${k}}`, String(v));
        });
      }
      return str;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useT() {
  return useContext(LanguageContext).t;
}
