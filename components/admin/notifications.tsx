"use client";

import { Bell, Mail, MailOpen } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/components/locale";
import { asJson, errorCode, requestJson } from "@/lib/client";
import { formatTimestamp } from "@/lib/dates";
import { errorLabel, serviceLabel } from "@/lib/i18n";
import type { StudioNotification } from "@/lib/model";
import { EmptyState, ErrorState, LoadingState, Pagination, useResource } from "./ui";

type NotificationList = { items: StudioNotification[]; total: number; unread: number; page: number; pageSize: number };

export function Notifications({ version, onChanged, onOpen }: {
  version: number;
  onChanged: () => void;
  onOpen: (id: string) => void;
}) {
  const { locale } = useLocale();
  const sq = locale === "sq";
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const { data, error, reload } = useResource<NotificationList>(`/api/admin/notifications?page=${page}&unread=${Number(unreadOnly)}`, version);

  async function change(item?: StudioNotification, openBooking = false) {
    if (openBooking && item?.readAt) { onOpen(item.bookingId); return; }
    setBusy(true);
    setActionError(undefined);
    try {
      if (item) await requestJson(`/api/admin/notifications/${item.id}`, asJson("PATCH", { read: !item.readAt }));
      else await requestJson("/api/admin/notifications", { method: "PATCH" });
      onChanged();
      if (openBooking && item) onOpen(item.bookingId);
    } catch (failure) { setActionError(errorCode(failure)); }
    finally { setBusy(false); }
  }

  return <section className="admin-panel notifications-panel">
    <div className="panel-title">
      <div className="segments" aria-label={sq ? "Filtro njoftimet" : "Filter notifications"} role="group">
        <button type="button" aria-pressed={!unreadOnly} onClick={() => { setUnreadOnly(false); setPage(1); }}>{sq ? "Të gjitha" : "All"}</button>
        <button type="button" aria-pressed={unreadOnly} onClick={() => { setUnreadOnly(true); setPage(1); }}>{sq ? "Të palexuara" : "Unread"}</button>
      </div>
      <button type="button" className="button button-secondary" disabled={busy || !data?.unread} onClick={() => change()}>
        <MailOpen size={16}/>{sq ? "Lexoji të gjitha" : "Mark all as read"}
      </button>
    </div>
    {actionError && <p className="form-error" role="alert">{errorLabel(actionError, locale)}</p>}
    {error ? <ErrorState code={error} retry={reload}/> : !data ? <LoadingState/> : data.items.length ? <>
      <ul className="notification-list">
        {data.items.map((item) => <li className={item.readAt ? "" : "notice-unread"} key={item.id}>
          <span className="notification-icon"><Bell size={19}/></span>
          <button className="notification-copy" type="button" disabled={busy} onClick={() => change(item, true)}>
            <strong>{item.name}</strong>
            <span>{sq ? "Kërkesë e re" : "New booking request"} · {serviceLabel(item.service, locale)}</span>
          </button>
          <time dateTime={item.createdAt}>{formatTimestamp(item.createdAt, locale)}</time>
          <button type="button" className="icon-button" disabled={busy}
            aria-label={item.readAt ? (sq ? "Shëno si të palexuar" : "Mark as unread") : (sq ? "Shëno si të lexuar" : "Mark as read")}
            onClick={() => change(item)}>{item.readAt ? <Mail size={17}/> : <MailOpen size={17}/>}</button>
        </li>)}
      </ul>
      <Pagination {...data} onChange={setPage}/>
    </> : <EmptyState title={sq ? (unreadOnly ? "S’ka njoftime të palexuara" : "Ende s’ka njoftime")
      : (unreadOnly ? "No unread notifications" : "No notifications yet")}
      detail={unreadOnly ? undefined : (sq ? "Kërkesat nga faqja shfaqen këtu." : "Website booking requests appear here.")}/>}
  </section>;
}
