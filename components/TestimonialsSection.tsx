"use client";

import { Star } from "lucide-react";
import { Reveal } from "./ui/Reveal";
import { Flag } from "./ui/Flag";

type Testimonial = {
  initials: string;
  name: string;
  location: string;
  flag: string;
  quote: string;
  bg: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    initials: "SM",
    name: "Sarah M.",
    location: "USA",
    flag: "us",
    quote:
      "My daughter has memorized 3 surahs in just 2 months. The teacher is amazing and so patient with kids.",
    bg: "from-primary to-primary-700",
  },
  {
    initials: "AK",
    name: "Abdullah K.",
    location: "UK",
    flag: "gb",
    quote:
      "Finally a platform that feels modern and professional. Booking is easy and teachers are top quality.",
    bg: "from-accent to-accent-600",
  },
  {
    initials: "FR",
    name: "Fatima R.",
    location: "Canada",
    flag: "ca",
    quote:
      "As a revert Muslim, I was nervous to start. My teacher made me feel so comfortable. Highly recommend.",
    bg: "from-primary-700 to-primary-900",
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="bg-pattern-islamic-soft py-20 md:py-28">
      <div className="container">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-700">
              Testimonials
            </span>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              What parents are saying
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Real stories from families learning with LearnFurqan.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <TestimonialCard t={t} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div className="group relative flex h-full flex-col rounded-3xl border border-border bg-white p-7 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-card">
      <div className="flex items-center gap-1 text-accent">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-current" />
        ))}
      </div>
      <p className="mt-5 flex-1 text-[15px] leading-relaxed text-foreground/85">
        “{t.quote}”
      </p>
      <div className="mt-6 flex items-center gap-3 border-t border-border/70 pt-5">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${t.bg} text-sm font-bold text-white`}
        >
          {t.initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{t.name}</p>
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flag code={t.flag} size="sm" label={t.location} />
            {t.location}
          </p>
        </div>
      </div>
    </div>
  );
}
