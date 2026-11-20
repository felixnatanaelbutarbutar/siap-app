import { WorkspaceDialog } from "../../components/WorkspaceDialog";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api, SOCKET_URL } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { Download, Eye, X, MapPin, ExternalLink } from "lucide-react";
import { ModernMap } from "../../components/ModernMap";

export const Route = createFileRoute("/_authenticated/absensi")({
  beforeLoad: () => {
    throw redirect({ to: "/absensi/$role", params: { role: "satpam" } });
  },
});

const inputStyle = {
  background: "var(--bg-input)",
  color: "var(--text-base)",
  border: "1px solid var(--border-bright)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  outline: "none",
};

export function AbsensiPage({
  division = "SEMUA",
  label = "Semua bagian",
}: {
  division?: string;
  label?: string;
}) {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"HARIAN" | "BULANAN">("HARIAN");
  const [dateHarian, setDateHarian] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [divisiHarian, setDivisiHarian] = useState(division);
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [divisiBulanan, setDivisiBulanan] = useState(division);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const queryClient = useQueryClient();

  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token } });
    socket.on("absensi:new", () =>
      queryClient.invalidateQueries({ queryKey: ["absensi-harian"] }),
    );
    return () => {
      socket.disconnect();
    };
  }, [token, queryClient]);

  useEffect(() => setPage(1), [dateHarian, divisiHarian]);
  const {
    data: daily,
    isPending: loadingDaily,
    isError: errorDaily,
  } = useQuery({
    queryKey: ["absensi-harian", dateHarian, divisiHarian, page],
    queryFn: async () => {
      const params: any = { tanggal: dateHarian, page };
      if (divisiHarian !== "SEMUA") params.divisi = divisiHarian;
      const res = await api.get("/admin/absensi", { params });
      const rawData = res.data.data;
      const grouped: Record<string, any> = rawData.reduce(
        (acc: any, curr: any) => {
          if (!acc[curr.staff_id]) {
            acc[curr.staff_id] = {
              id: curr.staff_id,
              nama: curr.staff.nama,
              divisi: curr.staff.divisi,
              masuk: "-",
              istirahat: "-",
              keluar: "-",
              masukMs: null,
              keluarMs: null,
              istirahatMulaiMs: null,
              istirahatSelesaiMs: null,
              total: "-",
              status: "HADIR",
              lat: curr.lat,
              lng: curr.lng,
              foto_masuk: null,
              foto_keluar: null,
            };
          }
          const dt = new Date(curr.waktu_server);
          const time = format(dt, "HH:mm");
          if (curr.jenis === "MASUK") {
            acc[curr.staff_id].masuk = time;
            acc[curr.staff_id].masukMs = dt.getTime();
            acc[curr.staff_id].foto_masuk = curr.foto_url;
          }
          if (curr.jenis === "MULAI_ISTIRAHAT") {
            acc[curr.staff_id].istirahat = time;
            acc[curr.staff_id].istirahatMulaiMs = dt.getTime();
          }
          if (curr.jenis === "SELESAI_ISTIRAHAT") {
            acc[curr.staff_id].istirahatSelesaiMs = dt.getTime();
          }
          if (curr.jenis === "KELUAR") {
            acc[curr.staff_id].keluar = time;
            acc[curr.staff_id].keluarMs = dt.getTime();
            acc[curr.staff_id].foto_keluar = curr.foto_url;
          }
          if (acc[curr.staff_id].masukMs && acc[curr.staff_id].keluarMs) {
            let totalMin = Math.round(
              (acc[curr.staff_id].keluarMs - acc[curr.staff_id].masukMs) /
                60000,
            );
            if (
              acc[curr.staff_id].istirahatMulaiMs &&
              acc[curr.staff_id].istirahatSelesaiMs
            ) {
              const restMin = Math.round(
                (acc[curr.staff_id].istirahatSelesaiMs -
                  acc[curr.staff_id].istirahatMulaiMs) /
                  60000,
              );
              if (restMin > 0) totalMin -= restMin;
            }
            if (totalMin < 0) totalMin = 0;
            const hrs = Math.floor(totalMin / 60);
            const mins = totalMin % 60;
            acc[curr.staff_id].total =
              mins > 0 ? `${hrs}j ${mins}m` : `${hrs} Jam`;
          }
          return acc;
        },
        {},
      );
      const finalData = Object.values(grouped);
      return { rows: finalData, pagination: res.data.pagination };
    },
  });

  const logs = daily?.rows;
  const { data: stats } = useQuery({
    queryKey: ["absensi-bulanan", bulan, tahun, divisiBulanan],
    queryFn: async () => {
      const params: any = { bulan, tahun };
      if (divisiBulanan !== "SEMUA") params.divisi = divisiBulanan;
      const res = await api.get("/admin/statistik/kehadiran", { params });
      const tableData = res.data.data || [];
      const chartData = res.data.chart || [];
      return { tableData, chartData };
    },
  });

  const handleExportCSV = async () => {
    try {
      const params: any = { bulan, tahun };
      if (divisiBulanan !== "SEMUA") params.divisi = divisiBulanan;
      const res = await api.get("/admin/export/absensi", {
        params,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `rekap_absensi_${bulan}_${tahun}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Gagal export CSV");
    }
  };

  const DivisiBadge = ({ divisi }: { divisi: string }) => {
    const colorMap: Record<string, { bg: string; text: string }> = {
      KEAMANAN: { bg: "rgba(30,215,96,0.12)", text: "var(--accent)" },
      SATPAM: { bg: "rgba(30,215,96,0.12)", text: "var(--accent)" },
      CLEANING_SERVICE: { bg: "rgba(83,157,245,0.12)", text: "var(--info)" },
      CS: { bg: "rgba(83,157,245,0.12)", text: "var(--info)" },
      UTILITY: { bg: "rgba(255,164,43,0.12)", text: "var(--warning)" },
    };
    const c = colorMap[divisi] || {
      bg: "var(--bg-input)",
      text: "var(--text-secondary)",
    };
    return (
      <span
        className="text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: c.bg, color: c.text }}
      >
        {divisi}
      </span>
    );
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const colorMap: Record<string, { bg: string; text: string }> = {
      HADIR: { bg: "rgba(30,215,96,0.12)", text: "var(--accent)" },
      TERLAMBAT: { bg: "rgba(255,164,43,0.12)", text: "var(--warning)" },
      ALFA: { bg: "rgba(243,114,127,0.12)", text: "var(--error)" },
    };
    const c = colorMap[status] || {
      bg: "var(--bg-input)",
      text: "var(--text-secondary)",
    };
    return (
      <span
        className="text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: c.bg, color: c.text }}
      >
        {status}
      </span>
    );
  };

  const thStyle = {
    padding: "12px 20px",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text-dim)",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    textAlign: "left" as const,
    borderBottom: "1px solid var(--border)",
  };
  const tdStyle = {
    padding: "12px 20px",
    fontSize: 13,
    color: "var(--text-secondary)",
    borderBottom: "1px solid var(--bg-hover)",
  };

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-base)" }}
        >
          Absensi - {label}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Kelola data kehadiran staff
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-full w-fit"
        style={{ background: "var(--bg-input)" }}
      >
        {(["HARIAN", "BULANAN"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-5 py-2 rounded-full text-sm font-bold uppercase transition-all"
            style={{
              background: activeTab === tab ? "var(--accent)" : "transparent",
              color:
                activeTab === tab
                  ? "var(--accent-text)"
                  : "var(--text-secondary)",
              letterSpacing: "1px",
            }}
          >
            {tab === "HARIAN" ? "Log Harian" : "Rekap Bulanan"}
          </button>
        ))}
      </div>

      {activeTab === "HARIAN" && (
        <div className="space-y-4">
          {/* Filters */}
          <div
            className="flex flex-wrap gap-4 items-end p-5 rounded-xl"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div>
              <label
                className="block text-xs font-bold uppercase mb-2"
                style={{ color: "var(--text-dim)", letterSpacing: "1px" }}
              >
                Tanggal
              </label>
              <input
                type="date"
                value={dateHarian}
                onChange={(e) => setDateHarian(e.target.value)}
                style={inputStyle}
              />
            </div>
            {division === "SEMUA" && (
              <div>
                <label
                  className="block text-xs font-bold uppercase mb-2"
                  style={{ color: "var(--text-dim)", letterSpacing: "1px" }}
                >
                  Divisi
                </label>
                <select
                  disabled={division !== "SEMUA"}
                  value={divisiHarian}
                  onChange={(e) => setDivisiHarian(e.target.value)}
                  style={inputStyle}
                >
                  <option value="SEMUA">Semua Divisi</option>
                  <option value="KEAMANAN">Keamanan</option>
                  <option value="CLEANING_SERVICE">Cleaning Service</option>
                  <option value="UTILITY">Utility</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              className="workspace-button"
              disabled={page <= 1 || loadingDaily}
              onClick={() => setPage((p) => p - 1)}
            >
              Sebelumnya
            </button>
            <span>
              Halaman {page} / {daily?.pagination?.totalPages || 1} ·{" "}
              {daily?.pagination?.total || 0} pegawai
            </span>
            <button
              className="workspace-button"
              disabled={
                loadingDaily || page >= (daily?.pagination?.totalPages || 1)
              }
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
            </button>
          </div>
          {errorDaily && (
            <p role="alert">Gagal memuat absensi. Silakan muat ulang.</p>
          )}
          {/* Table */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr>
                    {[
                      "Nama",
                      "Divisi",
                      "Masuk",
                      "Istirahat",
                      "Keluar",
                      "Total",
                      "Status",
                      "",
                    ].map((h) => (
                      <th key={h} style={thStyle}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs?.map((log: any) => (
                    <tr
                      key={log.id}
                      className="transition-colors"
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--bg-hover)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <td
                        style={{
                          ...tdStyle,
                          color: "var(--text-base)",
                          fontWeight: 600,
                        }}
                      >
                        {log.nama}
                      </td>
                      <td style={tdStyle}>
                        <DivisiBadge divisi={log.divisi} />
                      </td>
                      <td style={{ ...tdStyle, fontFamily: "monospace" }}>
                        {log.masuk}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: "monospace" }}>
                        {log.istirahat}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: "monospace" }}>
                        {log.keluar}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          color: "var(--text-base)",
                          fontWeight: 600,
                        }}
                      >
                        {log.total}
                      </td>
                      <td style={tdStyle}>
                        <StatusBadge status={log.status} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <button
                          onClick={() => setSelectedRow(log)}
                          style={{
                            color: "var(--accent)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 4,
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!logs || logs.length === 0) && (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          ...tdStyle,
                          textAlign: "center",
                          padding: "40px 20px",
                          color: "var(--text-dim)",
                        }}
                      >
                        {loadingDaily
                          ? "Memuat absensi…"
                          : errorDaily
                            ? "Data belum tersedia karena koneksi gagal."
                            : "Tidak ada data absensi untuk tanggal ini"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "BULANAN" && (
        <div className="space-y-4">
          <div
            className="flex flex-wrap gap-4 items-end justify-between p-5 rounded-xl"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex flex-wrap gap-4">
              {[
                {
                  label: "Bulan",
                  val: bulan,
                  onChange: (v: number) => setBulan(v),
                  options: Array.from({ length: 12 }).map((_, i) => ({
                    val: i + 1,
                    label: format(new Date(2000, i), "MMMM", { locale: id }),
                  })),
                },
                {
                  label: "Tahun",
                  val: tahun,
                  onChange: (v: number) => setTahun(v),
                  options: [
                    { val: 2026, label: "2026" },
                    { val: 2025, label: "2025" },
                  ],
                },
              ].map(({ label, val, onChange, options }) => (
                <div key={label}>
                  <label
                    className="block text-xs font-bold uppercase mb-2"
                    style={{ color: "var(--text-dim)", letterSpacing: "1px" }}
                  >
                    {label}
                  </label>
                  <select
                    value={val}
                    onChange={(e) => onChange(Number(e.target.value))}
                    style={inputStyle}
                  >
                    {options.map((o) => (
                      <option key={o.val} value={o.val}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {division === "SEMUA" && (
                <div>
                  <label
                    className="block text-xs font-bold uppercase mb-2"
                    style={{ color: "var(--text-dim)", letterSpacing: "1px" }}
                  >
                    Divisi
                  </label>
                  <select
                    disabled={division !== "SEMUA"}
                    value={divisiBulanan}
                    onChange={(e) => setDivisiBulanan(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="SEMUA">Semua Divisi</option>
                    <option value="KEAMANAN">Keamanan</option>
                    <option value="CLEANING_SERVICE">Cleaning Service</option>
                    <option value="UTILITY">Utility</option>
                  </select>
                </div>
              )}
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 font-bold uppercase rounded-full px-5 py-2.5 transition-all"
              style={{
                background: "var(--accent)",
                color: "var(--accent-text)",
                fontSize: 13,
                letterSpacing: "1px",
              }}
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[550px]">
                  <thead>
                    <tr>
                      {["Nama", "Hadir", "Jam Kerja", "Rata-rata"].map((h) => (
                        <th key={h} style={thStyle}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.tableData?.map((row: any) => (
                      <tr
                        key={row.staff_id || row.id}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "var(--bg-hover)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <td
                          style={{
                            ...tdStyle,
                            color: "var(--text-base)",
                            fontWeight: 600,
                          }}
                        >
                          {row.nama}
                        </td>
                        <td style={tdStyle}>{row.total_hadir || row.hadir}</td>
                        <td style={tdStyle}>
                          {row.total_jam_kerja || row.jamKerja}h
                        </td>
                        <td style={tdStyle}>
                          {row.rata_jam_per_hari || row.rataRata}h/hari
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div
              className="p-5 rounded-xl"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
            >
              <h3
                className="text-sm font-bold mb-5"
                style={{ color: "var(--text-base)" }}
              >
                Tren Kehadiran
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats?.chartData || []}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="tanggal"
                    tick={{ fontSize: 10, fill: "var(--text-dim)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--text-dim)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-input)",
                      border: "1px solid var(--border-bright)",
                      borderRadius: 8,
                      color: "var(--text-base)",
                    }}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar
                    dataKey="SATPAM"
                    fill="var(--accent)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar dataKey="CS" fill="var(--info)" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="UTILITY"
                    fill="var(--warning)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRow && (
        <WorkspaceDialog
          title="Bukti Absensi"
          description="Informasi lengkap, bukti, dan tindakan terkait."
          onClose={() => setSelectedRow(null)}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                label: `Foto Masuk (${selectedRow.masuk})`,
                foto: selectedRow.foto_masuk,
              },
              {
                label: `Foto Keluar (${selectedRow.keluar})`,
                foto: selectedRow.foto_keluar,
              },
            ].map(({ label, foto }) => (
              <div key={label}>
                <p
                  className="text-xs font-bold uppercase mb-2"
                  style={{ color: "var(--text-dim)", letterSpacing: "1px" }}
                >
                  {label}
                </p>
                <div
                  className="w-full rounded-xl flex items-center justify-center overflow-hidden"
                  style={{ background: "var(--bg-input)", aspectRatio: "3/4" }}
                >
                  {foto ? (
                    <img
                      src={foto}
                      alt={label}
                      className="w-full h-full object-contain max-h-[440px]"
                    />
                  ) : (
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-dim)" }}
                    >
                      Tidak ada foto
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div
            className="px-6 py-4 space-y-3"
            style={{
              borderTop: "1px solid var(--border)",
              background: "var(--bg-hover)",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin
                  className="w-4 h-4"
                  style={{ color: "var(--accent)" }}
                />
                <span
                  className="text-sm font-mono"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {Number.isFinite(Number(selectedRow.lat)) &&
                  Number.isFinite(Number(selectedRow.lng))
                    ? `${Number(selectedRow.lat).toFixed(6)}, ${Number(selectedRow.lng).toFixed(6)}`
                    : "Koordinat tidak tersedia"}
                </span>
              </div>
              {Number.isFinite(Number(selectedRow.lat)) &&
                Number.isFinite(Number(selectedRow.lng)) && (
                  <a
                    href={`https://www.google.com/maps?q=${selectedRow.lat},${selectedRow.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                    style={{ color: "var(--accent)" }}
                  >
                    Buka Google Maps <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
            </div>
            {Number.isFinite(Number(selectedRow.lat)) &&
              Number.isFinite(Number(selectedRow.lng)) && (
                <div
                  className="h-44 w-full rounded-lg overflow-hidden relative"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <ModernMap
                    center={[Number(selectedRow.lat), Number(selectedRow.lng)]}
                    zoom={16}
                    pitch={25}
                    defaultStyle="standar"
                    followCenter
                    showControls={false}
                    markers={[
                      {
                        id: String(selectedRow.id || "absen-loc"),
                        lat: Number(selectedRow.lat),
                        lng: Number(selectedRow.lng),
                        title: selectedRow.nama,
                        subtitle: "Lokasi Absensi",
                        color: "#1ed760",
                        variant: "pin",
                      },
                    ]}
                  />
                </div>
              )}
          </div>
        </WorkspaceDialog>
      )}
    </div>
  );
}
