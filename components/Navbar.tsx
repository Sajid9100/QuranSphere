"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ChevronDown,
  LogIn,
  BookOpen,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { Logo } from "./ui/Logo";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Teachers", href: "/teachers" },
  { label: "About", href: "/about" },
];

const LOGIN_OPTIONS: { Icon: LucideIcon; label: string; href: string }[] = [
  { Icon: GraduationCap, label: "Student Login", href: "/sign-in?role=student" },
  { Icon: BookOpen, label: "Teacher Login", href: "/sign-in?role=teacher" },
  { Icon: Users, label: "Parent Login", href: "/sign-in?role=parent" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center" aria-label="LearnFurqan home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-1 lg:flex">
          <DesktopAuthedActions />
          <SignedOut>
            <LoginDropdown />
          </SignedOut>
        </div>

        <MobileMenu />
      </div>
    </header>
  );
}

function useIsTeacher(): boolean {
  const [isTeacher, setIsTeacher] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/teacher/me")
      .then((r) => (r.ok ? r.json() : { teacher: null }))
      .then((data) => {
        if (!cancelled) setIsTeacher(Boolean(data?.teacher));
      })
      .catch(() => {
        if (!cancelled) setIsTeacher(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return isTeacher;
}

function DesktopAuthedActions() {
  const { user } = useUser();
  const isTeacher = useIsTeacher();
  const greeting = user?.firstName || user?.username || "Account";
  return (
    <SignedIn>
      {isTeacher && (
        <Link href="/teacher" className="contents">
          <Button variant="ghost" size="md">
            <GraduationCap className="h-4 w-4" />
            Teacher
          </Button>
        </Link>
      )}
      <Link href="/dashboard" className="contents">
        <Button variant="ghost" size="md">
          <LayoutDashboard className="h-4 w-4" />
          Student
        </Button>
      </Link>
      <Link href="/parent" className="contents">
        <Button variant="ghost" size="md">
          <Users className="h-4 w-4" />
          Parent
        </Button>
      </Link>
      <span className="hidden text-sm font-medium text-muted-foreground xl:inline">
        Hi, {greeting}
      </span>
      <UserButton afterSignOutUrl="/" />
    </SignedIn>
  );
}

function LoginDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="group inline-flex items-center gap-2 rounded-full border border-gray-800 px-5 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-800 hover:text-white"
      >
        <LogIn className="h-4 w-4" />
        Log In
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          {LOGIN_OPTIONS.map((opt) => (
            <Link
              key={opt.href}
              href={opt.href}
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#0a2e1e] transition-colors hover:bg-gray-50"
            >
              <opt.Icon className="h-4 w-4 text-[#c9a84c]" />
              <span>{opt.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const isTeacher = useIsTeacher();

  const closeAnd = (fn?: () => void) => () => {
    setOpen(false);
    fn?.();
  };

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-800 hover:bg-gray-100"
      >
        <Menu className="h-6 w-6" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.aside
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.3 }}
              className="fixed right-0 top-0 z-50 flex h-full w-[280px] flex-col overflow-y-auto bg-white shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile menu"
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
                <Logo />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-800 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex flex-col gap-1 px-3 py-4">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-base font-medium text-[#0a2e1e] hover:bg-gray-50"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <SignedIn>
                <div className="border-t border-gray-200 px-3 py-4">
                  <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Hi, {user?.firstName || user?.username || "Account"}
                  </p>
                  {isTeacher && (
                    <Link
                      href="/teacher"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#0a2e1e] hover:bg-gray-50"
                    >
                      <GraduationCap className="h-4 w-4 text-[#c9a84c]" />
                      Teacher Dashboard
                    </Link>
                  )}
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#0a2e1e] hover:bg-gray-50"
                  >
                    <LayoutDashboard className="h-4 w-4 text-[#c9a84c]" />
                    Student Dashboard
                  </Link>
                  <Link
                    href="/parent"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#0a2e1e] hover:bg-gray-50"
                  >
                    <Users className="h-4 w-4 text-[#c9a84c]" />
                    Parent Dashboard
                  </Link>
                  <div className="mt-3 px-3">
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </div>
              </SignedIn>

              <SignedOut>
                <div className="border-t border-gray-200 px-3 py-4">
                  <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Log In
                  </p>
                  {LOGIN_OPTIONS.map((opt) => (
                    <Link
                      key={opt.href}
                      href={opt.href}
                      onClick={closeAnd()}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#0a2e1e] hover:bg-gray-50"
                    >
                      <opt.Icon className="h-4 w-4 text-[#c9a84c]" />
                      {opt.label}
                    </Link>
                  ))}
                </div>
              </SignedOut>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
