import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { WorkspaceDialog } from "./WorkspaceDialog";

type Target = {
  divisi?: string;
  kind: "HARIAN" | "PER_JAM";
  id?: string;
  title?: string;
};
const monthNow = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
// Continue bounded storage batches while progress is made; leave failures in the durable queue.
async function finishPhotos(result: any, progress?: (value: any) => void) {
  for (let batch = 0; batch < 100 && result.pendingPhotos > 0; batch++) {
    try {
      const next = (
        await api.post(`/admin/report-cleanup/jobs/${result.id}/retry`)
      ).data.data;
      progress?.(next);
      if (next.pendingPhotos >= result.pendingPhotos) return next;
      result = next;
    } catch {
      return result;
    }
  }
  return result;
}
export function ReportCleanup({
  target,
  onClose,
}: {
  target: Target;
  onClose: () => void;
}) {
  const cache = useQueryClient();
  const [from, setFrom] = useState(monthNow());
  const [to, setTo] = useState(monthNow());
  const [includePending, setIncludePending] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  async function run(confirm = false) {
    setBusy(true);
    setError("");
    try {
      if (confirm) {
        const { data } = await api.post("/admin/report-cleanup/confirm", {
          token: preview.token,
          reason,
          confirmation,
        });
        setResult(data.data);
        setResult(await finishPhotos(data.data, setResult));
        await cache.invalidateQueries();
      } else {
        const { data } = await api.post("/admin/report-cleanup/preview", {
          kind: target.kind,
          divisi: target.divisi,
          id: target.id,
          from,
          to,
          includePending,
        });
        setPreview(data.data);
      }
    } catch (e: any) {
      setError(
        e.response?.data?.message || "Pembersihan gagal. Silakan coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }
  function preset(n: number) {
    const [y, m] = monthNow().split("-").map(Number);
    const d = new Date(Date.UTC(y, m - n, 1));
    setFrom(d.toISOString().slice(0, 7));
    setTo(monthNow());
    setPreview(null);
  }
  return (
    <WorkspaceDialog
      title={target.id ? "Hapus laporan" : "Kelola penyimpanan laporan"}
      description={
        target.kind === "HARIAN" ? "Laporan harian" : "Laporan terjadwal"
      }
      onClose={() => {
        if (!busy) onClose();
      }}
      compact
      footer={
        <>
          <button
            className="workspace-button"
            disabled={busy}
            onClick={onClose}
          >
            Tutup
          </button>
          {!result && (
            <button
              className="workspace-button"
              disabled={
                busy ||
                (preview &&
                  (preview.count === 0 ||
                    confirmation !== "HAPUS" ||
                    reason.trim().length < 5))
              }
              onClick={() => run(!!preview)}
            >
              {busy
                ? "Memproses…"
                : preview
                  ? "Hapus permanen"
                  : "Lihat pratinjau"}
            </button>
          )}
        </>
      }
    >
      {result ? (
        <div role="status">
          <h3 className="text-xl font-bold">{result.count} laporan dihapus</h3>
          <p>
            {result.deletedPhotos} foto dibersihkan; {result.retainedPhotos}{" "}
            foto bersama atau di luar folder laporan dipertahankan.
          </p>
          {result.pendingPhotos > 0 && (
            <p className="mt-3">
              {result.pendingPhotos} foto belum terhapus. Gunakan tombol Coba
              ulang pada riwayat pembersihan.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="workspace-notice">
            Periode penghapusan hanya berlaku untuk divisi halaman ini.
            Penghapusan permanen menghilangkan laporan dari admin dan riwayat
            pegawai. Simpan arsip yang diperlukan sebelum melanjutkan. Tidak ada
            penghapusan otomatis.
          </p>
          {target.id ? (
            <p className="font-semibold">{target.title || target.id}</p>
          ) : (
            <>
              <div className="flex gap-2 flex-wrap">
                <button className="workspace-button" onClick={() => preset(1)}>
                  Bulan ini
                </button>
                <button className="workspace-button" onClick={() => preset(3)}>
                  3 bulan termasuk bulan ini
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  Dari bulan
                  <input
                    className="workspace-input w-full"
                    type="month"
                    value={from}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      setPreview(null);
                    }}
                  />
                </label>
                <label>
                  Sampai bulan
                  <input
                    className="workspace-input w-full"
                    type="month"
                    value={to}
                    onChange={(e) => {
                      setTo(e.target.value);
                      setPreview(null);
                    }}
                  />
                </label>
              </div>
              <p className="workspace-description">
                Periode menggunakan WIB dan mencakup seluruh hari pada bulan
                yang dipilih. Untuk retensi, pilih bulan lama yang sudah selesai
                direkap.
              </p>
              {target.kind === "HARIAN" && (
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={includePending}
                    onChange={(e) => {
                      setIncludePending(e.target.checked);
                      setPreview(null);
                    }}
                  />
                  Sertakan draft dan laporan belum direview (default: hanya
                  disetujui / ditolak).
                </label>
              )}
            </>
          )}
          {preview && (
            <section className="space-y-3 border rounded-xl p-4">
              <h3 className="font-bold">
                {preview.count} laporan · {preview.photos} foto
              </h3>
              <p className="workspace-description">
                {preview.total > preview.count
                  ? `Total ${preview.total} laporan cocok. Penghapusan dibatasi 500 per proses; ulangi periode ini untuk batch berikutnya.`
                  : "Pratinjau berlaku 10 menit. Data yang berubah harus ditinjau ulang."}
              </p>
              <ul>
                {preview.sample.map((r: any) => (
                  <li key={r.id}>
                    {r.title} · {new Date(r.date).toLocaleDateString("id-ID")}
                  </li>
                ))}
              </ul>
              <label className="block">
                Alasan penghapusan
                <textarea
                  className="workspace-input w-full"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={500}
                />
              </label>
              <label className="block">
                Ketik HAPUS untuk konfirmasi
                <input
                  className="workspace-input w-full"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoComplete="off"
                />
              </label>
            </section>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 text-red-500">
          {error}
        </p>
      )}
    </WorkspaceDialog>
  );
}
export function ReportCleanupHistory({ division }: { division?: string }) {
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ["report-cleanup-jobs", division],
    queryFn: async () =>
      (
        await api.get("/admin/report-cleanup/jobs", {
          params: { divisi: division },
        })
      ).data.data,
  });
  return (
    <details className="workspace-card p-4">
      <summary className="cursor-pointer font-semibold">
        Riwayat pembersihan & foto tertunda
      </summary>
      <p className="workspace-description my-2">
        50 aktivitas terakhir dan seluruh pembersihan tertunda. Maksimal 25 foto
        dibersihkan per batch dan dilanjutkan otomatis selama berhasil. Foto
        tertunda tetap tercatat agar bisa dibersihkan setelah penyimpanan
        kembali tersedia.
      </p>
      {data.map((j: any) => (
        <div
          key={j.id}
          className="flex flex-wrap justify-between gap-2 border-t py-3"
        >
          <span>
            {new Date(j.date).toLocaleString("id-ID")} · {j.count} laporan ·{" "}
            {j.divisi || "Lintas divisi"} · {j.reason}
          </span>
          {j.pendingPhotos > 0 ? (
            <button
              disabled={busy}
              className="workspace-button"
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const result = (
                    await api.post(`/admin/report-cleanup/jobs/${j.id}/retry`)
                  ).data.data;
                  await finishPhotos(result);
                  await cache.invalidateQueries({
                    queryKey: ["report-cleanup-jobs"],
                  });
                } catch {
                  setError("Pembersihan foto belum berhasil. Coba lagi nanti.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Coba ulang {j.pendingPhotos} foto
            </button>
          ) : (
            <span>Selesai</span>
          )}
        </div>
      ))}
      {!data.length && <p>Belum ada penghapusan.</p>}
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
