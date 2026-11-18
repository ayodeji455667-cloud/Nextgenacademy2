-- RLS smoke test. Run with supabase/tests/run.sh against a throwaway Postgres.
-- Each "expect" line says what should happen; errors marked "expect ... error" are correct.
\set ON_ERROR_STOP 0
-- second school
insert into public.schools (id, name, student_join_code, teacher_join_code) values ('aaaaaaaa-0000-4000-8000-000000000000','Other School','OTHSTU01','OTHTEACH01');
insert into auth.users (id, raw_user_meta_data) values
 ('00000000-0000-4000-8000-0000000000a1', '{"full_name":"Ada Student","join_code":"demostu1","class_level":"JSS2"}'),
 ('00000000-0000-4000-8000-0000000000b1', '{"full_name":"Tunde Teacher","join_code":"DEMOTEACH1","role":"admin"}'),
 ('00000000-0000-4000-8000-0000000000c1', '{"full_name":"Other Student","join_code":"OTHSTU01"}'),
 ('00000000-0000-4000-8000-0000000000d1', '{"full_name":"Other Teacher","join_code":"OTHTEACH01"}'),
 ('00000000-0000-4000-8000-0000000000e1', '{"full_name":"Boss","join_code":"DEMOTEACH1"}');
update public.profiles set role='admin', school_id=null where id='00000000-0000-4000-8000-0000000000e1';
\echo '--- bad join code should fail'
insert into auth.users (id, raw_user_meta_data) values ('00000000-0000-4000-8000-0000000000f1', '{"join_code":"NOPE"}');
select id, role, school_id is not null as has_school, class_level from public.profiles order by id;

set role authenticated;
\echo '=== STUDENT A (no consent yet)'
set request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000a1';
select 'courses visible (expect 0, no consent)', count(*) from public.courses;
\echo '--- student tries to grant self consent (expect error)'
update public.profiles set parental_consent = true where id = auth.uid();
\echo '--- student tries to become teacher (expect error)'
update public.profiles set role = 'teacher' where id = auth.uid();
select 'schools cols ok', name from public.schools;
\echo '--- student reads join codes (expect permission error)'
select student_join_code from public.schools;
select 'get_join_codes as student (expect 0 rows)', count(*) from public.get_join_codes('11111111-1111-4111-8111-111111111111');

\echo '=== TEACHER demo'
set request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000b1';
select 'teacher role (expect teacher, not admin)', role from public.profiles where id = auth.uid();
select 'teacher sees profiles (expect 2: self + student a)', count(*) from public.profiles;
update public.profiles set parental_consent = true where id = '00000000-0000-4000-8000-0000000000a1';
select 'consent recorded', parental_consent, parental_consent_recorded_by is not null from public.profiles where id='00000000-0000-4000-8000-0000000000a1';
\echo '--- teacher tries to consent other school student (expect 0 updated)'
update public.profiles set parental_consent = true where id = '00000000-0000-4000-8000-0000000000c1';
select 'teacher answer keys (expect 10)', count(*) from public.quiz_answer_keys;
select 'join codes teacher (student code, null teacher code)', * from public.get_join_codes('11111111-1111-4111-8111-111111111111');
insert into public.courses (school_id, slug, title) values ('11111111-1111-4111-8111-111111111111','my-course','My School Course') ;
\echo '--- teacher creates course for OTHER school (expect RLS error)'
insert into public.courses (school_id, slug, title) values ('aaaaaaaa-0000-4000-8000-000000000000','x','Hack Course');
\echo '--- teacher edits platform course (expect 0 rows)'
update public.courses set title='hacked' where id='22222222-2222-4222-8222-222222222222';
insert into public.workshops (id, school_id, title) values ('77777777-7777-4777-8777-777777777777','11111111-1111-4111-8111-111111111111','Safety assembly');
insert into public.workshop_attendance (workshop_id, student_id, school_id) values ('77777777-7777-4777-8777-777777777777','00000000-0000-4000-8000-0000000000a1','11111111-1111-4111-8111-111111111111');
\echo '--- attendance for other school student (expect RLS error)'
insert into public.workshop_attendance (workshop_id, student_id, school_id) values ('77777777-7777-4777-8777-777777777777','00000000-0000-4000-8000-0000000000c1','11111111-1111-4111-8111-111111111111');

\echo '=== STUDENT A (consented)'
set request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000a1';
select 'courses (expect 1 platform; draft school course hidden)', count(*) from public.courses;
select 'questions (expect 10)', count(*) from public.quiz_questions;
select 'answer keys (expect 0)', count(*) from public.quiz_answer_keys;
\echo '--- claim cert early (expect error)'
select public.claim_certificate('22222222-2222-4222-8222-222222222222');
insert into public.lesson_progress (student_id, lesson_id, school_id) values (auth.uid(), '33333333-3333-4333-8333-333333333333', public.my_school_id());
select (public.submit_quiz('44444444-4444-4444-8444-444444444444', '{"66666666-6666-4666-8666-000000000001":0}'::jsonb))->>'passed' as fail_attempt;
select (r->>'score') score, r->>'passed' passed from (select public.submit_quiz('44444444-4444-4444-8444-444444444444', jsonb_build_object(
 '66666666-6666-4666-8666-000000000001',1,'66666666-6666-4666-8666-000000000002',3,'66666666-6666-4666-8666-000000000003',1,
 '66666666-6666-4666-8666-000000000004',2,'66666666-6666-4666-8666-000000000005',3,'66666666-6666-4666-8666-000000000006',2,
 '66666666-6666-4666-8666-000000000007',1,'66666666-6666-4666-8666-000000000008',1,'66666666-6666-4666-8666-000000000009',2,
 '66666666-6666-4666-8666-000000000010',1)) r) x;
select 'cert', (public.claim_certificate('22222222-2222-4222-8222-222222222222')).code is not null;
\echo '--- direct insert attempt/cert (expect RLS errors)'
insert into public.quiz_attempts (quiz_id, student_id, school_id, answers, score, total, passed) values ('44444444-4444-4444-8444-444444444444', auth.uid(), public.my_school_id(), '{}', 10, 10, true);
insert into public.submissions (assignment_id, student_id, school_id, text_response) values ('55555555-5555-4555-8555-555555555555', auth.uid(), public.my_school_id(), 'my poster');
\echo '--- student self-grades (expect RLS error)'
update public.submissions set score = 20 where student_id = auth.uid();
select 'workshops visible (expect 1)', count(*) from public.workshops;
insert into storage.objects (bucket_id, name) values ('submissions', '11111111-1111-4111-8111-111111111111/00000000-0000-4000-8000-0000000000a1/poster.jpg');
\echo '--- upload into another student folder (expect RLS error)'
insert into storage.objects (bucket_id, name) values ('submissions', '11111111-1111-4111-8111-111111111111/00000000-0000-4000-8000-0000000000c1/poster.jpg');
\echo '--- student uploads lesson video (expect RLS error)'
insert into storage.objects (bucket_id, name) values ('lesson-videos', '22222222-2222-4222-8222-222222222222/x.mp4');

\echo '=== TEACHER grades'
set request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000b1';
update public.submissions set score = 18, feedback='Great', graded_by=auth.uid(), graded_at=now() where student_id='00000000-0000-4000-8000-0000000000a1';
select 'graded', score from public.submissions;
select 'teacher sees uploaded file', count(*) from storage.objects where bucket_id='submissions';

\echo '=== OTHER SCHOOL TEACHER'
set request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000d1';
select 'other teacher sees profiles (expect 2: self + own student)', count(*) from public.profiles;
select 'courses (expect 0, not licensed)', count(*) from public.courses;
select 'submissions (expect 0)', count(*) from public.submissions;
select 'progress (expect 0)', count(*) from public.lesson_progress;
select 'files (expect 0)', count(*) from storage.objects;
select 'certs (expect 0)', count(*) from public.certificates;
select 'workshops (expect 0)', count(*) from public.workshops;

\echo '=== ADMIN'
set request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000e1';
select 'admin profiles (expect 5)', count(*) from public.profiles;
select 'admin join codes', * from public.get_join_codes('11111111-1111-4111-8111-111111111111');
select public.regenerate_join_codes('aaaaaaaa-0000-4000-8000-000000000000');
update public.subscriptions set status='cancelled' where school_id='11111111-1111-4111-8111-111111111111';
set request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000a1';
select 'student after cancel (expect 0 courses)', count(*) from public.courses;
set role anon;
select 'anon check code', * from public.check_join_code('demostu1');
select 'anon profiles (expect error or 0)', count(*) from public.profiles;
