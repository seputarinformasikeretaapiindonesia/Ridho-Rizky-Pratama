import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import {
  INITIAL_RAILWAY_PROJECTS,
  INITIAL_UPDATES,
} from './src/data/railwayProjects.ts';
import { analyzeRailwayIssues, SikaAnalyzerError } from './src/lib/sikaAnalyzer.ts';
import type {
  RailwayProject,
  RailwayUpdateNotification,
  RealtimeServerMessage,
  UrgencyLevel,
} from './src/types/sika.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Ephemeral in-memory state (sesuai PRD: tanpa database, hanya selama sesi server berjalan)
const sessionProjects: RailwayProject[] = INITIAL_RAILWAY_PROJECTS.map((p) => ({ ...p }));
const sessionUpdates: RailwayUpdateNotification[] = INITIAL_UPDATES.map((u) => ({ ...u }));

const app = express();
app.use(express.json({ limit: '1mb' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcastWs(message: RealtimeServerMessage): void {
  const payload = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function broadcastPresence(): void {
  broadcastWs({
    type: 'presence:count',
    payload: { connectedClients: wss.clients.size },
  });
}

wss.on('connection', (socket) => {
  const initPayload: RealtimeServerMessage = {
    type: 'init',
    payload: {
      projects: sessionProjects,
      updates: sessionUpdates,
      connectedClients: wss.clients.size,
    },
  };
  socket.send(JSON.stringify(initPayload));
  broadcastPresence();

  socket.on('close', () => {
    broadcastPresence();
  });

  socket.on('error', (err) => {
    console.error('[SIKA][WS] Socket error:', err.message);
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    connectedClients: wss.clients.size,
  });
});

app.get('/api/updates', (_req, res) => {
  res.json({
    projects: sessionProjects,
    updates: sessionUpdates,
    connectedClients: wss.clients.size,
  });
});

app.post('/api/analyze', async (req, res) => {
  const inputText =
    typeof req.body?.inputText === 'string' ? req.body.inputText : '';

  if (!inputText.trim()) {
    res.status(400).json({
      error:
        'Silakan masukkan minimal satu laporan atau pertanyaan pembangunan perkeretaapian terlebih dahulu.',
    });
    return;
  }

  try {
    const result = await analyzeRailwayIssues(inputText);

    // Broadcast anonymized summary notification when urgent/confirmation items are detected
    if (result.daftar_isu.length > 0) {
      const highCount = result.ringkasan.urgensi_tinggi;
      const confirmCount = result.ringkasan.perlu_konfirmasi;
      const firstKoridor = result.daftar_isu[0]?.lokasi_koridor || 'Wilayah BTP Jakarta';

      const notification: RailwayUpdateNotification = {
        id: `upd-ai-${Date.now()}`,
        judul: `Triage Cepat Selesai (${result.ringkasan.total_isu} Isu Diproses)`,
        pesan:
          highCount > 0
            ? `Terdeteksi ${highCount} isu urgensi Tinggi dan ${confirmCount} isu perlu konfirmasi teknis (antara lain di ${firstKoridor}).`
            : `Sebanyak ${result.ringkasan.total_isu} laporan telah dikelompokkan dan disiapkan draf responsnya.`,
        koridor: firstKoridor,
        wilayah: 'Jabodetabek (BTP Jakarta)',
        urgensi: highCount > 0 ? 'Tinggi' : 'Sedang',
        perlu_konfirmasi: confirmCount > 0,
        sumber: 'Triage AI SIKA (Terverifikasi Privasi)',
        waktu_iso: new Date().toISOString(),
      };

      sessionUpdates.unshift(notification);
      if (sessionUpdates.length > 30) {
        sessionUpdates.pop();
      }
      broadcastWs({
        type: 'update:new',
        payload: notification,
      });
    }

    res.json(result);
  } catch (err: unknown) {
    if (err instanceof SikaAnalyzerError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const msg = err instanceof Error ? err.message : 'Kesalahan server internal.';
    console.error('[SIKA][API /api/analyze] Unhandled error:', msg);
    res.status(500).json({
      error: 'Layanan AI sedang sibuk atau mengalami kendala sementara. Silakan klik "Coba lagi".',
    });
  }
});

app.post('/api/updates/publish', (req, res) => {
  const judul = typeof req.body?.judul === 'string' ? req.body.judul.trim() : '';
  const pesan = typeof req.body?.pesan === 'string' ? req.body.pesan.trim() : '';
  const koridor = typeof req.body?.koridor === 'string' ? req.body.koridor.trim() : '';
  const wilayahRaw = req.body?.wilayah;
  const urgensiRaw = req.body?.urgensi;
  const perluKonfirmasi = Boolean(req.body?.perlu_konfirmasi);
  const sumber = typeof req.body?.sumber === 'string' && req.body.sumber.trim()
    ? req.body.sumber.trim()
    : 'Petugas Informasi BTP Jakarta';

  if (!judul || !pesan || !koridor) {
    res.status(400).json({
      error: 'Judul, isi pembaruan, dan koridor/stasiun wajib diisi sebelum disiarkan.',
    });
    return;
  }

  const urgensi: UrgencyLevel =
    urgensiRaw === 'Tinggi' || urgensiRaw === 'Sedang' || urgensiRaw === 'Rendah'
      ? urgensiRaw
      : 'Sedang';

  const wilayah: RailwayUpdateNotification['wilayah'] =
    wilayahRaw === 'Koridor Nasional' ? 'Koridor Nasional' : 'Jabodetabek (BTP Jakarta)';

  const newUpdate: RailwayUpdateNotification = {
    id: `upd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    judul,
    pesan,
    koridor,
    wilayah,
    urgensi,
    perlu_konfirmasi: perluKonfirmasi,
    sumber,
    waktu_iso: new Date().toISOString(),
  };

  sessionUpdates.unshift(newUpdate);
  if (sessionUpdates.length > 30) {
    sessionUpdates.pop();
  }

  broadcastWs({
    type: 'update:new',
    payload: newUpdate,
  });

  res.status(201).json({ update: newUpdate });
});

app.patch('/api/projects/:id', (req, res) => {
  const project = sessionProjects.find((p) => p.id === req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Proyek pembangunan tidak ditemukan.' });
    return;
  }

  if (typeof req.body?.progres_persen === 'number') {
    const clamped = Math.max(0, Math.min(100, Math.round(req.body.progres_persen)));
    project.progres_persen = clamped;
  }

  const statusRaw = req.body?.status;
  if (
    statusRaw === 'Berjalan Normal' ||
    statusRaw === 'Perlu Atensi' ||
    statusRaw === 'Penyesuaian Operasional'
  ) {
    project.status = statusRaw;
  }

  if (typeof req.body?.catatan_terbaru === 'string' && req.body.catatan_terbaru.trim()) {
    project.catatan_terbaru = req.body.catatan_terbaru.trim();
  }

  project.diperbarui_pada = new Date().toISOString();

  const updateNote: RailwayUpdateNotification = {
    id: `upd-prj-${Date.now()}`,
    judul: `Pembaruan Progres: ${project.nama}`,
    pesan: `Progres fisik kini ${project.progres_persen}% (${project.status}). ${project.catatan_terbaru}`,
    koridor: project.koridor,
    wilayah: project.wilayah,
    urgensi: project.status === 'Perlu Atensi' ? 'Tinggi' : 'Rendah',
    perlu_konfirmasi: project.status === 'Perlu Atensi',
    sumber: `Koordinator ${project.kode}`,
    waktu_iso: project.diperbarui_pada,
  };

  sessionUpdates.unshift(updateNote);
  if (sessionUpdates.length > 30) {
    sessionUpdates.pop();
  }

  broadcastWs({ type: 'project:updated', payload: project });
  broadcastWs({ type: 'update:new', payload: updateNote });

  res.json({ project, update: updateNote });
});

async function startServer(): Promise<void> {
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SIKA] Server aktif pada http://0.0.0.0:${PORT} (mode=${IS_PROD ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('[SIKA] Gagal menjalankan server:', err);
  process.exit(1);
});
