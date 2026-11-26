export function RulesGuideSection() {
  const rules = [
    {
      title: '01. Perlindungan Privasi Otomatis',
      detail:
        'Seluruh nama pelapor/warga, nomor telepon/WhatsApp, NIK, dan alamat email pada masukan otomatis disamarkan menjadi [warga] atau [kontak] baik di ringkasan isu maupun draf respons.',
    },
    {
      title: '02. Penandaan Konfirmasi Teknis',
      detail:
        'Isu yang memuat klaim anggaran/ganti rugi, rumor penutupan permanen stasiun/lintas, insiden keselamatan proyek, atau jadwal peresmian belum terverifikasi otomatis ditandai Perlu Konfirmasi.',
    },
    {
      title: '03. Kriteria Prioritas Urgensi',
      detail:
        'Tinggi untuk isu keselamatan konstruksi/perlintasan, gangguan layanan > 1 hari, atau rumor viral; Sedang untuk keluhan harian/pertanyaan progres <= 1 hari; Rendah untuk apresiasi atau saran umum.',
    },
    {
      title: '04. Etika Gaya Keluaran Humas',
      detail:
        'Draf respons disusun dalam bahasa Indonesia formal yang empatik dan tidak pernah menjanjikan kompensasi finansial, pencairan dana, atau kepastian jadwal di luar kewenangan.',
    },
  ];

  return (
    <section
      id="aturan-layanan"
      aria-labelledby="aturan-heading"
      className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div className="border-b border-slate-100 pb-4">
        <h2 id="aturan-heading" className="text-lg font-semibold text-slate-950">
          Aturan Bisnis &amp; Tata Kelola Sesi SIKA
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Standar pemrosesan Balai Teknik Perkeretaapian Kelas I Jakarta — tanpa
          penyimpanan database permanen (data hasil triage terhapus saat halaman
          dimuat ulang).
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {rules.map((rule) => (
          <div
            key={rule.title}
            className="rounded-lg border border-slate-200 bg-slate-50/60 p-4"
          >
            <h3 className="text-sm font-semibold text-slate-950">{rule.title}</h3>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{rule.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
