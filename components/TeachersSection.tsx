"use client";

import Link from "next/link";
import { Star, Clock } from "lucide-react";
import { Reveal } from "./ui/Reveal";
import { Button } from "./ui/button";
import { Flag } from "./ui/Flag";

type Teacher = {
  initials: string;
  name: string;
  specialization: string;
  country: string;
  flag: string;
  experience: string;
  price: string;
  rating: number;
  bg: string;
  slug: string;
};

const TEACHERS: Teacher[] = [
  {
    initials: "AH",
    name: "Ustadh Ahmad",
    specialization: "Tajweed & Hifz",
    country: "Egypt",
    flag: "eg",
    experience: "8 years",
    price: "$15/hr",
    rating: 4.9,
    bg: "from-primary to-primary-700",
    slug: "ustadh-ahmad-ali",
  },
  {
    initials: "FA",
    name: "Sister Fatima",
    specialization: "Quran for Kids",
    country: "Pakistan",
    flag: "pk",
    experience: "5 years",
    price: "$12/hr",
    rating: 4.8,
    bg: "from-accent to-accent-600",
    slug: "sister-fatima-malik",
  },
  {
    initials: "OM",
    name: "Sheikh Omar",
    specialization: "Arabic & Tafseer",
    country: "Jordan",
    flag: "jo",
    experience: "12 years",
    price: "$20/hr",
    rating: 5.0,
    bg: "from-primary-700 to-primary-900",
    slug: "sheikh-omar-hassan",
  },
  {
    initials: "MA",
    name: "Ustadha Maryam",
    specialization: "Female Students Only",
    country: "Malaysia",
    flag: "my",
    experience: "6 years",
    price: "$14/hr",
    rating: 4.9,
    bg: "from-accent-600 to-accent-700",
    slug: "ustadha-maryam-yusuf",
  },
];

export function TeachersSection() {
  return (
    <section id="teachers" className="py-20 md:py-28">
      <div className="container">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              Our Teachers
            </span>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Learn from the best teachers worldwide
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Every teacher is hand-vetted, certified, and reviewed by parents.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TEACHERS.map((teacher, i) => (
            <Reveal key={teacher.name} delay={i * 0.06}>
              <TeacherCard teacher={teacher} />
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <div className="mt-12 flex justify-center">
            <Link href="/teachers" className="contents">
              <Button variant="outline" size="lg">
                Browse All Teachers
              </Button>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function TeacherCard({ teacher }: { teacher: Teacher }) {
  return (
    <div className="group h-full overflow-hidden rounded-3xl border border-border bg-white shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-card">
      <div
        className={`relative h-24 bg-gradient-to-br ${teacher.bg} px-6`}
        aria-hidden
      >
        <div className="absolute -bottom-9 left-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-[#0a2e1e] bg-white text-2xl font-bold text-primary shadow-soft ring-4 ring-white">
            {teacher.initials}
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 pt-12">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-heading text-lg font-semibold text-foreground">
              {teacher.name}
            </h3>
            <p className="truncate text-sm text-primary">
              {teacher.specialization}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent-700">
            <Star className="h-3 w-3 fill-current" />
            {teacher.rating.toFixed(1)}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Flag code={teacher.flag} size="sm" label={teacher.country} />
            {teacher.country}
          </span>
          <span className="text-border">•</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {teacher.experience}
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4">
          <div>
            <p className="font-heading text-lg font-bold text-foreground">
              {teacher.price}
            </p>
            <p className="text-[11px] text-muted-foreground">starting from</p>
          </div>
          <Link href={`/teachers/${teacher.slug}`} className="contents">
            <Button variant="outline" size="sm">
              View Profile
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
