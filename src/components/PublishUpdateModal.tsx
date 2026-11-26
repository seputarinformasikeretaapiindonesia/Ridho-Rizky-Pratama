import { useState } from 'react';
import { X } from 'lucide-react';
import type { UrgencyLevel } from '../types/sika.ts';

interface PublishUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    judul: string;
    pesan: string;
    koridor: string;
    wilayah: 'Jabodetabek (BTP Jakarta)' | 'Koridor Nasional';
    urgensi: UrgencyLevel;
    perlu_konfirmasi: boolean;
    sumber: string;
  }) => Promise<void>;
}

export function PublishUpdateModal({
  isOpen,
  onClose,
  onSubmit,
}: PublishUpdateModalProps) {
  const [judul, setJudul] = useState('');
  const [koridor, setKoridor] = useState('Stasiun Tanah Abang');
  const [wilayah, setWilayah] = useState<'Jabodetabek (BTP Jakarta)' | 'Koridor Nasional'>(
    'Jabodetabek (BTP Jakarta)',
  );
  const [urgensi, setUrgensi] = useState<UrgencyLevel>('Sedang');
  const [sumber, setSumber] = useState('Posko Informasi BTP Jakarta');
  const [pesan, setPesan] = useState('');
  const [perluKonfirmasi, setPerluKonfirmasi] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!judul.trim() || !pesan.trim() || !koridor.trim()) {
      setErrorMsg('Judul pembaruan, koridor/stasiun, dan isi pesan wajib diisi.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        judul: judul.trim(),
        pesan: pesan.trim(),
        koridor: koridor.trim(),
        wilayah,
        urgensi,
        perlu_konfirmasi: perluKonfirmasi,
        sumber: sumber.trim() || 'Posko Informasi BTP Jakarta',
      });
      setJudul('');
      setPesan('');
      setPerluKonfirmasi(false);
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menyiarkan pembaruan real-time.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3.5">
          <div>
            <h2 id="publish-modal-title" className="text-lg font-semibold text-slate-950">
              Siarkan Update Lapangan Real-Time
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Pembaruan dikirim langsung melalui WebSocket ke seluruh sesi operator yang
              sedang terhubung.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup formulir"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="mt-4 space-y-3.5">
          <div>
            <label htmlFor="upd-judul" className="block text-xs font-semibold text-slate-700">
              Judul Pembaruan
            </label>
            <input
              id="upd-judul"
              type="text"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Mis. Pengalihan Sementara Akses Pintu Timur Stasiun Manggarai"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="upd-koridor" className="block text-xs font-semibold text-slate-700">
                Stasiun / Koridor
              </label>
              <input
                id="upd-koridor"
                type="text"
                value={koridor}
                onChange={(e) => setKoridor(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="upd-wilayah" className="block text-xs font-semibold text-slate-700">
                Cakupan Wilayah
              </label>
              <select
                id="upd-wilayah"
                value={wilayah}
                onChange={(e) =>
                  setWilayah(
                    e.target.value as 'Jabodetabek (BTP Jakarta)' | 'Koridor Nasional',
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
              >
                <option value="Jabodetabek (BTP Jakarta)">Jabodetabek (BTP Jakarta)</option>
                <option value="Koridor Nasional">Koridor Nasional</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="upd-urgensi" className="block text-xs font-semibold text-slate-700">
                Tingkat Urgensi
              </label>
              <select
                id="upd-urgensi"
                value={urgensi}
                onChange={(e) => setUrgensi(e.target.value as UrgencyLevel)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
              >
                <option value="Tinggi">Tinggi</option>
                <option value="Sedang">Sedang</option>
                <option value="Rendah">Rendah</option>
              </select>
            </div>

            <div>
              <label htmlFor="upd-sumber" className="block text-xs font-semibold text-slate-700">
                Unit Sumber
              </label>
              <input
                id="upd-sumber"
                type="text"
                value={sumber}
                onChange={(e) => setSumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="upd-pesan" className="block text-xs font-semibold text-slate-700">
              Ringkasan Informasi Lapangan
            </label>
            <textarea
              id="upd-pesan"
              rows={3}
              value={pesan}
              onChange={(e) => setPesan(e.target.value)}
              placeholder="Tuliskan informasi cepat perkembangan konstruksi atau rekayasa akses penumpang (tanpa data pribadi warga)..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0F2942] focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={perluKonfirmasi}
              onChange={(e) => setPerluKonfirmasi(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#0F2942]"
            />
            <span>Tandai memerlukan konfirmasi teknis lanjutan sebelum siaran publik</span>
          </label>

          {errorMsg && (
            <p role="alert" className="text-xs font-medium text-red-700">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#0F2942] px-4 py-2 text-sm font-semibold text-white hover:bg-[#173A5E] disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? 'Menyiarkan...' : 'Kirim Notifikasi Real-Time'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
