export function VideoPlayer({ source, title }: { source: { kind: "file" | "youtube"; url: string } | null; title: string }) {
  if (!source) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-200 text-sm text-slate-500">
        Video coming soon
      </div>
    );
  }
  if (source.kind === "youtube") {
    return (
      <iframe
        className="aspect-video w-full rounded-xl"
        src={source.url}
        title={title}
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <video className="aspect-video w-full rounded-xl bg-black" controls preload="metadata" playsInline>
      <source src={source.url} type="video/mp4" />
      Your browser cannot play this video.
    </video>
  );
}
