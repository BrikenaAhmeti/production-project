"use client";

import { useEffect, useRef, type RefObject } from "react";

export const exposureStart = .34;

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function easeBetween(value: number, start: number, end: number) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

export function useCameraMotion(
  stage: RefObject<HTMLDivElement | null>,
  hero: RefObject<HTMLElement | null>,
  onBeforeExposure: () => void,
) {
  const progress = useRef(0);

  useEffect(() => {
    const track = stage.current;
    const scene = hero.current;
    if (!track || !scene) return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previousTime = 0;
    let start = 0;
    let distance = 1;
    let outOfView = 0;

    function paint(value: number) {
      if (!scene) return;
      progress.current = value;
      if (value < exposureStart) onBeforeExposure();
      scene.style.setProperty("--camera-push", easeBetween(value, .015, .68).toFixed(4));
      scene.style.setProperty("--camera-fade", easeBetween(value, .47, .81).toFixed(4));
      scene.style.setProperty("--copy-fade", easeBetween(value, .095, .39).toFixed(4));
      scene.style.setProperty("--image-exposure", easeBetween(value, exposureStart, .73).toFixed(4));
      scene.style.setProperty("--image-credit", easeBetween(value, .64, .85).toFixed(4));
      const unfolded = value >= .39 ? "true" : "false";
      if (scene.dataset.unfolded !== unfolded) scene.dataset.unfolded = unfolded;
      const exposed = value >= .81 ? "true" : "false";
      if (scene.dataset.exposed !== exposed) scene.dataset.exposed = exposed;
    }

    function update(time: number) {
      const position = window.scrollY;
      const target = clamp((position - start) / distance);
      const elapsed = previousTime ? Math.min(time - previousTime, 40) : 16;
      previousTime = time;
      const difference = target - progress.current;
      // A short time-based settle smooths trackpad and wheel input at different refresh rates.
      const done = Math.abs(difference) < .001 || position >= outOfView;
      paint(done ? target : progress.current + difference * (1 - Math.exp(-elapsed / 42)));
      frame = done ? 0 : requestAnimationFrame(update);
    }

    function schedule() {
      if (frame || preference.matches || clamp((window.scrollY - start) / distance) === progress.current) return;
      previousTime = 0;
      frame = requestAnimationFrame(update);
    }

    function measure() {
      if (!track || !scene) return;
      const position = window.scrollY;
      const box = track.getBoundingClientRect();
      const stickyTop = Number.parseFloat(getComputedStyle(scene).top) || 0;
      start = position + box.top - stickyTop;
      distance = Math.max(1, box.height - scene.offsetHeight);
      outOfView = position + box.bottom - stickyTop;
      paint(preference.matches ? 0 : clamp((position - start) / distance));
    }

    function reset() {
      cancelAnimationFrame(frame);
      frame = 0;
      measure();
    }

    const observer = new ResizeObserver(measure);
    observer.observe(track);
    observer.observe(scene);
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", reset);
    preference.addEventListener("change", reset);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", reset);
      preference.removeEventListener("change", reset);
    };
  }, [stage, hero, onBeforeExposure]);

  return progress;
}
