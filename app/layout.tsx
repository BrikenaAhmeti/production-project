import type { Metadata } from "next";
import { cookies } from "next/headers";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import { LocaleProvider } from "@/components/locale";
import { localeCookie } from "@/lib/i18n";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await cookies()).get(localeCookie)?.value === "en";
  const description = en
    ? "Go Production is a photography and film studio for weddings, portraits, brands and stories in motion."
    : "Go Production është studio fotografie dhe filmi për dasma, portrete, brende dhe histori në lëvizje.";
  return {
    ...(process.env.APP_ORIGIN ? { metadataBase: new URL(process.env.APP_ORIGIN) } : {}),
    title: { default: en ? "Go Production — Photography & Film" : "Go Production — Fotografi & Film", template: "%s · Go Production" },
    description,
    openGraph: {
      type: "website", siteName: "Go Production", description,
      title: en ? "Go Production — Photography & Film" : "Go Production — Fotografi & Film",
      ...(process.env.APP_ORIGIN ? { images: ["/images/go-hero.webp"] } : {}),
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = (await cookies()).get(localeCookie)?.value === "en" ? "en" : "sq";
  return (
    <html lang={locale}>
      <body suppressHydrationWarning><LocaleProvider initial={locale}>{children}</LocaleProvider></body>
    </html>
  );
}
