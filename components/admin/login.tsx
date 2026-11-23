"use client";

import Image from "next/image";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import { LocaleToggle, useLocale } from "@/components/locale";
import { Logo } from "@/components/logo";
import { asJson, errorCode, requestJson } from "@/lib/client";
import { errorLabel } from "@/lib/i18n";

export function Login() {
  const { locale } = useLocale();
  const sq = locale === "sq";
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const credentials = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError(undefined);
    try {
      await requestJson("/api/admin/session", asJson("POST", credentials));
      window.location.assign("/admin");
    } catch (failure) {
      setError(errorCode(failure));
      setBusy(false);
    }
  }

  return <div className="login-layout">
    <main className="login-main">
      <header><Logo/><LocaleToggle/></header>
      <section className="login-card">
        <div className="login-icon"><LockKeyhole size={22}/></div>
        <h1>{sq ? "Hyr në studio" : "Sign in to the studio"}</h1>
        <p>{sq ? "Menaxho rezervimet dhe portofolin e Go Production." : "Manage Go Production’s bookings and portfolio."}</p>
        <form className="form-grid" onSubmit={signIn}>
          <label className="field field-wide">Email<input name="email" type="email" autoComplete="username" required maxLength={254}/></label>
          <label className="field field-wide">{sq ? "Fjalëkalimi" : "Password"}<input name="password" type="password" autoComplete="current-password" required maxLength={512}/></label>
          {error && <p className="form-error field-wide" role="alert">{errorLabel(error, locale)}</p>}
          <button className="button button-primary field-wide" type="submit" disabled={busy}>{busy ? (sq ? "Duke hyrë…" : "Signing in…") : (sq ? "Hyr" : "Sign in")}</button>
        </form>
      </section>
      <a className="login-back" href="/"><ArrowLeft size={15}/>{sq ? "Kthehu te faqja" : "Back to the website"}</a>
    </main>
    <div className="login-photo"><Image src="/images/go-hero.webp" alt="" fill unoptimized priority sizes="55vw"/></div>
  </div>;
}
