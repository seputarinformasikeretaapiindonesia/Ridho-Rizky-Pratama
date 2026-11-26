import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import type { RailwayUpdateNotification } from '../types/sika.ts';

interface RealtimeFeedRailProps {
  updates: RailwayUpdateNotification[];
  unreadIds: Record<string, boolean>;
  wsConnected: boolean;
  connectedClients: number;
  browserNotifEnabled: boolean;
  browserNotifSupported: boolean;
  onToggleBrowserNotif: () => void;
  onMarkAllRead: () => void;
  onMarkOneRead: (id: string) => void;
}

function formatWaktuWib(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  } catch {
    return '--:--';
  }
}

export function RealtimeFeedRail({
  updates,
  unreadIds,
  wsConnected,
  connectedClients,
  browserNotifEnabled,
  browserNotifSupported,
  onToggleBrowserNotif,
  onMarkAllRead,
  onMarkOneRead,
}: RealtimeFeedRailProps) {
  const unreadCount = Object.values(unreadIds).filter(Boolean).length;

  return (
    <aside
      id="siaran-realtime"
      aria-labelledby="realtime-heading"
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="realtime-heading" className="text-base font-semibold text-slate-950">
            Notifikasi Update Real-Time
          </h2>
          {unreadCount > 0 && (
            <span className="font-mono text-xs font-semibold tabular-nums text-sky-800">
              {unreadCount} baru
            </span>
          )}
        </div>

        {/* Real WebSocket live connection telemetry */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                wsConnected ? 'bg-emerald-600' : 'bg-amber-500'
              }`}
              aria-hidden="true"
            />
            <span className="font-medium text-slate-800">
              {wsConnected ? 'WebSocket Terhubung' : 'Menghubungkan Ulang...'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{connectedClients} sesi aktif</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {browserNotifSupported && (
            <button
              type="button"
              onClick={onToggleBrowserNotif}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                browserNotifEnabled
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {browserNotifEnabled ? (
                <>
                  <Bell className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                  <span>Notifikasi Browser Aktif</span>
                </>
              ) : (
                <>
                  <BellOff className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  <span>Aktifkan Notifikasi Browser</span>
                </>
              )}
            </button>
          )}

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Tandai Dibaca</span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3 max-h-[680px] overflow-y-auto pr-1">
        {updates.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Belum ada siaran pembaruan pada sesi ini.
          </p>
        ) : (
          updates.map((item) => {
            const isUnread = Boolean(unreadIds[item.id]);
            const UrgencyIcon =
              item.urgensi === 'Tinggi'
                ? AlertTriangle
                : item.urgensi === 'Sedang'
                  ? Clock
                  : CheckCircle2;
            const urgencyColor =
              item.urgensi === 'Tinggi'
                ? 'text-red-700'
                : item.urgensi === 'Sedang'
                  ? 'text-amber-700'
                  : 'text-emerald-700';

            return (
              <article
                key={item.id}
                onClick={() => isUnread && onMarkOneRead(item.id)}
                className={`rounded-lg border p-3.5 transition-colors ${
                  isUnread
                    ? 'border-sky-300 bg-sky-50/40 cursor-pointer'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className={`inline-flex items-center gap-1 font-semibold ${urgencyColor}`}>
                    <UrgencyIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{item.urgensi}</span>
                  </span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {formatWaktuWib(item.waktu_iso)} WIB
                  </span>
                </div>

                <h3 className="mt-1.5 text-sm font-semibold text-slate-950 leading-snug">
                  {item.judul}
                </h3>

                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {item.pesan}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="font-medium text-slate-700">{item.koridor}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.sumber}</span>
                  {item.perlu_konfirmasi && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                        <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                        Verifikasi Teknis
                      </span>
                    </>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
}
