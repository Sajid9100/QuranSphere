"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Languages,
  Plus,
  Sparkles,
  Star,
  Upload,
  User2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/categories";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const COUNTRIES = [
  "Pakistan",
  "India",
  "Bangladesh",
  "Egypt",
  "Saudi Arabia",
  "United Arab Emirates",
  "Turkey",
  "Indonesia",
  "Malaysia",
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "Morocco",
  "Algeria",
  "Tunisia",
  "Jordan",
  "Palestine",
  "Yemen",
  "Sudan",
  "Nigeria",
  "South Africa",
  "France",
  "Germany",
  "Other",
];

const COUNTRY_TIMEZONE: Record<string, string> = {
  Pakistan: "GMT+5",
  India: "GMT+5",
  Bangladesh: "GMT+5",
  Egypt: "GMT+2",
  "Saudi Arabia": "GMT+3",
  "United Arab Emirates": "GMT+3",
  Jordan: "GMT+3",
  Palestine: "GMT+3",
  Yemen: "GMT+3",
  Sudan: "GMT+2",
  Turkey: "GMT+3",
  Malaysia: "GMT+8",
  Indonesia: "GMT+8",
  "United Kingdom": "GMT+0",
  "United States": "GMT-5",
  Canada: "GMT-5",
  Australia: "GMT+10",
  France: "GMT+0",
  Germany: "GMT+0",
  Morocco: "GMT+0",
  Algeria: "GMT+0",
  Tunisia: "GMT+0",
};

const LANGUAGE_OPTIONS = ["Urdu", "English", "Arabic", "Pashto", "Other"];

const YEARS_EXPERIENCE = [
  "Less than 1 year",
  "1 – 3 years",
  "3 – 5 years",
  "5 – 10 years",
  "10+ years",
];

const YEARS_TO_NUM: Record<string, number> = {
  "Less than 1 year": 0,
  "1 – 3 years": 2,
  "3 – 5 years": 4,
  "5 – 10 years": 7,
  "10+ years": 10,
};

const DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"] as const;
type DayName = (typeof DAYS)[number];

const DAY_TO_KEY: Record<DayName, "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"> = {
  Sat: "sat",
  Sun: "sun",
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
};

const TIMEZONES = [
  "GMT+5 · Asia/Karachi",
  "GMT+3 · Asia/Riyadh",
  "GMT+4 · Asia/Dubai",
  "GMT+0 · Europe/London",
  "GMT-5 · America/New_York",
  "GMT-8 · America/Los_Angeles",
];

const STEPS = [
  "Personal Info",
  "Profile Photo",
  "Teaching Subjects",
  "Certifications",
  "About You",
  "Intro Video",
  "Availability",
  "Pricing",
];

const COMMISSION_RATE = 0.2;
const TOTAL_STEPS = 8;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const inputCls =
  "w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30";
const labelCls = "mb-1.5 block text-sm font-medium text-foreground";
const errorCls = "border-red-500 ring-2 ring-red-500/20";

function timeOptions(): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (let h = 6; h <= 23; h++) {
    for (const m of [0, 30]) {
      const hh = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? "AM" : "PM";
      out.push({
        label: `${hh}:${m === 0 ? "00" : "30"} ${ampm}`,
        value: `${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`,
      });
    }
  }
  return out;
}
const TIMES = timeOptions();

const yearOptions = (() => {
  const ys: number[] = [];
  for (let y = 2026; y >= 1980; y--) ys.push(y);
  return ys;
})();

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type Subject = { name: string; level: "Beginner" | "Intermediate" | "Expert" };
type Cert = { name: string; issuedBy: string; year: string; file: File | null };
type Slot = { from: string; to: string };
type DaysMap = Partial<Record<DayName, Slot[]>>;

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function ApplyForm() {
  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  // Step 1
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [headline, setHeadline] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [gender, setGender] = useState("");

  // Step 2
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");

  // Step 3
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [yearsExperience, setYearsExperience] = useState("");

  // Step 4
  const [noCert, setNoCert] = useState(false);
  const [certs, setCerts] = useState<Cert[]>([
    { name: "", issuedBy: "", year: "", file: null },
  ]);
  const [university, setUniversity] = useState("");
  const [degree, setDegree] = useState("");
  const [degreeYear, setDegreeYear] = useState("");
  const [diploma, setDiploma] = useState<File | null>(null);

  // Step 5
  const [bio, setBio] = useState("");

  // Step 6
  const [videoLink, setVideoLink] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // Step 7
  const [timezone, setTimezone] = useState("GMT+5 · Asia/Karachi");
  const [days, setDays] = useState<DaysMap>({});

  // Step 8
  const [duration, setDuration] = useState<"" | "30" | "45" | "60">("");
  const [lessonPrice, setLessonPrice] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);

  // UI state
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const timezoneTouched = useRef(false);
  const stepperRef = useRef<HTMLDivElement>(null);

  // Auto-set timezone from country
  useEffect(() => {
    if (!country || timezoneTouched.current) return;
    const tz = COUNTRY_TIMEZONE[country];
    if (!tz) return;
    const match = TIMEZONES.find((t) => t.startsWith(tz));
    if (match) setTimezone(match);
  }, [country]);

  // Revoke object URL on cleanup
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  /* ---------------------------- Validation ------------------------------ */

  function setErr(key: string, bad: boolean) {
    setErrors((p) => {
      const next = { ...p };
      if (bad) next[key] = true;
      else delete next[key];
      return next;
    });
  }

  function validateStep(n: number): boolean {
    const errs: Record<string, boolean> = {};
    if (n === 1) {
      if (!fullName.trim()) errs.fullName = true;
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = true;
      if (!phone.trim()) errs.phone = true;
      if (!country) errs.country = true;
      if (!gender) errs.gender = true;
      if (!headline.trim()) errs.headline = true;
      if (languages.length === 0) errs.languages = true;
    }
    if (n === 3) {
      if (subjects.length === 0) errs.subjects = true;
      if (!yearsExperience) errs.yearsExperience = true;
    }
    if (n === 5) {
      if (bio.trim().length < 300) errs.bio = true;
    }
    if (n === 7) {
      const anyDay = Object.values(days).some(
        (slots) => slots && slots.length > 0
      );
      if (!anyDay) errs.availability = true;
    }
    if (n === 8) {
      if (!duration) errs.duration = true;
      const price = Number(lessonPrice);
      if (!Number.isFinite(price) || price <= 0) errs.lessonPrice = true;
      if (!agreedTerms) errs.terms = true;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /* ---------------------------- Navigation ----------------------------- */

  function goToStep(n: number) {
    if (n < 1 || n > TOTAL_STEPS) return;
    if (n > step) {
      if (!validateStep(step)) return;
      stepperRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setCompleted((p) => new Set(p).add(step));
    }
    setErrors({});
    setStep(n);
  }
  function next() {
    goToStep(step + 1);
  }
  function back() {
    goToStep(step - 1);
  }

  /* ---------------------------- Submit --------------------------------- */

  async function submit() {
    if (!validateStep(8)) return;
    setSubmitError(null);
    setLoading(true);

    const schedule: Record<string, Slot | null> = {
      mon: null,
      tue: null,
      wed: null,
      thu: null,
      fri: null,
      sat: null,
      sun: null,
    };
    for (const d of DAYS) {
      const slots = days[d];
      if (slots && slots.length > 0) {
        schedule[DAY_TO_KEY[d]] = slots[0];
      }
    }
    const availabilityJson = JSON.stringify({
      timezone,
      schedule,
      // Pass full multi-slot data too in case reviewers want detail
      slots: days,
    });

    const certsText = noCert
      ? "No formal certificate"
      : certs
          .filter((c) => c.name.trim())
          .map(
            (c) =>
              `${c.name}${c.issuedBy ? ` — ${c.issuedBy}` : ""}${
                c.year ? ` (${c.year})` : ""
              }${c.file ? ` [file: ${c.file.name}]` : ""}`
          )
          .join("; ");
    const eduText = university
      ? `\nEducation: ${degree || ""} at ${university}${
          degreeYear ? ` (${degreeYear})` : ""
        }`
      : "";

    const subjectLevels = subjects
      .map((s) => `${s.name} (${s.level})`)
      .join(", ");

    const pricingNote =
      duration && lessonPrice
        ? `Trial lesson: FREE | Standard rate: $${lessonPrice} per ${duration} min`
        : "";

    const meta = [
      headline ? `Headline: ${headline}` : "",
      gender ? `Gender: ${gender}` : "",
      subjectLevels ? `Subject levels: ${subjectLevels}` : "",
      videoFile ? `Video file uploaded: ${videoFile.name}` : "",
      photo ? `Photo uploaded: ${photo.name}` : "",
      pricingNote,
    ]
      .filter(Boolean)
      .join("\n");

    const fullMessage = `${bio}\n\n---\n${meta}`.trim();

    try {
      const res = await fetch("/api/teachers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email,
          phone,
          country,
          subject: subjects.map((s) => s.name),
          experience_years: YEARS_TO_NUM[yearsExperience] ?? 0,
          certifications: certsText + eduText,
          demo_video_url: videoLink,
          languages,
          availability: availabilityJson,
          message: fullMessage,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data?.error || "Failed to submit application.");
        return;
      }
      setCompleted((p) => new Set(p).add(8));
      setDone(true);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------- Success -------------------------------- */

  if (done) {
    return (
      <div className="flex flex-col items-center px-4 py-16 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <Check className="h-12 w-12 text-primary" strokeWidth={3} />
        </div>
        <h2 className="mt-8 font-heading text-3xl font-bold text-foreground sm:text-4xl">
          Application Submitted!
        </h2>
        <p className="mt-3 max-w-md text-base text-muted-foreground">
          Our team will review your profile within{" "}
          <strong className="text-foreground">48 hours</strong>. You&apos;ll
          receive an email at{" "}
          <strong className="text-primary">{email}</strong> with the next steps.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/dashboard">
            <Button size="lg">Go to Dashboard</Button>
          </Link>
          <Link href="/teachers">
            <Button variant="ghost" size="lg">
              Browse teachers
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------------------- Stepper -------------------------------- */

  const progressPct = useMemo(() => {
    if (step === 1 && completed.size === 0) return 0;
    const filled = completed.size > 0 ? Math.max(...completed) : 0;
    return (Math.max(filled, step - 1) / (TOTAL_STEPS - 1)) * 100;
  }, [step, completed]);

  /* ---------------------------- Render --------------------------------- */

  return (
    <div className="space-y-8">
      {/* Stepper */}
      <div ref={stepperRef}>
        {/* Mobile-only linear progress bar */}
        <div className="mb-5 sm:hidden">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Step {step} of {TOTAL_STEPS}
            </span>
            <span className="truncate text-xs font-medium text-muted-foreground">
              {STEPS[step - 1]}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Circle stepper — smaller on mobile */}
        <div className="relative mb-6">
          <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border" />
          <div
            className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
          <div className="relative flex items-center justify-between">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const isDone = completed.has(n);
              const isCurrent = n === step;
              const canClick = isDone || n < step;
              return (
                <div key={label} className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => canClick && goToStep(n)}
                    disabled={!canClick}
                    className={[
                      "relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold transition sm:h-9 sm:w-9 sm:text-xs",
                      isDone
                        ? "border-primary bg-primary text-white"
                        : isCurrent
                          ? "border-primary bg-white text-primary shadow-[0_0_0_4px_rgba(15,118,110,0.15)]"
                          : "border-border bg-white text-muted-foreground",
                      canClick ? "cursor-pointer hover:scale-105" : "cursor-default",
                    ].join(" ")}
                    aria-label={`Go to step ${n}: ${label}`}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={3} /> : n}
                  </button>
                  <span
                    className={`mt-2 hidden text-[11px] font-medium sm:block ${
                      isCurrent || isDone
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="hidden items-end justify-between sm:flex">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Step {step} of {TOTAL_STEPS}
            </div>
            <div className="mt-0.5 font-heading text-lg font-semibold text-foreground sm:text-xl">
              {STEPS[step - 1]}
            </div>
          </div>
          {step < TOTAL_STEPS && (
            <div className="text-right">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Up next
              </div>
              <div className="mt-0.5 text-sm font-medium text-muted-foreground">
                {STEPS[step]}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">
        {step === 1 && (
          <StepPersonalInfo
            fullName={fullName}
            setFullName={setFullName}
            email={email}
            setEmail={setEmail}
            phone={phone}
            setPhone={setPhone}
            country={country}
            setCountry={setCountry}
            headline={headline}
            setHeadline={setHeadline}
            languages={languages}
            setLanguages={setLanguages}
            gender={gender}
            setGender={setGender}
            errors={errors}
            clearErr={(k) => setErr(k, false)}
          />
        )}
        {step === 2 && (
          <StepPhoto
            photo={photo}
            photoUrl={photoUrl}
            setPhoto={(f) => {
              if (photoUrl) URL.revokeObjectURL(photoUrl);
              setPhoto(f);
              setPhotoUrl(f ? URL.createObjectURL(f) : "");
            }}
            previewName={fullName}
            previewHeadline={headline}
          />
        )}
        {step === 3 && (
          <StepSubjects
            subjects={subjects}
            setSubjects={setSubjects}
            yearsExperience={yearsExperience}
            setYearsExperience={setYearsExperience}
            errors={errors}
            clearErr={(k) => setErr(k, false)}
          />
        )}
        {step === 4 && (
          <StepCertifications
            noCert={noCert}
            setNoCert={setNoCert}
            certs={certs}
            setCerts={setCerts}
            university={university}
            setUniversity={setUniversity}
            degree={degree}
            setDegree={setDegree}
            degreeYear={degreeYear}
            setDegreeYear={setDegreeYear}
            diploma={diploma}
            setDiploma={setDiploma}
          />
        )}
        {step === 5 && (
          <StepBio
            bio={bio}
            setBio={setBio}
            errors={errors}
            clearErr={(k) => setErr(k, false)}
          />
        )}
        {step === 6 && (
          <StepVideo
            videoLink={videoLink}
            setVideoLink={setVideoLink}
            videoFile={videoFile}
            setVideoFile={setVideoFile}
            onSkip={next}
          />
        )}
        {step === 7 && (
          <StepAvailability
            timezone={timezone}
            setTimezone={(tz) => {
              timezoneTouched.current = true;
              setTimezone(tz);
            }}
            days={days}
            setDays={setDays}
            errors={errors}
          />
        )}
        {step === 8 && (
          <StepPricing
            duration={duration}
            setDuration={setDuration}
            lessonPrice={lessonPrice}
            setLessonPrice={setLessonPrice}
            agreedTerms={agreedTerms}
            setAgreedTerms={setAgreedTerms}
            errors={errors}
            clearErr={(k) => setErr(k, false)}
          />
        )}
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={back}
          className={step === 1 ? "invisible" : ""}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < TOTAL_STEPS ? (
          <Button type="button" onClick={next}>
            Save & Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={submit}
            disabled={loading}
            size="lg"
          >
            {loading ? "Submitting…" : "Complete Registration"}
            {!loading && <Check className="h-4 w-4" strokeWidth={3} />}
          </Button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 1 — Personal Info                                                    */
/* -------------------------------------------------------------------------- */

function StepPersonalInfo(props: {
  fullName: string;
  setFullName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  headline: string;
  setHeadline: (v: string) => void;
  languages: string[];
  setLanguages: (v: string[]) => void;
  gender: string;
  setGender: (v: string) => void;
  errors: Record<string, boolean>;
  clearErr: (k: string) => void;
}) {
  const {
    fullName,
    setFullName,
    email,
    setEmail,
    phone,
    setPhone,
    country,
    setCountry,
    headline,
    setHeadline,
    languages,
    setLanguages,
    gender,
    setGender,
    errors,
    clearErr,
  } = props;

  function toggleLanguage(lang: string) {
    if (languages.includes(lang)) {
      setLanguages(languages.filter((l) => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
    clearErr("languages");
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
        Tell us about yourself
      </h2>
      <p className="mt-2 text-muted-foreground">
        This information will be displayed on your public teacher profile.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              clearErr("fullName");
            }}
            placeholder="e.g. Ahmad Hassan"
            className={`${inputCls} ${errors.fullName ? errorCls : ""}`}
          />
        </div>

        <div>
          <label className={labelCls}>
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearErr("email");
            }}
            placeholder="you@example.com"
            className={`${inputCls} ${errors.email ? errorCls : ""}`}
          />
        </div>

        <div>
          <label className={labelCls}>
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              clearErr("phone");
            }}
            placeholder="+92 300 1234567"
            className={`${inputCls} ${errors.phone ? errorCls : ""}`}
          />
        </div>

        <div>
          <label className={labelCls}>
            Country <span className="text-red-500">*</span>
          </label>
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              clearErr("country");
            }}
            className={`${inputCls} ${errors.country ? errorCls : ""}`}
          >
            <option value="">Select your country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>
            Gender <span className="text-red-500">*</span>
          </label>
          <div className={`flex gap-3 ${errors.gender ? "animate-pulse" : ""}`}>
            {(["Male", "Female"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setGender(g);
                  clearErr("gender");
                }}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                  gender === g
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-white text-foreground hover:border-primary/40"
                }`}
              >
                <span
                  className={`h-4 w-4 rounded-full border-2 ${
                    gender === g
                      ? "border-primary bg-primary ring-2 ring-inset ring-white"
                      : "border-border"
                  }`}
                />
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>
            Profile Headline <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            maxLength={80}
            value={headline}
            onChange={(e) => {
              setHeadline(e.target.value);
              clearErr("headline");
            }}
            placeholder="e.g. Certified Quran Teacher with 5 years experience"
            className={`${inputCls} ${errors.headline ? errorCls : ""}`}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            A short, compelling line that appears below your name.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>
            Languages you speak <span className="text-red-500">*</span>
          </label>
          <div className={`flex flex-wrap gap-2 ${errors.languages ? "animate-pulse" : ""}`}>
            {LANGUAGE_OPTIONS.map((lang) => {
              const active = languages.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-white text-foreground hover:border-primary/40"
                  }`}
                >
                  {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  {lang}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Select all that apply.
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 2 — Photo                                                            */
/* -------------------------------------------------------------------------- */

function StepPhoto(props: {
  photo: File | null;
  photoUrl: string;
  setPhoto: (f: File | null) => void;
  previewName: string;
  previewHeadline: string;
}) {
  const { photo, photoUrl, setPhoto, previewName, previewHeadline } = props;
  const requirements = [
    "Clear face visible, looking at the camera",
    "Professional, modest appearance",
    "No logos, text, or watermarks",
    "High resolution, well-lit, in focus",
    "Solo photo — no other people in frame",
  ];

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
        Upload your profile photo
      </h2>
      <p className="mt-2 text-muted-foreground">
        A clear, friendly photo helps students trust you instantly.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <label className="group relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted transition hover:border-primary hover:bg-primary/5">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
            {photoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl}
                  alt="Profile preview"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setPhoto(null);
                  }}
                  className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-foreground shadow-soft backdrop-blur transition hover:bg-white"
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary shadow-soft transition group-hover:scale-105">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="mt-4 text-sm font-semibold text-foreground">
                  Click to upload your photo
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  JPG or PNG · Max 5MB · Recommended 800×800px
                </p>
              </div>
            )}
          </label>

          <div className="mt-6 rounded-2xl border border-border bg-white p-5">
            <h3 className="text-sm font-semibold text-foreground">
              Photo requirements
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {requirements.map((r) => (
                <li key={r} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="lg:col-span-2">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Profile preview
          </div>
          <div className="mt-3 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-white p-6 shadow-soft">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-muted ring-4 ring-white">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User2 className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <p className="mt-4 text-base font-bold text-foreground">
                {previewName || "Your Name"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {previewHeadline || "Your headline will appear here"}
              </p>
              <div className="mt-4 flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
                <span className="ml-1 text-xs text-muted-foreground">
                  New teacher
                </span>
              </div>
            </div>
          </div>
          {photo && (
            <p className="mt-3 truncate text-xs text-muted-foreground">
              Selected: <span className="text-foreground">{photo.name}</span>
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 3 — Subjects                                                         */
/* -------------------------------------------------------------------------- */

function StepSubjects(props: {
  subjects: Subject[];
  setSubjects: (s: Subject[]) => void;
  yearsExperience: string;
  setYearsExperience: (v: string) => void;
  errors: Record<string, boolean>;
  clearErr: (k: string) => void;
}) {
  const { subjects, setSubjects, yearsExperience, setYearsExperience, errors, clearErr } =
    props;

  function toggleSubject(name: string) {
    const exists = subjects.find((s) => s.name === name);
    if (exists) {
      setSubjects(subjects.filter((s) => s.name !== name));
    } else {
      setSubjects([...subjects, { name, level: "Beginner" }]);
    }
    clearErr("subjects");
  }
  function setLevel(name: string, level: Subject["level"]) {
    setSubjects(subjects.map((s) => (s.name === name ? { ...s, level } : s)));
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
        What do you teach?
      </h2>
      <p className="mt-2 text-muted-foreground">
        Select all subjects you can teach. You can update these later.
      </p>

      <div
        className={`mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${
          errors.subjects ? "animate-pulse" : ""
        }`}
      >
        {CATEGORIES.map((c) => {
          const active = subjects.some((sel) => sel.name === c.name);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleSubject(c.name)}
              className={`relative flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-primary bg-primary/5 shadow-soft"
                  : "border-border bg-white hover:border-primary/40 hover:shadow-soft"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                  active
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-white"
                }`}
              >
                {active && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <div className="flex flex-1 items-start gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0a2e1e] text-[#c9a84c] shadow-inner"
                  aria-hidden
                >
                  <c.Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    {c.name}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {c.tagline}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {subjects.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-foreground">
            Set your experience level for each subject
          </h3>
          <div className="mt-4 space-y-3">
            {subjects.map((s) => (
              <div
                key={s.name}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4"
              >
                <span className="text-sm font-medium text-foreground">
                  {s.name}
                </span>
                <div className="flex gap-2">
                  {(["Beginner", "Intermediate", "Expert"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevel(s.name, lvl)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        s.level === lvl
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-white text-foreground hover:border-primary/40"
                      }`}
                    >
                      <span
                        className={`h-3 w-3 rounded-full border-2 ${
                          s.level === lvl
                            ? "border-primary bg-primary ring-2 ring-inset ring-white"
                            : "border-border"
                        }`}
                      />
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 max-w-sm">
        <label className={labelCls}>
          Years of teaching experience <span className="text-red-500">*</span>
        </label>
        <select
          value={yearsExperience}
          onChange={(e) => {
            setYearsExperience(e.target.value);
            clearErr("yearsExperience");
          }}
          className={`${inputCls} ${errors.yearsExperience ? errorCls : ""}`}
        >
          <option value="">Select range</option>
          {YEARS_EXPERIENCE.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 4 — Certifications                                                   */
/* -------------------------------------------------------------------------- */

function StepCertifications(props: {
  noCert: boolean;
  setNoCert: (v: boolean) => void;
  certs: Cert[];
  setCerts: (c: Cert[]) => void;
  university: string;
  setUniversity: (v: string) => void;
  degree: string;
  setDegree: (v: string) => void;
  degreeYear: string;
  setDegreeYear: (v: string) => void;
  diploma: File | null;
  setDiploma: (f: File | null) => void;
}) {
  const {
    noCert,
    setNoCert,
    certs,
    setCerts,
    university,
    setUniversity,
    degree,
    setDegree,
    degreeYear,
    setDegreeYear,
    diploma,
    setDiploma,
  } = props;

  function updateCert(i: number, patch: Partial<Cert>) {
    setCerts(certs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function addCert() {
    setCerts([...certs, { name: "", issuedBy: "", year: "", file: null }]);
  }
  function removeCert(i: number) {
    if (certs.length === 1) return;
    setCerts(certs.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
        Certifications &amp; Education
      </h2>
      <p className="mt-2 text-muted-foreground">
        Verified credentials boost your visibility on LearnFurqan.
      </p>

      <label className="mt-8 flex items-start gap-3 rounded-2xl border border-border bg-muted/60 p-4">
        <input
          type="checkbox"
          checked={noCert}
          onChange={(e) => setNoCert(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <div>
          <div className="text-sm font-medium text-foreground">
            I don&apos;t have a formal certificate
          </div>
          <div className="text-xs text-muted-foreground">
            That&apos;s okay — your experience and ijazah count too. Skip the
            cert section below.
          </div>
        </div>
      </label>

      {!noCert && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-foreground">Certifications</h3>
          <div className="mt-3 space-y-4">
            {certs.map((c, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Certificate {i + 1}
                  </div>
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => removeCert(i)}
                      className="text-xs font-medium text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Certificate name
                    </label>
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => updateCert(i, { name: e.target.value })}
                      placeholder="e.g. Ijazah in Tajweed"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Issued by
                    </label>
                    <input
                      type="text"
                      value={c.issuedBy}
                      onChange={(e) =>
                        updateCert(i, { issuedBy: e.target.value })
                      }
                      placeholder="e.g. Markaz al-Quran"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Year
                    </label>
                    <select
                      value={c.year}
                      onChange={(e) => updateCert(i, { year: e.target.value })}
                      className={inputCls}
                    >
                      <option value="">Year</option>
                      {yearOptions.map((y) => (
                        <option key={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Upload certificate
                    </label>
                    <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-3">
                      <input
                        id={`cert-file-${i}`}
                        type="file"
                        className="sr-only"
                        onChange={(e) =>
                          updateCert(i, { file: e.target.files?.[0] ?? null })
                        }
                      />
                      <label
                        htmlFor={`cert-file-${i}`}
                        className="cursor-pointer rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-primary ring-1 ring-border hover:bg-primary/5"
                      >
                        Choose file
                      </label>
                      <span className="truncate text-xs text-muted-foreground">
                        {c.file ? c.file.name : "No file selected"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addCert}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-700"
          >
            <Plus className="h-4 w-4" />
            Add another certificate
          </button>
        </div>
      )}

      <div className="mt-10 border-t border-border pt-8">
        <h3 className="text-sm font-semibold text-foreground">Education</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Optional but recommended.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              University / Institute
            </label>
            <input
              type="text"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder="e.g. Al-Azhar University"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Degree
            </label>
            <input
              type="text"
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
              placeholder="e.g. Bachelor of Islamic Studies"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Year completed
            </label>
            <select
              value={degreeYear}
              onChange={(e) => setDegreeYear(e.target.value)}
              className={inputCls}
            >
              <option value="">Year</option>
              {yearOptions.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Diploma (optional)
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-3">
              <input
                id="diploma-file"
                type="file"
                className="sr-only"
                onChange={(e) => setDiploma(e.target.files?.[0] ?? null)}
              />
              <label
                htmlFor="diploma-file"
                className="cursor-pointer rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-primary ring-1 ring-border hover:bg-primary/5"
              >
                Choose file
              </label>
              <span className="truncate text-xs text-muted-foreground">
                {diploma ? diploma.name : "No file selected"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 5 — Bio                                                              */
/* -------------------------------------------------------------------------- */

function StepBio(props: {
  bio: string;
  setBio: (v: string) => void;
  errors: Record<string, boolean>;
  clearErr: (k: string) => void;
}) {
  const { bio, setBio, errors, clearErr } = props;
  const len = bio.length;
  const ok = len >= 300;
  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
        Write your profile description
      </h2>
      <p className="mt-2 text-muted-foreground">
        This is your chance to introduce yourself to thousands of students.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <textarea
            rows={10}
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              if (e.target.value.length >= 300) clearErr("bio");
            }}
            placeholder="E.g. Assalamu Alaikum! I am a certified Quran teacher with 7 years of experience teaching students of all ages. I specialize in Tajweed and Hifz, with a patient and structured approach that helps students build confidence one ayah at a time..."
            className={`${inputCls} min-h-[240px] resize-y leading-relaxed ${errors.bio ? errorCls : ""}`}
          />
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Tip: Personal, specific, and warm beats generic.
            </span>
            <span>
              <span
                className={`font-semibold ${ok ? "text-primary" : "text-red-500"}`}
              >
                {len}
              </span>
              <span className="text-muted-foreground"> / 300 min</span>
            </span>
          </div>
        </div>
        <aside>
          <div className="rounded-2xl border border-border bg-muted/40 p-5">
            <h3 className="text-sm font-semibold text-foreground">
              A great description includes
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
              {[
                "Introduce yourself",
                "Describe your teaching style",
                "Mention your qualifications",
                "End with a warm welcome",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 6 — Video                                                            */
/* -------------------------------------------------------------------------- */

function StepVideo(props: {
  videoLink: string;
  setVideoLink: (v: string) => void;
  videoFile: File | null;
  setVideoFile: (f: File | null) => void;
  onSkip: () => void;
}) {
  const { videoLink, setVideoLink, videoFile, setVideoFile, onSkip } = props;
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
            <Sparkles className="h-3 w-3" /> Optional
          </span>
          <h2 className="mt-3 font-heading text-2xl font-bold text-foreground sm:text-3xl">
            Record a short intro video
          </h2>
          <p className="mt-2 text-muted-foreground">
            Students who watch teacher videos book 3× more often. 60–90 seconds
            is perfect.
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={onSkip}>
          Skip for now
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>YouTube or Vimeo link</label>
          <input
            type="url"
            value={videoLink}
            onChange={(e) => setVideoLink(e.target.value)}
            placeholder="https://youtu.be/..."
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Or upload a video</label>
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2.5">
            <input
              id="video-file"
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            />
            <label
              htmlFor="video-file"
              className="cursor-pointer rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-primary ring-1 ring-border hover:bg-primary/5"
            >
              Choose file
            </label>
            <span className="truncate text-xs text-muted-foreground">
              {videoFile ? videoFile.name : "No file selected"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border p-5">
          <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            Do
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Introduce yourself by name &amp; where you&apos;re from</li>
            <li>• Mention what you teach and to whom</li>
            <li>• Speak slowly, clearly, and warmly</li>
            <li>• Record in a quiet, well-lit space</li>
            <li>• End with an invitation to book a trial</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-border p-5">
          <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-red-600">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-50">
              <X className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            Don&apos;t
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Use background music or filters</li>
            <li>• Include your phone, email, or WhatsApp</li>
            <li>• Promote competing platforms</li>
            <li>• Show low resolution or shaky footage</li>
            <li>• Make it longer than 2 minutes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 7 — Availability                                                     */
/* -------------------------------------------------------------------------- */

function StepAvailability(props: {
  timezone: string;
  setTimezone: (v: string) => void;
  days: DaysMap;
  setDays: (d: DaysMap) => void;
  errors: Record<string, boolean>;
}) {
  const { timezone, setTimezone, days, setDays, errors } = props;

  function toggleDay(d: DayName) {
    const next = { ...days };
    if (next[d] && next[d]!.length > 0) {
      delete next[d];
    } else {
      next[d] = [{ from: "18:00", to: "21:00" }];
    }
    setDays(next);
  }
  function addSlot(d: DayName) {
    const next = { ...days };
    next[d] = [...(next[d] || []), { from: "18:00", to: "21:00" }];
    setDays(next);
  }
  function updateSlot(d: DayName, i: number, patch: Partial<Slot>) {
    const next = { ...days };
    const slots = (next[d] || []).map((s, idx) =>
      idx === i ? { ...s, ...patch } : s
    );
    next[d] = slots;
    setDays(next);
  }
  function removeSlot(d: DayName, i: number) {
    const next = { ...days };
    const slots = (next[d] || []).filter((_, idx) => idx !== i);
    if (slots.length === 0) delete next[d];
    else next[d] = slots;
    setDays(next);
  }

  const activeDays = DAYS.filter((d) => days[d] && days[d]!.length > 0);

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
        When are you available?
      </h2>
      <p className="mt-2 text-muted-foreground">
        Set the days and times you can hold lessons. You can change this
        anytime.
      </p>

      <div className="mt-6 rounded-2xl bg-primary/5 p-4 text-sm text-primary-800">
        <strong className="font-semibold">Tip:</strong> Most students book
        between <strong className="font-semibold">6 PM – 9 PM PKT</strong>.
        Coverage in evening hours boosts your visibility.
      </div>

      <div className="mt-8">
        <label className={labelCls}>Your timezone</label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className={`${inputCls} max-w-md`}
        >
          {TIMEZONES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="mt-8">
        <div className={`text-sm font-medium text-foreground ${errors.availability ? "animate-pulse text-red-600" : ""}`}>
          Available days {errors.availability && "— please select at least one"}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {DAYS.map((d) => {
            const active = days[d] && days[d]!.length > 0;
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-white text-foreground hover:border-primary/40"
                }`}
              >
                {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {activeDays.map((d) => (
          <div
            key={d}
            className="rounded-2xl border border-border bg-white p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">{d}</div>
              <button
                type="button"
                onClick={() => addSlot(d)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Add time slot
              </button>
            </div>
            <div className="space-y-2">
              {(days[d] || []).map((s, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <select
                    value={s.from}
                    onChange={(e) => updateSlot(d, i, { from: e.target.value })}
                    className={`${inputCls} max-w-[140px]`}
                  >
                    {TIMES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-muted-foreground">to</span>
                  <select
                    value={s.to}
                    onChange={(e) => updateSlot(d, i, { to: e.target.value })}
                    className={`${inputCls} max-w-[140px]`}
                  >
                    {TIMES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeSlot(d, i)}
                    className="ml-1 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-red-500"
                    aria-label="Remove time slot"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 8 — Pricing                                                          */
/* -------------------------------------------------------------------------- */

function StepPricing(props: {
  duration: "" | "30" | "45" | "60";
  setDuration: (v: "" | "30" | "45" | "60") => void;
  lessonPrice: string;
  setLessonPrice: (v: string) => void;
  agreedTerms: boolean;
  setAgreedTerms: (v: boolean) => void;
  errors: Record<string, boolean>;
  clearErr: (k: string) => void;
}) {
  const {
    duration,
    setDuration,
    lessonPrice,
    setLessonPrice,
    agreedTerms,
    setAgreedTerms,
    errors,
    clearErr,
  } = props;
  const [open, setOpen] = useState(false);

  const usd = Number(lessonPrice) || 0;
  const fee = usd * COMMISSION_RATE;
  const net = usd - fee;

  const recMap: Record<string, string> = { "30": "$5", "45": "$7", "60": "$10" };
  const recText = duration
    ? `Recommended: ${recMap[duration]} per ${duration}-min lesson for new teachers`
    : "Recommended: $5 per 30-min lesson for new teachers";

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
        Set your lesson pricing
      </h2>
      <p className="mt-2 text-muted-foreground">
        Your first trial lesson is always{" "}
        <strong className="text-primary">free</strong> — students try you
        risk-free. Set your standard lesson rate below.
      </p>

      {/* Free trial banner */}
      <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              Trial lesson
            </span>
            <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Free
            </span>
          </div>
          <p className="mt-0.5 text-xs text-primary-800">
            First lesson is free for every new student. Teachers offering free
            trials get <strong>3× more bookings</strong>.
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
            <div className="sm:col-span-2">
              <label className={labelCls}>
                Lesson duration <span className="text-red-500">*</span>
              </label>
              <select
                value={duration}
                onChange={(e) => {
                  setDuration(e.target.value as typeof duration);
                  clearErr("duration");
                }}
                className={`${inputCls} ${errors.duration ? errorCls : ""}`}
              >
                <option value="">Choose</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className={labelCls}>
                Price per lesson <span className="text-red-500">*</span>
              </label>
              <div
                className={`flex items-center gap-2 rounded-xl border bg-white px-4 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 ${
                  errors.lessonPrice ? "border-red-500" : "border-border"
                }`}
              >
                <span className="shrink-0 border-r border-border pr-3 text-sm font-semibold text-muted-foreground">
                  USD&nbsp;$
                </span>
                <input
                  type="number"
                  min="1"
                  max="200"
                  step="0.5"
                  value={lessonPrice}
                  onChange={(e) => {
                    setLessonPrice(e.target.value);
                    clearErr("lessonPrice");
                  }}
                  placeholder="0"
                  className="w-full min-w-0 border-0 bg-transparent py-2.5 text-base font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                />
                <span className="shrink-0 whitespace-nowrap text-xs font-medium text-muted-foreground">
                  per lesson
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            {recText}
          </div>

          <div className="mt-6 rounded-2xl border border-primary/15 bg-primary/5 p-5 text-sm text-primary-800">
            <strong className="font-semibold">
              Competitive pricing helps you get your first 5 students faster.
            </strong>
            <p className="mt-1 text-primary-700">
              After 5 completed lessons + reviews, you can raise your price
              anytime.
            </p>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-white">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
              aria-expanded={open}
            >
              <span className="text-sm font-semibold text-foreground">
                Platform commission &amp; payouts
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
            {open && (
              <div className="border-t border-border px-5 py-4 text-sm text-muted-foreground">
                <p>
                  LearnFurqan keeps <strong>20% commission</strong> on paid
                  lesson earnings to cover payments, support, and platform
                  development. Payouts are made weekly to your bank or
                  Easypaisa account.
                </p>
                <ul className="mt-3 space-y-1 text-xs">
                  <li>
                    • Trial lesson: <strong>FREE</strong> — no charge to
                    student, no payout to teacher
                  </li>
                  <li>• Paid lessons: 80% to you, 20% platform fee</li>
                  <li>• Payouts every Monday in USD</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        <aside className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-soft">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Earnings preview
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">
                ${net.toFixed(2)}
              </span>
              <span className="text-sm text-muted-foreground">/ lesson</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              After 20% platform fee
            </div>
            <hr className="my-5 border-border" />
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Trial lesson</dt>
                <dd className="inline-flex items-center gap-1 font-semibold text-primary">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  FREE
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Standard rate</dt>
                <dd className="font-medium text-foreground">
                  ${usd.toFixed(2)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Lesson duration</dt>
                <dd className="font-medium text-foreground">
                  {duration ? `${duration} min` : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Platform fee (20%)</dt>
                <dd className="font-medium text-foreground">
                  – ${fee.toFixed(2)}
                </dd>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                <dt className="font-semibold text-foreground">
                  You earn / lesson
                </dt>
                <dd className="font-semibold text-primary">
                  ${net.toFixed(2)}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      <label
        className={`mt-10 flex items-start gap-3 rounded-2xl border bg-muted/60 p-4 ${
          errors.terms ? "border-red-500 ring-2 ring-red-500/20" : "border-border"
        }`}
      >
        <input
          type="checkbox"
          checked={agreedTerms}
          onChange={(e) => {
            setAgreedTerms(e.target.checked);
            if (e.target.checked) clearErr("terms");
          }}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <div className="text-sm text-foreground">
          I agree to LearnFurqan&apos;s{" "}
          <a
            href="/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            Teacher Terms &amp; Conditions
          </a>{" "}
          and{" "}
          <a
            href="/terms-of-service#code-of-conduct"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            Code of Conduct
          </a>
          . I confirm all information above is accurate.
        </div>
      </label>
    </div>
  );
}

// Suppress unused warnings for icon imports we keep for future use
void Languages;
