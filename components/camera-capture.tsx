"use client";

import Image from "next/image";
import { Aperture, Maximize2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryItem } from "@/lib/model";
import { useLocale } from "./locale";

export function CameraCapture({ projects, onCapture, onOpen }: {
  projects: GalleryItem[];
  onCapture: (project: GalleryItem) => void;
  onOpen: (project: GalleryItem) => void;
}) {
  const { locale } = useLocale();
  const sq = locale === "sq";
  const [take, setTake] = useState(-1);
  const [developing, setDeveloping] = useState(false);
  const [instant, setInstant] = useState(false);
  const active = useRef(-1);
  const timer = useRef<number | undefined>(undefined);
  const project = take >= 0 && projects.length ? projects[take % projects.length] : null;
  const title = project ? (sq ? project.titleSq : project.titleEn) : "";

  const capture = useCallback(() => {
    if (!projects.length || timer.current !== undefined) return;
    const skipMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const index = active.current + 1;
    active.current = index;
    setInstant(skipMotion);
    setTake(index);
    setDeveloping(!skipMotion);
    onCapture(projects[index % projects.length]);
    if (!skipMotion) {
      timer.current = window.setTimeout(() => {
        timer.current = undefined;
        setDeveloping(false);
      }, 1430);
    }
  }, [onCapture, projects]);

  useEffect(() => {
    function openFirst() {
      if (active.current === -1 && window.scrollY <= 24) capture();
    }
    const initialCapture = window.setTimeout(openFirst, 860);
    return () => {
      window.clearTimeout(initialCapture);
      window.clearTimeout(timer.current);
      timer.current = undefined;
    };
  }, [capture]);

  const captureLabel = developing ? (sq ? "Duke zhvilluar…" : "Developing…")
    : take < 0 ? (sq ? "Shkrep një foto" : "Take a photo") : (sq ? "Shkrep përsëri" : "Take another shot");

  return (
    <>
      <div className="camera-canvas">
        <div className="camera-glow" aria-hidden="true"/>
        <div className="camera-rig">
          {project && (
            <button key={`print-${take}`} className={`instant-print ${instant ? "instant-ready" : ""}`}
              disabled={developing} type="button" onClick={() => onOpen(project)}
              aria-label={sq ? `Hap projektin ${title}` : `Open project ${title}`}>
              <span className="instant-photo"><Image src={project.imageUrl} alt="" fill unoptimized sizes="320px" loading="eager"/></span>
              <span className="instant-caption"><span>{title}</span><Maximize2 size={14}/></span>
            </button>
          )}
          <div className="camera-shell" key={`camera-${take}`}>
            <Image className="camera-render" src="/images/go-camera.webp" alt="" fill unoptimized sizes="(max-width: 700px) 80vw, 48vw" preload={take === -1} />
            {take >= 0 && !instant && <>
              <div className="camera-focus" aria-hidden="true"><i/><i/><i/><i/></div>
              <div className="camera-blades" aria-hidden="true"/>
              <div className="camera-flash" aria-hidden="true"/>
            </>}
          </div>
        </div>
      </div>
      {projects.length > 0 && <div className="camera-actions">
        <button type="button" className="camera-trigger" onClick={capture} aria-disabled={developing}>
          <span className="camera-trigger-symbol"><Aperture size={22}/></span>
          <span>{captureLabel}</span>
        </button>
      </div>}
    </>
  );
}
