export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-md text-center">
        <h1 className="mb-2 text-xl font-bold">You are offline</h1>
        <p className="text-slate-600">Check your data or Wi-Fi connection, then try again.</p>
      </div>
    </div>
  );
}
