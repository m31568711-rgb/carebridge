export default function PortalLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="mx-auto max-w-7xl animate-pulse">
      <div className="h-3 w-28 rounded-full bg-blue-100" />
      <div className="mt-4 h-9 w-full max-w-xl rounded-xl bg-slate-200" />
      <div className="mt-3 h-4 w-full max-w-2xl rounded-full bg-slate-100" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div className="h-32 rounded-2xl border border-slate-100 bg-white" key={index} />)}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => <div className="h-44 rounded-2xl border border-slate-100 bg-white" key={index} />)}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
