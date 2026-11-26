import { AlertCircle, Database, Eraser, Send } from 'lucide-react';

interface IntakePanelProps {
  inputText: string;
  onChangeInput: (value: string) => void;
  onLoadSampleData: () => void;
  onAnalyze: () => void;
  onClear: () => void;
  isAnalyzing: boolean;
  inputError: string | null;
}

export function IntakePanel({
  inputText,
  onChangeInput,
  onLoadSampleData,
  onAnalyze,
  onClear,
  isAnalyzing,
  inputError,
}: IntakePanelProps) {
  const lineCount = inputText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length;

  return (
    <section
      id="triage-cepat"
      aria-labelledby="triage-heading"
      className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <h2
            id="triage-heading"
            className="text-lg font-semibold text-slate-950"
          >
            Panel Input Triage &amp; Respons Cepat
          </h2>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">
            Masukkan laporan masyarakat, keluhan konstruksi, rumor publik, atau
            pertanyaan jadwal KRL Jabodetabek (satu isu per baris atau paragraf
            bernomor).
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs font-mono tabular-nums text-slate-500">
          <span>{lineCount} baris terdeteksi</span>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="sika-intake-textarea" className="sr-only">
          Daftar laporan atau pertanyaan pembangunan perkeretaapian
        </label>
        <textarea
          id="sika-intake-textarea"
          rows={7}
          value={inputText}
          onChange={(e) => onChangeInput(e.target.value)}
          placeholder="Contoh:&#10;1. [Keluhan] Debu galian di akses barat Stasiun Tanah Abang mengganggu penumpang selama 3 hari.&#10;2. [Rumor] Warga menanyakan kabar penutupan permanen Stasiun Manggarai bulan depan."
          className="w-full rounded-lg border border-slate-300 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F2942] focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-700/15 transition-colors leading-relaxed"
        />

        {inputError && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
            <span>{inputError}</span>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onLoadSampleData}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            >
              <Database className="h-4 w-4 text-slate-600" aria-hidden="true" />
              <span>Muat Contoh Data</span>
            </button>

            <button
              type="button"
              onClick={onClear}
              disabled={isAnalyzing || !inputText}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            >
              <Eraser className="h-4 w-4" aria-hidden="true" />
              <span>Bersihkan</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F2942] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173A5E] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span>{isAnalyzing ? 'Memproses Analisis...' : 'Analisis & Buat Draf'}</span>
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Aturan pelatihan aman: gunakan data dummy. Jika terdapat nama atau nomor kontak pada masukan, sistem otomatis menyamarkannya menjadi{' '}
          <code className="font-mono text-slate-700">[warga]</code> atau{' '}
          <code className="font-mono text-slate-700">[kontak]</code>.
        </p>
      </div>
    </section>
  );
}
