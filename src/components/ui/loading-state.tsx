interface LoadingStateProps {
  title: string;
  description: string;
}

export function LoadingState({ title, description }: LoadingStateProps) {
  return (
    <div aria-live="polite" className="grid min-h-64 place-items-center rounded-2xl border border-slate-200 bg-white p-8 text-center" role="status">
      <div>
        <span aria-hidden="true" className="mx-auto block size-10 animate-spin rounded-full border-4 border-blue-100 border-r-blue-600" />
        <h2 className="mt-5 font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </div>
    </div>
  );
}
