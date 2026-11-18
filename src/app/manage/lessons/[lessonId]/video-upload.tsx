"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { setLessonVideo } from "../../actions";

const MAX_BYTES = 500 * 1024 * 1024;

export function VideoUpload({ lessonId, courseId, currentPath }: { lessonId: string; courseId: string; currentPath: string | null }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function upload() {
    if (!file) return;
    setMessage(null);
    startTransition(async () => {
      if (file.size > MAX_BYTES) return setMessage({ kind: "error", text: "Videos must be smaller than 500 MB." });
      if (!file.type.startsWith("video/")) return setMessage({ kind: "error", text: "Choose a video file (MP4 works best)." });
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
      const path = `${courseId}/${Date.now()}-${safeName}`;
      const { error } = await createClient().storage.from("lesson-videos").upload(path, file, { contentType: file.type });
      if (error) return setMessage({ kind: "error", text: `Upload failed: ${error.message}` });
      const res = await setLessonVideo(lessonId, path);
      if (res.error) return setMessage({ kind: "error", text: res.error });
      setFile(null);
      setMessage({ kind: "ok", text: "Video uploaded." });
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await setLessonVideo(lessonId, null);
      setMessage(res.error ? { kind: "error", text: res.error } : { kind: "ok", text: "Video removed." });
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 text-sm">
      {currentPath ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2">
          <span className="truncate font-mono text-xs">{currentPath.split("/").pop()}</span>
          <button type="button" onClick={remove} disabled={pending} className="text-xs text-red-700 underline">Remove</button>
        </div>
      ) : <p className="text-slate-500">No video file uploaded.</p>}
      <input type="file" accept="video/mp4,video/webm,video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
      <p className="text-xs text-slate-500">Keep videos short and compressed (720p MP4) so they play well on mobile data.</p>
      <button type="button" onClick={upload} disabled={!file || pending} className="btn-primary">{pending ? "Uploading…" : "Upload video"}</button>
      {message ? <p className={message.kind === "ok" ? "text-brand-700" : "text-red-700"}>{message.text}</p> : null}
    </div>
  );
}
