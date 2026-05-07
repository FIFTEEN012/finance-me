import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono, Anuphan } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Providers } from "@/components/shared/Providers";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FinanceMe — บริหารการเงินส่วนตัว",
  description: "ระบบบริหารจัดการการเงินส่วนบุคคล",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FinanceMe",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${jakarta.variable} ${geistMono.variable} ${anuphan.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#7c3aed" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="min-h-full" suppressHydrationWarning>
        <Providers>
          <AppShell>{children}</AppShell>
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
