"use client";

import { Aperture, CalendarDays, Focus, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "./locale";

const modes = [
  { id: "top", section: ".hero-stage", icon: Aperture, sq: "Kamera", en: "Camera" },
  { id: "work", section: "#work", icon: Play, sq: "Punët", en: "Work" },
  { id: "studio", section: "#studio", icon: Focus, sq: "Studio", en: "Studio" },
  { id: "contact", section: "#contact", icon: CalendarDays, sq: "Kontakt", en: "Contact" },
] as const;

type Mode = typeof modes[number]["id"];

export function CameraModeDial({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const { locale } = useLocale();
  const [active, setActive] = useState<Mode>("top");
  const dial = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = dial.current?.closest("header");
    const sections = modes.map(({ id, section }) => ({ id, element: document.querySelector(section) }));
    let frame = 0;
    let previous: Mode = "top";
    let thresholds: { id: Mode; start: number }[] = [];
    let maxScroll = 0;

    function update() {
      frame = 0;
      const position = window.scrollY;
      const atBottom = position > 0 && position >= maxScroll - 2;
      const current = atBottom ? "contact" : thresholds.findLast(({ start }) => position >= start)?.id ?? "top";

      if (current !== previous) {
        previous = current;
        setActive(current);
      }
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    function measure() {
      const viewport = window.innerHeight;
      const headerHeight = header?.offsetHeight ?? 0;
      const focusLine = headerHeight + (viewport - headerHeight) * .34;
      const position = window.scrollY;
      maxScroll = document.documentElement.scrollHeight - viewport;
      thresholds = sections.flatMap(({ id, element }) => element
        ? [{ id, start: position + element.getBoundingClientRect().top - focusLine }]
        : []);
      schedule();
    }

    const observer = new ResizeObserver(measure);
    sections.forEach(({ element }) => {
      if (element) observer.observe(element);
    });
    if (header) observer.observe(header);
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("hashchange", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      window.removeEventListener("hashchange", schedule);
    };
  }, []);

  return (
    <nav
      id="site-navigation"
      aria-label={locale === "sq" ? "Modalitetet e kamerës" : "Camera modes"}
      className={`camera-mode-dial ${className ?? ""}`}
      ref={dial}
    >
      {modes.map(({ id, icon: Icon, ...label }) => (
        <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined} onClick={onNavigate}>
          <Icon size={15} strokeWidth={1.65} aria-hidden="true" />
          <span>{label[locale]}</span>
        </a>
      ))}
    </nav>
  );
}
