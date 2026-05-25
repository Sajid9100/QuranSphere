"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";

export type GenderFilter = "all" | "male" | "female";
export type SubjectFilter = "all" | string;
export type LanguageFilter = "all" | "english" | "urdu" | "arabic";
export type SortOption =
  | "rating"
  | "price-asc"
  | "price-desc"
  | "experience";

export const SUBJECT_OPTIONS: { value: SubjectFilter; label: string }[] = [
  { value: "all", label: "All Subjects" },
  ...CATEGORIES.map((c) => ({ value: c.id, label: c.name })),
];

export const LANGUAGE_OPTIONS: { value: LanguageFilter; label: string }[] = [
  { value: "all", label: "All Languages" },
  { value: "english", label: "English" },
  { value: "urdu", label: "Urdu" },
  { value: "arabic", label: "Arabic" },
];

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "rating", label: "Top Rated" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "experience", label: "Most Experienced" },
];

export type Filters = {
  gender: GenderFilter;
  subject: SubjectFilter;
  language: LanguageFilter;
  sort: SortOption;
};

export function TeachersFilterBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  return (
    <div className="sticky top-16 z-30 border-y border-border/70 bg-background/85 px-4 glass-blur md:top-20 md:rounded-2xl md:border md:px-6 md:shadow-soft">
      <div className="flex flex-wrap items-center gap-3 py-4">
        <FilterGroup label="Gender">
          <div className="inline-flex rounded-full border border-border bg-white p-0.5">
            {(["all", "male", "female"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onChange({ ...filters, gender: g })}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors",
                  filters.gender === g
                    ? "bg-primary text-white shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {g === "all" ? "All" : g}
              </button>
            ))}
          </div>
        </FilterGroup>

        <FilterGroup label="Subject">
          <Select
            value={filters.subject}
            onChange={(v) =>
              onChange({ ...filters, subject: v as SubjectFilter })
            }
            options={SUBJECT_OPTIONS}
          />
        </FilterGroup>

        <FilterGroup label="Language">
          <Select
            value={filters.language}
            onChange={(v) =>
              onChange({ ...filters, language: v as LanguageFilter })
            }
            options={LANGUAGE_OPTIONS}
          />
        </FilterGroup>

        <FilterGroup label="Sort by" className="ml-auto">
          <Select
            value={filters.sort}
            onChange={(v) => onChange({ ...filters, sort: v as SortOption })}
            options={SORT_OPTIONS}
          />
        </FilterGroup>
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex items-center gap-2", className)}>
      <span className="hidden text-xs font-medium uppercase tracking-wider text-muted-foreground sm:inline">
        {label}
      </span>
      {children}
    </label>
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="appearance-none rounded-full border border-border bg-white py-1.5 pl-4 pr-9 text-xs font-medium text-foreground transition-colors hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
