import { GoogleGenAI, Type } from '@google/genai';
import type {
  IssueCategory,
  SikaAnalysisResponse,
  SikaIssueItem,
  UrgencyLevel,
} from '../types/sika.ts';

const DEFAULT_MODEL = 'gemini-4-hydrogen';

const VALID_CATEGORIES = new Set<IssueCategory>([
  'Konstruksi & Stasiun',
  'Operasional KRL & Jadwal',
  'Lahan & Lingkungan',
  'Klarifikasi Rumor',
  'Apresiasi & Masukan',
]);

const VALID_URGENCY = new Set<UrgencyLevel>(['Tinggi', 'Sedang', 'Rendah']);

function maskResidualPii(text: string): { masked: string; changed: boolean } {
  let changed = false;
  let result = text;

  const phoneRegex = /(?:\+62|62|0)8[1-9][0-9\-\s]{6,13}[0-9]/g;
  if (phoneRegex.test(result)) {
    result = result.replace(phoneRegex, '[kontak]');
    changed = true;
  }

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  if (emailRegex.test(result)) {
    result = result.replace(emailRegex, '[kontak]');
    changed = true;
  }

  const nikRegex = /\b\d{16}\b/g;
  if (nikRegex.test(result)) {
    result = result.replace(nikRegex, '[warga]');
    changed = true;
  }

  return { masked: result, changed };
}

export class SikaAnalyzerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'SikaAnalyzerError';
    this.statusCode = statusCode;
  }
}

export async function analyzeRailwayIssues(rawInput: string): Promise<SikaAnalysisResponse> {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new SikaAnalyzerError(
      'Silakan masukkan minimal satu laporan atau pertanyaan pembangunan perkeretaapian terlebih dahulu.',
      400,
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.error('[SIKA][Gemini] GEMINI_API_KEY belum tersedia di environment server.');
    throw new SikaAnalyzerError(
      'Layanan AI belum siap karena kunci API server belum dikonfigurasi. Silakan periksa panel Secrets lalu coba lagi.',
      503,
    );
  }

  const modelName = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const startedAt = Date.now();

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const systemInstruction = `Anda adalah asisten triage kehumasan dan pemantauan proyek untuk Balai Teknik Perkeretaapian Kelas I Jakarta (BTP Jakarta), Direktorat Jenderal Perkeretaapian.
Tugas Anda: membaca seluruh daftar masukan, laporan, pertanyaan, keluhan, atau rumor terkait pembangunan perkeretaapian Indonesia dan KRL Jabodetabek, lalu mengelompokkannya satu per satu ke dalam JSON terstruktur tanpa melewatkan satu pun item masukan.

ATURAN BISNIS WAJIB (PATUHI 100%):
1. ATURAN PRIVASI:
   - Samarkan SELURUH data pribadi seperti nama warga/pelapor (mis. "Pak Budi Santoso", "Ibu Rina"), nomor HP/WhatsApp, alamat email, NIK, dan alamat rumah spesifik menjadi penanda "[warga]" (untuk nama/identitas) atau "[kontak]" (untuk nomor HP/email).
   - JANGAN pernah menampilkan nama orang asli/dummy atau nomor telepon/email di field ringkasan_isu maupun draf_respons. Set "data_pribadi_disamarkan": true jika masukan awalnya mengandung data pribadi tersebut.

2. ATURAN PENANDAAN ("perlu_konfirmasi"):
   - Set "perlu_konfirmasi": true apabila isu memuat salah satu dari hal berikut:
     a) Klaim anggaran, pembebasan lahan, atau tuntutan ganti rugi/kompensasi;
     b) Rumor penutupan permanen stasiun, lintas, atau perubahan tarif;
     c) Insiden keselamatan kerja proyek, struktur miring/rusak, atau risiko kecelakaan;
     d) Permintaan kepastian tanggal peresmian atau angka teknis yang harus diverifikasi oleh unit teknis BTP Jakarta.
   - Jika bersifat informasi rutin atau apresiasi tanpa klaim berisiko, set "perlu_konfirmasi": false.

3. ATURAN PRIORITAS ("urgensi"):
   - "Tinggi": menyangkut keselamatan pengguna/proyek (mis. pagar miring, bahaya perlintasan), gangguan layanan/akses KRL lebih dari 1 hari (> 1 hari), penutupan akses vital warga/stasiun, atau rumor viral yang berpotensi memicu kepanikan publik.
   - "Sedang": keluhan kebisingan/debu konstruksi harian, gangguan sementara <= 1 hari, pertanyaan jadwal/progres proyek, atau pertanyaan lahan/anggaran non-darurat.
   - "Rendah": apresiasi/pujian terhadap fasilitas atau saran umum jangka panjang.

4. ATURAN GAYA KELUARAN ("draf_respons"):
   - Tulis draf respons dalam bahasa Indonesia yang formal, empatik, dan sopan khas Humas Balai Teknik Perkeretaapian Kelas I Jakarta.
   - Sapaan netral (mis. "Yth. [warga] / Pengguna Jasa KRL,").
   - DILARANG keras menjanjikan kompensasi finansial, pencairan dana ganti rugi, atau kepastian tanggal penyelesaian/operasional di luar kewenangan.
   - Jika "perlu_konfirmasi": true, cantumkan kalimat bahwa hal tersebut sedang dikoordinasikan/diverifikasi bersama unit teknis terkait sebelum pernyataan resmi diterbitkan.

Pastikan jumlah elemen pada "daftar_isu" sama persis dengan jumlah laporan/isu yang ada pada input pengguna.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Proses daftar laporan/pertanyaan pembangunan perkeretaapian berikut sesuai aturan bisnis SIKA:\n\n${trimmed}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            daftar_isu: {
              type: Type.ARRAY,
              description: 'Daftar seluruh isu yang telah dikelompokkan, disamarkan privasinya, dan dibuatkan draf respons.',
              items: {
                type: Type.OBJECT,
                properties: {
                  ringkasan_isu: {
                    type: Type.STRING,
                    description: 'Ringkasan inti isu dalam bahasa Indonesia dengan seluruh nama/nomor HP/email disamarkan menjadi [warga] atau [kontak].',
                  },
                  kategori: {
                    type: Type.STRING,
                    description: 'Salah satu dari: Konstruksi & Stasiun, Operasional KRL & Jadwal, Lahan & Lingkungan, Klarifikasi Rumor, Apresiasi & Masukan.',
                  },
                  urgensi: {
                    type: Type.STRING,
                    description: 'Salah satu dari: Tinggi, Sedang, Rendah.',
                  },
                  perlu_konfirmasi: {
                    type: Type.BOOLEAN,
                    description: 'true jika butuh verifikasi teknis/anggaran/keselamatan/rumor sebelum direspons resmi.',
                  },
                  estimasi_hari_dampak: {
                    type: Type.NUMBER,
                    description: 'Perkiraan durasi dampak dalam satuan hari (0 jika hanya pertanyaan/apresiasi, >= 1 jika gangguan berlangsung harian).',
                  },
                  lokasi_koridor: {
                    type: Type.STRING,
                    description: 'Nama stasiun, lintas KRL, atau koridor pembangunan terkait (mis. Stasiun Tanah Abang, Lintas Manggarai–Bekasi).',
                  },
                  alasan_prioritas: {
                    type: Type.STRING,
                    description: 'Alasan singkat penetapan tingkat urgensi mengacu pada aturan prioritas.',
                  },
                  draf_respons: {
                    type: Type.STRING,
                    description: 'Draf balasan resmi Humas BTP Kelas I Jakarta yang sopan, tanpa data pribadi, dan tidak menjanjikan hal di luar kewenangan.',
                  },
                  data_pribadi_disamarkan: {
                    type: Type.BOOLEAN,
                    description: 'true apabila masukan asli mengandung data pribadi (nama/kontak/email) yang telah disamarkan.',
                  },
                },
                required: [
                  'ringkasan_isu',
                  'kategori',
                  'urgensi',
                  'perlu_konfirmasi',
                  'estimasi_hari_dampak',
                  'lokasi_koridor',
                  'alasan_prioritas',
                  'draf_respons',
                  'data_pribadi_disamarkan',
                ],
              },
            },
          },
          required: ['daftar_isu'],
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      throw new SikaAnalyzerError(
        'AI tidak mengembalikan hasil analisis. Silakan klik "Coba lagi".',
        502,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('[SIKA][Gemini] Gagal mengurai JSON dari Gemini:', parseErr, rawText);
      throw new SikaAnalyzerError(
        'Format jawaban AI tidak sesuai skema yang diharapkan. Silakan klik "Coba lagi".',
        502,
      );
    }

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray((parsed as { daftar_isu?: unknown }).daftar_isu)
    ) {
      console.error('[SIKA][Gemini] Struktur JSON tidak memiliki array daftar_isu:', parsed);
      throw new SikaAnalyzerError(
        'Struktur respons AI belum lengkap. Silakan klik "Coba lagi".',
        502,
      );
    }

    const rawItems = (parsed as { daftar_isu: Record<string, unknown>[] }).daftar_isu;
    const validatedItems: SikaIssueItem[] = rawItems.map((item, index) => {
      const kategoriRaw = String(item.kategori ?? '').trim() as IssueCategory;
      const kategori: IssueCategory = VALID_CATEGORIES.has(kategoriRaw)
        ? kategoriRaw
        : 'Konstruksi & Stasiun';

      const urgensiRaw = String(item.urgensi ?? '').trim() as UrgencyLevel;
      const urgensi: UrgencyLevel = VALID_URGENCY.has(urgensiRaw) ? urgensiRaw : 'Sedang';

      const ringkasanMask = maskResidualPii(String(item.ringkasan_isu ?? '').trim());
      const drafMask = maskResidualPii(String(item.draf_respons ?? '').trim());
      const alasanMask = maskResidualPii(String(item.alasan_prioritas ?? '').trim());

      const piiDetected =
        Boolean(item.data_pribadi_disamarkan) ||
        ringkasanMask.changed ||
        drafMask.changed ||
        ringkasanMask.masked.includes('[warga]') ||
        ringkasanMask.masked.includes('[kontak]');

      const estimasiRaw = Number(item.estimasi_hari_dampak);
      const estimasi_hari_dampak = Number.isFinite(estimasiRaw) && estimasiRaw >= 0
        ? Math.round(estimasiRaw)
        : 0;

      return {
        id: `isu-${Date.now()}-${index + 1}`,
        ringkasan_isu: ringkasanMask.masked || 'Laporan pembangunan perkeretaapian tanpa rincian.',
        kategori,
        urgensi,
        perlu_konfirmasi: Boolean(item.perlu_konfirmasi),
        estimasi_hari_dampak,
        lokasi_koridor: String(item.lokasi_koridor ?? 'Wilayah Kerja BTP Jakarta').trim() || 'Wilayah Kerja BTP Jakarta',
        alasan_prioritas: alasanMask.masked || 'Dievaluasi sesuai kriteria dampak operasional dan keselamatan.',
        draf_respons: drafMask.masked || 'Terima kasih atas informasi yang disampaikan. Tim terkait sedang menindaklanjuti laporan ini.',
        data_pribadi_disamarkan: piiDetected,
      };
    });

    const ringkasan = {
      total_isu: validatedItems.length,
      urgensi_tinggi: validatedItems.filter((i) => i.urgensi === 'Tinggi').length,
      urgensi_sedang: validatedItems.filter((i) => i.urgensi === 'Sedang').length,
      urgensi_rendah: validatedItems.filter((i) => i.urgensi === 'Rendah').length,
      perlu_konfirmasi: validatedItems.filter((i) => i.perlu_konfirmasi).length,
      data_tersamar: validatedItems.filter((i) => i.data_pribadi_disamarkan).length,
    };

    return {
      daftar_isu: validatedItems,
      ringkasan,
      model_digunakan: modelName,
      waktu_proses_ms: Date.now() - startedAt,
    };
  } catch (err: unknown) {
    if (err instanceof SikaAnalyzerError) {
      throw err;
    }

    const status =
      typeof err === 'object' && err !== null && 'status' in err
        ? Number((err as { status?: unknown }).status)
        : 502;
    const message =
      err instanceof Error ? err.message : 'Terjadi kesalahan tidak terduga pada layanan AI.';

    console.error(`[SIKA][GeminiError] status=${status} message=${message}`);

    if (status === 400 || status === 403) {
      throw new SikaAnalyzerError(
        'Konfigurasi kunci API atau permintaan Gemini ditolak. Periksa pengaturan GEMINI_API_KEY di panel Secrets lalu coba lagi.',
        status,
      );
    }
    if (status === 404) {
      throw new SikaAnalyzerError(
        `Model AI (${modelName}) tidak ditemukan. Periksa variabel GEMINI_MODEL lalu coba lagi.`,
        404,
      );
    }
    if (status === 429) {
      throw new SikaAnalyzerError(
        'Layanan AI sedang mencapai batas kuota sementara. Tunggu beberapa saat lalu klik "Coba lagi".',
        429,
      );
    }

    throw new SikaAnalyzerError(
      'Layanan AI sedang sibuk atau mengalami gangguan koneksi. Silakan klik "Coba lagi".',
      502,
    );
  }
}
