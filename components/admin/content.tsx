"use client";

import Image from "next/image";
import { ImagePlus, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";
import { SelectMenu } from "@/components/controls";
import { Dialog } from "@/components/dialog";
import { useLocale } from "@/components/locale";
import { asJson, errorCode, requestJson } from "@/lib/client";
import { defaultHero, defaultReel } from "@/lib/content";
import { common, errorLabel, serviceLabel } from "@/lib/i18n";
import { services, type GalleryItem, type Service, type StudioSettings } from "@/lib/model";
import { prepareImage } from "@/lib/prepare-image";
import { EmptyState, ErrorState, LoadingState, useResource } from "./ui";

function UploadField({ preview, label, onChange }: { preview?: string; label: string; onChange: (file?: File) => void }) {
  const { locale } = useLocale();
  const sq = locale === "sq";
  const id = useId();
  const [file, setFile] = useState<File>();
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!file) return;
    const created = URL.createObjectURL(file);
    setUrl(created);
    return () => URL.revokeObjectURL(created);
  }, [file]);

  const image = file ? url : preview;
  return <div className="upload-field">
    <div className="upload-preview">{image
      ? <Image src={image} alt="" fill sizes="380px" unoptimized/>
      : <ImagePlus size={28}/>}</div>
    <div className="upload-actions">
      <label htmlFor={id} className="button button-secondary"><Upload size={16}/>{label}
        <input className="sr-only" id={id} type="file" accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (!selected) return;
            setFile(selected);
            onChange(selected);
            event.target.value = "";
          }}/>
      </label>
      {file ? <button className="text-button" type="button" onClick={() => { setFile(undefined); onChange(undefined); }}>{sq ? "Hiq skedarin" : "Remove file"}</button>
        : <small>JPG, PNG, WebP, AVIF · 32 MB</small>}
    </div>
  </div>;
}

function VisualSettings({ initial }: { initial: StudioSettings }) {
  const { locale } = useLocale();
  const sq = locale === "sq";
  const t = common[locale];
  const [current, setCurrent] = useState(initial);
  const [reel, setReel] = useState(initial.reelUrl === defaultReel ? "" : initial.reelUrl);
  const [image, setImage] = useState<File>();
  const [reset, setReset] = useState(false);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData();
    form.set("reset", String(reset));
    form.set("reelUrl", reel);
    setState("saving");
    setError(undefined);
    try {
      if (image) form.set("image", await prepareImage(image));
      const saved = await requestJson<StudioSettings>("/api/admin/settings/visuals", { method: "PATCH", body: form });
      setCurrent(saved);
      setReel(saved.reelUrl === defaultReel ? "" : saved.reelUrl);
      setImage(undefined);
      setReset(false);
      setVersion((value) => value + 1);
      setState("saved");
    } catch (failure) {
      setError(errorCode(failure));
      setState("idle");
    }
  }

  return <section className="admin-panel content-panel">
    <div className="panel-title"><div><h2>{sq ? "Hapja e faqes" : "Homepage opening"}</h2>
      <p>{sq ? "Imazhi në sfond dhe videoja e showreel-it." : "The background image and showreel video."}</p></div></div>
    <form className="form-grid visual-form" onSubmit={submit}>
      <div className="field">
        <span>{sq ? "Imazhi i hapjes" : "Opening image"}</span>
        <UploadField key={version} preview={reset ? defaultHero : current.heroUrl}
          label={sq ? "Ndrysho imazhin" : "Replace image"} onChange={(file) => { setImage(file); setReset(false); setState("idle"); }}/>
        {current.heroUrl !== defaultHero && <button type="button" className="text-button" onClick={() => {
          setReset(!reset); setImage(undefined); setVersion((value) => value + 1); setState("idle");
        }}>{reset ? (sq ? "Mbaj imazhin aktual" : "Keep current image") : (sq ? "Rikthe imazhin fillestar" : "Restore original image")}</button>}
      </div>
      <label className="field"><span>{sq ? "Lidhja e showreel-it" : "Showreel link"}</span>
        <input value={reel} onChange={(event) => { setReel(event.target.value); setState("idle"); }} inputMode="url" maxLength={1500} placeholder="https://…/showreel.mp4"/>
        <small>{sq ? "Përdor një lidhje direkte HTTPS të një videoje. Fusha bosh përdor showreel-in demonstrues."
          : "Use a direct HTTPS video link. Leave blank to use the sample showreel."}</small>
      </label>
      {error && <p className="form-error field-wide" role="alert">{errorLabel(error, locale)}</p>}
      {state === "saved" && <p className="form-success field-wide" role="status">{sq ? "Hapja u përditësua." : "Homepage opening updated."}</p>}
      <div className="form-actions field-wide"><button type="submit" className="button button-primary" disabled={state === "saving"}>{state === "saving" ? t.saving : t.save}</button></div>
    </form>
  </section>;
}

function GalleryEditor({ item, position, onClose, onSaved }: {
  item?: GalleryItem; position: number; onClose: () => void; onSaved: () => void;
}) {
  const { locale } = useLocale();
  const sq = locale === "sq";
  const t = common[locale];
  const [category, setCategory] = useState<Service>(item?.category ?? "wedding");
  const [image, setImage] = useState<File>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item && !image) { setError("imageRequired"); return; }
    const form = new FormData(event.currentTarget);
    form.set("category", category);
    setSaving(true);
    setError(undefined);
    try {
      if (image) form.set("image", await prepareImage(image));
      await requestJson(item ? `/api/admin/gallery/${item.id}` : "/api/admin/gallery", {
        method: item ? "PATCH" : "POST", body: form,
      });
      onSaved();
    } catch (failure) { setError(errorCode(failure)); }
    finally { setSaving(false); }
  }

  return <Dialog title={item ? (sq ? "Ndrysho projektin" : "Edit project") : (sq ? "Projekt i ri" : "New project")} onClose={onClose}>
    <form className="form-grid" onSubmit={submit}>
      <div className="field-wide"><UploadField preview={item?.imageUrl} label={sq ? "Ngarko imazh" : "Upload image"} onChange={setImage}/></div>
      <label className="field">{sq ? "Titulli në shqip" : "Albanian title"}<input name="titleSq" defaultValue={item?.titleSq} required maxLength={100}/></label>
      <label className="field">{sq ? "Titulli në anglisht" : "English title"}<input name="titleEn" defaultValue={item?.titleEn} required maxLength={100}/></label>
      <label className="field">{sq ? "Përshkrimi në shqip" : "Albanian description"}<textarea name="descriptionSq" rows={2} defaultValue={item?.descriptionSq} maxLength={1000}/></label>
      <label className="field">{sq ? "Përshkrimi në anglisht" : "English description"}<textarea name="descriptionEn" rows={2} defaultValue={item?.descriptionEn} maxLength={1000}/></label>
      <div className="field"><label htmlFor="gallery-category">{t.service}</label><SelectMenu id="gallery-category" label={t.service} value={category}
        onChange={setCategory} options={services.map((value) => ({ value, label: serviceLabel(value, locale) }))}/></div>
      <label className="field">{sq ? "Renditja" : "Display order"}<input name="position" type="number" min={0} max={9999} defaultValue={item?.position ?? position} required/></label>
      <label className="field field-wide"><span>{sq ? "Lidhja direkte e videos" : "Direct video link"} <small>({t.optional})</small></span>
        <input name="videoUrl" inputMode="url" placeholder="https://…/film.mp4" defaultValue={item?.videoUrl} maxLength={1500}/></label>
      {error && <p className="form-error field-wide" role="alert">{errorLabel(error, locale)}</p>}
      <div className="form-actions field-wide">
        <button className="button button-secondary" type="button" onClick={onClose}>{t.cancel}</button>
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? t.saving : t.save}</button>
      </div>
    </form>
  </Dialog>;
}

export function Gallery() {
  const { locale } = useLocale();
  const sq = locale === "sq";
  const t = common[locale];
  const gallery = useResource<GalleryItem[]>("/api/admin/gallery");
  const settings = useResource<StudioSettings>("/api/admin/settings");
  const [editing, setEditing] = useState<GalleryItem | "new">();
  const [deleting, setDeleting] = useState<GalleryItem>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [page, setPage] = useState(1);
  const pageSize = 9;
  const maxPage = Math.max(1, Math.ceil((gallery.data?.length ?? 0) / pageSize));
  const activePage = Math.min(page, maxPage);
  const items = gallery.data?.slice((activePage - 1) * pageSize, activePage * pageSize);

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setError(undefined);
    try {
      await requestJson(`/api/admin/gallery/${deleting.id}`, { method: "DELETE" });
      setDeleting(undefined);
      gallery.reload();
    } catch (failure) { setError(errorCode(failure)); }
    finally { setBusy(false); }
  }

  return <div className="content-stack">
    {settings.error ? <ErrorState code={settings.error} retry={settings.reload}/> : settings.data
      ? <VisualSettings initial={settings.data}/> : <LoadingState/>}
    <section className="admin-panel content-panel">
      <div className="panel-title"><div><h2>{sq ? "Projektet" : "Projects"}</h2></div>
        <button type="button" className="button button-primary" onClick={() => setEditing("new")}><Plus size={17}/>{sq ? "Shto projekt" : "Add project"}</button></div>
      {gallery.error ? <ErrorState code={gallery.error} retry={gallery.reload}/> : !items ? <LoadingState/> : items.length ? (
        <div className="gallery-admin-grid">
          {items.map((item) => <article key={item.id} className="gallery-admin-card">
            <div className="gallery-admin-img"><Image src={item.imageUrl} alt="" fill unoptimized sizes="360px"/></div>
            <div className="gallery-admin-meta"><div>
              <p>{serviceLabel(item.category, locale)}{item.isSample ? (sq ? " · Shembull" : " · Sample") : ""}</p>
              <h3>{sq ? item.titleSq : item.titleEn}</h3>
            </div>
              <button className="icon-button" type="button" aria-label={sq ? "Ndrysho projektin" : "Edit project"} onClick={() => setEditing(item)}><Pencil size={16}/></button>
              <button className="icon-button" type="button" aria-label={sq ? "Fshi projektin" : "Delete project"} onClick={() => { setError(undefined); setDeleting(item); }}><Trash2 size={16}/></button>
            </div>
          </article>)}
        </div>
      ) : <EmptyState title={sq ? "Ende s’ka projekte" : "No projects yet"}/>}
      {maxPage > 1 && <div className="table-pagination">
        <button type="button" className="button button-secondary" disabled={activePage <= 1} onClick={() => setPage(activePage - 1)}>{t.previous}</button>
        <span>{activePage} / {maxPage}</span>
        <button type="button" className="button button-secondary" disabled={activePage >= maxPage} onClick={() => setPage(activePage + 1)}>{t.next}</button>
      </div>}
    </section>
    {editing && <GalleryEditor item={editing === "new" ? undefined : editing}
      position={Math.min(9999, Math.max(0, ...(gallery.data ?? []).map((item) => item.position)) + 10)}
      onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); gallery.reload(); }}/>}
    {deleting && <Dialog title={sq ? "Fshi projektin" : "Delete project"} onClose={() => setDeleting(undefined)}>
      <p className="dialog-description">{sq ? `Ta heqësh «${deleting.titleSq}» nga portofoli?` : `Remove “${deleting.titleEn}” from the portfolio?`}</p>
      {error && <p className="form-error" role="alert">{errorLabel(error, locale)}</p>}
      <div className="form-actions"><button type="button" className="button button-secondary" onClick={() => setDeleting(undefined)}>{t.cancel}</button>
        <button type="button" className="button button-primary" disabled={busy} onClick={remove}>{sq ? "Fshi projektin" : "Delete project"}</button></div>
    </Dialog>}
  </div>;
}

function ContactForm({ settings }: { settings: StudioSettings }) {
  const { locale } = useLocale();
  const sq = locale === "sq";
  const t = common[locale];
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.currentTarget));
    setState("saving");
    setError(undefined);
    try {
      await requestJson("/api/admin/settings", asJson("PATCH", input));
      setState("saved");
    } catch (failure) {
      setError(errorCode(failure));
      setState("idle");
    }
  }

  return <section className="admin-panel content-panel contact-admin">
    <div className="panel-title"><h2>{sq ? "Të dhënat publike" : "Public details"}</h2></div>
    <form className="form-grid" onSubmit={submit} onChange={() => { if (state === "saved") setState("idle"); }}>
      <label className="field">{t.email}<input name="email" type="email" maxLength={254} defaultValue={settings.email}/></label>
      <label className="field">{t.phone}<input name="phone" type="tel" maxLength={40} defaultValue={settings.phone}/></label>
      <label className="field">{sq ? "Vendndodhja në shqip" : "Albanian location"}<input name="locationSq" maxLength={160} defaultValue={settings.locationSq}/></label>
      <label className="field">{sq ? "Vendndodhja në anglisht" : "English location"}<input name="locationEn" maxLength={160} defaultValue={settings.locationEn}/></label>
      <label className="field">Instagram<input name="instagramUrl" type="url" maxLength={1500} placeholder="https://…" defaultValue={settings.instagramUrl}/></label>
      <label className="field">{sq ? "Lidhja e hartës" : "Map link"}<input name="mapUrl" type="url" maxLength={1500} placeholder="https://…" defaultValue={settings.mapUrl}/></label>
      {error && <p className="form-error field-wide" role="alert">{errorLabel(error, locale)}</p>}
      {state === "saved" && <p className="form-success field-wide" role="status">{sq ? "Kontakti u përditësua." : "Contact details updated."}</p>}
      <div className="form-actions field-wide"><button type="submit" className="button button-primary" disabled={state === "saving"}>{state === "saving" ? t.saving : t.save}</button></div>
    </form>
  </section>;
}

export function Contact() {
  const { data, error, reload } = useResource<StudioSettings>("/api/admin/settings");
  return error ? <ErrorState code={error} retry={reload}/> : data ? <ContactForm settings={data}/> : <LoadingState/>;
}
