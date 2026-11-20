import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clock3,
  BellRing,
  HardDrive,
  Plus,
  X,
  Save,
  ShieldCheck,
  CalendarClock,
} from "lucide-react";
import { api } from "../../services/api";
import {
  ReportCleanup,
  ReportCleanupHistory,
} from "../../components/ReportCleanup";

export const Route = createFileRoute("/_authenticated/laporan_/pengaturan")({
  component: ReportSettings,
});
const roles = [
  { role: "SATPAM", label: "Satpam", division: "KEAMANAN" },
  { role: "CS", label: "Cleaning Service", division: "CLEANING_SERVICE" },
  { role: "UTILITY", label: "Utility", division: "UTILITY" },
];
type Setting = {
  role: string;
  enabled: boolean;
  times: string[];
  version: number;
  updated_at?: string;
};
const reminder = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  const total = (h * 60 + m - 5 + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};
function ReportSettings() {
  const cache = useQueryClient();
  const [tab, setTab] = useState<"schedule" | "storage">("schedule");
  const [role, setRole] = useState("SATPAM");
  const [drafts, setDrafts] = useState<Record<string, Setting>>({});
  const [time, setTime] = useState("09:00");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [kind, setKind] = useState<"HARIAN" | "PER_JAM">("HARIAN");
  const [date, setDate] = useState(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
      new Date(),
    ),
  );
  const [cleanup, setCleanup] = useState<any>(null);
  const selected = roles.find((r) => r.role === role)!;
  const settings = useQuery({
    queryKey: ["report-settings"],
    queryFn: async () => (await api.get("/admin/report-settings")).data.data,
  });
  const saved: Setting = settings.data?.roles.find(
    (r: Setting) => r.role === role,
  );
  const draft = drafts[role] || saved;
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(saved);
  const edit = (patch: Partial<Setting>) => {
    setDrafts((v) => ({ ...v, [role]: { ...draft, ...patch } }));
    setMessage("");
    setError("");
  };
  const list = useQuery({
    queryKey: ["storage-reports", selected.division, kind, date],
    enabled: tab === "storage",
    queryFn: async () =>
      (
        await api.get(
          kind === "HARIAN" ? "/admin/laporan" : "/admin/laporan-perjam",
          { params: { tanggal: date, divisi: selected.division } },
        )
      ).data.data,
  });
  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await api.put(`/admin/report-settings/${role}`, {
        enabled: draft.enabled,
        times: draft.times,
        version: draft.version,
      });
      setDrafts((v) => ({ ...v, [role]: res.data.data }));
      await cache.invalidateQueries({ queryKey: ["report-settings"] });
      setMessage(
        `Jadwal ${selected.label} tersimpan. Perubahan berlaku segera untuk jadwal yang belum dilaporkan.`,
      );
    } catch (e: any) {
      setError(e.response?.data?.message || "Gagal menyimpan jadwal.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="workspace-page space-y-6">
      <header className="workspace-heading">
        <div>
          <p className="workspace-eyebrow">PUSAT PENGELOLAAN LAPORAN</p>
          <h1>Atur ritme. Rapikan penyimpanan.</h1>
          <p className="workspace-description">
            Satu tempat untuk menentukan jadwal laporan pegawai dan membersihkan
            data yang sudah tidak diperlukan.
          </p>
        </div>
        <span className="workspace-button">
          <Clock3 size={16} />
          Waktu Indonesia Barat
        </span>
      </header>
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          {
            icon: CalendarClock,
            title: "Jadwal per role",
            text: "Jam bebas, mengikuti shift kerja.",
          },
          {
            icon: BellRing,
            title: "Pengingat H-5",
            text: "Dikirim ke pegawai yang dijadwalkan.",
          },
          {
            icon: ShieldCheck,
            title: "Penghapusan terkontrol",
            text: "Pratinjau sebelum data dihapus.",
          },
        ].map((i) => (
          <div key={i.title} className="workspace-card p-5 flex gap-3">
            <i.icon size={22} style={{ color: "var(--accent)" }} />
            <div>
              <h2 className="font-semibold">{i.title}</h2>
              <p className="workspace-description">{i.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Pengaturan laporan"
      >
        {[
          { id: "schedule", label: "Jadwal & pengingat", icon: CalendarClock },
          {
            id: "storage",
            label: "Penyimpanan & pembersihan",
            icon: HardDrive,
          },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id as any);
              setError("");
              setMessage("");
            }}
            className="workspace-button"
            style={
              tab === t.id
                ? { background: "var(--accent)", color: "var(--accent-text)" }
                : {}
            }
          >
            <t.icon size={17} />
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap" aria-label="Pilih role">
        {roles.map((r) => (
          <button
            key={r.role}
            disabled={busy}
            className="workspace-button"
            aria-pressed={role === r.role}
            onClick={() => {
              setRole(r.role);
              setError("");
              setMessage("");
            }}
            style={
              role === r.role
                ? { borderColor: "var(--accent)", color: "var(--accent)" }
                : {}
            }
          >
            {r.label}
            {drafts[r.role] &&
            JSON.stringify(drafts[r.role]) !==
              JSON.stringify(
                settings.data?.roles.find((v: Setting) => v.role === r.role),
              )
              ? " •"
              : ""}
          </button>
        ))}
      </div>
      {tab === "schedule" && (
        <>
          {settings.isPending ? (
            <div className="workspace-card p-8">Memuat pengaturan…</div>
          ) : settings.isError ? (
            <div role="alert">
              Pengaturan gagal dimuat.{" "}
              <button
                className="workspace-button"
                onClick={() => settings.refetch()}
              >
                Coba lagi
              </button>
            </div>
          ) : (
            draft && (
              <div className="grid xl:grid-cols-[1.5fr_1fr] gap-6">
                <section className="workspace-card p-6 space-y-5">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="workspace-eyebrow">{selected.label}</p>
                      <h2 className="text-xl font-bold">
                        Jam laporan terjadwal
                      </h2>
                      <p className="workspace-description">
                        Jam berlaku setiap hari, hanya pada pegawai yang
                        memiliki shift saat itu. Laporan harian tetap dapat
                        digunakan terpisah.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 self-start whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={draft.enabled}
                        onChange={(e) => edit({ enabled: e.target.checked })}
                      />
                      {draft.enabled ? "Aktif" : "Nonaktif"}
                    </label>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!time || draft.times.includes(time)) {
                        setError("Pilih jam yang belum ditambahkan.");
                        return;
                      }
                      if (draft.times.length >= 48) {
                        setError("Maksimal 48 jam laporan per role.");
                        return;
                      }
                      edit({ times: [...draft.times, time].sort() });
                    }}
                    className="flex flex-wrap gap-3 items-end"
                  >
                    <label className="flex-1">
                      Tambah jam (WIB)
                      <input
                        aria-label="Jam laporan baru"
                        type="time"
                        required
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="workspace-input w-full mt-2"
                      />
                    </label>
                    <button className="workspace-button" type="submit">
                      <Plus size={16} />
                      Tambah jam
                    </button>
                  </form>
                  <div className="flex flex-wrap gap-2">
                    {draft.times.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-3 rounded-xl px-4 py-3"
                        style={{
                          background: "var(--bg-input)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <Clock3 size={15} />
                        <strong>{t}</strong>
                        <button
                          aria-label={`Hapus jam ${t}`}
                          onClick={() =>
                            edit({ times: draft.times.filter((v) => v !== t) })
                          }
                        >
                          <X size={15} />
                        </button>
                      </span>
                    ))}
                  </div>
                  {!draft.times.length && (
                    <div className="rounded-xl border border-dashed p-8 text-center">
                      <Clock3 className="mx-auto mb-3" />
                      <p>Belum ada jam laporan.</p>
                      <p className="workspace-description mx-auto">
                        Tambahkan jam pertama, atau gunakan contoh untuk mulai
                        menyusun jadwal.
                      </p>
                    </div>
                  )}
                  <button
                    className="workspace-button"
                    onClick={() =>
                      edit({
                        times: [
                          ...new Set([
                            ...draft.times,
                            "09:00",
                            "12:00",
                            "15:00",
                            "20:00",
                          ]),
                        ].sort(),
                      })
                    }
                  >
                    Tambahkan contoh 09.00 · 12.00 · 15.00 · 20.00
                  </button>
                  <div className="border-t pt-5 flex flex-wrap justify-between gap-3 items-center">
                    <p className="workspace-description">
                      {dirty
                        ? "Ada perubahan belum disimpan."
                        : saved?.updated_at
                          ? `Terakhir disimpan ${new Date(saved.updated_at).toLocaleString("id-ID")}`
                          : "Jadwal belum diaktifkan oleh admin."}
                    </p>
                    <div className="flex gap-2">
                      <button
                        disabled={busy || !dirty}
                        className="workspace-button"
                        onClick={() =>
                          setDrafts((v) => ({ ...v, [role]: saved }))
                        }
                      >
                        Batalkan perubahan
                      </button>
                      <button
                        className="workspace-button"
                        disabled={
                          busy ||
                          !dirty ||
                          (draft.enabled && !draft.times.length)
                        }
                        onClick={save}
                        style={{
                          background: "var(--accent)",
                          color: "var(--accent-text)",
                        }}
                      >
                        <Save size={16} />
                        {busy ? "Menyimpan…" : "Simpan jadwal"}
                      </button>
                    </div>
                  </div>
                </section>
                <aside className="space-y-4">
                  <section className="workspace-card p-6">
                    <p className="workspace-eyebrow">PRATINJAU PENGINGAT</p>
                    <h2 className="font-bold text-lg">
                      Dari jadwal ke HP pegawai
                    </h2>
                    <p className="workspace-description">
                      {draft.enabled
                        ? "Pengingat H-5 untuk setiap jam berikut, bila jam laporan masuk dalam shift pegawai."
                        : "Jadwal sedang nonaktif. Pengingat tidak dikirim sampai diaktifkan dan disimpan."}
                    </p>
                    <div className="mt-4 space-y-2">
                      {draft.times.map((t) => (
                        <div
                          key={t}
                          className="flex items-center justify-between py-3 border-b"
                        >
                          <span className="flex items-center gap-2">
                            <BellRing size={15} />
                            {reminder(t)}
                            <small>pengingat</small>
                          </span>
                          <span>→</span>
                          <strong>{t} laporan</strong>
                        </div>
                      ))}
                    </div>
                  </section>
                  <div className="workspace-card p-5">
                    <h3 className="font-semibold">Contoh shift 09.00–17.00</h3>
                    <p className="workspace-description">
                      Jadwal 09.00, 12.00, dan 15.00 berlaku. Jam 20.00
                      dilewati. Shift malam tetap mengikuti tanggal dan waktu
                      sebenarnya.
                    </p>
                    <p className="workspace-description">
                      Pengingat dilewati saat cuti, sudah pulang, atau laporan
                      sudah terkirim. Foto laporan dapat dikirim setelah jamnya
                      tiba dan pegawai sudah absen masuk.
                    </p>
                  </div>
                </aside>
              </div>
            )
          )}
          {settings.data && !settings.data.push_configured && (
            <div
              className="workspace-card p-5"
              style={{ borderColor: "var(--warning)" }}
            >
              <h3 className="font-semibold">Pengiriman push belum siap</h3>
              <p className="workspace-description">
                Firebase backend belum terkonfigurasi. Jadwal tetap bisa
                disimpan dan dilihat di mobile, tetapi notifikasi HP memerlukan
                konfigurasi Firebase backend, aplikasi Android, dan izin
                notifikasi.
              </p>
            </div>
          )}
        </>
      )}
      {tab === "storage" && (
        <div className="space-y-5">
          <section className="workspace-card p-6">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <p className="workspace-eyebrow">
                  PENYIMPANAN • {selected.label}
                </p>
                <h2 className="text-xl font-bold">
                  Bersihkan laporan yang sudah selesai
                </h2>
                <p className="workspace-description">
                  Penghapusan berlaku untuk divisi yang dipilih. Foto ikut
                  dibersihkan jika tidak digunakan data lain. Simpan arsip yang
                  dibutuhkan sebelum menghapus.
                </p>
              </div>
              <button
                className="workspace-button self-start"
                onClick={() => setCleanup({ kind, divisi: selected.division })}
              >
                <HardDrive size={16} />
                Hapus berdasarkan periode
              </button>
            </div>
            <div className="flex flex-wrap gap-4 mt-5">
              <label>
                Jenis laporan
                <select
                  className="workspace-input block mt-2"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as any)}
                >
                  <option value="HARIAN">Laporan harian</option>
                  <option value="PER_JAM">Laporan terjadwal</option>
                </select>
              </label>
              <label>
                Tanggal daftar
                <input
                  className="workspace-input block mt-2"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            </div>
          </section>
          <section className="workspace-card p-5">
            <h3 className="font-semibold mb-3">Hapus laporan satuan</h3>
            {list.isPending ? (
              <p>Memuat laporan…</p>
            ) : list.isError ? (
              <p role="alert">
                Gagal memuat laporan.{" "}
                <button onClick={() => list.refetch()}>Coba lagi</button>
              </p>
            ) : list.data?.length ? (
              list.data.map((r: any) => (
                <div
                  key={r.id}
                  className="flex justify-between items-center gap-4 py-4 border-t"
                >
                  <div>
                    <p className="font-semibold">
                      {r.judul ||
                        `Laporan ${String(r.jam).padStart(2, "0")}:${String(r.menit || 0).padStart(2, "0")}`}
                    </p>
                    <p className="workspace-description">
                      {r.staff?.nama} · {r.status || r.status_keamanan}
                    </p>
                  </div>
                  <button
                    className="workspace-button"
                    onClick={() =>
                      setCleanup({
                        kind,
                        divisi: selected.division,
                        id: r.id,
                        title: r.judul || "Laporan terjadwal",
                      })
                    }
                  >
                    Hapus
                  </button>
                </div>
              ))
            ) : (
              <p className="workspace-description">
                Tidak ada laporan pada tanggal ini.
              </p>
            )}
            <p className="workspace-description">
              Daftar harian menampilkan maksimal 200 laporan. Untuk pembersihan
              lebih besar, gunakan pilihan periode.
            </p>
          </section>
          <ReportCleanupHistory />
        </div>
      )}
      {message && (
        <p
          role="status"
          className="workspace-card p-4"
          style={{ color: "var(--accent)" }}
        >
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="workspace-card p-4"
          style={{ color: "var(--error)" }}
        >
          {error}
        </p>
      )}
      {cleanup && (
        <ReportCleanup target={cleanup} onClose={() => setCleanup(null)} />
      )}
    </div>
  );
}
