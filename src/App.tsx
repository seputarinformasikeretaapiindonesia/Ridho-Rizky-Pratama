import { useCallback, useEffect, useRef, useState } from 'react';
import { HeaderBar } from './components/HeaderBar.tsx';
import { IntakePanel } from './components/IntakePanel.tsx';
import { AnalysisResults } from './components/AnalysisResults.tsx';
import { ProjectMonitor } from './components/ProjectMonitor.tsx';
import { RealtimeFeedRail } from './components/RealtimeFeedRail.tsx';
import { PublishUpdateModal } from './components/PublishUpdateModal.tsx';
import { RulesGuideSection } from './components/RulesGuideSection.tsx';
import { ToastStack } from './components/ToastStack.tsx';
import { DUMMY_INPUT_SAMPLES } from './data/railwayProjects.ts';
import type {
  RailwayProject,
  RailwayUpdateNotification,
  RealtimeServerMessage,
  SikaAnalysisResponse,
  SikaIssueItem,
  UrgencyLevel,
} from './types/sika.ts';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<SikaAnalysisResponse | null>(null);

  const [projects, setProjects] = useState<RailwayProject[]>([]);
  const [updates, setUpdates] = useState<RailwayUpdateNotification[]>([]);
  const [unreadIds, setUnreadIds] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<RailwayUpdateNotification[]>([]);

  const [wsConnected, setWsConnected] = useState(false);
  const [connectedClients, setConnectedClients] = useState(1);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  const browserNotifSupported =
    typeof window !== 'undefined' && 'Notification' in window;
  const [browserNotifEnabled, setBrowserNotifEnabled] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return window.Notification.permission === 'granted';
    }
    return false;
  });

  const browserNotifRef = useRef(browserNotifEnabled);
  useEffect(() => {
    browserNotifRef.current = browserNotifEnabled;
  }, [browserNotifEnabled]);

  const showToast = useCallback((update: RailwayUpdateNotification) => {
    setToasts((prev) => {
      if (prev.some((t) => t.id === update.id)) return prev;
      return [update, ...prev].slice(0, 3);
    });
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== update.id));
    }, 6500);
  }, []);

  const triggerDesktopNotif = useCallback((update: RailwayUpdateNotification) => {
    if (
      browserNotifRef.current &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'granted'
    ) {
      try {
        new window.Notification(`SIKA · ${update.judul}`, {
          body: `${update.koridor}: ${update.pesan}`,
        });
      } catch {
        // Ignore browser-level notification restrictions inside embedded frames
      }
    }
  }, []);

  // Initial HTTP fallback fetch + persistent WebSocket connection
  useEffect(() => {
    let active = true;
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let reconnectDelay = 1200;

    async function fetchInitialUpdates() {
      try {
        const res = await fetch('/api/updates');
        if (!res.ok) return;
        const data = (await res.json()) as {
          projects: RailwayProject[];
          updates: RailwayUpdateNotification[];
          connectedClients: number;
        };
        if (!active) return;
        setProjects(data.projects);
        setUpdates(data.updates);
        setConnectedClients(data.connectedClients);
      } catch {
        // WebSocket init will populate state when ready
      }
    }

    function connectWebSocket() {
      if (!active) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (!active) return;
        setWsConnected(true);
        reconnectDelay = 1200;
      };

      ws.onmessage = (event) => {
        if (!active) return;
        try {
          const msg = JSON.parse(String(event.data)) as RealtimeServerMessage;

          if (msg.type === 'init') {
            setProjects(msg.payload.projects);
            setUpdates(msg.payload.updates);
            setConnectedClients(msg.payload.connectedClients);
          } else if (msg.type === 'presence:count') {
            setConnectedClients(msg.payload.connectedClients);
          } else if (msg.type === 'project:updated') {
            const updatedProject = msg.payload;
            setProjects((prev) =>
              prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)),
            );
          } else if (msg.type === 'update:new') {
            const incoming = msg.payload;
            setUpdates((prev) => {
              if (prev.some((u) => u.id === incoming.id)) {
                return prev;
              }
              return [incoming, ...prev].slice(0, 30);
            });
            setUnreadIds((prev) => ({ ...prev, [incoming.id]: true }));
            showToast(incoming);
            triggerDesktopNotif(incoming);
          }
        } catch {
          // Ignore malformed message
        }
      };

      ws.onclose = () => {
        if (!active) return;
        setWsConnected(false);
        reconnectTimer = window.setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 1.5, 8000);
          connectWebSocket();
        }, reconnectDelay);
      };

      ws.onerror = () => {
        ws?.close();
      };
    }

    fetchInitialUpdates();
    connectWebSocket();

    return () => {
      active = false;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      ws?.close();
    };
  }, [showToast, triggerDesktopNotif]);

  async function handleToggleBrowserNotif() {
    if (!browserNotifSupported) return;
    if (browserNotifEnabled) {
      setBrowserNotifEnabled(false);
      return;
    }
    try {
      const permission = await window.Notification.requestPermission();
      setBrowserNotifEnabled(permission === 'granted');
    } catch {
      setBrowserNotifEnabled(false);
    }
  }

  function handleLoadSampleData() {
    setInputError(null);
    setAiError(null);
    setInputText(DUMMY_INPUT_SAMPLES.join('\n'));
  }

  function handleClear() {
    setInputText('');
    setInputError(null);
    setAiError(null);
    setAnalysisResult(null);
  }

  async function handleAnalyze() {
    if (!inputText.trim()) {
      setInputError(
        'Silakan masukkan minimal satu laporan atau pertanyaan pembangunan perkeretaapian terlebih dahulu.',
      );
      return;
    }

    setInputError(null);
    setAiError(null);
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputText }),
      });

      const data = (await response.json()) as SikaAnalysisResponse & { error?: string };

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Layanan AI sedang sibuk atau mengalami gangguan. Silakan klik "Coba lagi".',
        );
      }

      setAnalysisResult(data);
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Layanan AI gagal dihubungi. Silakan klik "Coba lagi".',
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handlePublishUpdate(payload: {
    judul: string;
    pesan: string;
    koridor: string;
    wilayah: 'Jabodetabek (BTP Jakarta)' | 'Koridor Nasional';
    urgensi: UrgencyLevel;
    perlu_konfirmasi: boolean;
    sumber: string;
  }) {
    const response = await fetch('/api/updates/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || 'Gagal menyiarkan pembaruan real-time.');
    }
  }

  async function handleBroadcastIssue(issue: SikaIssueItem) {
    await handlePublishUpdate({
      judul: `[Triage ${issue.kategori}] ${issue.lokasi_koridor}`,
      pesan: issue.ringkasan_isu,
      koridor: issue.lokasi_koridor,
      wilayah: 'Jabodetabek (BTP Jakarta)',
      urgensi: issue.urgensi,
      perlu_konfirmasi: issue.perlu_konfirmasi,
      sumber: 'Staf Humas BTP Jakarta',
    });
  }

  async function handleQuickProgressBump(project: RailwayProject) {
    const nextProgress = Math.min(100, project.progres_persen + 1);
    const response = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        progres_persen: nextProgress,
        catatan_terbaru: `Pembaruan lapangan sesi aktif: progres fisik meningkat menjadi ${nextProgress}%.`,
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as { project: RailwayProject };
      setProjects((prev) =>
        prev.map((p) => (p.id === data.project.id ? data.project : p)),
      );
    }
  }

  return (
    <div id="top" className="min-h-screen bg-slate-50 text-slate-900">
      <HeaderBar onOpenPublishModal={() => setIsPublishModalOpen(true)} />

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Hero / Operational Context Header */}
        <section className="rounded-xl border border-slate-200 bg-[#0F2942] px-5 py-6 text-white sm:px-8 sm:py-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-medium tracking-wide text-sky-200">
                Balai Teknik Perkeretaapian Kelas I Jakarta · KRL Jabodetabek &amp; Koridor Nasional
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl text-balance">
                Seputar Informasi Kereta Api &amp; Respon Cepat Pembangunan Perkeretaapian
              </h1>
              <p className="mt-2 text-sm text-slate-200 leading-relaxed max-w-2xl">
                Kelompokkan laporan pembangunan, ukur tingkat urgensi, susun draf
                respons resmi bebas data pribadi, serta pantau siaran pembaruan
                proyek perkeretaapian Indonesia secara real-time.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 border-t border-white/15 pt-4 lg:border-t-0 lg:pt-0 text-xs text-slate-200 shrink-0">
              <div>
                <p className="text-slate-300">Koridor Aktif</p>
                <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-white">
                  {projects.length}
                </p>
              </div>
              <div>
                <p className="text-slate-300">Siaran Real-Time</p>
                <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-white">
                  {updates.length}
                </p>
              </div>
              <div>
                <p className="text-slate-300">Sesi Terhubung</p>
                <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-white">
                  {connectedClients}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Main 2-Column Operational Grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Left Primary Column */}
          <div className="space-y-6 lg:col-span-8">
            <IntakePanel
              inputText={inputText}
              onChangeInput={(val) => {
                setInputText(val);
                if (inputError && val.trim()) setInputError(null);
              }}
              onLoadSampleData={handleLoadSampleData}
              onAnalyze={handleAnalyze}
              onClear={handleClear}
              isAnalyzing={isAnalyzing}
              inputError={inputError}
            />

            <AnalysisResults
              result={analysisResult}
              isAnalyzing={isAnalyzing}
              aiError={aiError}
              onRetry={handleAnalyze}
              onLoadSampleData={handleLoadSampleData}
              onBroadcastIssue={handleBroadcastIssue}
            />

            <ProjectMonitor
              projects={projects}
              onQuickProgressBump={handleQuickProgressBump}
            />

            <RulesGuideSection />
          </div>

          {/* Right Live Notification Rail */}
          <div className="lg:col-span-4 lg:sticky lg:top-20">
            <RealtimeFeedRail
              updates={updates}
              unreadIds={unreadIds}
              wsConnected={wsConnected}
              connectedClients={connectedClients}
              browserNotifEnabled={browserNotifEnabled}
              browserNotifSupported={browserNotifSupported}
              onToggleBrowserNotif={handleToggleBrowserNotif}
              onMarkAllRead={() => setUnreadIds({})}
              onMarkOneRead={(id) =>
                setUnreadIds((prev) => ({ ...prev, [id]: false }))
              }
            />
          </div>
        </div>

        {/* Persistent Mandatory Disclaimer (FR-10 & NFR-07) */}
        <footer className="mt-8 rounded-xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-800">
            Disclaimer: Seluruh hasil pengelompokan isu, penentuan tingkat urgensi, dan
            draf respons merupakan keluaran bantu AI dan bersifat draf. Keputusan resmi
            serta publikasi kepada masyarakat tetap berada pada kewenangan pejabat dan
            staf Balai Teknik Perkeretaapian Kelas I Jakarta.
          </p>
          <p className="mt-1 text-slate-500">
            Prototipe SIKA tanpa penyimpanan database permanen · Data analisis hanya
            diproses selama sesi aktif dan hilang saat halaman dimuat ulang.
          </p>
        </footer>
      </main>

      <PublishUpdateModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onSubmit={handlePublishUpdate}
      />

      <ToastStack
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
