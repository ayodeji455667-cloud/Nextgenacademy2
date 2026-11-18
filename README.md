# School Learning App (MVP)

A paid e-learning web app for Nigerian secondary schools (ages 11–18): AI and digital skills courses plus in-school workshops. Schools subscribe for their students; students learn through short video lessons, quizzes and projects; teachers follow progress, mark work and record workshops.

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind CSS 4) · Supabase (Auth, Postgres, Storage, row-level security) · deploys to Vercel · installable as a PWA. An Expo mobile app can come later and reuse the same Supabase backend.

The database is seeded with the pilot lesson **Staying Safe Online** (Internet Safety, Level 2): lesson text, the draft video, the 10-question quiz with explanations, and the poster project with its rubric.

---

## What's included

| Area | Features |
| --- | --- |
| **Sign-up and roles** | Email and password sign-in. People join a school with a **join code**: the student code makes you a student, the teacher code makes you a teacher. Admins are promoted by hand (see setup step 6). |
| **Student portal** | Dashboard with progress, course list, lessons (video + text), quizzes with instant feedback, project submission with photo upload, certificates (printable / save as PDF). |
| **Teacher portal** | Record parental consent, see each student's progress, mark projects with feedback, record workshops and attendance, create the school's own courses, lessons, videos and quizzes. |
| **Admin portal** | Schools (create, join codes, unlock courses), users (change role or school), platform courses (create and edit), billing (subscription status per school). |
| **Payments** | Designed for **school-billed subscriptions** (per student seat, per term, in naira). **Paystack is a stub**: admins set a school's status by hand. See `src/lib/billing/paystack.ts` for the plan. |
| **PWA** | Web manifest, icons, and a service worker that shows an offline page. It does not cache signed-in pages, so student data is never stored for another user on a shared device. |

### Data protection (NDPA-minded)

- **Each school's data is separate.** Every school-owned row has a `school_id`, and row-level security (RLS) in Postgres stops anyone reading another school's students, progress, submissions, files or workshops. This is enforced in the database, not only in the app.
- **Minimal student data:** display name (first name and surname initial is suggested), class (JSS1–SS3), school, and a parental-consent record. No date of birth, phone number, address or photo is collected.
- **Parental consent gate:** a student's lessons stay locked until a teacher records that the parent or guardian has consented. The teacher and time are stored with the record.
- **Quiz answers are private:** answer keys are in a separate table students cannot read; quizzes are marked by a database function.
- **Private files:** lesson videos and student uploads are in private storage buckets, served with short-lived signed links.
- **Subscription gate:** students lose access to platform courses when their school's subscription is past due, cancelled or expired.

---

## Setup

You need: Node.js 20+ and a free [Supabase](https://supabase.com) account.

### 1. Create a Supabase project

In the Supabase dashboard, create a new project. Choose the region closest to your users, and save the database password somewhere safe.

### 2. Create the database tables and seed data

**Option A: SQL editor (no tools to install).** In the dashboard, open **SQL Editor**, paste the whole of `supabase/migrations/20261118000000_init.sql`, and run it. Then do the same with `supabase/seed.sql`.

**Option B: Supabase CLI.**

```bash
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase db push
# then run supabase/seed.sql in the SQL editor
# (if the CLI asks for a config file, run `npx supabase init` first)
```

### 3. Configure authentication

In **Authentication > URL Configuration**:

- **Site URL:** `http://localhost:3000` while developing, then your live address (for example `https://your-app.vercel.app`).
- **Redirect URLs:** add `http://localhost:3000/auth/callback` and `https://your-app.vercel.app/auth/callback`.

In **Authentication > Sign In / Providers > Email**, keep **Confirm email** on.

Recommended: in **Authentication > Email Templates > Confirm signup**, change the link so it works even when a student opens the email on a different phone from the one they signed up on:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
```

Supabase's built-in email sender is rate limited and meant for testing. Before a real pilot, set up your own SMTP provider in **Authentication > Emails > SMTP Settings**.

### 4. Set environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from **Project Settings > API Keys** (the legacy `anon` key also works). The service-role key is only needed for step 7 and must **never** start with `NEXT_PUBLIC_`.

### 5. Run the app

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### 6. Create the first admin

1. Sign up at `/signup` with the demo teacher code **`DEMOTEACH1`**, choose "I am a teacher", and confirm your email.
2. In the SQL editor, promote yourself:

   ```sql
   update public.profiles
      set role = 'admin', school_id = null
    where id = (select id from auth.users where email = 'you@example.com');
   ```

3. Sign out and back in. You now see the Admin portal.

### 7. Upload the pilot video (optional)

The seed points the pilot lesson at a video in private storage. Upload it with:

```bash
# add SUPABASE_SERVICE_ROLE_KEY to .env.local first
npm run seed:video
```

The video is the **silent draft animatic** (`supabase/seed-media/`). Replace it with the final voiced video from the teacher's lesson page when it is ready.

### 8. Try it as a student

1. Sign up with the demo student code **`DEMOSTU1`** and pick a class.
2. Sign in as the demo teacher, open **Students**, and click **Record consent**.
3. Back as the student: open the course, watch the lesson, take the quiz, submit the project, and claim the certificate.

### 9. Before inviting real schools

- **Regenerate the demo join codes** (Admin > Schools > Demo Secondary School > Generate new codes). The codes above are public in this repository.
- Set up custom SMTP (step 3).
- Prepare a parental consent form for schools to collect, and a privacy notice for parents (NDPA).

---

## Deploy to Vercel

1. Push this repository to GitHub and import it in Vercel ("Add New Project").
2. Add the environment variables from `.env.example` (at least the two `NEXT_PUBLIC_SUPABASE_*` values and `NEXT_PUBLIC_SITE_URL` set to your Vercel address).
3. Deploy, then update the Supabase **Site URL** and **Redirect URLs** (step 3) to the Vercel address.

---

## How it fits together

```
src/
  proxy.ts                  refreshes the Supabase session; sends signed-out visitors to /login
  app/
    (auth)/                 login, signup, server actions for auth
    auth/callback/          confirms email links
    student/                student portal
    teacher/                teacher portal
    manage/                 course and lesson editor (teachers: own school; admins: platform courses)
    admin/                  admin portal
    certificates/[code]/    printable certificate
    api/paystack/webhook/   Paystack webhook (stub: checks the signature only)
  lib/
    auth.ts                 getProfile(), requireRole()
    supabase/               server and browser clients
    billing/paystack.ts     Paystack stub and integration plan
supabase/
  migrations/               schema, RLS policies, storage buckets, database functions
  seed.sql                  demo school + "Staying Safe Online"
  seed-media/               pilot draft video
public/sw.js                service worker
```

**Roles.** `student` and `teacher` always belong to a school. `admin` is a platform admin (your organisation) with no school. A school-level admin role (for example a head teacher who manages billing) is a natural next step.

**Courses.** A course with no school is a platform course; an admin unlocks it per school (the `school_courses` table). A course with a school is that school's own content, created by its teachers.

**Database functions the app calls:** `check_join_code`, `submit_quiz`, `claim_certificate`, `get_join_codes`, `regenerate_join_codes`.

### Useful commands

```bash
npm run dev         # development server
npm run build       # production build
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run seed:video  # upload the pilot video to Supabase Storage

# RLS smoke test against a THROWAWAY local Postgres (creates/drops a database called rls_smoke)
PGURL=postgres://postgres@localhost:5432/postgres supabase/tests/run.sh
```

---

## Known limits and next steps

- **Paystack:** not integrated. The plan (initialize a transaction per school, then handle webhooks to set the subscription status) is written in `src/lib/billing/paystack.ts`.
- **Students without email:** sign-up needs an email address. Many JSS students may not have one; a next step is teacher-created accounts with a username and PIN.
- **Offline lessons:** the PWA shows an offline page but does not download lessons for offline viewing yet.
- **Bulk tools:** no CSV import of students, no class groups within a school, no report export yet.
- **Mobile app:** the Expo app is not started. It can use the same Supabase project and RLS rules.
