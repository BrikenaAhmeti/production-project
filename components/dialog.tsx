"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { common } from "@/lib/i18n";
import { useLocale } from "./locale";

export function Dialog({ children, title, onClose, className = "" }: {
  children: ReactNode;
  title: string;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const { locale } = useLocale();
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.showModal();
    return () => element.close();
  }, []);

  return (
    <dialog
      className={`dialog ${className}`}
      ref={ref}
      aria-labelledby={id}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="dialog-inner">
        <header className="dialog-header">
          <h2 id={id}>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label={common[locale].close}><X size={19}/></button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
