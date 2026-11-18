"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { submitAssignment } from "../../actions";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function SubmissionForm({
  assignmentId,
  schoolId,
  studentId,
  initialText,
}: {
  assignmentId: string;
  schoolId: string;
  studentId: string;
  initialText: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      let filePath: string | null = null;
      if (file) {
        if (file.size > MAX_BYTES) return setMessage({ kind: "error", text: "That file is bigger than 10 MB. Try a smaller photo." });
        if (!ALLOWED.includes(file.type)) return setMessage({ kind: "error", text: "Upload a JPG, PNG, WEBP photo or a PDF." });
        // Files go straight from the browser to private storage, in a folder
        // only this student and their teachers can read.
        const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        filePath = `${schoolId}/${studentId}/${assignmentId}-${Date.now()}.${ext}`;
        const { error } = await createClient().storage.from("submissions").upload(filePath, file, { contentType: file.type });
        if (error) return setMessage({ kind: "error", text: `Upload failed: ${error.message}` });
      }
      const res = await submitAssignment({ assignmentId, textResponse: text, filePath });
      if (res.error) return setMessage({ kind: "error", text: res.error });
      setFile(null);
      setMessage({ kind: "ok", text: "Submitted! Your teacher will mark it soon." });
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="text">Your answers (Part 2 and Part 3)</label>
        <textarea id="text" className="input min-h-40" value={text} onChange={(e) => setText(e.target.value)} maxLength={10000} />
      </div>
      <div>
        <label className="label" htmlFor="file">Photo of your poster (optional, max 10 MB)</label>
        <input id="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block text-sm" />
        <p className="mt-1 text-xs text-slate-500">Do not include your full name, school name, phone number, address or real password in the photo.</p>
      </div>
      {message ? <p role="status" className={`text-sm ${message.kind === "ok" ? "text-brand-700" : "text-red-700"}`}>{message.text}</p> : null}
      <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Submitting…" : "Submit"}</button>
    </form>
  );
}
