import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getUserSettings } from "@/lib/actions/settings";
import { LocaleProvider } from "@/components/locale-provider";
import type { Locale } from "@/lib/i18n";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PLATE LAB",
  description: "Sample Plate Management",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getUserSettings();
  const locale: Locale = settings?.language === "ja" ? "ja" : "en";
  const appearance = settings?.appearance ?? "light";
  const isDark = appearance === "dark";
  const isSystem = appearance === "system";

  return (
    <html
      lang={locale}
      className={isDark ? "dark" : ""}
      data-theme={isSystem ? "system" : undefined}
      suppressHydrationWarning
    >
      <head>
        {isSystem && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{if(window.matchMedia('(prefers-color-scheme:dark)').matches){document.documentElement.classList.add('dark')}}catch(e){}})()`,
            }}
          />
        )}
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <LocaleProvider locale={locale}>
          <div className="mx-auto min-h-dvh max-w-[402px] bg-bg-primary">
            {children}
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
