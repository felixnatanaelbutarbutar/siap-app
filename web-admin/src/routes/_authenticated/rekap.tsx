import { WorkspaceDialog } from "../../components/WorkspaceDialog";
import { WorkforceDetails } from "../../components/WorkforceDetails";
import React, { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import {
  Download,
  ShieldCheck,
  CalendarDays,
  ClipboardList,
  Archive,
  Search,
  X,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/rekap")({
  component: WorkforcePage,
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
    tab: typeof s.tab === "string" ? s.tab : "attendance",
    status: typeof s.status === "string" ? s.status : "",
    from: typeof s.from === "string" ? s.from : "",
    to: typeof s.to === "string" ? s.to : "",
  }),
});
const dateNow = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const time = (v: any) =>
  v
    ? new Date(v).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
const labels: Record<string, string> = {
  TANPA_JADWAL: "Tanpa jadwal",
  HADIR: "Hadir",
  TIDAK_HADIR: "Tidak hadir",
  BELUM_ABSEN: "Belum absen",
  BELUM_WAKTUNYA: "Belum waktunya",
  SHIFT_AKTIF: "Shift aktif",
  TIDAK_LENGKAP: "Tidak lengkap",
  CUTI: "Cuti",
  SAKIT: "Sakit",
  IZIN: "Izin",
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  REVOKED: "Dicabut",
  CANCELLED: "Dibatalkan",
};
const panel = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 3px 18px var(--shadow-base)",
};
const input = {
  background: "var(--bg-input)",
  color: "var(--text-base)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 12px",
};
function Badge({ value }: { value: string }) {
  const bad = ["TIDAK_HADIR", "TIDAK_LENGKAP", "REVOKED", "REJECTED"].includes(
    value,
  );
  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 9px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
        background: bad ? "#dc262618" : "#10b98118",
        color: bad ? "var(--error)" : "var(--accent)",
      }}
    >
      {labels[value] || value}
    </span>
  );
}
function csv(name: string, rows: any[]) {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const cell = (v: any) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@-]/, "'$&")
      .replace(/"/g, '""') +
    '"';
  const blob = new Blob(
    [
      "\ufeff" +
        [columns, ...rows.map((r) => columns.map((k) => r[k]))]
          .map((r) => r.map(cell).join(","))
          .join("\r\n"),
    ],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}
function Table({
  heads,
  children,
}: {
  heads: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="workspace-table-scroll">
      <table className="workspace-table">
        <thead>
          <tr>
            {heads.map((h, i) => (
              <th key={h + i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function Cell({ children }: { children: React.ReactNode }) {
  return <td>{children}</td>;
}

function WorkforcePage() {
  const routeSearch = Route.useSearch();
  const client = useQueryClient();
  const [tab, setTab] = useState(
    ["attendance", "devices", "leave", "archives"].includes(routeSearch.tab)
      ? routeSearch.tab
      : "attendance",
  );
  const [from, setFrom] = useState(
    routeSearch.from || dateNow().slice(0, 7) + "-01",
  );
  const [to, setTo] = useState(routeSearch.to || dateNow());
  const [search, setSearch] = useState(routeSearch.q);
  const [status, setStatus] = useState(routeSearch.status);
  const [division, setDivision] = useState("");
  const [area, setArea] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [action, setAction] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [matrix, setMatrix] = useState(false);
  const [leaveView, setLeaveView] = useState("requests");
  const [leaveStatus, setLeaveStatus] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [balanceStaff, setBalanceStaff] = useState("");
  const [days, setDays] = useState(12);
  const [archiveMonth, setArchiveMonth] = useState(new Date(Date.UTC(Number(dateNow().slice(0,4)),Number(dateNow().slice(5,7))-2,15)).toISOString().slice(0,7));
  const [archiveRows, setArchiveRows] = useState<any[] | null>(null);
  const [correctStatus, setCorrectStatus] = useState("HADIR");
  const [correctIn, setCorrectIn] = useState("");
  const [correctOut, setCorrectOut] = useState("");
  const [leaveMonth, setLeaveMonth] = useState(dateNow().slice(5, 7));
  const [offlineDate, setOfflineDate] = useState(dateNow());
  const attendance = useQuery({
    queryKey: ["workforce", "attendance", from, to],
    queryFn: async () =>
      (await api.get("/admin/workforce/attendance", { params: { from, to } }))
        .data.data,
    enabled: tab === "attendance",
  });
  const offline = useQuery({
    queryKey: ["workforce", "offline"],
    queryFn: async () => (await api.get("/offline-attendance")).data.data,
    enabled: tab === "devices",
  });
  const devices = useQuery({
    queryKey: ["workforce", "devices"],
    queryFn: async () => (await api.get("/admin/workforce/devices")).data.data,
    enabled: tab === "devices",
  });
  const leave = useQuery({
    queryKey: ["workforce", "leave", year],
    queryFn: async () =>
      (await api.get("/admin/workforce/leave-summary", { params: { year } }))
        .data.data,
    enabled: tab === "leave",
  });
  const archives = useQuery({
    queryKey: ["workforce", "archives"],
    queryFn: async () => (await api.get("/admin/workforce/archives")).data.data,
    enabled: tab === "archives",
  });
  const impact = useQuery({
    queryKey: ["workforce", "impact", selected?.id],
    queryFn: async () =>
      (await api.get(`/admin/workforce/leave/${selected.id}/impact`)).data.data,
    enabled: selected?.kind === "leave",
  });
  const history = useQuery({
    queryKey: ["workforce", "audit", selected?.id],
    queryFn: async () =>
      (await api.get(`/admin/workforce/audit/${selected.id}`)).data.data,
    enabled: !!selected && selected.kind !== "attendance",
  });
  const mutation = useMutation({
    mutationFn: async (a: any) => {
      const body = {
        ...a.body,
        reason,
        komentar_admin: reason,
        ...(a.offline ? { date: offlineDate } : {}),
        ...(a.correction
          ? {
              status: correctStatus,
              masuk: correctIn
                ? new Date(correctIn + ":00+07:00").toISOString()
                : null,
              keluar: correctOut
                ? new Date(correctOut + ":00+07:00").toISOString()
                : null,
            }
          : {}),
      };
      return a.method === "put" ? api.put(a.url, body) : api.post(a.url, body);
    },
    onSuccess: () => {
      setAction(null);
      setSelected(null);
      setReason("");
      client.invalidateQueries({ queryKey: ["workforce"] });
      client.invalidateQueries({ queryKey: ["admin-izin"] });
    },
    onError: (e: any) => setError(e.response?.data?.message || e.message),
  });
  const match = (r: any) =>
    `${r.nama || r.staff?.nama || ""} ${r.nik || r.staff?.nik || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()) &&
    (!division || (r.divisi || r.staff?.divisi) === division);
  const rows = useMemo(
    () =>
      (attendance.data || []).filter(
        (r: any) =>
          match(r) &&
          (!area || r.area_nama === area) &&
          (!status ||
            (status === "TERLAMBAT" ? r.terlambat : r.status === status)),
      ),
    [attendance.data, search, status, division, area],
  );
  const exportRows = (list: any[]) =>
    csv(
      "rekap-absensi-" + from,
      list.map((r) => ({
        NIK: r.nik,
        Nama: r.nama,
        Divisi: r.divisi,
        Area: r.area_nama,
        Tanggal: r.date,
        JadwalMasuk: time(r.start_at),
        JadwalKeluar: time(r.end_at),
        Masuk: time(r.masuk),
        Keluar: time(r.keluar),
        Status: labels[r.status] || r.status,
        TerlambatMenit: r.menit_terlambat,
        PulangAwalMenit: r.pulang_awal,
        JamAktual: r.jam_aktual,
        SumberJadwal: r.source,
      })),
    );
  const openAction = (a: any) => {
    setError("");
    setReason("");
    setAction(a);
  };
  const activeQuery =
    tab === "attendance"
      ? attendance
      : tab === "devices"
        ? devices
        : tab === "leave"
          ? leave
          : archives;
  return (
    <div
      className="workspace-page workforce-page space-y-6"
      style={{ color: "var(--text-base)" }}
    >
      <div className="workspace-heading">
        <div>
          <p className="workspace-eyebrow">SIAP • Kontrol Kehadiran</p>
          <h1 className="text-3xl font-bold mt-2">Rekap & Verifikasi</h1>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Jadwal, bukti kehadiran, perangkat, dan cuti dalam satu tempat.
            Waktu ditampilkan dalam WIB.
          </p>
        </div>
        <span className="workspace-notice">
          Jadwal → Bukti → Verifikasi → Arsip
        </span>
      </div>
      <div className="workspace-tabs" role="tablist" aria-label="Modul rekap">
        {[
          ["attendance", "Rekap Absensi", CalendarDays],
          ["devices", "Perangkat", ShieldCheck],
          ["leave", "Rekap Cuti", ClipboardList],
          ["archives", "Arsip Bulanan", Archive],
        ].map(([key, title, Icon]: any) => (
          <button
            role="tab"
            aria-selected={tab === key}
            key={key}
            onClick={() => {
              setTab(key);
              setSelected(null);
              setSearch("");
              setStatus("");
            }}
          >
            <Icon size={18} />
            {title}
          </button>
        ))}
      </div>
      <div style={panel} className="flex flex-wrap gap-3 items-center">
        <Search size={18} />
        <input
          aria-label="Cari pegawai"
          style={input}
          placeholder="Cari nama atau NIK"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Divisi"
          style={input}
          value={division}
          onChange={(e) => setDivision(e.target.value)}
        >
          <option value="">Semua divisi</option>
          {["KEAMANAN", "CLEANING_SERVICE", "UTILITY"].map((d) => (
            <option key={d} value={d}>
              {d === "CLEANING_SERVICE" ? "Cleaning Service" : d === "KEAMANAN" ? "Keamanan" : "Utility"}
            </option>
          ))}
        </select>
        {tab === "attendance" && (
          <>
            <input
              aria-label="Dari tanggal"
              type="date"
              style={input}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <input
              aria-label="Sampai tanggal"
              type="date"
              style={input}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <button
              onClick={() => {
                setFrom(dateNow());
                setTo(dateNow());
                setStatus("");
              }}
            >
              Hari Ini
            </button>
            <select
              aria-label="Area"
              style={input}
              value={area}
              onChange={(e) => setArea(e.target.value)}
            >
              <option value="">Semua area</option>
              {[
                ...new Set<string>(
                  (attendance.data || []).map((r: any) => r.area_nama),
                ),
              ].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            <select
              aria-label="Status absensi"
              style={input}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Semua status</option>
              {[
                "HADIR",
                "BELUM_ABSEN",
                "TERLAMBAT",
                "TIDAK_HADIR",
                "TIDAK_LENGKAP",
                "SHIFT_AKTIF",
                "CUTI",
                "SAKIT",
                "IZIN",
                "BELUM_WAKTUNYA",
                "TANPA_JADWAL",
              ].map((s) => (
                <option key={s} value={s}>
                  {labels[s] || "Terlambat"}
                </option>
              ))}
            </select>
          </>
        )}
        {tab === "leave" && (
          <input
            aria-label="Tahun cuti"
            style={input}
            type="number"
            min={2020}
            max={2100}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        )}
      </div>
      {activeQuery.isLoading && <p role="status">Memuat data…</p>}
      {activeQuery.error && (
        <p role="alert" style={{ color: "var(--error)" }}>
          Gagal memuat data.{" "}
          <button onClick={() => activeQuery.refetch()}>Coba lagi</button>
        </p>
      )}
      {tab === "attendance" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              "HADIR",
              "BELUM_ABSEN",
              "TERLAMBAT",
              "TIDAK_HADIR",
              "TIDAK_LENGKAP",
            ].map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                style={panel}
                className="workspace-kpi text-left"
              >
                <span className="text-sm">{labels[s] || "Terlambat"}</span>
                <strong className="block text-3xl mt-2">
                  {
                    (attendance.data || []).filter(
                      (r: any) =>
                        match(r) &&
                        (s === "TERLAMBAT" ? r.terlambat : r.status === s),
                    ).length
                  }
                </strong>
              </button>
            ))}
          </div>
          <div style={panel}>
            <div className="flex flex-wrap justify-between gap-3 mb-4">
              <div>
                <h2 className="font-bold">Jadwal vs Kehadiran</h2>
                <p className="text-xs mt-1">
                  {rows.length} shift • Klik baris untuk melihat bukti. Jadwal
                  baseline historis belum dapat dipastikan.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setMatrix(!matrix)}>
                  {matrix ? "Tabel Detail" : "Matriks Tanggal"}
                </button>
                <button
                  onClick={() => exportRows(rows)}
                  className="flex gap-2 items-center"
                >
                  <Download size={16} />
                  Excel (CSV)
                </button>
                <button onClick={() => window.print()}>Cetak / PDF</button>
              </div>
            </div>
            {matrix ? (
              <Table
                heads={[
                  "Pegawai",
                  ...[...new Set<string>(rows.map((r: any) => r.date))],
                ]}
              >
                {[...new Set<string>(rows.map((r: any) => r.staff_id))].map(
                  (id) => (
                    <tr key={id}>
                      <Cell>
                        {rows.find((r: any) => r.staff_id === id)?.nama}
                      </Cell>
                      {[...new Set<string>(rows.map((r: any) => r.date))].map(
                        (d) => {
                          const r = rows.find(
                            (r: any) => r.staff_id === id && r.date === d,
                          );
                          return (
                            <Cell key={d}>
                              {r ? (
                                <button
                                  onClick={() =>
                                    setSelected({ ...r, kind: "attendance" })
                                  }
                                >
                                  <Badge value={r.status} />
                                  {r.terlambat && " ⏱"}
                                </button>
                              ) : (
                                "—"
                              )}
                            </Cell>
                          );
                        },
                      )}
                    </tr>
                  ),
                )}
              </Table>
            ) : (
              <Table
                heads={[
                  "Pegawai / Area",
                  "Tanggal & Jadwal",
                  "Masuk / Keluar",
                  "Status",
                  "Selisih",
                  "Jam Aktual",
                ]}
              >
                {rows.map((r: any) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer"
                    tabIndex={0}
                    aria-label={`Detail absensi ${r.nama} ${r.date}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        setSelected({ ...r, kind: "attendance" });
                    }}
                    onClick={() => setSelected({ ...r, kind: "attendance" })}
                  >
                    <Cell>
                      <strong>{r.nama}</strong>
                      <div className="text-xs">
                        {r.nik} • {r.area_nama}
                      </div>
                    </Cell>
                    <Cell>
                      {r.date}
                      <div className="text-xs">
                        {time(r.start_at)} → {time(r.end_at)}
                      </div>
                    </Cell>
                    <Cell>
                      {time(r.masuk)}
                      <br />
                      {time(r.keluar)}
                    </Cell>
                    <Cell>
                      <Badge value={r.status} />
                      {r.terlambat && (
                        <div className="text-xs text-amber-500">Terlambat</div>
                      )}
                      {r.konflik_cuti && <div>Periksa konflik cuti</div>}
                    </Cell>
                    <Cell>
                      {r.terlambat ? `Telat ${r.menit_terlambat} m` : "—"}
                      {r.pulang_awal > 0 && (
                        <div>Pulang awal {r.pulang_awal} m</div>
                      )}
                    </Cell>
                    <Cell>{r.jam_aktual ?? "—"}</Cell>
                  </tr>
                ))}
              </Table>
            )}
            {!rows.length && !attendance.isLoading && (
              <p className="py-10 text-center">
                Tidak ada shift untuk filter ini. Periksa jadwal pegawai.
              </p>
            )}
          </div>
        </>
      )}
      {tab === "devices" && (
        <>
          <div style={panel}>
            <h2 className="font-bold mb-2">Perangkat Pegawai</h2>
            <p className="text-sm mb-4">
              Persetujuan perangkat baru otomatis mencabut perangkat lama.
              Verifikasi pemilik sebelum menyetujui.
            </p>
            <Table
              heads={[
                "Pegawai",
                "Perangkat",
                "Status",
                "Terakhir dipakai",
                "Tindakan",
              ]}
            >
              {(devices.data || []).filter(match).map((d: any) => (
                <tr key={d.id}>
                  <Cell>
                    {d.staff?.nama}
                    <div>{d.staff?.nik}</div>
                  </Cell>
                  <Cell>
                    {d.label}
                    <div className="text-xs">{d.reason}</div>
                  </Cell>
                  <Cell>
                    <Badge value={d.status} />
                  </Cell>
                  <Cell>{time(d.last_used_at)}</Cell>
                  <Cell>
                    <div className="flex gap-3">
                      {(d.status === "PENDING"
                        ? ["APPROVED", "REJECTED"]
                        : d.status === "APPROVED"
                          ? ["REVOKED"]
                          : []
                      ).map((s) => (
                        <button
                          key={s}
                          onClick={() =>
                            openAction({
                              title: `${labels[s]} perangkat ${d.staff?.nama}`,
                              url: `/admin/workforce/devices/${d.id}/review`,
                              body: { status: s },
                            })
                          }
                        >
                          {s === "APPROVED"
                            ? "Setujui"
                            : s === "REJECTED"
                              ? "Tolak"
                              : "Cabut"}
                        </button>
                      ))}
                      <button
                        onClick={() => setSelected({ ...d, kind: "device" })}
                      >
                        Riwayat
                      </button>
                    </div>
                  </Cell>
                </tr>
              ))}
            </Table>
            {!devices.data?.length && (
              <p className="py-10 text-center">
                Belum ada permohonan. Pegawai mendaftarkan HP melalui halaman
                Absensi.
              </p>
            )}
          </div>
          <div style={panel}>
            <h2 className="font-bold mb-4">Verifikasi Bukti Offline</h2>
            <p className="text-sm mb-4">
              Waktu berasal dari HP dan belum dipercaya otomatis. Periksa foto,
              lokasi, jadwal, serta riwayat sebelum menyetujui.
            </p>
            <Table
              heads={[
                "Pegawai",
                "Bukti",
                "Waktu diklaim / diterima",
                "Status",
                "",
              ]}
            >
              {offline.data?.map((r: any) => (
                <tr key={r.id}>
                  <Cell>{r.staff?.nama}</Cell>
                  <Cell>
                    {r.detail.action}
                    <p className="text-xs">
                      {r.detail.lat}, {r.detail.lng}
                    </p>
                    {r.detail.photo && (
                      <a href={r.detail.photo} target="_blank" rel="noreferrer">
                        Lihat foto
                      </a>
                    )}
                  </Cell>
                  <Cell>
                    {time(r.detail.captured_at)}
                    <br />
                    {time(r.created_at)}
                  </Cell>
                  <Cell>
                    {r.review
                      ? r.review.action === "OFFLINE_APPROVED"
                        ? "Disetujui"
                        : "Ditolak"
                      : "Menunggu verifikasi"}
                  </Cell>
                  <Cell>
                    {!r.review && (
                      <div className="flex gap-3">
                        {["APPROVED", "REJECTED"].map((status) => (
                          <button
                            key={status}
                            onClick={() =>
                              openAction({
                                title:
                                  status === "APPROVED"
                                    ? "Verifikasi bukti offline"
                                    : "Tolak bukti offline",
                                url: `/offline-attendance/${r.id}/review`,
                                offline: true,
                                body: { status },
                              })
                            }
                          >
                            {status === "APPROVED" ? "Verifikasi" : "Tolak"}
                          </button>
                        ))}
                      </div>
                    )}
                  </Cell>
                </tr>
              ))}
            </Table>
            {!offline.data?.length && <p>Belum ada bukti offline.</p>}
          </div>
        </>
      )}
      {tab === "leave" && (
        <>
          <div className="workspace-kpi-grid">
            {[
              [
                "Menunggu keputusan",
                (leave.data?.requests || []).filter(
                  (r: any) => match(r) && r.status === "PENDING",
                ).length,
              ],
              [
                "Disetujui",
                (leave.data?.requests || []).filter(
                  (r: any) => match(r) && r.status === "APPROVED",
                ).length,
              ],
              [
                "Pengajuan cuti",
                (leave.data?.requests || []).filter(
                  (r: any) => match(r) && r.jenis === "CUTI",
                ).length,
              ],
              [
                "Pegawai tercatat",
                (leave.data?.people || []).filter(match).length,
              ],
            ].map(([name, count]) => (
              <div className="workspace-kpi" key={String(name)}>
                <span className="workspace-kpi-label">{name}</span>
                <strong className="workspace-kpi-value">{count}</strong>
                <span className="workspace-kpi-foot">Periode {year}</span>
              </div>
            ))}
          </div>
          <div
            className="workspace-tabs"
            role="tablist"
            aria-label="Tampilan cuti"
          >
            {[
              ["requests", "Pengajuan & Keputusan"],
              ["calendar", "Kalender Tim"],
              ["balances", "Saldo & Riwayat"],
            ].map(([id, name]) => (
              <button
                key={id}
                role="tab"
                aria-selected={leaveView === id}
                onClick={() => setLeaveView(id)}
              >
                {name}
              </button>
            ))}
          </div>
          {leaveView === "balances" && (
            <div style={panel}>
              <h2 className="font-bold mb-3">Saldo Cuti {year}</h2>
              <p className="text-sm mb-4">
                Saldo awal tidak diasumsikan. Tetapkan hak cuti sesuai
                kebijakan. Sakit dan izin tidak memotong saldo cuti.
              </p>
              <div className="flex flex-wrap gap-3 mb-4">
                <select
                  aria-label="Pegawai saldo"
                  style={input}
                  value={balanceStaff}
                  onChange={(e) => setBalanceStaff(e.target.value)}
                >
                  <option value="">Pilih pegawai</option>
                  {leave.data?.people.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Penambahan atau pengurangan saldo"
                  style={input}
                  type="number"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                />
                <button
                  disabled={!balanceStaff}
                  onClick={() =>
                    openAction({
                      title: "Penyesuaian saldo cuti",
                      url: "/admin/workforce/leave-balance",
                      body: { staff_id: balanceStaff, year, days },
                    })
                  }
                >
                  Catat Penyesuaian
                </button>
                <button
                  onClick={() =>
                    csv(
                      "saldo-cuti-" + year,
                      (leave.data?.people || [])
                        .filter(match)
                        .map((p: any) => ({
                          NIK: p.nik,
                          Nama: p.nama,
                          Saldo: p.balance,
                          Terpakai: p.used,
                          PengajuanMenunggu: p.pending,
                        })),
                    )
                  }
                >
                  Ekspor Saldo
                </button>
              </div>
              <Table
                heads={[
                  "Pegawai",
                  "Saldo",
                  "Terpakai",
                  "Pengajuan menunggu",
                  "",
                ]}
              >
                {leave.data?.people.filter(match).map((p: any) => (
                  <tr key={p.id}>
                    <Cell>{p.nama}</Cell>
                    <Cell>{p.balance} hari</Cell>
                    <Cell>{p.used} hari</Cell>
                    <Cell>{p.pending}</Cell>
                    <Cell>
                      <button
                        onClick={() => setSelected({ ...p, kind: "ledger" })}
                      >
                        Buku Saldo
                      </button>
                    </Cell>
                  </tr>
                ))}
              </Table>
            </div>
          )}
          {leaveView === "calendar" && (
            <div style={panel}>
              <div className="flex flex-wrap justify-between gap-3 mb-4">
                <h2 className="font-bold">Kalender Cuti Tim</h2>
                <select
                  aria-label="Bulan kalender cuti"
                  style={input}
                  value={leaveMonth}
                  onChange={(e) => setLeaveMonth(e.target.value)}
                >
                  {Array.from({ length: 12 }, (_, i) =>
                    String(i + 1).padStart(2, "0"),
                  ).map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto">
                <div className="workspace-calendar">
                  {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(
                    (d) => (
                      <div
                        key={d}
                        className="px-3 py-3 text-xs font-semibold"
                        style={{
                          background: "var(--bg-elevated)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {d}
                      </div>
                    ),
                  )}
                  {Array.from(
                    {
                      length:
                        (new Date(year, Number(leaveMonth) - 1, 1).getDay() +
                          6) %
                        7,
                    },
                    (_, i) => (
                      <div
                        key={"empty-" + i}
                        className="workspace-calendar-day"
                        style={{ opacity: 0.4 }}
                      />
                    ),
                  )}
                  {Array.from(
                    { length: new Date(year, Number(leaveMonth), 0).getDate() },
                    (_, i) =>
                      `${year}-${leaveMonth}-${String(i + 1).padStart(2, "0")}`,
                  ).map((d) => (
                    <div
                      key={d}
                      className={`workspace-calendar-day ${d === dateNow() ? "today" : ""}`}
                    >
                      <strong>{d.slice(8)}</strong>
                      {(leave.data?.requests || [])
                        .filter(
                          (l: any) =>
                            match(l) &&
                            l.status === "APPROVED" &&
                            l.tanggal_mulai.slice(0, 10) <= d &&
                            l.tanggal_selesai.slice(0, 10) >= d,
                        )
                        .map((l: any) => (
                          <button
                            key={l.id}
                            className="calendar-event"
                            style={{ color: "var(--accent)" }}
                            onClick={() => setSelected({ ...l, kind: "leave" })}
                          >
                            {l.staff.nama} · {l.jenis}
                          </button>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {leaveView === "requests" && (
            <div style={panel}>
              <div className="flex flex-wrap gap-3 justify-between mb-4">
                <h2 className="font-bold">Riwayat Pengajuan</h2>
                <button
                  onClick={() =>
                    csv(
                      "rekap-cuti-" + year,
                      (leave.data?.requests || [])
                        .filter(match)
                        .map((l: any) => ({
                          NIK: l.staff.nik,
                          Nama: l.staff.nama,
                          Jenis: l.jenis,
                          Mulai: l.tanggal_mulai.slice(0, 10),
                          Selesai: l.tanggal_selesai.slice(0, 10),
                          HariKerja: l.work_dates?.length ?? "Belum dihitung",
                          Status: labels[l.status],
                          Diputuskan: time(l.reviewed_at),
                        })),
                    )
                  }
                >
                  Ekspor Rekap
                </button>
              </div>
              <p className="text-sm mb-3">
                Urutkan periode melalui tanggal pengajuan; buka detail untuk
                melihat hari kerja dan pegawai satu area yang sedang cuti.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <select
                  className="workspace-input"
                  aria-label="Status pengajuan"
                  value={leaveStatus}
                  onChange={(e) => setLeaveStatus(e.target.value)}
                >
                  <option value="">Semua status</option>
                  {["PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((v) => (
                    <option key={v} value={v}>
                      {labels[v]}
                    </option>
                  ))}
                </select>
                <select
                  className="workspace-input"
                  aria-label="Jenis izin"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                >
                  <option value="">Semua jenis</option>
                  {["CUTI", "SAKIT", "IZIN"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>
              <Table
                heads={[
                  "Pegawai",
                  "Jenis",
                  "Periode",
                  "Hari Kerja",
                  "Status",
                  "",
                ]}
              >
                {leave.data?.requests
                  .filter(
                    (r: any) =>
                      match(r) &&
                      (!leaveStatus || r.status === leaveStatus) &&
                      (!leaveType || r.jenis === leaveType),
                  )
                  .map((l: any) => (
                    <tr key={l.id}>
                      <Cell>{l.staff.nama}</Cell>
                      <Cell>{l.jenis}</Cell>
                      <Cell>
                        {l.tanggal_mulai.slice(0, 10)} →{" "}
                        {l.tanggal_selesai.slice(0, 10)}
                      </Cell>
                      <Cell>{l.work_dates?.length ?? "—"}</Cell>
                      <Cell>
                        <Badge value={l.status} />
                      </Cell>
                      <Cell>
                        <button
                          onClick={() => setSelected({ ...l, kind: "leave" })}
                        >
                          Detail & Keputusan
                        </button>
                      </Cell>
                    </tr>
                  ))}
              </Table>
            </div>
          )}
        </>
      )}
      {tab === "archives" && (
        <div style={panel}>
          <h2 className="font-bold mb-4">Arsip Bulanan Berversi</h2>
          <div className="flex gap-4 mb-5">
            <input
              aria-label="Bulan arsip"
              type="month"
              max={new Date(Date.UTC(Number(dateNow().slice(0,4)),Number(dateNow().slice(5,7))-2,15)).toISOString().slice(0,7)}
              style={input}
              value={archiveMonth}
              onChange={(e) => setArchiveMonth(e.target.value)}
            />
            <button
              onClick={() =>
                openAction({
                  title: "Finalisasi rekap bulanan",
                  url: "/admin/workforce/archives",
                  body: { month: archiveMonth },
                })
              }
            >
              Finalisasi Bulan
            </button>
          </div>
          <Table heads={["Bulan", "Revisi", "Status", "Disimpan", "Tindakan"]}>
            {archives.data?.map((a: any) => (
              <tr key={a.id}>
                <Cell>{a.month}</Cell>
                <Cell>{a.revision}</Cell>
                <Cell>{a.status}</Cell>
                <Cell>{time(a.created_at)}</Cell>
                <Cell>
                  <button
                    onClick={async () => {
                      try {
                        const r = (
                          await api.get(`/admin/workforce/archives/${a.id}`)
                        ).data.data;
                        setArchiveRows(r.rows);
                        exportRows(r.rows);
                      } catch (e) {
                        setError("Gagal memuat arsip");
                      }
                    }}
                  >
                    Unduh Detail
                  </button>
                  {a.status === "FINAL" && (
                    <button
                      className="ml-4"
                      onClick={() =>
                        openAction({
                          title: "Buka kembali untuk revisi",
                          url: `/admin/workforce/archives/${a.id}/reopen`,
                          body: {},
                        })
                      }
                    >
                      Buka Kembali
                    </button>
                  )}
                </Cell>
              </tr>
            ))}
          </Table>
          {archiveRows && (
            <p className="mt-4">
              {archiveRows.length} baris arsip dimuat dan diekspor. Arsip
              sebelumnya tetap disimpan.
            </p>
          )}
        </div>
      )}
      {selected && (
        <WorkspaceDialog
          title={
            selected.nama || selected.staff?.nama || selected.label || "Detail"
          }
          description={
            selected.kind === "attendance"
              ? `Catatan absensi • ${selected.date} • ${selected.area_nama}`
              : selected.kind === "leave"
                ? "Tinjau pengajuan, dampak pada jadwal, dan riwayat keputusan."
                : selected.kind === "ledger"
                  ? "Riwayat pemberian hak, pemakaian, pengembalian, dan penyesuaian cuti."
                  : "Identitas perangkat dan riwayat persetujuan."
          }
          onClose={() => setSelected(null)}
        >
          <WorkforceDetails
            item={selected}
            impact={impact.data}
            history={history.data}
            onAction={openAction}
          />
        </WorkspaceDialog>
      )}
      {action && (
        <WorkspaceDialog
          compact
          title={action.title}
          description="Perubahan akan disimpan bersama alasan dan identitas admin. Periksa kembali sebelum mengonfirmasi."
          onClose={() => {
            if (!mutation.isPending) setAction(null);
          }}
          footer={
            <>
              <button
                className="workspace-button"
                disabled={mutation.isPending}
                onClick={() => setAction(null)}
              >
                Batal
              </button>
              <button
                className="workspace-button primary"
                disabled={
                  reason.trim().length <
                    (action.correction || action.offline ? 10 : 5) ||
                  mutation.isPending
                }
                onClick={() => mutation.mutate(action)}
              >
                {mutation.isPending ? "Menyimpan…" : "Konfirmasi & Simpan"}
              </button>
            </>
          }
        >
          <div className="space-y-5">
            {action.offline && (
              <label className="workspace-input-label">
                Tanggal mulai shift (WIB)
                <input
                  type="date"
                  value={offlineDate}
                  onChange={(e) => setOfflineDate(e.target.value)}
                />
              </label>
            )}
            {action.correction && (
              <>
                <label className="workspace-input-label">
                  Status hasil koreksi
                  <select
                    value={correctStatus}
                    onChange={(e) => setCorrectStatus(e.target.value)}
                  >
                    {[
                      "HADIR",
                      "TIDAK_HADIR",
                      "TIDAK_LENGKAP",
                      "CUTI",
                      "SAKIT",
                      "IZIN",
                    ].map((v) => (
                      <option key={v} value={v}>
                        {labels[v]}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="workspace-input-label">
                    Masuk (WIB)
                    <input
                      type="datetime-local"
                      value={correctIn}
                      onChange={(e) => setCorrectIn(e.target.value)}
                    />
                  </label>
                  <label className="workspace-input-label">
                    Keluar (WIB)
                    <input
                      type="datetime-local"
                      value={correctOut}
                      onChange={(e) => setCorrectOut(e.target.value)}
                    />
                  </label>
                </div>
                <p className="workspace-notice">
                  Koreksi hadir membutuhkan waktu masuk dan keluar. Data asli
                  tidak dihapus.
                </p>
              </>
            )}
            <label className="workspace-input-label">
              Alasan / catatan wajib
              <textarea
                rows={5}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Jelaskan alasan keputusan agar dapat ditelusuri kembali…"
              />
            </label>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Minimal {action.correction || action.offline ? 10 : 5} karakter.
            </p>
            {error && (
              <p
                role="alert"
                className="workspace-notice"
                style={{ color: "var(--error)" }}
              >
                {error}
              </p>
            )}
          </div>
        </WorkspaceDialog>
      )}
    </div>
  );
}
