"use client";

import {
  Video,
  UserCheck,
  CalendarClock,
  LineChart,
  Gamepad2,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "./ui/Reveal";

type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
};

const FEATURES: Feature[] = [
  {
    title: "Live One-on-One Classes",
    description:
      "Personalized attention from your dedicated teacher in HD video classes built for focused learning.",
    icon: Video,
  },
  {
    title: "Female Teachers Available",
    description:
      "Verified female teachers for sisters and young girls who prefer same-gender instruction.",
    icon: UserCheck,
  },
  {
    title: "Flexible Scheduling",
    description:
      "Book classes that fit your timezone and life — reschedule with one click, no penalties.",
    icon: CalendarClock,
  },
  {
    title: "Progress Tracking",
    description:
      "Detailed reports on attendance, memorization, and Tajweed milestones for every student.",
    icon: LineChart,
  },
  {
    title: "Kids Gamification",
    description:
      "Stars, streaks, and rewards keep children excited to attend their next Quran class.",
    icon: Gamepad2,
  },
  {
    title: "Parent Dashboard",
    description:
      "See every lesson, track memorization progress, and stay connected with your child's Quran teacher.",
    icon: LayoutDashboard,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="container">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              Features
            </span>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Everything you need to{" "}
              <span className="text-gradient-primary">learn Quran online</span>
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Tools, teachers, and a learning experience designed for the
              modern Muslim family.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 0.05}>
              <FeatureCard {...feature} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ title, description, icon: Icon, badge }: Feature) {
  return (
    <div className="group relative h-full rounded-3xl border border-border bg-white p-7 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-card">
      <div className="relative">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-white">
          <Icon className="h-6 w-6" />
        </div>
        {badge && (
          <span className="absolute -top-1 left-16 rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-700">
            {badge}
          </span>
        )}
      </div>
      <h3 className="mt-6 font-heading text-xl font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
