"use client";

import { ChevronRight, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { DatePicker, SelectMenu } from "@/components/controls";
import { useLocale } from "@/components/locale";
import { formatDate } from "@/lib/dates";
import { common, errorLabel, serviceLabel, statusLabel } from "@/lib/i18n";
import { services, statuses, type Booking, type BookingList, type BookingStatus, type Service } from "@/lib/model";
import { EmptyState, ErrorState, LoadingState, Pagination, StatusBadge, useResource } from "./ui";

export type BookingDates = { mode: "any" | "day" | "range"; from: string; to: string };
export const anyDate: BookingDates = { mode: "any", from: "", to: "" };

export function BookingTable({ bookings, onOpen, compact = false }: {
  bookings: Booking[];
  onOpen: (id: string) => void;
  compact?: boolean;
}) {
  const { locale } = useLocale();
  const sq = locale === "sq";
  const t = common[locale];
  return <div className="table-scroll">
    <table className={`admin-table ${compact ? "admin-table-compact" : ""}`}>
      <thead><tr>
        <th scope="col">{sq ? "Klienti" : "Client"}</th>
        <th scope="col">{t.service}</th>
        <th scope="col">{t.date}</th>
        <th scope="col">{sq ? "Gjendja" : "Status"}</th>
        {!compact && <th scope="col">{sq ? "Burimi" : "Source"}</th>}
        <th scope="col"><span className="sr-only">{sq ? "Detajet" : "Details"}</span></th>
      </tr></thead>
      <tbody>{bookings.map((item) => <tr key={item.id}>
        <td><button type="button" className="table-name" onClick={() => onOpen(item.id)}>{item.name}</button>
          {!compact && (item.email || item.phone) && <small>{item.email || item.phone}</small>}</td>
        <td>{serviceLabel(item.service, locale)}</td>
        <td className="cell-nowrap">{formatDate(item.eventDate, locale)}</td>
        <td><StatusBadge status={item.status}/></td>
        {!compact && <td><span className="source-pill">{item.source === "website" ? (sq ? "Faqja" : "Website") : (sq ? "Manual" : "Manual")}</span></td>}
        <td className="table-detail"><button type="button" className="icon-button" aria-label={sq ? `Hap rezervimin e ${item.name}` : `Open booking for ${item.name}`} onClick={() => onOpen(item.id)}><ChevronRight size={17}/></button></td>
      </tr>)}</tbody>
    </table>
  </div>;
}

export function Bookings({ dates: initialDates, version, onOpen }: {
  dates: BookingDates;
  version: number;
  onOpen: (id: string) => void;
}) {
  const { locale } = useLocale();
  const sq = locale === "sq";
  const t = common[locale];
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [service, setService] = useState<Service | "all">("all");
  const [status, setStatus] = useState<BookingStatus | "all">("all");
  const [dates, setDates] = useState<BookingDates>(initialDates);
  const [page, setPage] = useState(1);
  const filtering = Boolean(search || service !== "all" || status !== "all" || dates.mode !== "any");
  const invalidRange = dates.mode === "range" && dates.from && dates.to && dates.from > dates.to;

  useEffect(() => {
    const timeout = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 240);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set("q", query);
  if (service !== "all") params.set("service", service);
  if (status !== "all") params.set("status", status);
  if (dates.mode === "day" && dates.from) params.set("on", dates.from);
  if (dates.mode === "range" && !invalidRange) {
    if (dates.from) params.set("from", dates.from);
    if (dates.to) params.set("to", dates.to);
  }
  const { data, error, reload } = useResource<BookingList>(`/api/admin/bookings?${params}`, version);

  function dateChange(next: Partial<BookingDates>) { setDates({ ...dates, ...next }); setPage(1); }
  function reset() {
    setSearch(""); setQuery(""); setService("all"); setStatus("all"); setDates(anyDate); setPage(1);
  }

  return <section className="admin-panel bookings-panel">
    <div className="booking-filters">
      <label className="search-field">
        <Search size={16}/>
        <input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={120}
          aria-label={sq ? "Kërko sipas emrit, emailit ose telefonit" : "Search by name, email, or phone"}
          placeholder={sq ? "Kërko emër, email ose telefon" : "Search name, email, or phone"}/>
      </label>
      <SelectMenu label={t.service} value={service} onChange={(value) => { setService(value); setPage(1); }}
        options={[{ value: "all", label: sq ? "Të gjitha shërbimet" : "All services" }, ...services.map((value) => ({
          value, label: serviceLabel(value, locale),
        }))]}/>
      <SelectMenu label={sq ? "Gjendja" : "Status"} value={status} onChange={(value) => { setStatus(value); setPage(1); }}
        options={[{ value: "all", label: sq ? "Të gjitha gjendjet" : "All statuses" }, ...statuses.map((value) => ({
          value, label: statusLabel(value, locale),
        }))]}/>
      <SelectMenu<BookingDates["mode"]> label={t.date} value={dates.mode} onChange={(mode) => dateChange({ mode, from: "", to: "" })}
        options={[
          { value: "any", label: sq ? "Çdo datë" : "Any date" },
          { value: "day", label: sq ? "Datë e caktuar" : "Specific date" },
          { value: "range", label: sq ? "Interval datash" : "Date range" },
        ]}/>
    </div>
    {dates.mode !== "any" && <div className="booking-date-filters">
      <DatePicker label={dates.mode === "day" ? t.date : (sq ? "Nga data" : "From date")}
        value={dates.from} onChange={(from) => dateChange({ from, to: dates.to && from > dates.to ? "" : dates.to })} canClear/>
      {dates.mode === "range" && <DatePicker label={sq ? "Deri më" : "To date"} value={dates.to}
        onChange={(to) => dateChange({ to })} min={dates.from || undefined} canClear/>}
    </div>}
    {filtering && <div className="clear-filters"><button className="text-button" type="button" onClick={reset}>{sq ? "Pastro filtrat" : "Clear filters"}</button></div>}
    {invalidRange ? <p role="alert" className="form-error">{errorLabel("to", locale)}</p> : error ? <ErrorState code={error} retry={reload}/>
      : !data ? <LoadingState/> : data.items.length
        ? <><BookingTable bookings={data.items} onOpen={onOpen}/><Pagination {...data} onChange={setPage}/></>
        : <EmptyState title={sq ? "Asnjë rezervim i gjetur" : "No bookings found"}
          detail={filtering ? (sq ? "Provo një kërkim ose filtër tjetër." : "Try another search or filter.") : undefined}/>}
  </section>;
}
