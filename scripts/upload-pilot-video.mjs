// Uploads the pilot lesson's draft video to the private "lesson-videos" bucket.
//
// Usage (needs the service-role key, which must never be put in the browser):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:video
//
// The seed SQL already points the lesson at this path, so after the upload
// the video plays in the lesson page.
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) first.");
  process.exit(1);
}

const COURSE_ID = "22222222-2222-4222-8222-222222222222";
const file = new URL("../supabase/seed-media/staying-safe-online-animatic-draft1.mp4", import.meta.url);
const path = `${COURSE_ID}/staying-safe-online-animatic-draft1.mp4`;

const supabase = createClient(url, key, { auth: { persistSession: false } });
const body = await readFile(file);
const { error } = await supabase.storage.from("lesson-videos").upload(path, body, { contentType: "video/mp4", upsert: true });
if (error) {
  console.error("Upload failed:", error.message);
  process.exit(1);
}
console.log(`Uploaded ${(body.length / 1024 / 1024).toFixed(1)} MB to lesson-videos/${path}`);
