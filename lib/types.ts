export type Teacher = {
  id: string;
  name: string;
  gender: "male" | "female";
  subject: string;
  language: string;
  country: string;
  country_flag: string;
  experience_years: number;
  price_per_class: number;
  rating: number;
  review_count: number;
  bio: string;
  teaching_style: string;
  certifications: string;
  intro_video_url: string;
  available_slots: string[];
  is_featured: boolean;
  slug: string;
  class_duration_minutes?: number;
  email?: string | null;
  stripe_account_id?: string | null;
  stripe_charges_enabled?: boolean;
  stripe_payouts_enabled?: boolean;
  stripe_details_submitted?: boolean;
};

// 0 = Sunday … 6 = Saturday (matches JavaScript Date.getDay()).
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type TeacherAvailabilityRule = {
  id: string;
  teacher_id: string;
  weekday: Weekday;
  start_time: string; // "HH:MM:SS" in `timezone`
  end_time: string;
  timezone: string; // IANA tz, e.g. "Africa/Cairo"
  is_active: boolean;
  created_at: string;
};

export type TeacherAvailabilityException = {
  id: string;
  teacher_id: string;
  exception_date: string; // YYYY-MM-DD in `timezone` (when set)
  kind: "block" | "extra";
  start_time: string | null;
  end_time: string | null;
  timezone: string | null;
  notes: string;
  created_at: string;
};

export type AvailabilitySlot = {
  // ISO 8601 timestamp (UTC) for the start of the slot.
  start: string;
  // ISO 8601 timestamp (UTC) for the end of the slot.
  end: string;
  // Duration in minutes — same as teacher.class_duration_minutes at fetch time.
  duration_minutes: number;
};

export type AgeGroup = "child" | "teen" | "adult";
export type StudentLevel = "beginner" | "can-read" | "intermediate";

export type Booking = {
  id: string;
  teacher_id: string | null;
  teacher_name: string;
  teacher_slug: string;
  student_name: string;
  student_email: string;
  student_phone: string;
  student_country: string;
  age_group: AgeGroup;
  current_level: StudentLevel;
  selected_slot: string;
  message: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  stripe_session_id: string;
  payment_status: "free_trial" | "pending" | "paid" | "refunded";
  booking_type: "trial" | "paid";
  zoom_link: string;
  lesson_notes: string;
  created_at: string;
};

export type BookingInsert = Omit<
  Booking,
  | "id"
  | "created_at"
  | "status"
  | "stripe_session_id"
  | "payment_status"
  | "booking_type"
  | "zoom_link"
  | "lesson_notes"
> & {
  status?: Booking["status"];
  stripe_session_id?: string;
  payment_status?: Booking["payment_status"];
  booking_type?: Booking["booking_type"];
  zoom_link?: string;
  lesson_notes?: string;
};

export type Review = {
  id: string;
  booking_id: string;
  teacher_id: string;
  student_email: string;
  student_name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  created_at: string;
};

export type ReviewableBooking = {
  id: string;
  teacher_id: string | null;
  teacher_name: string;
  teacher_slug: string;
  student_email: string;
  student_name: string;
  selected_slot: string;
};

export type MessageSender = "teacher" | "student";

export type Message = {
  id: string;
  teacher_id: string;
  student_email: string;
  student_name: string;
  sender_role: MessageSender;
  body: string;
  read_at: string | null;
  created_at: string;
};

// One row per (teacher, student-email) pair — what's rendered in the inbox list.
export type MessageThreadSummary = {
  teacher_id: string;
  teacher_name: string;
  teacher_slug: string;
  student_email: string;
  student_name: string;
  last_message: Message;
  unread_count: number;
};

export type SubscriptionPlan = "basic" | "premium";

export type Subscription = {
  id: string;
  student_email: string;
  student_name: string;
  plan: SubscriptionPlan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: "active" | "cancelled" | "past_due";
  current_period_end: string | null;
  created_at: string;
};

export type TeacherApplication = {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  subject: string;
  experience_years: number;
  certifications: string;
  demo_video_url: string;
  languages: string;
  availability: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export type TeacherApplicationInsert = Omit<
  TeacherApplication,
  "id" | "created_at" | "status"
> & { status?: TeacherApplication["status"] };

export type TeacherFilters = {
  gender?: "male" | "female";
  is_featured?: boolean;
  language?: string;
};

export type StudentProfile = {
  email: string;
  name: string;
  phone: string;
  country: string;
  age_group: "" | AgeGroup;
  stripe_customer_id: string | null;
  updated_at: string;
};

export type LearningGoal =
  | "Quran Reading"
  | "Tajweed"
  | "Hifz"
  | "Islamic Studies";

export type ChildLevel = "Beginner" | "Can read Arabic" | "Intermediate";

export type ParentChild = {
  id: string;
  parent_email: string;
  child_name: string;
  child_age: number;
  learning_goal: LearningGoal;
  current_level: ChildLevel;
  linked_booking_email: string;
  created_at: string;
};

export type ParentChildInsert = Omit<ParentChild, "id" | "created_at">;

export type ParentPreferences = {
  email: string;
  notify_confirmed: boolean;
  notify_zoom: boolean;
  notify_reminder: boolean;
  notify_notes: boolean;
  updated_at: string;
};

export const LEARNING_GOALS: LearningGoal[] = [
  "Quran Reading",
  "Tajweed",
  "Hifz",
  "Islamic Studies",
];

export const CHILD_LEVELS: ChildLevel[] = [
  "Beginner",
  "Can read Arabic",
  "Intermediate",
];

export const CLASSES_GOAL = 20;
