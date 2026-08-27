import { Globe2, HeartPulse, MapPin, Stethoscope } from 'lucide-react';

export function ProviderVisualPlaceholder({ label }: { label: string }) {
  return (
    <div aria-label={label} className="relative min-h-64 overflow-hidden rounded-t-[1.65rem] bg-[linear-gradient(145deg,#dcecf4_0%,#f8fbfd_58%,#e8f2f7_100%)]" data-replaceable-visual="provider-hero" role="img">
      <div aria-hidden="true" className="absolute -end-12 -top-16 size-56 rounded-full border-[32px] border-white/45" />
      <div aria-hidden="true" className="absolute -bottom-20 start-8 size-52 rounded-full bg-[#bcd8e5]/55 blur-3xl" />
      <div className="absolute end-5 top-5 flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-2 text-xs font-semibold text-[var(--primary)] shadow-sm backdrop-blur"><Globe2 className="size-4" />CareBridge Global</div>
      <div className="absolute bottom-0 start-1/2 h-[88%] w-48 -translate-x-1/2">
        <div className="absolute start-1/2 top-2 grid size-20 -translate-x-1/2 place-items-center rounded-full border-[6px] border-white bg-[#d4e5ed] text-[var(--primary)] shadow-lg"><Stethoscope className="size-9" /></div>
        <div className="absolute bottom-0 start-1/2 h-40 w-44 -translate-x-1/2 rounded-t-[5rem] bg-[var(--primary)] shadow-[0_20px_50px_-20px_rgba(16,75,122,.55)]"><div className="absolute start-1/2 top-10 h-24 w-px -translate-x-1/2 bg-white/20" /><HeartPulse className="absolute start-1/2 top-14 size-8 -translate-x-1/2 text-white/85" /></div>
      </div>
      <span className="absolute bottom-5 start-5 grid size-10 place-items-center rounded-xl bg-white text-[#2f7f9d] shadow-md"><MapPin className="size-5" /></span>
    </div>
  );
}
