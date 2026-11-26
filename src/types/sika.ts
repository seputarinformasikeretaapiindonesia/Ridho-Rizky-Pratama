export type UrgencyLevel = 'Tinggi' | 'Sedang' | 'Rendah';

export type IssueCategory =
  | 'Konstruksi & Stasiun'
  | 'Operasional KRL & Jadwal'
  | 'Lahan & Lingkungan'
  | 'Klarifikasi Rumor'
  | 'Apresiasi & Masukan';

export interface SikaIssueItem {
  id: string;
  ringkasan_isu: string;
  kategori: IssueCategory;
  urgensi: UrgencyLevel;
  perlu_konfirmasi: boolean;
  estimasi_hari_dampak: number;
  lokasi_koridor: string;
  alasan_prioritas: string;
  draf_respons: string;
  data_pribadi_disamarkan: boolean;
}

export interface SikaAnalysisSummary {
  total_isu: number;
  urgensi_tinggi: number;
  urgensi_sedang: number;
  urgensi_rendah: number;
  perlu_konfirmasi: number;
  data_tersamar: number;
}

export interface SikaAnalysisResponse {
  daftar_isu: SikaIssueItem[];
  ringkasan: SikaAnalysisSummary;
  model_digunakan: string;
  waktu_proses_ms: number;
}

export interface RailwayProject {
  id: string;
  kode: string;
  nama: string;
  wilayah: 'Jabodetabek (BTP Jakarta)' | 'Koridor Nasional';
  koridor: string;
  progres_persen: number;
  status: 'Berjalan Normal' | 'Perlu Atensi' | 'Penyesuaian Operasional';
  target_selesai: string;
  catatan_terbaru: string;
  diperbarui_pada: string;
}

export interface RailwayUpdateNotification {
  id: string;
  judul: string;
  pesan: string;
  koridor: string;
  wilayah: 'Jabodetabek (BTP Jakarta)' | 'Koridor Nasional';
  urgensi: UrgencyLevel;
  perlu_konfirmasi: boolean;
  sumber: string;
  waktu_iso: string;
}

export type RealtimeServerMessage =
  | {
      type: 'init';
      payload: {
        projects: RailwayProject[];
        updates: RailwayUpdateNotification[];
        connectedClients: number;
      };
    }
  | {
      type: 'update:new';
      payload: RailwayUpdateNotification;
    }
  | {
      type: 'project:updated';
      payload: RailwayProject;
    }
  | {
      type: 'presence:count';
      payload: { connectedClients: number };
    };
