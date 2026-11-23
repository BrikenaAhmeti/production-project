"use client";

import { ChevronLeft, ChevronRight, Inbox, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale";
import { errorCode, requestJson } from "@/lib/client";
import { common, errorLabel, statusLabel } from "@/lib/i18n";
import type { BookingStatus } from "@/lib/model";

export function useResource<T>(url: string, version = 0) {
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>();
  const [refresh, setRefresh] = useState(0);
  const key = `${url}|${version}|${refresh}`;
  useEffect(() => {
    const abort = new AbortController();
    requestJson<T>(url, { signal: abort.signal }).then(
      (data) => { if (!abort.signal.aborted) setState({ key, data }); },
      (error) => { if (!abort.signal.aborted) setState({ key, error: errorCode(error) }); },
    );
    return () => abort.abort();
  }, [url, key]);
  return { data: state?.key === key ? state.data : undefined,
    error: state?.key === key ? state.error : undefined, reload: () => setRefresh((count) => count + 1) };
}

export function LoadingState() {
  const { locale } = useLocale();
  return <div className="admin-state" role="status"><LoaderCircle className="spin" size={20}/>{common[locale].loading}</div>;
}

export function ErrorState({ code, retry }: { code: string; retry: () => void }) {
  const { locale } = useLocale();
  return <div className="admin-state" role="alert">
    <span>{errorLabel(code, locale)}</span>
    <button type="button" className="button button-secondary" onClick={retry}>{common[locale].retry}</button>
  </div>;
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return <div className="admin-state admin-empty">
    <span className="empty-icon"><Inbox size={21}/></span>
    <strong>{title}</strong>
    {detail && <span>{detail}</span>}
  </div>;
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const { locale } = useLocale();
  return <span className={`status-pill status-${status}`}><i aria-hidden="true"/>{statusLabel(status, locale)}</span>;
}

export function Pagination({ page, pageSize, total, onChange }: {
  page: number; pageSize: number; total: number; onChange: (page: number) => void;
}) {
  const { locale } = useLocale();
  if (!total) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="table-pagination">
    <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} {locale === "sq" ? "nga" : "of"} {total}</span>
    {pages > 1 && <div>
      <button type="button" className="icon-button" disabled={page <= 1} aria-label={common[locale].previous} onClick={() => onChange(page - 1)}><ChevronLeft size={16}/></button>
      <span>{page} / {pages}</span>
      <button type="button" className="icon-button" disabled={page >= pages} aria-label={common[locale].next} onClick={() => onChange(page + 1)}><ChevronRight size={16}/></button>
    </div>}
  </div>;
}
