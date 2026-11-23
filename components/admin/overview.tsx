"use client";

import { CalendarDays, CheckCircle2, Clock3, Globe2 } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/components/locale";
import { dateInUtc, formatDate, isoDate } from "@/lib/dates";
import { serviceLabel } from "@/lib/i18n";
import { periods, services, type Period, type StudioStats } from "@/lib/model";
import { BookingTable, type BookingDates } from "./booking-table";
import { EmptyState, ErrorState, LoadingState, useResource } from "./ui";

type OverviewProps = {
  version: number;
  onOpen: (id: string) => void;
  onBookings: (dates?: BookingDates) => void;
};

function StatsChart({ stats, period, onBookings }: {
  stats: StudioStats; period: Period; onBookings: OverviewProps["onBookings"];
}) {
  const { locale } = useLocale();
  const sq = locale === "sq";
  const maximum = Math.max(1, ...stats.series.map((item) => item.total));
  const step = Math.max(1, Math.ceil(maximum / 4));
  const scale = step * 4;

  function openDate(value: string) {
    if (period !== "year") { onBookings({ mode: "day", from: value, to: "" }); return; }
    const end = dateInUtc(value);
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
    onBookings({ mode: "range", from: value, to: isoDate(end) });
  }

  return <section className="admin-panel chart-panel">
    <div className="panel-title"><div><h2>{sq ? "Ecuria e rezervimeve" : "Booking activity"}</h2>
      <p>{sq ? "Sipas datës së rezervuar" : "By scheduled date"}</p></div>
      <div className="chart-legend"><span><i/>{sq ? "Gjithsej" : "Total"}</span>
      <span><i/>{sq ? "Konfirmuar" : "Confirmed"}</span></div>
    </div>
    <div className="chart-body">
      <div className="chart-y" aria-hidden="true">{[4, 3, 2, 1, 0].map((level) => <span key={level}>{level * step}</span>)}</div>
      <div className="chart-content">
        <div className="chart-columns" style={{ gridTemplateColumns: `repeat(${stats.series.length}, minmax(0, 1fr))` }}>
          {stats.series.map((item) => {
            const day = period === "year" ? formatDate(item.date, locale, { month: "long" }) : formatDate(item.date, locale);
            return <button type="button" key={item.date} className="chart-col" onClick={() => openDate(item.date)}
              aria-label={`${day}: ${item.total} ${sq ? "rezervime" : "bookings"}`} title={`${day} · ${item.total}`}>
              <span className="chart-bar" style={{ height: `${item.total / scale * 100}%` }}>
                <span style={{ height: `${item.total ? item.confirmed / item.total * 100 : 0}%` }}/>
              </span>
            </button>;
          })}
          {stats.total === 0 && <span className="chart-zero">{sq ? "Nuk ka rezervime për këtë periudhë" : "No bookings in this period"}</span>}
        </div>
        <div className="chart-x" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${stats.series.length}, minmax(0, 1fr))` }}>
          {stats.series.map((item, index) => <span key={item.date}>{period === "month"
            ? ([0, 4, 9, 14, 19, 24, stats.series.length - 1].includes(index) ? Number(item.date.slice(-2)) : "")
            : formatDate(item.date, locale, period === "year" ? { month: "short" } : { weekday: "short" }).replace(".", "")}</span>)}
        </div>
      </div>
    </div>
  </section>;
}

export function Overview({ version, onOpen, onBookings }: OverviewProps) {
  const { locale } = useLocale();
  const sq = locale === "sq";
  const [period, setPeriod] = useState<Period>("month");
  const { data, error, reload } = useResource<StudioStats>(`/api/admin/stats?period=${period}`, version);
  const periodLabels = { week: sq ? "Java" : "Week", month: sq ? "Muaji" : "Month", year: sq ? "Viti" : "Year" };
  const tiles = [
    { id: "total", label: sq ? "Rezervime gjithsej" : "Total bookings", icon: CalendarDays, tone: "peach" },
    { id: "confirmed", label: sq ? "Të konfirmuara" : "Confirmed", icon: CheckCircle2, tone: "green" },
    { id: "pending", label: sq ? "Në pritje" : "Pending", icon: Clock3, tone: "sand" },
    { id: "website", label: sq ? "Nga faqja" : "From the website", icon: Globe2, tone: "blue" },
  ] as const;

  return <>
    <div className="period-row">
      <p>{data ? `${formatDate(data.start, locale)} – ${formatDate(data.end, locale)}` : (sq ? "Periudha" : "Period")}</p>
      <div className="segments" role="group" aria-label={sq ? "Periudha e statistikave" : "Statistics period"}>
        {periods.map((value) => <button type="button" key={value} aria-pressed={period === value} onClick={() => setPeriod(value)}>{periodLabels[value]}</button>)}
      </div>
    </div>
    {error ? <ErrorState code={error} retry={reload}/> : !data ? <LoadingState/> : <>
      <div className="metric-grid">
        {tiles.map(({ id, label, icon: Icon, tone }) => <div className="admin-panel metric" key={id}>
          <span className={`metric-icon tone-${tone}`}><Icon size={19}/></span>
          <span className="metric-label">{label}</span><strong>{data[id]}</strong>
        </div>)}
      </div>
      <div className="overview-grid">
        <StatsChart stats={data} period={period} onBookings={onBookings}/>
        <section className="admin-panel breakdown">
          <div className="panel-title"><div><h2>{sq ? "Sipas shërbimit" : "By service"}</h2>
            <p>{sq ? "Rezervimet në këtë periudhë" : "Bookings in this period"}</p></div></div>
          <div className="breakdown-list">
            {services.map((service, index) => {
              const total = data.services.find((entry) => entry.service === service)?.total || 0;
              return <div className={`breakdown-item breakdown-${index}`} key={service}>
                <div><strong>{serviceLabel(service, locale)}</strong><span>{total}</span></div>
                <div aria-hidden="true"><span style={{ width: `${data.total ? total / data.total * 100 : 0}%` }}/></div>
              </div>;
            })}
          </div>
        </section>
      </div>
      <section className="admin-panel">
        <div className="panel-title"><div><h2>{sq ? "Rezervimet e fundit" : "Recent bookings"}</h2></div>
          <button type="button" className="text-button" onClick={() => onBookings()}>{sq ? "Shiko të gjitha" : "View all"}</button></div>
        {data.recent.length ? <BookingTable compact bookings={data.recent} onOpen={onOpen}/>
          : <EmptyState title={sq ? "Ende s’ka rezervime në këtë periudhë" : "No bookings in this period yet"}/>}
      </section>
    </>}
  </>;
}
