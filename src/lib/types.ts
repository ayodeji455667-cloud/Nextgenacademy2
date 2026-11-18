export type Role = "student" | "teacher" | "admin";
export const CLASS_LEVELS = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"] as const;
export type ClassLevel = (typeof CLASS_LEVELS)[number];

export type Profile = {
  id: string;
  school_id: string | null;
  role: Role;
  full_name: string;
  class_level: ClassLevel | null;
  parental_consent: boolean;
  parental_consent_at: string | null;
  created_at: string;
};

export type School = {
  id: string;
  name: string;
  state: string | null;
  lga: string | null;
  contact_email: string | null;
  created_at: string;
};

export type Course = {
  id: string;
  school_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  level: string | null;
  age_group: string | null;
  published: boolean;
  created_at: string;
};

export type Lesson = {
  id: string;
  course_id: string;
  position: number;
  title: string;
  summary: string | null;
  content_md: string | null;
  video_url: string | null;
  video_path: string | null;
  duration_minutes: number | null;
  ai_disclosure: string | null;
  published: boolean;
};

export type Quiz = { id: string; lesson_id: string; title: string; pass_mark: number };

export type QuizQuestion = {
  id: string;
  quiz_id: string;
  position: number;
  prompt: string;
  options: string[];
};

export type QuizResult = {
  attempt_id: string;
  score: number;
  total: number;
  pass_mark: number;
  passed: boolean;
  feedback: {
    question_id: string;
    chosen: number | null;
    correct_index: number | null;
    correct: boolean;
    explanation: string | null;
  }[];
};

export type Assignment = {
  id: string;
  course_id: string;
  lesson_id: string | null;
  title: string;
  instructions_md: string | null;
  rubric_md: string | null;
  max_score: number;
};

export type Submission = {
  id: string;
  assignment_id: string;
  student_id: string;
  school_id: string;
  text_response: string | null;
  file_path: string | null;
  submitted_at: string;
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
};

export type Certificate = {
  id: string;
  code: string;
  student_id: string;
  course_id: string;
  school_id: string;
  issued_at: string;
};

export type Workshop = {
  id: string;
  school_id: string;
  course_id: string | null;
  title: string;
  held_on: string;
  facilitator: string | null;
  notes: string | null;
};

export type SubscriptionStatus = "trial" | "active" | "past_due" | "cancelled";

export type Subscription = {
  id: string;
  school_id: string;
  plan: string;
  status: SubscriptionStatus;
  seats: number;
  price_per_seat_kobo: number;
  currency: string;
  current_period_start: string | null;
  current_period_end: string | null;
};
