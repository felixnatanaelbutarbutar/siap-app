import React, { useState } from "react";
import {
  CalendarDays,
  Camera,
  Clock3,
  MapPin,
  ShieldCheck,
  FileText,
  History,
  ArrowUpRight,
} from "lucide-react";
import { WorkspaceDialog } from "./WorkspaceDialog";
import { api } from "../services/api";

const stamp = (v: any) =>
  v
    ? new Date(v).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Belum tercatat";
const label: Record<string, string> = {
  HADIR: "Hadir",
  TIDAK_HADIR: "Tidak hadir",
  BELUM_ABSEN: "Belum absen",
  BELUM_WAKTUNYA: "Belum waktunya",
  SHIFT_AKTIF: "Shift aktif",
  TIDAK_LENGKAP: "Absensi tidak lengkap",
  TANPA_JADWAL: "Tanpa jadwal",
  CUTI: "Cuti",
  IZIN: "Izin",
  SAKIT: "Sakit",
  PENDING: "Menunggu persetujuan",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  REVOKED: "Dicabut",
  CANCELLED: "Dibatalkan",
};
export function WorkforceDetails({
  item,
  impact,
  history,
  onAction,
}: {
  item: any;
  impact: any;
  history: any[] | undefined;
  onAction: (a: any) => void;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const facts = (values: [string, any][]) => (
    <dl className="workspace-facts">
      {values.map(([name, value]) => (
        <div key={name}>
          <dt>{name}</dt>
          <dd>{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
  const historyPanel = (
    <section className="workspace-detail-section">
      <h3 className="flex items-center gap-2">
        <History size={16} />
        Jejak keputusan
      </h3>
      {history?.length ? (
        history.map((h) => (
          <div
            key={h.id}
            className="relative pl-5 pb-5"
            style={{ borderLeft: "2px solid var(--border)" }}
          >
            <i
              className="absolute w-2 h-2 rounded-full"
              style={{ background: "var(--accent)", left: -5, top: 4 }}
            />
            <p className="text-xs font-semibold">
              {h.action.replaceAll("_", " ")}
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              {stamp(h.created_at)}
            </p>
            <p className="text-sm mt-2 leading-relaxed">{h.reason}</p>
          </div>
        ))
      ) : (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Belum ada keputusan yang dicatat.
        </p>
      )}
    </section>
  );
  return (
    <>
      {item.kind === "attendance" && (
        <div className="workspace-detail-grid">
          <div>
            <section className="workspace-detail-section">
              <h3 className="flex items-center gap-2">
                <CalendarDays size={17} />
                Jadwal & realisasi
              </h3>
              {facts([
                ["Tanggal shift", item.date],
                ["Area tugas", item.area_nama],
                ["Jadwal masuk", stamp(item.start_at)],
                ["Jadwal keluar", stamp(item.end_at)],
                ["Masuk aktual", stamp(item.masuk)],
                ["Keluar aktual", stamp(item.keluar)],
              ])}
            </section>
            <section>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Camera size={17} />
                Bukti lapangan{" "}
                <span
                  className="text-xs font-normal"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {item.events.length} catatan
                </span>
              </h3>
              {!item.events.length && (
                <div className="workspace-empty workspace-detail-section">
                  <Camera size={28} />
                  Belum ada bukti absensi untuk shift ini.
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {item.events.map((e: any) => (
                  <article key={e.id} className="workspace-card">
                    <button
                      className="block w-full relative"
                      style={{ background: "var(--bg-base)" }}
                      onClick={() => e.foto_url && setPhoto(e.foto_url)}
                      disabled={!e.foto_url}
                      aria-label={`Perbesar foto ${e.jenis}`}
                    >
                      {e.foto_url ? (
                        <img
                          src={e.foto_url}
                          alt={`Bukti ${e.jenis}`}
                          className="w-full h-56 object-contain"
                        />
                      ) : (
                        <div
                          className="h-36 flex items-center justify-center text-sm"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Tidak ada foto
                        </div>
                      )}
                      {e.foto_url && (
                        <span className="absolute bottom-3 right-3 text-xs px-2 py-1 rounded-md bg-black/65 text-white">
                          Perbesar ↗
                        </span>
                      )}
                    </button>
                    <div className="p-4">
                      <p className="font-semibold text-sm">
                        {e.jenis.replaceAll("_", " ")}
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {stamp(e.waktu_server)}
                      </p>
                      <div
                        className="text-xs space-y-2 mt-4"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <p className="flex gap-2">
                          <MapPin size={14} className="shrink-0" />
                          {e.lat?.toFixed(6)}, {e.lng?.toFixed(6)} • ±
                          {e.akurasi_gps ?? "—"} m
                        </p>
                        <p className="flex gap-2">
                          <ShieldCheck size={14} className="shrink-0" />
                          {e.evidence?.device ||
                            "Perangkat belum tercatat pada data lama"}
                        </p>
                        {e.evidence?.offline && (
                          <p className="workspace-notice">
                            Bukti offline diperiksa admin. Diterima{" "}
                            {stamp(e.evidence.received_at)}.
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
          <aside>
            <section className="workspace-detail-section">
              <p className="workspace-eyebrow">Hasil rekap</p>
              <h2 className="text-xl font-bold mb-5">
                {label[item.status] || item.status}
              </h2>
              {facts([
                ["Selisih masuk", `${item.menit_terlambat} menit`],
                ["Toleransi", `${item.tolerance} menit`],
                  ["Istirahat tercatat", `${item.istirahat_menit||0} menit`],
                ["Lewat toleransi", `${item.kelebihan_toleransi} menit`],
                ["Pulang lebih awal", `${item.pulang_awal} menit`],
                [
                  "Durasi tercatat",
                  item.jam_aktual === null
                    ? "Belum lengkap"
                    : `${item.jam_aktual} jam`,
                ],
              ])}
            </section>
            {item.source === "LEGACY_BASELINE" && (
              <p className="workspace-notice mb-4">
                Jadwal historis memakai data awal saat pembaruan. Periksa
                kesesuaiannya sebelum finalisasi.
              </p>
            )}
            {item.correction && (
              <div className="workspace-notice mb-4">
                <strong>Koreksi admin</strong>
                <p className="mt-2">{item.correction.reason}</p>
                <p className="mt-2">
                  Status awal:{" "}
                  {label[item.original.status] || item.original.status}
                </p>
                <p>{stamp(item.correction.created_at)}</p>
              </div>
            )}
            <button
              className="workspace-button w-full"
              disabled={item.source === "UNSCHEDULED"}
              onClick={() =>
                onAction({
                  title: "Koreksi absensi",
                  url: `/admin/workforce/attendance/${item.id}/correct`,
                  correction: true,
                  body: {},
                })
              }
            >
              Koreksi dengan alasan
            </button>
            <p
              className="text-xs leading-relaxed mt-3"
              style={{ color: "var(--text-secondary)" }}
            >
              Koreksi dicatat terpisah. Foto, lokasi, dan catatan asli tetap
              disimpan.
            </p>
          </aside>
        </div>
      )}
      {item.kind === "leave" && (
        <div className="workspace-detail-grid">
          <div>
            <section className="workspace-detail-section">
              <h3>Informasi pengajuan</h3>
              {facts([
                ["Pegawai", item.staff.nama],
                ["NIK", item.staff.nik],
                ["Jenis", label[item.jenis]],
                ["Status", label[item.status]],
                ["Tanggal mulai", item.tanggal_mulai.slice(0, 10)],
                ["Tanggal selesai", item.tanggal_selesai.slice(0, 10)],
              ])}
            </section>
            <section className="workspace-detail-section">
              <h3>Alasan pengajuan</h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {item.keterangan}
              </p>
              {item.foto_url && (
                <button
                  className="workspace-button mt-5"
                  disabled={downloading}
                  onClick={async () => {
                    setDownloading(true);
                    try {
                      const r = await api.get(`/izin/${item.id}/lampiran`, {
                        responseType: "blob",
                      });
                      const url = URL.createObjectURL(r.data);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "lampiran-izin";
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 30000);
                    } catch {
                      setError("Lampiran belum dapat dibuka. Coba lagi.");
                    } finally {
                      setDownloading(false);
                    }
                  }}
                >
                  <FileText size={16} />
                  {downloading
                    ? "Mengambil lampiran…"
                    : "Unduh lampiran pribadi"}
                </button>
              )}
              {error && (
                <p
                  role="alert"
                  className="mt-3 text-sm"
                  style={{ color: "var(--error)" }}
                >
                  {error}
                </p>
              )}
            </section>
            {historyPanel}
          </div>
          <aside>
            <section className="workspace-detail-section">
              <h3>Dampak pada jadwal</h3>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <strong className="text-3xl">
                    {impact?.calendar_days ?? "—"}
                  </strong>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    hari kalender
                  </p>
                </div>
                <div>
                  <strong
                    className="text-3xl"
                    style={{ color: "var(--accent)" }}
                  >
                    {impact?.dates.length ?? "—"}
                  </strong>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    hari kerja
                  </p>
                </div>
              </div>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {impact?.dates.join(" · ") ||
                  "Tidak ada jadwal kerja atau data masih dimuat."}
              </p>
            </section>
            {item.jenis === "CUTI" &&
              impact?.balances?.map((b: any) => (
                <section key={b.year} className="workspace-detail-section">
                  <h3>Saldo cuti {b.year}</h3>
                  {facts([
                    ["Saldo saat ini", `${b.balance} hari`],
                    ["Hari kerja diajukan", `${b.days} hari`],
                    ["Setelah keputusan", `${b.after} hari`],
                  ])}
                  {b.after < 0 && (
                    <p className="workspace-notice mt-4">
                      Saldo tidak cukup. Periksa hak cuti sebelum menyetujui.
                    </p>
                  )}
                </section>
              ))}
            <section className="workspace-detail-section">
              <h3>Cuti bersamaan di area ini</h3>
              {impact?.others.length ? (
                impact.others.map((o: any) => (
                  <p className="text-sm py-2" key={o.id}>
                    {o.staff.nama}
                    <span
                      className="block text-xs mt-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {o.tanggal_mulai.slice(0, 10)} —{" "}
                      {o.tanggal_selesai.slice(0, 10)}
                    </span>
                  </p>
                ))
              ) : (
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Tidak ada pengajuan lain yang disetujui pada periode ini.
                </p>
              )}
            </section>
            <div className="space-y-3">
              {item.status === "PENDING" && (
                <>
                  <button
                    className="workspace-button primary w-full"
                    onClick={() =>
                      onAction({
                        title: "Setujui pengajuan cuti / izin",
                        url: `/admin/izin/${item.id}`,
                        method: "put",
                        body: { status: "APPROVED" },
                      })
                    }
                  >
                    Setujui pengajuan
                  </button>
                  <button
                    className="workspace-button danger w-full"
                    onClick={() =>
                      onAction({
                        title: "Tolak pengajuan cuti / izin",
                        url: `/admin/izin/${item.id}`,
                        method: "put",
                        body: { status: "REJECTED" },
                      })
                    }
                  >
                    Tolak dengan alasan
                  </button>
                </>
              )}
              {["PENDING", "APPROVED"].includes(item.status) && (
                <button
                  className="workspace-button w-full"
                  onClick={() =>
                    onAction({
                      title: "Batalkan pengajuan",
                      url: `/admin/workforce/leave/${item.id}/cancel`,
                      body: {},
                    })
                  }
                >
                  Batalkan pengajuan
                </button>
              )}
            </div>
          </aside>
        </div>
      )}
      {item.kind === "ledger" && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              ["Saldo tersedia", item.balance],
              ["Terpakai bersih", item.used],
              ["Pengajuan menunggu", item.pending],
            ].map(([name, value]) => (
              <div key={String(name)} className="workspace-detail-section">
                <p
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {name}
                </p>
                <strong className="block text-3xl mt-3">{value}</strong>
              </div>
            ))}
          </div>
          {!!item.legacy_approved_count&&<p className="workspace-notice mb-5">Ada {item.legacy_approved_count} pengajuan cuti lama sebelum buku saldo digunakan. Tetapkan saldo awal berdasarkan sisa hak yang sudah diverifikasi.</p>}<h3 className="font-semibold mb-3">Transaksi saldo</h3>
          <div className="workspace-table-scroll">
            <table className="workspace-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Transaksi</th>
                  <th>Perubahan</th>
                  <th>Alasan</th>
                </tr>
              </thead>
              <tbody>
                {item.entries.map((e: any) => (
                  <tr key={e.id}>
                    <td>{stamp(e.created_at)}</td>
                    <td>
                      {{
                        USE: "Pemakaian",
                        REFUND: "Pengembalian",
                        ADJUSTMENT: "Penyesuaian",
                      }[e.kind as string] || e.kind}
                    </td>
                    <td
                      style={{
                        color: e.days > 0 ? "var(--accent)" : "var(--error)",
                        fontWeight: 700,
                      }}
                    >
                      {e.days > 0 ? "+" : ""}
                      {e.days} hari
                    </td>
                    <td>{e.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!item.entries.length && (
              <div className="workspace-empty">
                Belum ada transaksi. Admin dapat menetapkan hak cuti melalui
                Penyesuaian Saldo.
              </div>
            )}
          </div>
          <div className="mt-6">{historyPanel}</div>
        </>
      )}
      {item.kind === "device" && (
        <div className="workspace-detail-grid">
          <section className="workspace-detail-section">
            <ShieldCheck
              size={32}
              style={{ color: "var(--accent)", marginBottom: 20 }}
            >
              <title>Perangkat</title>
            </ShieldCheck>
            <h3>{item.label}</h3>
            {facts([
              ["Pemilik", item.staff?.nama],
              ["NIK", item.staff?.nik],
              ["Status", label[item.status]],
              ["Didaftarkan", stamp(item.created_at)],
              ["Terakhir digunakan", stamp(item.last_used_at)],
              ["Keputusan terakhir", stamp(item.reviewed_at)],
            ])}
            <p className="workspace-notice mt-5">{item.reason}</p>
          </section>
          <div>{historyPanel}</div>
        </div>
      )}
      {photo && (
        <WorkspaceDialog
          title="Bukti foto absensi"
          description="Foto asli yang tersimpan untuk catatan ini."
          onClose={() => setPhoto(null)}
        >
          <img
            src={photo}
            alt="Foto absensi diperbesar"
            className="w-full h-full object-contain min-h-[320px]"
          />
        </WorkspaceDialog>
      )}
    </>
  );
}
