import { AlertTriangle, CheckCircle2, Clock, X } from 'lucide-react';
import type { RailwayUpdateNotification } from '../types/sika.ts';

interface ToastStackProps {
  toasts: RailwayUpdateNotification[];
  onDismiss: (id: string) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifikasi pembaruan terbaru"
      className="fixed bottom-4 right-4 z-40 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.urgensi === 'Tinggi'
            ? AlertTriangle
            : toast.urgensi === 'Sedang'
              ? Clock
              : CheckCircle2;
        const iconColor =
          toast.urgensi === 'Tinggi'
            ? 'text-red-600'
            : toast.urgensi === 'Sedang'
              ? 'text-amber-600'
              : 'text-emerald-600';

        return (
          <div
            key={toast.id}
            role="status"
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-slate-950">{toast.judul}</p>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {toast.pesan}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                    {toast.koridor} · Update Real-Time
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Tutup notifikasi"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
