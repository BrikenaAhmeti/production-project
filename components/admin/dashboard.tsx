"use client";

import { Bell, CalendarDays, ExternalLink, Images, LayoutDashboard, LogOut, MapPin, Plus } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { LocaleToggle, useLocale } from "@/components/locale";
import { Logo } from "@/components/logo";
import { errorCode, requestJson } from "@/lib/client";
import { errorLabel } from "@/lib/i18n";
import { isAdminView, type AdminView } from "@/lib/model";
import { CreateBooking, OpenBooking } from "./booking-editor";
import { anyDate, Bookings, type BookingDates } from "./booking-table";
import { Contact, Gallery } from "./content";
import { Notifications } from "./notifications";
import { Overview } from "./overview";

const navigation = [
  { id: "overview", sq: "Përmbledhje", en: "Overview", icon: LayoutDashboard },
  { id: "bookings", sq: "Rezervimet", en: "Bookings", icon: CalendarDays },
  { id: "notifications", sq: "Njoftimet", en: "Notifications", icon: Bell },
  { id: "gallery", sq: "Galeria", en: "Gallery", icon: Images },
  { id: "contact", sq: "Kontakti", en: "Contact details", icon: MapPin },
] as const;

const descriptions = {
  overview: { sq: "Rezervimet e studios në një pamje.", en: "Your studio’s bookings at a glance." },
  bookings: { sq: "Shiko kërkesat dhe menaxho datat e rezervuara.", en: "Review requests and manage scheduled dates." },
  notifications: { sq: "Kërkesat e reja të rezervimit nga faqja.", en: "New booking requests from the website." },
  gallery: { sq: "Përditëso projektet, imazhin e hapjes dhe showreel-in.", en: "Update projects, the opening image, and the showreel." },
  contact: { sq: "Përditëso të dhënat e kontaktit që shfaqen në faqe.", en: "Edit the contact details shown on the website." },
};

function adminUrl(view: AdminView) { return view === "overview" ? "/admin" : `/admin?view=${view}`; }

export function Dashboard({ email, initialView }: { email: string; initialView: AdminView }) {
  const { locale } = useLocale();
  const sq = locale === "sq";
  const [view, setView] = useState(initialView);
  const [version, setVersion] = useState(0);
  const [unread, setUnread] = useState(0);
  const [bookingDates, setBookingDates] = useState<BookingDates>(anyDate);
  const [dateKey, setDateKey] = useState(0);
  const [modal, setModal] = useState<{ kind: "create" } | { kind: "booking"; id: string }>();
  const [signOutError, setSignOutError] = useState<string>();
  const [signingOut, setSigningOut] = useState(false);
  const unreadRef = useRef<number | undefined>(undefined);
  const title = navigation.find((item) => item.id === view)![locale];

  useEffect(() => {
    const controller = new AbortController();
    async function check() {
      if (document.hidden || controller.signal.aborted) return;
      try {
        const result = await requestJson<{ unread: number }>("/api/admin/notifications?count=1", { signal: controller.signal });
        if (controller.signal.aborted) return;
        const previous = unreadRef.current;
        unreadRef.current = result.unread;
        setUnread(result.unread);
        if (previous !== undefined && previous !== result.unread) setVersion((count) => count + 1);
      } catch { /* The active dashboard view handles service errors. */ }
    }
    void check();
    const timer = window.setInterval(check, 20000);
    document.addEventListener("visibilitychange", check);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [version]);

  useEffect(() => {
    function pop() {
      const target = new URL(window.location.href).searchParams.get("view");
      setView(isAdminView(target) ? target : "overview");
    }
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);

  function navigate(next: AdminView) {
    if (view !== next) window.history.pushState(null, "", adminUrl(next));
    setView(next);
    window.scrollTo(0, 0);
  }

  function onNav(event: MouseEvent<HTMLAnchorElement>, target: AdminView) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (target === "bookings" && view !== "bookings") openBookings();
    else navigate(target);
  }

  function openBookings(dates = anyDate) {
    setBookingDates(dates);
    setDateKey((count) => count + 1);
    navigate("bookings");
  }

  async function signOut() {
    setSigningOut(true);
    setSignOutError(undefined);
    try {
      await requestJson("/api/admin/session", { method: "DELETE" });
      window.location.assign("/admin/login");
    } catch (failure) {
      if (errorCode(failure) === "unauthorized") { window.location.assign("/admin/login"); return; }
      setSignOutError(errorCode(failure));
      setSigningOut(false);
    }
  }

  const open = (id: string) => setModal({ kind: "booking", id });
  const close = () => setModal(undefined);
  const changed = () => setVersion((count) => count + 1);

  return <div className="dashboard">
    <aside className="studio-sidebar">
      <div className="sidebar-head"><Logo href="/admin"/><div className="studio-caption">Studio</div></div>
      <nav aria-label={sq ? "Paneli i studios" : "Studio dashboard"} className="sidebar-nav">
        {navigation.map(({ id, icon: Icon, ...names }) => <a key={id} href={adminUrl(id)}
          aria-current={view === id ? "page" : undefined} onClick={(event) => onNav(event, id)}>
          <Icon size={18}/><span>{names[locale]}</span>
          {id === "notifications" && unread > 0 && <b className="unread-badge">{unread > 99 ? "99+" : unread}</b>}
        </a>)}
      </nav>
      <div className="sidebar-foot">
        <a href="/" target="_blank" rel="noreferrer"><ExternalLink size={16}/>{sq ? "Hap faqen" : "View website"}</a>
        <button type="button" onClick={signOut} disabled={signingOut}><LogOut size={16}/>{sq ? "Dil" : "Sign out"}</button>
        {signOutError && <span role="alert">{errorLabel(signOutError, locale)}</span>}
      </div>
    </aside>
    <div className="dashboard-body">
      <header className="dashboard-top">
        <div className="dashboard-breadcrumb"><span>Studio</span><i>/</i><strong>{title}</strong></div>
        <div className="dashboard-top-actions">
          <LocaleToggle/>
          <button className="icon-button top-notice" type="button" aria-label={sq ? `Njoftime, ${unread} të palexuara` : `Notifications, ${unread} unread`}
            onClick={() => navigate("notifications")}><Bell size={18}/>{unread > 0 && <i/>}</button>
          <span className="admin-avatar" title={email} aria-label={email}>GO</span>
          <button type="button" className="icon-button mobile-signout" aria-label={sq ? "Dil" : "Sign out"} onClick={signOut} disabled={signingOut}><LogOut size={17}/></button>
        </div>
      </header>
      <main className="dashboard-main">
        <div className="dashboard-intro"><div><h1>{title}</h1><p>{descriptions[view][locale]}</p></div>
          {(view === "overview" || view === "bookings") && <button type="button" className="button button-primary"
            onClick={() => setModal({ kind: "create" })}><Plus size={18}/>{sq ? "Rezervim i ri" : "New booking"}</button>}
        </div>
        {view === "overview" && <Overview version={version} onOpen={open} onBookings={openBookings}/>}
        {view === "bookings" && <Bookings key={dateKey} dates={bookingDates} version={version} onOpen={open}/>}
        {view === "notifications" && <Notifications version={version} onChanged={changed} onOpen={open}/>}
        {view === "gallery" && <Gallery/>}
        {view === "contact" && <Contact/>}
      </main>
    </div>
    {modal?.kind === "create" && <CreateBooking onClose={close} onChanged={changed}/>}
    {modal?.kind === "booking" && <OpenBooking id={modal.id} onClose={close} onChanged={changed}/>}
  </div>;
}
