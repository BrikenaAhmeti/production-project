"use client";

import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { dateInUtc, formatDate, isoDate, todayIn } from "@/lib/dates";
import { common } from "@/lib/i18n";
import { useLocale } from "./locale";

function usePopover() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  return { open, setOpen, root, trigger, close };
}

export function SelectMenu<T extends string>({ label, value, options, onChange, placeholder, id }: {
  label: string;
  value: T | "";
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  placeholder?: string;
  id?: string;
}) {
  const popover = usePopover();
  const listId = useId();
  const { locale } = useLocale();
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = options.findIndex((option) => option.value === value);

  useEffect(() => {
    if (popover.open) optionRefs.current[Math.max(0, index)]?.focus();
  }, [popover.open, index]);

  function navigate(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      popover.close();
      return;
    }
    const directions: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, Home: 0, End: 0 };
    if (!(event.key in directions)) return;
    event.preventDefault();
    const active = optionRefs.current.findIndex((option) => option === document.activeElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
      : (active + directions[event.key] + options.length) % options.length;
    optionRefs.current[next]?.focus();
  }

  return (
    <div className="control-wrap" ref={popover.root} onBlur={(event) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) popover.setOpen(false);
    }}>
      <button
        className="control-button" type="button" id={id} ref={popover.trigger}
        aria-label={`${label}: ${options[index]?.label ?? placeholder ?? common[locale].choose}`}
        aria-expanded={popover.open} aria-haspopup="listbox" aria-controls={listId}
        onClick={() => popover.setOpen(!popover.open)}
        onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); popover.setOpen(true); } }}
      >
        <span className={index < 0 ? "control-placeholder" : ""}>{options[index]?.label ?? placeholder ?? common[locale].choose}</span>
        <ChevronDown size={15} className="control-chevron" />
      </button>
      {popover.open && (
        <div className="option-popover" role="listbox" aria-label={label} id={listId} onKeyDown={navigate}>
          {options.map((option, optionIndex) => (
            <button
              type="button" role="option" aria-selected={option.value === value} key={option.value}
              ref={(element) => { optionRefs.current[optionIndex] = element; }}
              onClick={() => { onChange(option.value); popover.close(); }}
            >
              {option.label}{option.value === value && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DatePicker({ label, value, onChange, min, canClear, id }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  canClear?: boolean;
  id?: string;
}) {
  const { locale } = useLocale();
  const popover = usePopover();
  const labelId = useId();
  const calendarId = useId();
  const today = todayIn();
  const startingDate = value || (min && min > today ? min : today);
  const [month, setMonth] = useState(() => dateInUtc(`${startingDate.slice(0, 7)}-01`));
  const [focused, setFocused] = useState(startingDate);
  const dateRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const daysInMonth = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
  const firstColumn = (month.getUTCDay() + 6) % 7;
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(month);
    date.setUTCDate(index + 1);
    return isoDate(date);
  });

  function show() {
    if (popover.open) { popover.close(); return; }
    setMonth(dateInUtc(`${startingDate.slice(0, 7)}-01`));
    setFocused(startingDate);
    popover.setOpen(true);
    requestAnimationFrame(() => dateRefs.current[startingDate]?.focus());
  }

  function moveMonth(offset: number) {
    const next = new Date(month);
    next.setUTCMonth(month.getUTCMonth() + offset);
    if (min && isoDate(new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0))) < min) return;
    setMonth(next);
    setFocused(days.includes(focused) ? isoDate(next) : focused);
  }

  function navigate(event: KeyboardEvent, date: string) {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    const next = dateInUtc(date);
    next.setUTCDate(next.getUTCDate() + offsets[event.key]);
    const nextIso = isoDate(next);
    if (min && nextIso < min) return;
    next.setUTCDate(1);
    setMonth(next);
    setFocused(nextIso);
    requestAnimationFrame(() => dateRefs.current[nextIso]?.focus());
  }

  const weekdayLabels = locale === "sq" ? ["Hën", "Mar", "Mër", "Enj", "Pre", "Sht", "Die"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const showValue = value ? formatDate(value, locale) : locale === "sq" ? "Zgjidh datën" : "Choose a date";
  const tabbableDate = days.includes(focused) && (!min || focused >= min) ? focused : days.find((date) => !min || date >= min);

  return (
    <div className="control-wrap" ref={popover.root} onBlur={(event) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) popover.setOpen(false);
    }}>
      <button type="button" className="control-button date-trigger" ref={popover.trigger} id={id}
        aria-label={`${label}: ${showValue}`} aria-expanded={popover.open} aria-haspopup="dialog" aria-controls={calendarId}
        onClick={show}>
        <CalendarDays size={16}/><span className={value ? "" : "control-placeholder"}>{showValue}</span>
        <ChevronDown size={14} className="control-chevron"/>
      </button>
      {popover.open && (
        <div className="date-popover" role="dialog" id={calendarId} aria-labelledby={labelId} onKeyDown={(event) => {
          if (event.key === "Escape") { event.stopPropagation(); event.preventDefault(); popover.close(); }
        }}>
          <div className="date-month">
            <button type="button" className="icon-button" onClick={() => moveMonth(-1)} aria-label={locale === "sq" ? "Muaji i kaluar" : "Previous month"}
              disabled={Boolean(min && isoDate(month).slice(0, 7) <= min.slice(0, 7))}><ChevronLeft size={16}/></button>
            <b id={labelId} aria-live="polite">{formatDate(isoDate(month), locale, { month: "long", year: "numeric" })}</b>
            <button type="button" className="icon-button" onClick={() => moveMonth(1)} aria-label={locale === "sq" ? "Muaji tjetër" : "Next month"}><ChevronRight size={16}/></button>
          </div>
          <div className="date-grid">
            {weekdayLabels.map((day) => <span className="weekday" key={day}>{day}</span>)}
            {Array.from({ length: firstColumn }, (_, index) => <span key={index}/>)}
            {days.map((day) => (
              <button type="button" className="date-cell" key={day} aria-pressed={day === value}
                aria-label={formatDate(day, locale, { dateStyle: "full" })}
                aria-current={day === today ? "date" : undefined}
                disabled={Boolean(min && day < min)} tabIndex={day === tabbableDate ? 0 : -1}
                ref={(element) => { dateRefs.current[day] = element; }}
                onClick={() => { onChange(day); popover.close(); }}
                onKeyDown={(event) => navigate(event, day)}>{Number(day.slice(-2))}</button>
            ))}
          </div>
          <div className="date-quick">
            <button type="button" className="text-button" disabled={Boolean(min && today < min)}
              onClick={() => { onChange(today); popover.close(); }}>{common[locale].today}</button>
            {canClear && value && <button type="button" className="text-button" onClick={() => { onChange(""); popover.close(); }}>{common[locale].clear}</button>}
          </div>
        </div>
      )}
    </div>
  );
}
