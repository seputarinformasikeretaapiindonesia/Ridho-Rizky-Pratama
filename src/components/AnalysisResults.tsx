import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type { SikaAnalysisResponse, SikaIssueItem, UrgencyLevel } from '../types/sika.ts';

interface AnalysisResultsProps {
  result: SikaAnalysisResponse | null;
  isAnalyzing: boolean;
  aiError: string | null;
  onRetry: () => void;
  onLoadSampleData: () => void;
  onBroadcastIssue: (issue: SikaIssueItem) => Promise<void>;
}

type FilterMode = 'Semua' | UrgencyLevel | 'Perlu Konfirmasi';

export function AnalysisResults({
  result,
  isAnalyzing,
  aiError,
  onRetry,
  onLoadSampleData,
  onBroadcastIssue,
}: AnalysisResultsProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);
  const [broadcastedIds, setBroadcastedIds] = useState<Record<string, boolean>>({});

  const filteredIssues = useMemo(() => {
    if (!result) return [];
    const q = searchQuery.trim().toLowerCase();
    return result.daftar_isu.filter((item) => {
      if (filterMode === 'Perlu Konfirmasi' && !item.perlu_konfirmasi) return false;
      if (
        (filterMode === 'Tinggi' || filterMode === 'Sedang' || filterMode === 'Rendah') &&
        item.urgensi !== filterMode
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.ringkasan_isu.toLowerCase().includes(q) ||
        item.lokasi_koridor.toLowerCase().includes(q) ||
        item.kategori.toLowerCase().includes(q) ||
        item.draf_respons.toLowerCase().includes(q)
      );
    });
  }, [result, filterMode, searchQuery]);

  async function handleCopyDraft(issue: SikaIssueItem) {
    try {
      await navigator.clipboard.writeText(issue.draf_respons);
      setCopiedId(issue.id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === issue.id ? null : current));
      }, 2000);
    } catch {
      // Fallback silent if clipboard blocked
    }
  }

  async function handleBroadcast(issue: SikaIssueItem) {
    setBroadcastingId(issue.id);
    try {
      await onBroadcastIssue(issue);
      setBroadcastedIds((prev) => ({ ...prev, [issue.id]: true }));
    } finally {
      setBroadcastingId(null);
    }
  }

  if (isAnalyzing) {
    return (
      <section
        aria-live="polite"
        aria-label="Memproses analisis AI"
        className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="space-y-1.5">
            <div className="h-5 w-52 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-72 animate-pulse rounded bg-slate-100" />
          </div>
          <span className="text-xs font-medium text-sky-800">
            Mengelompokkan isu &amp; menyusun draf...
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50 p-3.5">
              <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-7 w-12 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="rounded-lg border border-slate-200 p-4 space-y-3">
              <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
              <div className="h-16 w-full animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (aiError) {
    return (
      <section
        role="alert"
        className="rounded-xl border border-red-200 bg-white p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
            <div>
              <h3 className="text-base font-semibold text-slate-950">
                Analisis Belum Dapat Diselesaikan
              </h3>
              <p className="mt-1 text-sm text-slate-700 leading-relaxed">{aiError}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F2942] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173A5E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Coba lagi</span>
          </button>
        </div>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 text-center">
        <h3 className="text-base font-semibold text-slate-950">
          Belum Ada Hasil Triage pada Sesi Ini
        </h3>
        <p className="mx-auto mt-1.5 max-w-xl text-sm text-slate-600 leading-relaxed">
          Muat contoh data dummy KRL Jabodetabek &amp; pembangunan BTP Jakarta atau
          ketik laporan Anda di atas, lalu klik{' '}
          <span className="font-medium text-slate-800">Analisis &amp; Buat Draf</span>{' '}
          untuk melihat pengelompokan isu, tingkat urgensi, dan draf respons resmi.
        </p>
        <div className="mt-4">
          <button
            type="button"
            onClick={onLoadSampleData}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Muat 6 Contoh Data BTP Jakarta
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="hasil-triage-heading"
      className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <h2
            id="hasil-triage-heading"
            className="text-lg font-semibold text-slate-950"
          >
            Hasil Pengelompokan Isu &amp; Draf Respons
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
            Model: {result.model_digunakan} · Waktu proses:{' '}
            {(result.waktu_proses_ms / 1000).toFixed(2)} dtk
          </p>
        </div>
      </div>

      {/* Ringkasan metrik (FR-06) */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-xs font-medium text-slate-600">Total Isu Diproses</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-950">
            {result.ringkasan.total_isu}
          </p>
        </div>
        <div className="rounded-lg border border-red-200/80 bg-red-50/50 px-4 py-3">
          <p className="text-xs font-medium text-red-800">Urgensi Tinggi</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-red-700">
            {result.ringkasan.urgensi_tinggi}
          </p>
        </div>
        <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 px-4 py-3">
          <p className="text-xs font-medium text-amber-900">Perlu Konfirmasi</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-amber-800">
            {result.ringkasan.perlu_konfirmasi}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-4 py-3">
          <p className="text-xs font-medium text-emerald-900">Privasi Tersamar</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-emerald-800">
            {result.ringkasan.data_tersamar}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Filter hasil isu"
          className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1"
        >
          {(['Semua', 'Tinggi', 'Sedang', 'Rendah', 'Perlu Konfirmasi'] as FilterMode[]).map(
            (mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={filterMode === mode}
                onClick={() => setFilterMode(mode)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filterMode === mode
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode}
              </button>
            ),
          )}
        </div>

        <div className="relative w-full lg:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari koridor atau isi..."
            aria-label="Cari hasil isu"
            className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F2942] focus:outline-none"
          />
        </div>
      </div>

      {/* Daftar Kartu Isu (FR-05) */}
      <div className="mt-5 space-y-4">
        {filteredIssues.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
            Tidak ada isu yang sesuai dengan filter atau kata kunci pencarian saat ini.
          </div>
        ) : (
          filteredIssues.map((issue, idx) => {
            const urgencyConfig =
              issue.urgensi === 'Tinggi'
                ? {
                    icon: AlertTriangle,
                    label: 'Urgensi Tinggi',
                    colorClass: 'text-red-700',
                  }
                : issue.urgensi === 'Sedang'
                  ? {
                      icon: Clock,
                      label: 'Urgensi Sedang',
                      colorClass: 'text-amber-700',
                    }
                  : {
                      icon: CheckCircle2,
                      label: 'Urgensi Rendah',
                      colorClass: 'text-emerald-700',
                    };
            const UrgencyIcon = urgencyConfig.icon;
            const isCopied = copiedId === issue.id;
            const isBroadcasting = broadcastingId === issue.id;
            const isBroadcasted = Boolean(broadcastedIds[issue.id]);

            return (
              <article
                key={issue.id}
                className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 transition-colors hover:border-slate-300"
              >
                {/* Clean unboxed metadata header */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2 text-slate-600">
                    <span className="font-mono font-semibold tabular-nums text-slate-900">
                      #{String(idx + 1).padStart(2, '0')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-slate-800">{issue.kategori}</span>
                    <span aria-hidden="true">·</span>
                    <span>{issue.lokasi_koridor}</span>
                    {issue.estimasi_hari_dampak > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          Dampak {issue.estimasi_hari_dampak} hari
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 font-semibold ${urgencyConfig.colorClass}`}
                    >
                      <UrgencyIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{urgencyConfig.label}</span>
                    </span>

                    {issue.perlu_konfirmasi && (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-amber-800">
                        <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Perlu Konfirmasi Teknis</span>
                      </span>
                    )}

                    {issue.data_pribadi_disamarkan && (
                      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Data Pribadi Disamarkan</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Ringkasan Isu */}
                <h3 className="mt-3 text-base font-semibold text-slate-950 leading-snug">
                  {issue.ringkasan_isu}
                </h3>

                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  <span className="font-medium text-slate-700">Dasar Prioritas:</span>{' '}
                  {issue.alasan_prioritas}
                </p>

                {/* Draf Respons */}
                <div className="mt-4 border-t border-slate-100 pt-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">
                      Draf Respons Humas BTP Jakarta (Untuk Verifikasi Staf)
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyDraft(issue)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                            <span className="text-emerald-700">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Salin Draf</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isBroadcasting || isBroadcasted}
                        onClick={() => handleBroadcast(issue)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-900 hover:bg-sky-100 disabled:opacity-60 transition-colors cursor-pointer"
                      >
                        <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {isBroadcasted
                            ? 'Terkirim ke Feed'
                            : isBroadcasting
                              ? 'Mengirim...'
                              : 'Siarkan ke Notifikasi'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 rounded-lg bg-slate-50 px-3.5 py-3 text-sm text-slate-800 leading-relaxed">
                    {issue.draf_respons}
                  </p>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
