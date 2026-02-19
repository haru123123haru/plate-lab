"use client";

import { createContext, useContext, useCallback } from "react";
import type { Locale, TranslationKey } from "@/lib/i18n";
import { t as translate } from "@/lib/i18n";

const LocaleContext = createContext<Locale>("en");

interface LocaleProviderProps {
  locale: Locale;
  children: React.ReactNode;
}

export function LocaleProvider({ locale, children }: LocaleProviderProps) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useTranslation() {
  const locale = useContext(LocaleContext);
  const t = useCallback(
    (key: TranslationKey) => translate(locale, key),
    [locale]
  );
  return { t, locale };
}
