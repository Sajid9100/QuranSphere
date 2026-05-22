"use client";

import { Logo } from "./ui/Logo";

const COLUMNS: {
  title: string;
  links: { label: string; href: string }[];
}[] = [
  {
    title: "Platform",
    links: [
      { label: "How it Works", href: "/how-it-works" },
      { label: "Courses", href: "/courses" },
      { label: "Browse Teachers", href: "/teachers" },
      { label: "For Parents", href: "/for-parents" },
    ],
  },
  {
    title: "For Teachers",
    links: [
      { label: "Become a Teacher", href: "/become-a-teacher" },
      { label: "Apply to Teach", href: "/become-a-teacher/apply" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Programs",
    links: [
      { label: "Tajweed", href: "/categories/tajweed" },
      { label: "Hifz", href: "/categories/hifz-program" },
      { label: "Kids", href: "/categories/kids-program" },
    ],
  },
  {
    title: "Contact",
    links: [
      { label: "Support", href: "/support" },
      { label: "FAQ", href: "/faq" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-white">
      <div className="container py-10 md:py-12">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Connecting students with Quran teachers worldwide.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8 lg:col-span-8">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="font-heading text-sm font-semibold text-foreground">
                  {col.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-border/70 pt-6 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            © 2025 LearnFurqan. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <a href="/privacy-policy" className="hover:text-primary">
              Privacy Policy
            </a>
            <a href="/terms-of-service" className="hover:text-primary">
              Terms of Service
            </a>
            <a href="/cookie-policy" className="hover:text-primary">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
