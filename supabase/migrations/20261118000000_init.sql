-- =============================================================================
-- School Learning App: initial schema
--
-- Design notes
-- * Every row that belongs to a school carries school_id, and row-level
--   security (RLS) keeps one school's data invisible to another school.
-- * Roles: student, teacher, admin. "admin" is a platform admin (the company
--   running the programme) and has no school. Teachers manage their own school.
-- * Student data is kept minimal (NDPA-minded): display name, class level and
--   a parental-consent record. No date of birth, phone, address or photo.
-- * Quiz answer keys live in a separate table that students cannot read.
--   Quizzes are graded by a SECURITY DEFINER function on the server.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('student', 'teacher', 'admin');
create type public.subscription_status as enum ('trial', 'active', 'past_due', 'cancelled');

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function public.random_code(len int default 8)
returns text
language sql
volatile
set search_path = ''
as $$
  -- Unambiguous upper-case letters and digits (no 0/O, 1/I/L).
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::int, 1), '')
  from generate_series(1, len);
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Schools
-- -----------------------------------------------------------------------------
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 200),
  state text,
  lga text,
  contact_email text,
  -- Codes that let students and teachers join this school when signing up.
  student_join_code text not null unique default public.random_code(8),
  teacher_join_code text not null unique default public.random_code(10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger schools_updated_at before update on public.schools
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Profiles (one per auth user)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  school_id uuid references public.schools (id) on delete set null,
  role public.user_role not null default 'student',
  full_name text not null check (char_length(full_name) between 1 and 120),
  class_level text check (class_level in ('JSS1','JSS2','JSS3','SS1','SS2','SS3')),
  parental_consent boolean not null default false,
  parental_consent_at timestamptz,
  parental_consent_recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint non_admin_needs_school check (role = 'admin' or school_id is not null)
);
create index profiles_school_id_idx on public.profiles (school_id);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Helper functions used by RLS policies. SECURITY DEFINER so they can read
-- profiles without recursing into the profiles policies.
create or replace function public.my_role()
returns public.user_role
language sql stable security definer
set search_path = ''
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.my_school_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$ select school_id from public.profiles where id = auth.uid() $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$ select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false) $$;

create or replace function public.is_teacher_of(target_school uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((
    select role = 'teacher' and school_id = target_school
    from public.profiles where id = auth.uid()
  ), false)
$$;

-- -----------------------------------------------------------------------------
-- Billing (school-billed subscriptions; Paystack integration is a stub)
-- -----------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null unique references public.schools (id) on delete cascade,
  plan text not null default 'pilot',
  status public.subscription_status not null default 'trial',
  seats int not null default 50 check (seats >= 0),
  -- Price per student per term, in kobo (NGN x 100).
  price_per_seat_kobo bigint not null default 0 check (price_per_seat_kobo >= 0),
  currency text not null default 'NGN',
  current_period_start date,
  current_period_end date,
  -- Filled in once Paystack is integrated.
  paystack_customer_code text,
  paystack_subscription_code text,
  paystack_plan_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Every new school starts on a trial subscription.
create or replace function public.create_trial_subscription()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.subscriptions (school_id, current_period_start, current_period_end)
  values (new.id, current_date, current_date + 30);
  return new;
end;
$$;
create trigger schools_trial_subscription after insert on public.schools
  for each row execute function public.create_trial_subscription();

create or replace function public.school_has_access(target_school uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.school_id = target_school
      and s.status in ('trial', 'active')
      and (s.current_period_end is null or s.current_period_end >= current_date)
  )
$$;

-- -----------------------------------------------------------------------------
-- Content: courses, lessons, quizzes, assignments
-- -----------------------------------------------------------------------------
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  -- NULL school_id = platform course (licensed to schools via school_courses).
  -- Non-NULL = a course a teacher created for their own school.
  school_id uuid references public.schools (id) on delete cascade,
  slug text not null,
  title text not null check (char_length(title) between 2 and 200),
  description text,
  category text not null default 'Digital Skills',
  level text,
  age_group text,
  published boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index courses_slug_unique on public.courses (coalesce(school_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);
create index courses_school_id_idx on public.courses (school_id);
create trigger courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();

-- Which platform courses each school has licensed.
create table public.school_courses (
  school_id uuid not null references public.schools (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (school_id, course_id)
);
create index school_courses_course_id_idx on public.school_courses (course_id);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  position int not null default 1,
  title text not null check (char_length(title) between 2 and 200),
  summary text,
  content_md text,              -- lesson text (Markdown)
  video_url text,               -- external video (e.g. YouTube) or a public URL
  video_path text,              -- object path in the private "lesson-videos" bucket
  duration_minutes int check (duration_minutes is null or duration_minutes > 0),
  ai_disclosure text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lessons_course_id_idx on public.lessons (course_id, position);
create trigger lessons_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons (id) on delete cascade,
  title text not null,
  pass_mark int not null default 7 check (pass_mark >= 0),
  created_at timestamptz not null default now()
);

-- Questions WITHOUT answers: safe for students to read.
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  position int not null default 1,
  prompt text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  created_at timestamptz not null default now()
);
create index quiz_questions_quiz_id_idx on public.quiz_questions (quiz_id, position);

-- Answer keys: teachers and admins only. Students get feedback via submit_quiz().
create table public.quiz_answer_keys (
  question_id uuid primary key references public.quiz_questions (id) on delete cascade,
  correct_index int not null check (correct_index >= 0),
  explanation text
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  title text not null,
  instructions_md text,
  rubric_md text,
  max_score int not null default 20 check (max_score > 0),
  created_at timestamptz not null default now()
);
create index assignments_course_id_idx on public.assignments (course_id);
create index assignments_lesson_id_idx on public.assignments (lesson_id);

-- Can the current user see this course?
create or replace function public.can_access_course(target_course uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.courses c
      join public.profiles p on p.id = auth.uid()
      where c.id = target_course
        and (
          -- the school's own course (teachers see drafts, students only published)
          (c.school_id = p.school_id and (c.published or p.role = 'teacher'))
          or
          -- a platform course the school has licensed and is paying for
          (c.school_id is null
            and (c.published or p.role = 'teacher')
            and exists (select 1 from public.school_courses sc
                        where sc.course_id = c.id and sc.school_id = p.school_id)
            and public.school_has_access(p.school_id))
        )
        and (p.role <> 'student' or p.parental_consent)
    )
$$;

-- Can the current user edit this course's content?
create or replace function public.can_edit_course(target_course uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select
    public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = target_course
        and c.school_id is not null
        and public.is_teacher_of(c.school_id)
    )
$$;

-- -----------------------------------------------------------------------------
-- Student activity
-- -----------------------------------------------------------------------------
create table public.lesson_progress (
  student_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);
create index lesson_progress_school_idx on public.lesson_progress (school_id);
create index lesson_progress_lesson_idx on public.lesson_progress (lesson_id);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  answers jsonb not null,
  score int not null,
  total int not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);
create index quiz_attempts_student_idx on public.quiz_attempts (student_id, quiz_id);
create index quiz_attempts_school_idx on public.quiz_attempts (school_id);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  text_response text,
  file_path text,               -- object path in the private "submissions" bucket
  submitted_at timestamptz not null default now(),
  score int check (score is null or score >= 0),
  feedback text,
  graded_by uuid references public.profiles (id) on delete set null,
  graded_at timestamptz,
  unique (assignment_id, student_id)
);
create index submissions_school_idx on public.submissions (school_id, graded_at);
create index submissions_student_idx on public.submissions (student_id);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default public.random_code(10),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  issued_at timestamptz not null default now(),
  unique (student_id, course_id)
);
create index certificates_school_idx on public.certificates (school_id);

-- -----------------------------------------------------------------------------
-- Workshops (in-school sessions) and attendance
-- -----------------------------------------------------------------------------
create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  title text not null,
  held_on date not null default current_date,
  facilitator text,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index workshops_school_idx on public.workshops (school_id, held_on desc);

create table public.workshop_attendance (
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  present boolean not null default true,
  recorded_by uuid references public.profiles (id) on delete set null,
  recorded_at timestamptz not null default now(),
  primary key (workshop_id, student_id)
);
create index workshop_attendance_school_idx on public.workshop_attendance (school_id);

-- =============================================================================
-- Row-level security
-- =============================================================================
alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.courses enable row level security;
alter table public.school_courses enable row level security;
alter table public.lessons enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answer_keys enable row level security;
alter table public.assignments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.submissions enable row level security;
alter table public.certificates enable row level security;
alter table public.workshops enable row level security;
alter table public.workshop_attendance enable row level security;

-- Schools: members read their own school; admins manage all.
-- Join codes are only shown in the app to teachers and admins (see schools_public view note).
create policy schools_select on public.schools for select to authenticated
  using (public.is_admin() or id = public.my_school_id());
create policy schools_admin_all on public.schools for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Students must not see join codes. Column privileges hide them from the
-- authenticated role; teachers and admins read them via get_join_codes().
revoke select on public.schools from authenticated, anon;
grant select (id, name, state, lga, contact_email, created_at, updated_at) on public.schools to authenticated;

create or replace function public.get_join_codes(target_school uuid)
returns table (student_join_code text, teacher_join_code text)
language sql stable security definer
set search_path = ''
as $$
  select s.student_join_code,
         case when public.is_admin() then s.teacher_join_code else null end
  from public.schools s
  where s.id = target_school
    and (public.is_admin() or public.is_teacher_of(s.id))
$$;

create or replace function public.regenerate_join_codes(target_school uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can regenerate join codes';
  end if;
  update public.schools
     set student_join_code = public.random_code(8),
         teacher_join_code = public.random_code(10)
   where id = target_school;
end;
$$;

-- Profiles
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or (school_id is not null and public.is_teacher_of(school_id))
  );
-- Users may update their own name and class only (role/school/consent are
-- protected by the trigger below).
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_teacher on public.profiles for update to authenticated
  using (role = 'student' and school_id is not null and public.is_teacher_of(school_id))
  with check (role = 'student' and school_id is not null and public.is_teacher_of(school_id));
create policy profiles_admin_all on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Guard privileged profile columns.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  -- Service role / SQL editor (no JWT) and admins may change anything.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role or new.school_id is distinct from old.school_id then
    raise exception 'Only admins can change role or school';
  end if;

  if (new.parental_consent is distinct from old.parental_consent
      or new.parental_consent_at is distinct from old.parental_consent_at
      or new.parental_consent_recorded_by is distinct from old.parental_consent_recorded_by)
     and not public.is_teacher_of(old.school_id) then
    raise exception 'Only a teacher at this school can record parental consent';
  end if;

  if new.parental_consent and not old.parental_consent then
    new.parental_consent_at = now();
    new.parental_consent_recorded_by = auth.uid();
  elsif not new.parental_consent then
    new.parental_consent_at = null;
    new.parental_consent_recorded_by = null;
  end if;

  return new;
end;
$$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- Subscriptions: admins manage; the school's teachers can read status.
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (public.is_admin() or public.is_teacher_of(school_id));
create policy subscriptions_admin_all on public.subscriptions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Courses
-- The direct teacher check lets INSERT ... RETURNING see a just-created row
-- (can_access_course looks the row up and cannot see it yet).
create policy courses_select on public.courses for select to authenticated
  using ((school_id is not null and public.is_teacher_of(school_id)) or public.can_access_course(id));
create policy courses_teacher_insert on public.courses for insert to authenticated
  with check (school_id is not null and public.is_teacher_of(school_id));
create policy courses_teacher_update on public.courses for update to authenticated
  using (school_id is not null and public.is_teacher_of(school_id))
  with check (school_id is not null and public.is_teacher_of(school_id));
create policy courses_teacher_delete on public.courses for delete to authenticated
  using (school_id is not null and public.is_teacher_of(school_id));
create policy courses_admin_all on public.courses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- School course licences
create policy school_courses_select on public.school_courses for select to authenticated
  using (public.is_admin() or school_id = public.my_school_id());
create policy school_courses_admin_all on public.school_courses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Lessons
create policy lessons_select on public.lessons for select to authenticated
  using (public.can_access_course(course_id) and (published or public.can_edit_course(course_id)));
create policy lessons_edit on public.lessons for all to authenticated
  using (public.can_edit_course(course_id)) with check (public.can_edit_course(course_id));

-- Quizzes
create policy quizzes_select on public.quizzes for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id and public.can_access_course(l.course_id)));
create policy quizzes_edit on public.quizzes for all to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id and public.can_edit_course(l.course_id)))
  with check (exists (select 1 from public.lessons l where l.id = lesson_id and public.can_edit_course(l.course_id)));

create policy quiz_questions_select on public.quiz_questions for select to authenticated
  using (exists (select 1 from public.quizzes q join public.lessons l on l.id = q.lesson_id
                 where q.id = quiz_id and public.can_access_course(l.course_id)));
create policy quiz_questions_edit on public.quiz_questions for all to authenticated
  using (exists (select 1 from public.quizzes q join public.lessons l on l.id = q.lesson_id
                 where q.id = quiz_id and public.can_edit_course(l.course_id)))
  with check (exists (select 1 from public.quizzes q join public.lessons l on l.id = q.lesson_id
                 where q.id = quiz_id and public.can_edit_course(l.course_id)));

-- Answer keys: teachers who can see the course, and admins. Never students.
create policy quiz_answer_keys_select on public.quiz_answer_keys for select to authenticated
  using (
    public.my_role() in ('teacher', 'admin')
    and exists (select 1 from public.quiz_questions qq
                join public.quizzes q on q.id = qq.quiz_id
                join public.lessons l on l.id = q.lesson_id
                where qq.id = question_id and public.can_access_course(l.course_id))
  );
create policy quiz_answer_keys_edit on public.quiz_answer_keys for all to authenticated
  using (exists (select 1 from public.quiz_questions qq
                 join public.quizzes q on q.id = qq.quiz_id
                 join public.lessons l on l.id = q.lesson_id
                 where qq.id = question_id and public.can_edit_course(l.course_id)))
  with check (exists (select 1 from public.quiz_questions qq
                 join public.quizzes q on q.id = qq.quiz_id
                 join public.lessons l on l.id = q.lesson_id
                 where qq.id = question_id and public.can_edit_course(l.course_id)));

-- Assignments
create policy assignments_select on public.assignments for select to authenticated
  using (public.can_access_course(course_id));
create policy assignments_edit on public.assignments for all to authenticated
  using (public.can_edit_course(course_id)) with check (public.can_edit_course(course_id));

-- Lesson progress: students write their own; teachers read their school's.
create policy lesson_progress_select on public.lesson_progress for select to authenticated
  using (student_id = auth.uid() or public.is_teacher_of(school_id) or public.is_admin());
create policy lesson_progress_insert on public.lesson_progress for insert to authenticated
  with check (
    student_id = auth.uid()
    and school_id = public.my_school_id()
    and exists (select 1 from public.lessons l where l.id = lesson_id and public.can_access_course(l.course_id))
  );
create policy lesson_progress_delete on public.lesson_progress for delete to authenticated
  using (student_id = auth.uid());

-- Quiz attempts: written only by submit_quiz() (no insert policy).
create policy quiz_attempts_select on public.quiz_attempts for select to authenticated
  using (student_id = auth.uid() or public.is_teacher_of(school_id) or public.is_admin());

-- Submissions: students create/update their own until graded; teachers grade.
create policy submissions_select on public.submissions for select to authenticated
  using (student_id = auth.uid() or public.is_teacher_of(school_id) or public.is_admin());
create policy submissions_insert on public.submissions for insert to authenticated
  with check (
    student_id = auth.uid()
    and school_id = public.my_school_id()
    and score is null and graded_by is null and graded_at is null and feedback is null
    and exists (select 1 from public.assignments a where a.id = assignment_id and public.can_access_course(a.course_id))
  );
create policy submissions_update_student on public.submissions for update to authenticated
  using (student_id = auth.uid() and graded_at is null)
  with check (student_id = auth.uid() and score is null and graded_by is null and graded_at is null and feedback is null);
create policy submissions_update_teacher on public.submissions for update to authenticated
  using (public.is_teacher_of(school_id)) with check (public.is_teacher_of(school_id));

-- Students may not move a submission to another school or student.
create or replace function public.protect_submission_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.student_id is distinct from old.student_id
     or new.school_id is distinct from old.school_id
     or new.assignment_id is distinct from old.assignment_id then
    raise exception 'Submission owner, school and assignment cannot change';
  end if;
  return new;
end;
$$;
create trigger submissions_protect before update on public.submissions
  for each row execute function public.protect_submission_columns();

-- Certificates: issued only by claim_certificate() (no insert policy).
create policy certificates_select on public.certificates for select to authenticated
  using (student_id = auth.uid() or public.is_teacher_of(school_id) or public.is_admin());

-- Workshops and attendance: the school's teachers manage; students see their own.
-- SECURITY DEFINER helpers avoid policy recursion between the two tables.
create or replace function public.attended_workshop(target_workshop uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.workshop_attendance wa
                 where wa.workshop_id = target_workshop and wa.student_id = auth.uid())
$$;

create or replace function public.workshop_school(target_workshop uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $$ select school_id from public.workshops where id = target_workshop $$;

create or replace function public.profile_school(target_profile uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $$ select school_id from public.profiles where id = target_profile $$;

create policy workshops_select on public.workshops for select to authenticated
  using (public.is_admin() or public.is_teacher_of(school_id) or public.attended_workshop(id));
create policy workshops_teacher_all on public.workshops for all to authenticated
  using (public.is_teacher_of(school_id) or public.is_admin())
  with check (public.is_teacher_of(school_id) or public.is_admin());

create policy workshop_attendance_select on public.workshop_attendance for select to authenticated
  using (student_id = auth.uid() or public.is_teacher_of(school_id) or public.is_admin());
create policy workshop_attendance_teacher_all on public.workshop_attendance for all to authenticated
  using (public.is_teacher_of(school_id) or public.is_admin())
  with check (
    (public.is_teacher_of(school_id) or public.is_admin())
    and public.workshop_school(workshop_id) = school_id
    and public.profile_school(student_id) = school_id
  );

-- =============================================================================
-- Server-side functions called from the app
-- =============================================================================

-- Grade a quiz. Returns the score plus per-question feedback.
create or replace function public.submit_quiz(target_quiz uuid, answers jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  me public.profiles;
  q public.quizzes;
  course uuid;
  total int;
  score int := 0;
  feedback jsonb := '[]'::jsonb;
  rec record;
  chosen int;
  is_correct boolean;
  attempt_id uuid;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role <> 'student' then
    raise exception 'Only students can submit quizzes';
  end if;

  select * into q from public.quizzes where id = target_quiz;
  if q.id is null then
    raise exception 'Quiz not found';
  end if;

  select l.course_id into course from public.lessons l where l.id = q.lesson_id;
  if not public.can_access_course(course) then
    raise exception 'You do not have access to this quiz';
  end if;

  if jsonb_typeof(answers) <> 'object' then
    raise exception 'answers must be an object of {question_id: option_index}';
  end if;

  select count(*) into total from public.quiz_questions where quiz_id = q.id;

  for rec in
    select qq.id, qq.position, k.correct_index, k.explanation
    from public.quiz_questions qq
    left join public.quiz_answer_keys k on k.question_id = qq.id
    where qq.quiz_id = q.id
    order by qq.position
  loop
    chosen := case when jsonb_typeof(answers -> rec.id::text) = 'number'
                   then (answers ->> rec.id::text)::int else null end;
    is_correct := chosen is not null and chosen = rec.correct_index;
    if is_correct then
      score := score + 1;
    end if;
    feedback := feedback || jsonb_build_object(
      'question_id', rec.id,
      'chosen', chosen,
      'correct_index', rec.correct_index,
      'correct', is_correct,
      'explanation', rec.explanation
    );
  end loop;

  insert into public.quiz_attempts (quiz_id, student_id, school_id, answers, score, total, passed)
  values (q.id, me.id, me.school_id, answers, score, total, score >= q.pass_mark)
  returning id into attempt_id;

  return jsonb_build_object(
    'attempt_id', attempt_id,
    'score', score,
    'total', total,
    'pass_mark', q.pass_mark,
    'passed', score >= q.pass_mark,
    'feedback', feedback
  );
end;
$$;

-- Issue a certificate when every published lesson in the course is complete
-- and every quiz in it has a passing attempt.
create or replace function public.claim_certificate(target_course uuid)
returns public.certificates
language plpgsql security definer
set search_path = ''
as $$
declare
  me public.profiles;
  cert public.certificates;
  missing int;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role <> 'student' then
    raise exception 'Only students can earn certificates';
  end if;
  if not public.can_access_course(target_course) then
    raise exception 'You do not have access to this course';
  end if;

  select * into cert from public.certificates where student_id = me.id and course_id = target_course;
  if cert.id is not null then
    return cert;
  end if;

  select count(*) into missing
  from public.lessons l
  where l.course_id = target_course and l.published
    and not exists (select 1 from public.lesson_progress lp where lp.lesson_id = l.id and lp.student_id = me.id);
  if missing > 0 then
    raise exception 'Finish all lessons first (% left)', missing;
  end if;

  select count(*) into missing
  from public.quizzes q
  join public.lessons l on l.id = q.lesson_id
  where l.course_id = target_course and l.published
    and not exists (select 1 from public.quiz_attempts a where a.quiz_id = q.id and a.student_id = me.id and a.passed);
  if missing > 0 then
    raise exception 'Pass all quizzes first (% left)', missing;
  end if;

  insert into public.certificates (student_id, course_id, school_id)
  values (me.id, target_course, me.school_id)
  returning * into cert;
  return cert;
end;
$$;

-- Create a profile when someone signs up. The school and role come ONLY from
-- the join code the user typed, never from anything else the client sends.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_code text := upper(trim(coalesce(new.raw_user_meta_data ->> 'join_code', '')));
  v_name text := left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120);
  v_level text := nullif(new.raw_user_meta_data ->> 'class_level', '');
  target_school uuid;
  target_role public.user_role;
begin
  if v_name = '' then
    v_name := 'New user';
  end if;
  if v_level not in ('JSS1','JSS2','JSS3','SS1','SS2','SS3') then
    v_level := null;
  end if;

  select id, 'student'::public.user_role into target_school, target_role
  from public.schools where student_join_code = v_code;

  if target_school is null then
    select id, 'teacher'::public.user_role into target_school, target_role
    from public.schools where teacher_join_code = v_code;
  end if;

  if target_school is null then
    raise exception 'Invalid school join code';
  end if;

  insert into public.profiles (id, school_id, role, full_name, class_level)
  values (new.id, target_school, target_role, v_name,
          case when target_role = 'student' then v_level else null end);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the sign-up form check a code before creating the account.
-- Returns only the school's name and the role the code grants.
create or replace function public.check_join_code(code text)
returns table (school_name text, role public.user_role)
language sql stable security definer
set search_path = ''
as $$
  select s.name, 'student'::public.user_role from public.schools s
  where s.student_join_code = upper(trim(code))
  union all
  select s.name, 'teacher'::public.user_role from public.schools s
  where s.teacher_join_code = upper(trim(code))
  limit 1
$$;

-- Only expose the RPCs the app needs to signed-in users.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.create_trial_subscription() from public, anon, authenticated;
revoke execute on function public.protect_profile_columns() from public, anon, authenticated;
revoke execute on function public.submit_quiz(uuid, jsonb) from public, anon;
revoke execute on function public.claim_certificate(uuid) from public, anon;
revoke execute on function public.get_join_codes(uuid) from public, anon;
revoke execute on function public.regenerate_join_codes(uuid) from public, anon;
grant execute on function public.check_join_code(text) to anon, authenticated;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;
grant execute on function public.claim_certificate(uuid) to authenticated;
grant execute on function public.get_join_codes(uuid) to authenticated;
grant execute on function public.regenerate_join_codes(uuid) to authenticated;

-- =============================================================================
-- Storage buckets (private) and their policies
--   lesson-videos/<course_id>/<file>
--   submissions/<school_id>/<student_id>/<file>
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('lesson-videos', 'lesson-videos', false, 524288000),   -- 500 MB
  ('submissions', 'submissions', false, 10485760)          -- 10 MB
on conflict (id) do nothing;

create policy lesson_videos_read on storage.objects for select to authenticated
  using (
    bucket_id = 'lesson-videos'
    and exists (select 1 from public.courses c
                where c.id::text = (storage.foldername(objects.name))[1]
                  and public.can_access_course(c.id))
  );
create policy lesson_videos_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lesson-videos'
    and exists (select 1 from public.courses c
                where c.id::text = (storage.foldername(objects.name))[1]
                  and public.can_edit_course(c.id))
  );
create policy lesson_videos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'lesson-videos'
    and exists (select 1 from public.courses c
                where c.id::text = (storage.foldername(objects.name))[1]
                  and public.can_edit_course(c.id))
  );

create policy submissions_files_read on storage.objects for select to authenticated
  using (
    bucket_id = 'submissions'
    and (
      ((storage.foldername(objects.name))[2] = auth.uid()::text
        and (storage.foldername(objects.name))[1] = public.my_school_id()::text)
      or exists (select 1 from public.schools s
                 where s.id::text = (storage.foldername(objects.name))[1]
                   and public.is_teacher_of(s.id))
      or public.is_admin()
    )
  );
create policy submissions_files_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(objects.name))[1] = public.my_school_id()::text
    and (storage.foldername(objects.name))[2] = auth.uid()::text
  );
