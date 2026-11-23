"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { localeCookie } from "@/lib/i18n";
import type { Locale } from "@/lib/model";

const LocaleContext = createContext<{ locale: Locale; change: (locale: Locale) => void }>({ locale: "sq", change: () => {} });

export function LocaleProvider({ initial, children }: { initial: Locale; children: ReactNode }) {
  const [locale, setLocale] = useState(initial);
  function change(value: Locale) {
    setLocale(value);
    document.documentElement.lang = value;
    document.cookie = `${localeCookie}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }
  return <LocaleContext.Provider value={{ locale, change }}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);

export function LocaleToggle() {
  const { locale, change } = useLocale();
  return (
    <div className="locale-toggle" role="group" aria-label={locale === "sq" ? "Gjuha" : "Language"}>
      <button type="button" lang="sq" aria-label="Shqip" aria-pressed={locale === "sq"} onClick={() => change("sq")}>SQ</button>
      <button type="button" lang="en" aria-label="English" aria-pressed={locale === "en"} onClick={() => change("en")}>EN</button>
    </div>
  );
}
