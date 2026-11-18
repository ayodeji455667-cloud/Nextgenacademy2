-- =============================================================================
-- Seed data: a demo school and the pilot lesson "Staying Safe Online".
-- Safe to re-run (uses fixed ids and ON CONFLICT).
--
-- IMPORTANT: the demo join codes below are public in this repository.
-- Regenerate them in Admin > Schools before inviting real students.
-- =============================================================================

-- Demo school ---------------------------------------------------------------
insert into public.schools (id, name, state, lga, student_join_code, teacher_join_code)
values ('11111111-1111-4111-8111-111111111111', 'Demo Secondary School', 'Lagos', 'Ikeja', 'DEMOSTU1', 'DEMOTEACH1')
on conflict (id) do nothing;

-- Platform course ------------------------------------------------------------
insert into public.courses (id, school_id, slug, title, description, category, level, age_group, published)
values (
  '22222222-2222-4222-8222-222222222222', null, 'internet-safety-level-2',
  'Internet Safety (Level 2)',
  'Learn how to protect your personal information, make strong passwords, spot scams, deal with strangers online and stop cyberbullying, using the S.A.F.E. rules.',
  'Digital Skills', 'Level 2', '11–14 (JSS 1 – JSS 3)', true
)
on conflict (id) do nothing;

-- License the course to the demo school.
insert into public.school_courses (school_id, course_id)
values ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')
on conflict do nothing;

-- Lesson 1 -------------------------------------------------------------------
insert into public.lessons (id, course_id, position, title, summary, content_md, video_path, duration_minutes, ai_disclosure, published)
values (
  '33333333-3333-4333-8333-333333333333',
  '22222222-2222-4222-8222-222222222222',
  1,
  'Staying Safe Online',
  'The internet is like a big market. Learn the tricks people use and the four S.A.F.E. rules that keep you safe.',
  $md$
## The big idea

The internet is like a very big market, like Balogun in Lagos or Onitsha Main Market. There are many good people and many useful things, but there are also pickpockets and fake sellers. If you know the tricks and follow a few simple rules, you can enjoy the internet and stay safe.

## What you will learn

By the end of this lesson you will be able to:

1. Explain what **personal information** is and give at least four examples.
2. Create a **strong password** and explain why you should never share it, not even with a best friend.
3. Spot the signs of a **fake message or scam** (for example "Free 10GB data, click here!").
4. Say what to do when a **stranger online** asks for photos, money, or a meeting.
5. Name what to do about **cyberbullying**: do not reply, screenshot, block, report, and tell.
6. Remember and use the **S.A.F.E.** rules.

## The S.A.F.E. rules

| Letter | Rule | In simple words |
|---|---|---|
| **S** | **Secret passwords stay secret** | Use strong passwords. Share them with nobody except your parent or guardian. |
| **A** | **Ask before you share** | Before you post, ask: "Would I be happy if my principal, my parents, and a stranger all saw this?" |
| **F** | **Fake? Check before you click** | If it sounds too good to be true, it is probably a scam. Don't click strange links. |
| **E** | **Expose it: tell a trusted adult** | If something online makes you feel scared, uncomfortable, or confused, tell a parent, guardian, or teacher. You will not be in trouble. |

## Key words

- **Personal information:** facts that can identify you or find you: full name, home address, school name, phone number, date of birth, photos in school uniform, your location.
- **Password:** a secret word or phrase that protects your account.
- **Scam:** a trick to steal your money, data, or account.
- **Phishing:** a fake message or website that pretends to be real (like a bank, MTN, Glo, Airtel, or WAEC) to steal your details.
- **Stranger online:** anyone you have not met in real life with your parents' knowledge, even if they have been chatting with you for weeks.
- **Cyberbullying:** using phones or the internet to insult, threaten, or embarrass someone.
- **Digital footprint:** everything you post or do online. It stays for a very long time.
- **Trusted adult:** a parent, guardian, teacher, or school counsellor you can talk to.

## Remember

**Personal information**
- Never post your home address, phone number, school name, or where you are right now.
- Photos in school uniform show strangers which school you attend.
- Turn off location tagging on photos and apps.

**Passwords**
- A strong password is long (at least 12 characters) and mixes words, numbers, and symbols.
- A **passphrase** is easy to remember and hard to guess: `Jollof!Rice4Sunday`.
- Don't use your name, birthday, or `123456`.
- Use a different password for each important account.
- Never share passwords with friends. Friendships can change.

**Scams and fake messages**
- Warning signs: "You have won!", "Free data / free airtime", "Urgent! Your account will be blocked", spelling mistakes, strange links, requests for PINs, OTPs, or BVN.
- Real companies never ask for your PIN or OTP.
- Don't forward chain messages ("Forward to 10 people or bad luck").

**Strangers online**
- People online can pretend to be anyone. A "13-year-old girl from Abuja" might be an adult.
- Red flags: asks you to keep secrets, asks for photos, offers gifts or airtime, asks to move to a private app, asks to meet.
- Never meet someone from online without a parent or guardian.

**Cyberbullying**
- Don't reply. Take a screenshot. Block. Report. Tell a trusted adult.
- If you see someone being bullied, don't laugh or share it. Support them and tell an adult.

## Next steps

1. Take the 10-question quiz. You need 7 out of 10 to pass.
2. Start your project: **My S.A.F.E. Online Poster + Family Safety Talk**.
$md$,
  '22222222-2222-4222-8222-222222222222/staying-safe-online-animatic-draft1.mp4',
  6,
  'The voice and visuals in this lesson''s video are made with AI tools. The characters are not real people.',
  true
)
on conflict (id) do nothing;

-- Quiz -----------------------------------------------------------------------
insert into public.quizzes (id, lesson_id, title, pass_mark)
values ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333', 'Staying Safe Online quiz', 7)
on conflict (id) do nothing;

insert into public.quiz_questions (id, quiz_id, position, prompt, options) values
('66666666-6666-4666-8666-000000000001', '44444444-4444-4444-8444-444444444444', 1,
 'Which of these is personal information that you should NOT post publicly?',
 '["Your favourite colour", "Your home address", "Your favourite footballer", "The name of a movie you liked"]'),
('66666666-6666-4666-8666-000000000002', '44444444-4444-4444-8444-444444444444', 2,
 'Which password is the strongest?',
 '["123456", "tolu2012", "password", "Jollof!Rice4Sunday"]'),
('66666666-6666-4666-8666-000000000003', '44444444-4444-4444-8444-444444444444', 3,
 'Your best friend asks for your game password so they can help you win. What should you do?',
 '["Give it to them because they are your best friend", "Politely say no. Passwords are only shared with a parent or guardian", "Give them half of it", "Post it in your class WhatsApp group so everybody can help"]'),
('66666666-6666-4666-8666-000000000004', '44444444-4444-4444-8444-444444444444', 4,
 'You get a message: "Congratulations! You have won 20GB free data! Click here and enter your PIN." What is this most likely to be?',
 '["A real gift from your network", "A message from your teacher", "A scam (phishing)", "A school announcement"]'),
('66666666-6666-4666-8666-000000000005', '44444444-4444-4444-8444-444444444444', 5,
 'Which of these is a warning sign of a scam message?',
 '["It asks for your PIN or OTP code", "It says \"Hurry, offer ends today!\"", "It says you won a prize you never entered for", "All of the above"]'),
('66666666-6666-4666-8666-000000000006', '44444444-4444-4444-8444-444444444444', 6,
 'Someone you met in an online game says, "Send me your photo, but don''t tell your parents. It''s our secret." What should you do?',
 '["Send the photo because they are nice", "Keep it a secret", "Don''t reply, take a screenshot, block and report them, and tell a trusted adult", "Send a photo of your friend instead"]'),
('66666666-6666-4666-8666-000000000007', '44444444-4444-4444-8444-444444444444', 7,
 'What does the "S" in S.A.F.E. stand for?',
 '["Share everything", "Secret passwords stay secret", "Social media is fun", "Send photos quickly"]'),
('66666666-6666-4666-8666-000000000008', '44444444-4444-4444-8444-444444444444', 8,
 'Before you post a photo, what question should you ask yourself?',
 '["\"Will I get many likes?\"", "\"Would I be happy if my principal, my parents, and a stranger all saw this?\"", "\"Is my phone charged?\"", "\"Is it Friday?\""]'),
('66666666-6666-4666-8666-000000000009', '44444444-4444-4444-8444-444444444444', 9,
 'A classmate is being insulted in a group chat. What is the best thing to do?',
 '["Laugh and share the messages", "Join in so you are not the next target", "Don''t join in, support your classmate, and tell a trusted adult", "Leave your phone off forever"]'),
('66666666-6666-4666-8666-000000000010', '44444444-4444-4444-8444-444444444444', 10,
 'True or false: "If someone has chatted with you online for many weeks, they are no longer a stranger, so it is safe to meet them alone."',
 '["True", "False"]')
on conflict (id) do nothing;

insert into public.quiz_answer_keys (question_id, correct_index, explanation) values
('66666666-6666-4666-8666-000000000001', 1, 'Your home address tells strangers where to find you. Keep it private.'),
('66666666-6666-4666-8666-000000000002', 3, 'It is long and mixes words, capital letters, a number, and a symbol.'),
('66666666-6666-4666-8666-000000000003', 1, 'Even best friends can make mistakes. Your password is your key. Keep it secret.'),
('66666666-6666-4666-8666-000000000004', 2, '"You have won" + "enter your PIN" = scam. Real companies never ask for your PIN.'),
('66666666-6666-4666-8666-000000000005', 3, 'All three are warning signs. When you see them, don''t click.'),
('66666666-6666-4666-8666-000000000006', 2, 'Asking for secrets and photos is a big red flag. Tell a trusted adult. You won''t be in trouble.'),
('66666666-6666-4666-8666-000000000007', 1, 'S = Secret passwords stay secret. A = Ask before you share. F = Fake? Check before you click. E = Expose it: tell a trusted adult.'),
('66666666-6666-4666-8666-000000000008', 1, 'If you wouldn''t want everyone to see it, don''t post it. The internet remembers.'),
('66666666-6666-4666-8666-000000000009', 2, 'Be the friend who helps. Bullying should be reported, not shared.'),
('66666666-6666-4666-8666-000000000010', 1, 'Online, people can pretend to be anyone. Never meet someone from online without your parent or guardian.')
on conflict (question_id) do nothing;

-- Project assignment -----------------------------------------------------------
insert into public.assignments (id, course_id, lesson_id, title, instructions_md, rubric_md, max_score)
values (
  '55555555-5555-4555-8555-555555555555',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  'My S.A.F.E. Online Poster + Family Safety Talk',
  $md$
You are now a **S.A.F.E. Ambassador**. Your job is to teach someone at home how to stay safe online. Work alone or in pairs. You have one week.

### Part 1: Make your poster (on paper or on a phone/computer)

Your poster must include:

1. **A title**, for example "Be S.A.F.E. Online!" or your own creative title.
2. **All four S.A.F.E. rules**, written in your own words.
3. **One drawing or picture for each rule.**
4. **One example of a fake/scam message** that you invent (do NOT copy a real person's phone number or name). Circle at least **two warning signs** in it.
5. **One strong passphrase example** that you made up (NOT your real password!).

A neat paper poster can score full marks.

### Part 2: Family Safety Talk (5–10 minutes)

1. Show your poster to a parent, guardian, older sibling, or grandparent.
2. Explain the four S.A.F.E. rules to them.
3. Ask them these two questions and write down their answers:
   - "Have you ever received a scam message? What did it say?"
   - "What is one thing you do to stay safe online?"
4. Ask them to sign or write one sentence at the bottom of your poster.

### Part 3: Reflection (write 3–5 sentences)

- Which S.A.F.E. rule do you think is the most important? Why?
- What is one thing you will change about how you use the internet after this lesson?

### What to submit

- A photo of your poster (upload below), **or** hand the poster to your teacher.
- Your written answers from Part 2 and Part 3 (type them in the box below).

> **Safety reminder:** Do not put your real full name, school name, phone number, address, or real password on the poster if you upload it.
$md$,
  $md$
| Area | 4–5 marks (Excellent) | 2–3 marks (Good) | 0–1 mark (Needs work) |
|---|---|---|---|
| **S.A.F.E. rules** (5) | All 4 rules explained clearly in own words | 2–3 rules, or copied exactly | 0–1 rule |
| **Scam message example** (5) | Invented message with 2+ warning signs correctly circled and labelled | Message with 1 warning sign | Missing or unclear |
| **Design and creativity** (5) | Neat, colourful, a picture for every rule, easy to read | Some pictures, mostly readable | Hard to read, no pictures |
| **Family talk + reflection** (5) | Family answers written, signature included, thoughtful reflection | Some answers or short reflection | Missing |

17–20: S.A.F.E. Ambassador · 12–16: Safety Star · Below 12: keep going, you can improve and resubmit!
$md$,
  20
)
on conflict (id) do nothing;
