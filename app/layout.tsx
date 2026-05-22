import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LearnFurqan — Learn Quran Online with Certified Teachers Worldwide",
  description:
    "Live one-on-one Quran classes for kids and adults. Flexible schedules, verified teachers, proven results. Start your free trial today.",
  keywords: [
    "Quran online",
    "Quran teacher",
    "Tajweed",
    "Hifz",
    "Islamic learning",
    "Quran classes for kids",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "LearnFurqan",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "LearnFurqan — Learn Quran Online",
    description:
      "Live one-on-one Quran classes with certified teachers worldwide.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a2e1e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tree = (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen overflow-x-clip bg-background text-foreground font-sans antialiased">
        <div className="page-transition">{children}</div>
        <ServiceWorkerRegister />
      </body>
    </html>
  );

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#0a2e1e",
          colorText: "#0a2e1e",
          borderRadius: "0.75rem",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        },
      }}
    >
      {tree}
    </ClerkProvider>
  );
}
