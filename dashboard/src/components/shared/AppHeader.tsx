export function AppHeader() {
  return (
    <nav className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          NusaSiaga{" "}
          <span className="text-slate-400 font-medium">·</span>{" "}
          <span className="text-emerald-300/90">Gemma Disaster Grid</span>
        </h1>
        <p className="text-sm text-slate-400">
          Offline-first disaster intelligence for communities anywhere · Powered by Gemma 4
        </p>
      </div>
      <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300">
        Offline-First Demo
      </div>
    </nav>
  );
}
