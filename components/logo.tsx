import type { SVGProps } from "react";

export function GoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 44 44" fill="none" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M22 3.5h15.5l-5.9 6.3H22a12.2 12.2 0 1 0 0 24.4h1.8l-5.5 6a18.5 18.5 0 0 1 3.7-36.7Z"/>
      <path fill="currentColor" d="M25.4 17.6h15.1v14.9h-6.2v-4.4L23.9 39.5h-8.4L32 21.4h-10l3.4-3.8Z"/>
    </svg>
  );
}

export function Logo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <a href={href} aria-label="Go Production" className={`wordmark ${className}`}>
      <GoMark className="wordmark-symbol" />
      <span className="wordmark-title" aria-hidden="true">GO<span>PRODUCTION</span></span>
    </a>
  );
}
