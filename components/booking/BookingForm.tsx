"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Send,
  ArrowLeft,
  ChevronDown,
  LayoutDashboard,
  UserPlus,
} from "lucide-react";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { SlotPicker } from "./SlotPicker";
import { TrialCardStep } from "./TrialCardStep";
import { cn } from "@/lib/utils";
import type { Teacher, AgeGroup, StudentLevel as Level } from "@/lib/types";

type FormState = {
  fullName: string;
  email: string;
  phonePrefix: string;
  phoneNumber: string;
  country: string;
  ageGroup: AgeGroup | "";
  level: Level | "";
  selectedSlot: string;
  message: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

const PHONE_PREFIXES = [
  { code: "+1", label: "+1 USA/CA" },
  { code: "+44", label: "+44 UK" },
  { code: "+92", label: "+92 PK" },
  { code: "+91", label: "+91 IN" },
  { code: "+20", label: "+20 EG" },
  { code: "+966", label: "+966 SA" },
  { code: "+971", label: "+971 AE" },
  { code: "+60", label: "+60 MY" },
  { code: "+90", label: "+90 TR" },
  { code: "+61", label: "+61 AU" },
];

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Pakistan",
  "India",
  "Egypt",
  "Saudi Arabia",
  "United Arab Emirates",
  "Australia",
  "Malaysia",
];

const AGE_GROUPS: { value: AgeGroup; label: string }[] = [
  { value: "child", label: "Child (4-12)" },
  { value: "teen", label: "Teen (13-17)" },
  { value: "adult", label: "Adult (18+)" },
];

const LEVELS: { value: Level; label: string }[] = [
  { value: "beginner", label: "Complete Beginner" },
  { value: "can-read", label: "Can Read Arabic" },
  { value: "intermediate", label: "Intermediate" },
];

const initialState: FormState = {
  fullName: "",
  email: "",
  phonePrefix: "+1",
  phoneNumber: "",
  country: "",
  ageGroup: "",
  level: "",
  selectedSlot: "",
  message: "",
};

type Status =
  | "idle"
  | "submitting"
  | "card_setup"
  | "success"
  | "redirecting"
  | "error";

type CardSetup = {
  bookingId: string;
  clientSecret: string;
  publishableKey: string;
};

const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

// Build-time visibility check — confirms the publishable key was inlined into
// the browser bundle (Next inlines NEXT_PUBLIC_* env vars at build time).
if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.log("[BookingForm] build marker v2 (trial setup intent)", {
    has_publishable_key: Boolean(STRIPE_PUBLISHABLE_KEY),
    publishable_key_prefix: STRIPE_PUBLISHABLE_KEY
      ? STRIPE_PUBLISHABLE_KEY.slice(0, 8) + "…"
      : "(empty)",
  });
}

export function BookingForm({ teacher }: { teacher: Teacher }) {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cardSetup, setCardSetup] = useState<CardSetup | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const e: Errors = {};
    if (!form.fullName.trim()) e.fullName = "Please enter your name.";
    if (!form.email.trim()) e.email = "Please enter your email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Please enter a valid email.";
    if (!form.phoneNumber.trim())
      e.phoneNumber = "Please enter your WhatsApp number.";
    if (!form.country) e.country = "Please choose your country.";
    if (!form.ageGroup) e.ageGroup = "Please select an age group.";
    if (!form.level) e.level = "Please select your current level.";
    if (!form.selectedSlot) e.selectedSlot = "Please pick a time slot.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    setStatus("submitting");
    setErrorMessage(null);

    const payload = {
      teacher_slug: teacher.slug,
      student_name: form.fullName.trim(),
      student_email: form.email.trim(),
      student_phone: `${form.phonePrefix} ${form.phoneNumber.trim()}`,
      student_country: form.country,
      age_group: form.ageGroup as AgeGroup,
      current_level: form.level as Level,
      selected_slot: form.selectedSlot,
      message: form.message.trim(),
    };

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: {
        ok?: boolean;
        id?: string;
        error?: string;
        requires_payment?: boolean;
        requires_setup?: boolean;
        checkout_url?: string;
        client_secret?: string;
      } = await res.json().catch(() => ({}));
      // eslint-disable-next-line no-console
      console.log("[BookingForm] /api/bookings response", {
        http_status: res.status,
        body: {
          ok: data.ok,
          id: data.id,
          error: data.error,
          requires_payment: data.requires_payment,
          requires_setup: data.requires_setup,
          has_checkout_url: Boolean(data.checkout_url),
          has_client_secret: Boolean(data.client_secret),
        },
        client_has_publishable_key: Boolean(STRIPE_PUBLISHABLE_KEY),
      });
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      if (data.requires_payment && data.checkout_url) {
        // eslint-disable-next-line no-console
        console.log("[BookingForm] -> redirecting to Stripe Checkout");
        setStatus("redirecting");
        window.location.href = data.checkout_url;
        return;
      }
      if (data.requires_setup) {
        if (!data.id || !data.client_secret) {
          throw new Error(
            "Card setup required but the server didn't return a SetupIntent. Please contact support."
          );
        }
        if (!STRIPE_PUBLISHABLE_KEY) {
          throw new Error(
            "Card setup is not configured on the client (missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)."
          );
        }
        // eslint-disable-next-line no-console
        console.log("[BookingForm] -> entering card_setup step");
        setCardSetup({
          bookingId: data.id,
          clientSecret: data.client_secret,
          publishableKey: STRIPE_PUBLISHABLE_KEY,
        });
        setStatus("card_setup");
        return;
      }
      // No card setup needed (Stripe not configured server-side) — trial is
      // already confirmed inline by /api/bookings.
      // eslint-disable-next-line no-console
      console.warn(
        "[BookingForm] -> success WITHOUT card step. Likely cause: server-side STRIPE_SECRET_KEY is missing or not loaded by the Next.js process. The booking row will already be confirmed."
      );
      setStatus("success");
    } catch (err) {
      console.error("Booking error", err);
      setErrorMessage((err as Error).message);
      setStatus("error");
    }
  }

  if (status === "success") {
    return <BookingSuccess email={form.email} />;
  }

  if (status === "card_setup" && cardSetup) {
    return (
      <div className="rounded-3xl border border-border bg-white p-6 shadow-card md:p-8">
        <h2 className="font-heading text-2xl font-semibold text-foreground">
          One last step — save your card
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your trial with {teacher.name.split(" ")[0]} is free. We only save
          your card so future paid classes are one-tap easy.
        </p>
        <div className="mt-6">
          <TrialCardStep
            bookingId={cardSetup.bookingId}
            clientSecret={cardSetup.clientSecret}
            publishableKey={cardSetup.publishableKey}
            onCardSaved={() => setStatus("success")}
          />
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-border bg-white p-6 shadow-card md:p-8"
      noValidate
    >
      <h2 className="font-heading text-2xl font-semibold text-foreground">
        Book your class
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Your first class with {teacher.name.split(" ")[0]} is free. Fill in
        your details — we’ll confirm by email within 2 hours.
      </p>

      <div className="mt-6 grid gap-5">
        <Field
          label="Full Name"
          required
          error={errors.fullName}
          htmlFor="fullName"
        >
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            className={inputClasses(errors.fullName)}
            placeholder="Your full name"
          />
        </Field>

        <Field
          label="Email Address"
          required
          error={errors.email}
          htmlFor="email"
        >
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputClasses(errors.email)}
            placeholder="you@example.com"
          />
        </Field>

        <Field
          label="WhatsApp Number"
          required
          error={errors.phoneNumber}
          htmlFor="phone"
        >
          <div className="flex gap-2">
            <SelectWrap>
              <select
                value={form.phonePrefix}
                onChange={(e) => update("phonePrefix", e.target.value)}
                className={cn(selectInputClasses(false), "w-32 pr-9")}
                aria-label="Phone country code"
              >
                {PHONE_PREFIXES.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label}
                  </option>
                ))}
              </select>
            </SelectWrap>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={form.phoneNumber}
              onChange={(e) => update("phoneNumber", e.target.value)}
              className={cn(inputClasses(errors.phoneNumber), "flex-1")}
              placeholder="555 123 4567"
            />
          </div>
        </Field>

        <Field
          label="Your Country"
          required
          error={errors.country}
          htmlFor="country"
        >
          <SelectWrap>
            <select
              id="country"
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
              className={cn(selectInputClasses(!!errors.country), "w-full")}
            >
              <option value="" disabled>
                Choose your country
              </option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </SelectWrap>
        </Field>

        <Field
          label="Student Age Group"
          required
          error={errors.ageGroup}
        >
          <RadioGrid
            name="ageGroup"
            value={form.ageGroup}
            options={AGE_GROUPS}
            onChange={(v) => update("ageGroup", v as AgeGroup)}
          />
        </Field>

        <Field label="Current Level" required error={errors.level}>
          <RadioGrid
            name="level"
            value={form.level}
            options={LEVELS}
            onChange={(v) => update("level", v as Level)}
          />
        </Field>

        <Field
          label="Select Time Slot"
          required
          error={errors.selectedSlot}
        >
          <SlotPicker
            teacherSlug={teacher.slug}
            value={form.selectedSlot}
            onChange={(iso) => update("selectedSlot", iso)}
            error={errors.selectedSlot}
          />
        </Field>

        <Field
          label="Special Message"
          htmlFor="message"
          hint="Optional"
        >
          <textarea
            id="message"
            rows={4}
            value={form.message}
            onChange={(e) => update("message", e.target.value)}
            className={cn(inputClasses(false), "resize-none")}
            placeholder="Any specific goals or requests for the teacher?"
          />
        </Field>
      </div>

      <AnimatePresence>
        {status === "error" && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-red-500" />
            <div>
              <p>
                Something went wrong. Please email us at{" "}
                <a
                  href="mailto:hello@learnfurqan.com"
                  className="font-semibold underline"
                >
                  hello@learnfurqan.com
                </a>
                .
              </p>
              {errorMessage && (
                <p className="mt-1 text-xs text-red-700/80">{errorMessage}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        type="submit"
        variant="primary"
        size="xl"
        disabled={status === "submitting" || status === "redirecting"}
        className="mt-7 w-full"
      >
        {status === "submitting" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Confirming…
          </>
        ) : status === "redirecting" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Redirecting to checkout…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Confirm Booking
          </>
        )}
      </Button>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        First class with each teacher is free. Subsequent classes are charged
        at the teacher’s rate.
      </p>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-foreground"
        >
          {label}
          {required && <span className="ml-0.5 text-primary">*</span>}
        </label>
        {hint && (
          <span className="text-xs text-muted-foreground">{hint}</span>
        )}
      </div>
      <div className="mt-1.5">{children}</div>
      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      )}
    </div>
  );
}

function RadioGrid({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((o) => {
        const checked = value === o.value;
        return (
          <label
            key={o.value}
            className={cn(
              "flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
              checked
                ? "border-primary bg-primary text-white shadow-soft"
                : "border-border bg-white text-foreground/80 hover:border-primary/40"
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={checked}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}

function SelectWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function inputClasses(error: string | undefined | false) {
  return cn(
    "block w-full rounded-xl border bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:outline-none focus:ring-2",
    error
      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
      : "border-border focus:border-primary focus:ring-primary/20"
  );
}

function selectInputClasses(error: boolean) {
  return cn(
    "appearance-none rounded-xl border bg-white py-3 pl-4 pr-9 text-sm text-foreground transition-colors focus:outline-none focus:ring-2",
    error
      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
      : "border-border focus:border-primary focus:ring-primary/20"
  );
}

function BookingSuccess({ email }: { email: string }) {
  const shareText = encodeURIComponent(
    "I just booked a free Quran trial class on LearnFurqan! Join me: https://learnfurqan.com"
  );
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl border border-border bg-white p-8 text-center shadow-card md:p-10"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CheckCircle2 className="h-9 w-9" strokeWidth={2.2} />
      </div>
      <h2 className="mt-5 font-heading text-2xl font-bold text-foreground md:text-3xl">
        Booking Confirmed!
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
        We will send a Zoom link to{" "}
        <span className="font-semibold text-foreground">{email}</span> within 2
        hours. The teacher will confirm your slot shortly.
      </p>

      <div className="mx-auto mt-7 flex max-w-md flex-col gap-2">
        <SignedIn>
          <Link href="/dashboard" className="contents">
            <Button variant="primary" size="lg" className="w-full">
              <LayoutDashboard className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
        </SignedIn>
        <SignedOut>
          <Link href="/sign-up" className="contents">
            <Button variant="primary" size="lg" className="w-full">
              <UserPlus className="h-4 w-4" />
              Create account to track your class
            </Button>
          </Link>
        </SignedOut>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/teachers" className="contents">
            <Button variant="outline" size="lg" className="w-full">
              <ArrowLeft className="h-4 w-4" />
              Back to Teachers
            </Button>
          </Link>
          <a
            href={`https://wa.me/?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="contents"
          >
            <Button variant="outline" size="lg" className="w-full">
              Share on WhatsApp
            </Button>
          </a>
        </div>
      </div>
    </motion.div>
  );
}
