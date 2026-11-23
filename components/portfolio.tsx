"use client";

import Image from "next/image";
import {
  ArrowDown, ArrowUp, AtSign, Camera, ChevronLeft, ChevronRight, Mail,
  MapPin, Maximize2, Menu, Phone, Play, Plus, X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { defaultReel } from "@/lib/content";
import { common, serviceLabel } from "@/lib/i18n";
import { services, type GalleryItem, type Service, type StudioContent } from "@/lib/model";
import { BookingForm } from "./booking-form";
import { CameraCapture } from "./camera-capture";
import { CameraModeDial } from "./camera-mode-dial";
import { exposureStart, useCameraMotion } from "./camera-motion";
import { Dialog } from "./dialog";
import { LocaleToggle, useLocale } from "./locale";
import { Logo } from "./logo";

const copy = {
  sq: {
    work: "Punët", studio: "Studio", contact: "Kontakt", book: "Rezervo", bookLong: "Rezervo një datë",
    medium: "FOTOGRAFI & FILM", intro: "Drita mban", introEm: "mend.",
    heroDescription: "Fotografi dhe film për histori që duan të mbeten.",
    reel: "Shiko showreel", showreel: "Showreel", sampleReel: "Montazh demonstrues me imazhe të krijuara.",
    selected: "Punë të", selectedEm: "zgjedhura.", all: "Të gjitha", noProjects: "Projektet e reja do të shfaqen këtu.",
    sample: "Shembull vizual", studioTitle: "Çdo histori ka", studioEm: "ritmin e vet.",
    studioBody: "E nisim me një bisedë. Pastaj gjejmë dritën, këndin dhe ritmin që i shkojnë historisë sate, nga një portret i thjeshtë te një film i tërë.",
    contactTitle: "Çfarë ke", contactEm: "në mendje?", contactDescription: "Na trego për projektin tënd.",
    location: "Vendndodhja", backTop: "Kthehu lart", scroll: "Zbulo punët", navigation: "Navigimi", skip: "Kalo te përmbajtja",
    videoError: "Videoja nuk u ngarkua.", previousProject: "Projekti i mëparshëm", nextProject: "Projekti tjetër",
    capture: "Shkrepje", playback: "Shfletim", focus: "Fokus", finalFrame: "Kuadri i fundit",
    services: {
      wedding: "Momente të vërteta, nga përgatitjet te vallëzimi.",
      film: "Filma të shkurtër, dokumentarë dhe video për fushata.",
      portrait: "Portrete individuale dhe editoriale, në studio ose në terren.",
      commercial: "Fotografi produkti dhe përmbajtje për fushata.",
    },
  },
  en: {
    work: "Work", studio: "Studio", contact: "Contact", book: "Book", bookLong: "Book a date",
    medium: "PHOTOGRAPHY & FILM", intro: "Light", introEm: "remembers.",
    heroDescription: "Photography and film for stories worth keeping.",
    reel: "Play showreel", showreel: "Showreel", sampleReel: "A sample montage made from generated images.",
    selected: "Selected", selectedEm: "work.", all: "All work", noProjects: "New projects will appear here.",
    sample: "Visual sample", studioTitle: "Every story has", studioEm: "its own rhythm.",
    studioBody: "We start with a conversation. Then we find the light, angle, and rhythm that suit your story, from a single portrait to a full film.",
    contactTitle: "What’s on", contactEm: "your mind?", contactDescription: "Tell us about your project.",
    location: "Location", backTop: "Back to top", scroll: "Explore the work", navigation: "Navigation", skip: "Skip to content",
    videoError: "The video could not be loaded.", previousProject: "Previous project", nextProject: "Next project",
    capture: "Capture", playback: "Playback", focus: "Focus", finalFrame: "Final frame",
    services: {
      wedding: "Real moments, from getting ready to the last dance.",
      film: "Short films, documentaries, and campaign films.",
      portrait: "Personal and editorial portraits, in studio or on location.",
      commercial: "Product photography and campaign imagery.",
    },
  },
};

type Overlay = { kind: "book"; service?: Service } | { kind: "reel" } | { kind: "project"; item: GalleryItem };

function Viewfinder({ className = "" }: { className?: string }) {
  return <span className={`hero-viewfinder ${className}`} aria-hidden="true"><i/><i/><i/><i/></span>;
}

function FilmPlayer({ url, poster, label, errorLabel }: { url: string; poster: string; label: string; errorLabel: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <>
      <video src={url} poster={poster} autoPlay playsInline controls preload="metadata" aria-label={label}
        className="film-player" onError={() => setFailed(true)} />
      {failed && <p className="form-error" role="alert">{errorLabel}</p>}
    </>
  );
}

export function Portfolio({ content, earliestDate }: { content: StudioContent; earliestDate: string }) {
  const { locale } = useLocale();
  const t = copy[locale];
  const { settings, gallery } = content;
  const focusPhoto = gallery.find((item) => item.category === "portrait")?.imageUrl || settings.heroUrl;
  const [filter, setFilter] = useState<Service | "all">("all");
  const [overlay, setOverlay] = useState<Overlay>();
  const [menu, setMenu] = useState(false);
  const [photograph, setPhotograph] = useState<GalleryItem | undefined>(gallery[0]);
  const stage = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const nextPhotograph = useRef<GalleryItem | null>(null);
  const captureNumber = useRef(0);
  const applyNextPhotograph = useCallback(() => {
    if (nextPhotograph.current) {
      setPhotograph(nextPhotograph.current);
      nextPhotograph.current = null;
    }
  }, []);
  const cameraProgress = useCameraMotion(stage, hero, applyNextPhotograph);
  const visible = filter === "all" ? gallery : gallery.filter((item) => item.category === filter);
  const categories = services.filter((service) => gallery.some((item) => item.category === service));
  const location = locale === "sq" ? settings.locationSq || settings.locationEn : settings.locationEn || settings.locationSq;
  const projectTitle = (item: GalleryItem) => locale === "sq" ? item.titleSq : item.titleEn;
  const projectDescription = (item: GalleryItem) => locale === "sq" ? item.descriptionSq : item.descriptionEn;
  const showBooking = (service?: Service) => setOverlay({ kind: "book", service });
  const close = () => setOverlay(undefined);

  const preparePhotograph = useCallback((project: GalleryItem) => {
    const current = ++captureNumber.current;
    nextPhotograph.current = null;
    const image = new window.Image();
    image.src = project.imageUrl;
    void image.decode().then(() => {
      if (current !== captureNumber.current) return;
      nextPhotograph.current = project;
      if (cameraProgress.current < exposureStart) applyNextPhotograph();
    }).catch(() => {});
  }, [applyNextPhotograph, cameraProgress]);

  function moveProject(item: GalleryItem, step: number) {
    const index = visible.findIndex((project) => project.id === item.id);
    const next = visible[(index + step + visible.length) % visible.length];
    if (next) setOverlay({ kind: "project", item: next });
  }

  return (
    <div className="portfolio" id="top">
      <a className="skip-link" href="#main">{t.skip}</a>
      <header className="site-header">
        <div className="site-header-inner">
          <Logo href="#top"/>
          <CameraModeDial className={`site-nav ${menu ? "nav-open" : ""}`} onNavigate={() => setMenu(false)}/>
          <div className="site-header-actions">
            <LocaleToggle />
            <button className="button button-ink header-book" onClick={() => showBooking()}>{t.book}</button>
            <button type="button" className="icon-button mobile-menu" aria-label={menu ? common[locale].close : t.navigation}
              aria-expanded={menu} aria-controls="site-navigation" onClick={() => setMenu(!menu)}>{menu ? <X size={20}/> : <Menu size={21}/>}</button>
          </div>
        </div>
      </header>

      <main id="main">
        <div className="hero-stage" ref={stage}>
          <section className="hero hero--camera" ref={hero} aria-labelledby="hero-title">
            <div className="hero-image-layer">
              <Image src={settings.heroUrl} alt="" fill preload unoptimized sizes="100vw" className="hero-image"/>
            </div>
            <div className="hero-scrim"/>
            <Viewfinder/>
            <span className="capture-label"><i aria-hidden="true"/>{t.capture}</span>
            <div className="hero-content">
              <p className="eyebrow hero-eyebrow"><span/> {t.medium}</p>
              <h1 id="hero-title"><span>{t.intro}</span><em>{t.introEm}</em></h1>
              <p className="hero-description">{t.heroDescription}</p>
              <div className="hero-actions">
                <button className="button button-primary" onClick={() => showBooking()}>{t.bookLong}</button>
                {settings.reelUrl && <button className="reel-trigger" onClick={() => setOverlay({ kind: "reel" })}><span><Play size={15} fill="currentColor"/></span>{t.reel}</button>}
              </div>
            </div>
            <CameraCapture projects={gallery} onCapture={preparePhotograph} onOpen={(item) => { setFilter("all"); setOverlay({ kind: "project", item }); }}/>
            <div className="hero-snapshot" aria-hidden="true">
              <Image src={photograph?.imageUrl || settings.heroUrl} alt="" fill unoptimized sizes="100vw" loading="eager"/>
              {photograph && <span>{projectTitle(photograph)}</span>}
            </div>
            {location && <div className="hero-location"><MapPin size={15}/><span>{location}</span></div>}
            <a className="hero-scroll-link" href="#work"><ArrowDown size={15}/>{t.scroll}</a>
          </section>
          <div className="hero-scroll-space" aria-hidden="true"/>
        </div>

        <section className="work-section camera-chapter viewfinder-playback wrap" id="work" aria-labelledby="work-title">
          <Viewfinder className="chapter-corners"/>
          <p className="chapter-mode"><Play size={13} aria-hidden="true"/>{t.playback}</p>
          <div className="work-heading">
            <h2 className="display-heading" id="work-title">{t.selected} <em>{t.selectedEm}</em></h2>
            {categories.length > 0 && (
              <div className="work-filters" role="group" aria-label={t.work}>
                <button className="work-filter" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{t.all}</button>
                {categories.map((value) => (
                  <button className="work-filter" key={value} aria-pressed={value === filter} onClick={() => setFilter(value)}>{serviceLabel(value, locale)}</button>
                ))}
              </div>
            )}
          </div>

          {visible.length ? (
            <div className={`work-grid ${filter !== "all" ? "work-grid-filtered" : ""}`} key={filter}>
              {visible.map((item) => (
                <div key={item.id} className={`work-project work-project-${item.category}`}>
                  <button type="button" className="project-button" onClick={() => setOverlay({ kind: "project", item })}>
                    <span className="project-image">
                      <Image src={item.imageUrl} alt="" fill unoptimized sizes="(max-width: 680px) 100vw, 55vw"/>
                      <Viewfinder className="project-corners"/>
                      {item.videoUrl && <span aria-hidden="true" className="project-play"><Play fill="currentColor" size={19}/></span>}
                    </span>
                    <span className="project-info">
                      <span>
                        <span className="project-category">{serviceLabel(item.category, locale)}</span>
                        <span className="project-title">{projectTitle(item)}</span>
                      </span>
                      <span className="project-expand" aria-hidden="true"><Maximize2 size={16}/></span>
                    </span>
                  </button>
                </div>
              ))}
            </div>
          ) : <p className="no-projects" aria-live="polite">{t.noProjects}</p>}
        </section>

        <section className="studio-section camera-chapter viewfinder-studio wrap" id="studio" aria-labelledby="studio-title">
          <Viewfinder className="chapter-corners"/>
          <p className="chapter-mode"><Maximize2 size={13} aria-hidden="true"/>{t.focus}</p>
          <div className="studio-layout">
            <div className="focus-screen" aria-hidden="true">
              <Image src={focusPhoto} alt="" fill unoptimized sizes="(max-width: 760px) 90vw, 44vw"/>
              <Viewfinder className="focus-reticle"/>
            </div>
            <div className="studio-details">
              <div className="studio-intro">
                <h2 className="display-heading" id="studio-title">{t.studioTitle}<br/><em>{t.studioEm}</em></h2>
                <p>{t.studioBody}</p>
              </div>
              <div className="studio-services">
                {services.map((service) => (
                  <button key={service} type="button" className="service-row" onClick={() => showBooking(service)}>
                    <span><strong>{serviceLabel(service, locale)}</strong><small>{t.services[service]}</small></span>
                    <span className="service-plus"><Plus size={20}/></span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="contact-section camera-chapter viewfinder-contact wrap" id="contact" aria-labelledby="contact-title">
          <div className="contact-exposure" aria-hidden="true">
            <Image src={settings.heroUrl} alt="" fill unoptimized sizes="100vw"/>
          </div>
          <Viewfinder className="chapter-corners"/>
          <p className="chapter-mode"><Camera size={13} aria-hidden="true"/>{t.finalFrame}</p>
          <div className="contact-content">
            <div className="contact-layout">
              <h2 className="display-heading" id="contact-title">{t.contactTitle}<br/><em>{t.contactEm}</em></h2>
              <div className="contact-action">
                <p>{t.contactDescription}</p>
                <button className="button button-ink" onClick={() => showBooking()}>{t.bookLong}</button>
                <div className="contact-links">
                  {location && (settings.mapUrl
                    ? <a href={settings.mapUrl} target="_blank" rel="noreferrer"><MapPin size={17}/>{location}</a>
                    : <span><MapPin size={17}/>{location}</span>)}
                  {settings.email && <a href={`mailto:${settings.email}`}><Mail size={17}/>{settings.email}</a>}
                  {settings.phone && <a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}><Phone size={17}/>{settings.phone}</a>}
                  {settings.instagramUrl && <a href={settings.instagramUrl} target="_blank" rel="noreferrer"><AtSign size={17}/>Instagram</a>}
                </div>
              </div>
            </div>
            <div className="footer-end">
              <Logo href="#top"/>
              <span>© Go Production</span>
              <a href="#top"><ArrowUp size={16}/>{t.backTop}</a>
            </div>
          </div>
        </footer>
      </main>

      {overlay?.kind === "book" && <BookingForm service={overlay.service} earliestDate={earliestDate} onClose={close}/>}
      {overlay?.kind === "reel" && (
        <Dialog title={t.showreel} onClose={close} className="media-dialog">
          <FilmPlayer url={settings.reelUrl} poster={settings.heroUrl} label={t.showreel} errorLabel={t.videoError}/>
          {settings.reelUrl === defaultReel && <p className="media-note">{t.sampleReel}</p>}
        </Dialog>
      )}
      {overlay?.kind === "project" && (
        <Dialog title={projectTitle(overlay.item)} onClose={close} className="media-dialog">
          {overlay.item.videoUrl
            ? <FilmPlayer key={overlay.item.id} url={overlay.item.videoUrl} poster={overlay.item.imageUrl} label={projectTitle(overlay.item)} errorLabel={t.videoError}/>
            : <div className="lightbox-image"><Image src={overlay.item.imageUrl} alt={projectTitle(overlay.item)} unoptimized fill sizes="90vw"/></div>}
          <div className="lightbox-caption">
            <div>
              <span className="eyebrow">{serviceLabel(overlay.item.category, locale)}{overlay.item.isSample ? ` · ${t.sample}` : ""}</span>
              {projectDescription(overlay.item) && <p>{projectDescription(overlay.item)}</p>}
            </div>
            {visible.length > 1 && (
              <div className="lightbox-nav">
                <button type="button" className="icon-button" onClick={() => moveProject(overlay.item, -1)} aria-label={t.previousProject}><ChevronLeft size={20}/></button>
                <button type="button" className="icon-button" onClick={() => moveProject(overlay.item, 1)} aria-label={t.nextProject}><ChevronRight size={20}/></button>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
