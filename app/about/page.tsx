import Link from "next/link";
import {
  ShieldCheck,
  CalendarClock,
  Wallet,
  ArrowRight,
  Building2,
  BookOpen,
  Globe,
  Users,
  Star,
  Handshake,
  CheckCircle,
  type LucideIcon,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "About LearnFurqan — Our Story, Mission & Team",
  description:
    "LearnFurqan connects thousands of students worldwide with certified Quran and Islamic teachers. Learn about our mission, values, and the team behind the platform.",
};

const HERO_STATS = [
  { value: "10,000+", label: "Students" },
  { value: "1,200+", label: "Teachers" },
  { value: "50+", label: "Countries" },
];

const MISSION_CARDS: {
  icon: LucideIcon;
  title: string;
  desc: string;
  bullets: string[];
}[] = [
  {
    icon: ShieldCheck,
    title: "Verified Teachers",
    desc: "Every instructor is vetted for credentials, Tajweed mastery, and teaching ability.",
    bullets: [
      "Manual verification process",
      "Tajweed & Ijazah certified",
      "Background checked",
    ],
  },
  {
    icon: CalendarClock,
    title: "Flexible Scheduling",
    desc: "Book lessons that fit your life — across every time zone, day or night.",
    bullets: [
      "Book 24/7 online",
      "Reschedule anytime",
      "Any timezone worldwide",
    ],
  },
  {
    icon: Wallet,
    title: "Affordable Pricing",
    desc: "Quality Quran education at a price that works for families everywhere.",
    bullets: [
      "Starting from $5/lesson",
      "No subscription required",
      "Free trial lesson included",
    ],
  },
];

const BIG_STATS = [
  { value: "10,000+", label: "Active Students" },
  { value: "1,200+", label: "Certified Teachers" },
  { value: "50+", label: "Countries Reached" },
  { value: "4.9/5", label: "Average Rating" },
];

const VALUES: { Icon: LucideIcon; title: string; desc: string }[] = [
  {
    Icon: Building2,
    title: "Islamic Integrity",
    desc: "Every teacher is verified and every lesson upholds Islamic values.",
  },
  {
    Icon: BookOpen,
    title: "Quality Education",
    desc: "Structured curriculum designed by Islamic scholars.",
  },
  {
    Icon: Globe,
    title: "Global Access",
    desc: "Students from 50+ countries learn on LearnFurqan.",
  },
  {
    Icon: Users,
    title: "Family First",
    desc: "Safe, family-friendly environment for all ages.",
  },
  {
    Icon: Star,
    title: "Proven Results",
    desc: "Thousands of students have completed Hifz and Tajweed programs.",
  },
  {
    Icon: Handshake,
    title: "Teacher Support",
    desc: "We invest in our teachers with training and fair compensation.",
  },
];

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#c9a84c]/40 bg-[#c9a84c]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6f2a]">
      {children}
    </span>
  );
}

export default function AboutPage() {
  return (
    <main className="relative bg-white">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden bg-pattern-islamic pb-8 pt-16 md:pb-12 md:pt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-gradient-to-b from-[#0a2e1e]/[0.06] to-transparent"
        />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <Badge>Our Story</Badge>
            <h1 className="mt-6 font-heading text-4xl font-bold leading-tight tracking-tight text-[#0a2e1e] sm:text-5xl md:text-6xl">
              Making Quran Education{" "}
              <span className="bg-gradient-to-r from-[#0a2e1e] via-[#0a2e1e] to-[#c9a84c] bg-clip-text text-transparent">
                Accessible to All
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-gray-600 sm:text-lg">
              LearnFurqan connects thousands of students worldwide with
              certified Quran and Islamic teachers — from the comfort of home.
            </p>

            <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
              {HERO_STATS.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#c9a84c] hover:shadow-lg sm:p-8"
                >
                  <div className="font-heading text-3xl font-bold text-[#0a2e1e] sm:text-4xl">
                    {s.value}
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-600">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section className="bg-pattern-islamic pb-20 pt-8 md:pb-28 md:pt-12">
        <div className="container">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <Badge>Our Mission</Badge>
              <h2 className="mt-5 font-heading text-3xl font-bold leading-tight text-[#0a2e1e] sm:text-4xl md:text-[2.75rem]">
                Bringing the Light of Quran to Every Home
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600 sm:text-lg">
                We believe every Muslim — regardless of age, location, or
                background — deserves access to quality Quran education.
                LearnFurqan was founded to remove the barriers of geography,
                cost, and availability that prevent millions from learning.
              </p>
              <div className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#0a2e1e]">
                <span className="h-px w-10 bg-[#c9a84c]" />
                Founded with purpose, built with intention
              </div>
            </div>

            <div className="flex flex-col gap-5">
              {MISSION_CARDS.map((card) => (
                <div
                  key={card.title}
                  className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#c9a84c] hover:shadow-md"
                >
                  <div className="flex items-start gap-5">
                    <div className="flex shrink-0 items-center justify-center rounded-xl bg-[#e8efec] p-3 text-[#0a2e1e]">
                      <card.icon className="h-10 w-10" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-heading text-xl font-semibold text-[#0a2e1e]">
                        {card.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">
                        {card.desc}
                      </p>
                      <ul className="mt-4 space-y-2">
                        {card.bullets.map((b) => (
                          <li
                            key={b}
                            className="flex items-start gap-2 text-sm text-gray-700"
                          >
                            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#c9a84c]" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="relative overflow-hidden bg-[#0a2e1e] py-20 md:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #c9a84c 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="container relative">
          <div className="grid grid-cols-2 gap-y-12 md:grid-cols-4 md:gap-x-8">
            {BIG_STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-heading text-4xl font-bold tracking-tight text-[#c9a84c] sm:text-5xl">
                  {s.value}
                </div>
                <div className="mt-2 text-sm font-medium uppercase tracking-wider text-white/70 sm:text-base sm:tracking-normal sm:normal-case">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="bg-pattern-islamic py-20 md:py-28">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Badge>Our Values</Badge>
            <h2 className="mt-5 font-heading text-3xl font-bold text-[#0a2e1e] sm:text-4xl md:text-5xl">
              What We Stand For
            </h2>
            <p className="mt-4 text-base text-gray-600 sm:text-lg">
              The principles that guide every decision we make.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="group relative rounded-2xl border border-gray-200/80 bg-white p-7 transition-all hover:-translate-y-1 hover:border-[#c9a84c]/40 hover:shadow-xl"
              >
                <div
                  aria-hidden
                  className="absolute inset-x-7 top-0 h-0.5 origin-left scale-x-0 bg-[#c9a84c] transition-transform duration-300 group-hover:scale-x-100"
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0a2e1e]/[0.06] text-[#0a2e1e]">
                  <v.Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-heading text-lg font-semibold text-[#0a2e1e]">
                  {v.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-pattern-islamic py-20 md:py-24">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#ecfdf5] via-[#f0fdf4] to-[#fef9e7] px-8 py-16 text-center sm:px-12 md:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#c9a84c]/15 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-[#0a2e1e]/10 blur-3xl"
            />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-heading text-3xl font-bold leading-tight text-[#0a2e1e] sm:text-4xl md:text-5xl">
                Ready to Start Your Journey?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-gray-600 sm:text-lg">
                Join thousands of students learning with certified teachers on
                LearnFurqan today.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/teachers" className="contents">
                  <Button size="lg" className="w-full sm:w-auto">
                    Find a Teacher
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/become-a-teacher" className="contents">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Become a Teacher
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
