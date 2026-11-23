import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = { title: "Studio", robots: { index: false, follow: false } };

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
