import { useMemo, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import type { RailwayProject } from '../types/sika.ts';

interface ProjectMonitorProps {
  projects: RailwayProject[];
  onQuickProgressBump: (project: RailwayProject) => Promise<void>;
}

type RegionFilter = 'Semua' | 'Jabodetabek (BTP Jakarta)' | 'Koridor Nasional';
type ProgressStageFilter =
  | 'Semua Tahap'
  | 'Baru Mulai'
  | 'Dalam Pengerjaan'
  | 'Hampir Selesai'
  | 'Perlu Atensi';

type ProgressStageLabel = 'Baru Mulai' | 'Dalam Pengerjaan' | 'Hampir Selesai';

function getProgressStage(progresPersen: number): ProgressStageLabel {
  if (progresPersen < 35) return 'Baru Mulai';
  if (progresPersen < 80) return 'Dalam Pengerjaan';
  return 'Hampir Selesai';
}

export function ProjectMonitor({
  projects,
  onQuickProgressBump,
}: ProjectMonitorProps) {
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('Semua');
  const [stageFilter, setStageFilter] = useState<ProgressStageFilter>('Semua Tahap');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const regionFilteredProjects = useMemo(() => {
    if (regionFilter === 'Semua') return projects;
    return projects.filter((p) => p.wilayah === regionFilter);
  }, [projects, regionFilter]);

  const stageCounts = useMemo(() => {
    return {
      'Semua Tahap': regionFilteredProjects.length,
      'Baru Mulai': regionFilteredProjects.filter(
        (p) => getProgressStage(p.progres_persen) === 'Baru Mulai',
      ).length,
      'Dalam Pengerjaan': regionFilteredProjects.filter(
        (p) => getProgressStage(p.progres_persen) === 'Dalam Pengerjaan',
      ).length,
      'Hampir Selesai': regionFilteredProjects.filter(
        (p) => getProgressStage(p.progres_persen) === 'Hampir Selesai',
      ).length,
      'Perlu Atensi': regionFilteredProjects.filter(
        (p) => p.status === 'Perlu Atensi' || p.status === 'Penyesuaian Operasional',
      ).length,
    };
  }, [regionFilteredProjects]);

  const visibleProjects = useMemo(() => {
    if (stageFilter === 'Semua Tahap') return regionFilteredProjects;
    if (stageFilter === 'Perlu Atensi') {
      return regionFilteredProjects.filter(
        (p) => p.status === 'Perlu Atensi' || p.status === 'Penyesuaian Operasional',
      );
    }
    return regionFilteredProjects.filter(
      (p) => getProgressStage(p.progres_persen) === stageFilter,
    );
  }, [regionFilteredProjects, stageFilter]);

  async function handleUpdateClick(project: RailwayProject) {
    setUpdatingId(project.id);
    try {
      await onQuickProgressBump(project);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section
      id="progres-proyek"
      aria-labelledby="progres-heading"
      className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <h2
            id="progres-heading"
            className="text-lg font-semibold text-slate-950"
          >
            Progres Pembangunan Perkeretaapian Indonesia
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Pemantauan koridor prioritas BTP Kelas I Jakarta &amp; jalur strategis
            nasional tersinkron real-time.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Filter wilayah pembangunan"
          className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 self-start sm:self-auto"
        >
          {(['Semua', 'Jabodetabek (BTP Jakarta)', 'Koridor Nasional'] as RegionFilter[]).map(
            (region) => (
              <button
                key={region}
                type="button"
                role="tab"
                aria-selected={regionFilter === region}
                onClick={() => setRegionFilter(region)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  regionFilter === region
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {region === 'Jabodetabek (BTP Jakarta)' ? 'BTP Jakarta' : region}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Filter Status Progres */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Filter tahap progres pembangunan"
          className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1"
        >
          {(
            [
              'Semua Tahap',
              'Baru Mulai',
              'Dalam Pengerjaan',
              'Hampir Selesai',
              'Perlu Atensi',
            ] as ProgressStageFilter[]
          ).map((stage) => (
            <button
              key={stage}
              type="button"
              role="tab"
              aria-selected={stageFilter === stage}
              onClick={() => setStageFilter(stage)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                stageFilter === stage
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{stage}</span>
              <span className="font-mono text-[11px] tabular-nums text-slate-500">
                ({stageCounts[stage]})
              </span>
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-500 font-mono tabular-nums">
          Baru Mulai &lt;35% · Pengerjaan 35–79% · Hampir Selesai ≥80%
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        {visibleProjects.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-medium text-slate-800">
              Tidak ada proyek pada kombinasi filter wilayah dan tahap progres ini.
            </p>
            <button
              type="button"
              onClick={() => {
                setRegionFilter('Semua');
                setStageFilter('Semua Tahap');
              }}
              className="mt-3 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Tampilkan Semua Proyek
            </button>
          </div>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-2.5 pr-4">Proyek &amp; Koridor</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Progres</th>
                <th className="py-2.5 px-3 text-right">Target</th>
                <th className="py-2.5 pl-3 text-right">Aksi Sesi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleProjects.map((project) => {
                const progressStage = getProgressStage(project.progres_persen);
                const StatusIcon =
                  project.status === 'Perlu Atensi'
                    ? AlertTriangle
                    : project.status === 'Penyesuaian Operasional'
                      ? Clock
                      : CheckCircle2;
                const statusColor =
                  project.status === 'Perlu Atensi'
                    ? 'text-red-700'
                    : project.status === 'Penyesuaian Operasional'
                      ? 'text-amber-700'
                      : 'text-emerald-700';

                return (
                  <tr key={project.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 pr-4 align-top">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono font-medium text-slate-700">
                          {project.kode}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{project.koridor}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-slate-700">{progressStage}</span>
                      </div>
                      <p className="mt-0.5 font-medium text-slate-950">{project.nama}</p>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                        {project.catatan_terbaru}
                      </p>
                    </td>
                    <td className="py-3.5 px-3 align-top whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${statusColor}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{project.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-3 align-top text-right whitespace-nowrap">
                      <span className="font-mono text-sm font-semibold tabular-nums text-slate-950">
                        {project.progres_persen}%
                      </span>
                      <div className="mt-1.5 ml-auto h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full bg-[#0F2942] transition-all"
                          style={{ width: `${project.progres_persen}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-3 align-top text-right font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                      {project.target_selesai}
                    </td>
                    <td className="py-3.5 pl-3 align-top text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={updatingId === project.id || project.progres_persen >= 100}
                        onClick={() => handleUpdateClick(project)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        <span>{updatingId === project.id ? 'Menyiar...' : '+1% Update'}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
