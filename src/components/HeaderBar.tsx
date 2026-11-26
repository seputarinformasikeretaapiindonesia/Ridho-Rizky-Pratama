interface HeaderBarProps {
  onOpenPublishModal: () => void;
}

export function HeaderBar({ onOpenPublishModal }: HeaderBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="font-display text-xl font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700"
        >
          SIKA
        </a>

        <nav
          aria-label="Navigasi utama"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <a
            href="#triage-cepat"
            className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Triage Cepat
          </a>
          <a
            href="#progres-proyek"
            className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Progres Proyek
          </a>
          <a
            href="#siaran-realtime"
            className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Siaran Real-Time
          </a>
          <a
            href="#aturan-layanan"
            className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Aturan Layanan
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenPublishModal}
            className="inline-flex items-center justify-center rounded-lg bg-[#0F2942] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#173A5E] active:scale-[0.99] transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          >
            Siarkan Update
          </button>
        </div>
      </div>
    </header>
  );
}
