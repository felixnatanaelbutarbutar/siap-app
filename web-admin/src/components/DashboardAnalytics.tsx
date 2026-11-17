import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCheck,
  Clock3,
  ClipboardCheck,
  RefreshCw,
  ShieldCheck,
  Users,
  WifiOff,
  ArrowRight,
  FileText,
  Info,
} from "lucide-react";
import { api } from "../services/api";

const COLORS = {
  green: "#29bc82",
  blue: "#6da5ed",
  amber: "#e7ad51",
  red: "#e27b87",
  gray: "#7e9187",
  purple: "#ab93df",
};
const tip = {
  background: "var(--bg-elevated)",
  color: "var(--text-base)",
  border: "1px solid var(--border-bright)",
  borderRadius: 12,
  fontSize: 12,
  padding: "12px 16px",
};
const axis = { fontSize: 10, fill: "var(--text-secondary)" };
const labels: Record<string, string> = {
  HADIR: "Hadir",
  BELUM_ABSEN: "Belum absen",
  TIDAK_HADIR: "Tidak hadir",
  TIDAK_LENGKAP: "Tidak lengkap",
  SHIFT_AKTIF: "Shift aktif",
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  CANCELLED: "Dibatalkan",
};
function Empty({
  text = "Belum ada data pada periode ini.",
}: {
  text?: string;
}) {
  return (
    <div className="workspace-empty">
      <CalendarDays size={30} />
      {text}
    </div>
  );
}
function ChartCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="workspace-card">
      <div className="workspace-card-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="workspace-card-body">
        {children}
        {footer}
      </div>
    </section>
  );
}
function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="workspace-legend">
      {items.map(([name, color]) => (
        <span key={name}>
          <i style={{ background: color }} />
          {name}
        </span>
      ))}
    </div>
  );
}
function recapLink(tab = "attendance", status = "", from = "", to = "") {
  return `/rekap?${new URLSearchParams({ tab, ...(status ? { status } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) })}`;
}

export function DashboardAnalytics() {
  const [period, setPeriod] = useState(14);
  const [division, setDivision] = useState("ALL");
  const q = useQuery({
    queryKey: ["workforce", "analytics", period, division],
    queryFn: async () =>
      (
        await api.get("/admin/analytics", {
          params: { days: period, division },
          timeout: 30000,
        })
      ).data.data,
    refetchInterval: 60000,
  });
  const data = q.data,
    c = data?.counts;
  const totals = (data?.trend || []).reduce(
    (a: any, d: any) => ({
      scheduled: a.scheduled + d.scheduled,
      present: a.present + d.attended,
      late: a.late + d.late,
      minutes: a.minutes + d.late_minutes,
    }),
    { scheduled: 0, present: 0, late: 0, minutes: 0 },
  );
  const distribution = c
    ? [
        { name: "Sudah hadir", value: c.present, color: COLORS.green },
        { name: "Belum absen", value: c.waiting, color: COLORS.amber },
        { name: "Tidak hadir", value: c.absent, color: COLORS.red },
        { name: "Cuti / izin / sakit", value: c.leave, color: COLORS.blue },
        { name: "Belum waktunya", value: c.upcoming, color: COLORS.gray },
      ]
    : [];
  const divisionLabel =
    division === "ALL"
      ? "Semua divisi"
      : division === "KEAMANAN"
        ? "Keamanan"
        : division === "UTILITY"
          ? "Utility"
          : "CS";
  return (
    <div className="space-y-6">
      <div className="workspace-heading">
        <div>
          <p className="workspace-eyebrow">SIAP • Pusat Operasional</p>
          <h1>Gambaran hari ini.</h1>
          <p className="workspace-description">
            Pantau kesiapan tim, temukan pengecualian, dan selesaikan pekerjaan
            yang menunggu keputusan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {data
              ? "Diperbarui " +
                new Date(data.generated_at).toLocaleTimeString("id-ID", {
                  timeZone: "Asia/Jakarta",
                  hour: "2-digit",
                  minute: "2-digit",
                }) +
                " WIB"
              : "Menghubungkan data…"}
          </span>
          <button
            aria-label="Perbarui dashboard"
            className="workspace-icon-button"
            disabled={q.isFetching}
            onClick={() => q.refetch()}
          >
            <RefreshCw
              size={17}
              className={q.isFetching ? "animate-spin" : ""}
            />
          </button>
        </div>
      </div>
      <div className="workspace-toolbar justify-between">
        <div className="flex items-center gap-3 text-sm">
          <CalendarDays size={18} style={{ color: "var(--accent)" }} />
          <span className="font-semibold">
            {new Date().toLocaleDateString("id-ID", {
              timeZone: "Asia/Jakarta",
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="workspace-input"
            aria-label="Divisi dashboard"
            value={division}
            onChange={(e) => setDivision(e.target.value)}
          >
            <option value="ALL">Semua divisi</option>
            <option value="KEAMANAN">Keamanan</option>
            <option value="CUSTOMER_SERVICE">CS</option>
            <option value="UTILITY">Utility</option>
          </select>
          <select
            className="workspace-input"
            aria-label="Periode grafik"
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
          >
            <option value={7}>Grafik 7 hari</option>
            <option value={14}>Grafik 14 hari</option>
            <option value={30}>Grafik 30 hari</option>
          </select>
        </div>
      </div>
      {q.error && (
        <div role="alert" className="workspace-notice">
          Dashboard belum dapat dimuat.{" "}
          <button className="workspace-button" onClick={() => q.refetch()}>
            Coba lagi
          </button>
        </div>
      )}
      <div className="workspace-kpi-grid">
        {[
          {
            title: "Kehadiran hari ini",
            value: c ? `${c.present} / ${c.due}` : "—",
            foot: c
              ? `${c.rate ?? "—"}% dari shift yang sudah dimulai, di luar cuti`
              : "Menyiapkan data jadwal",
            icon: Users,
            color: COLORS.green,
            accent: true,
            href: recapLink("attendance", "", data?.today, data?.today),
          },
          {
            title: "Perlu cek kehadiran",
            value: c ? c.waiting + c.absent : "—",
            foot: c
              ? `${c.waiting} belum absen · ${c.absent} tidak hadir`
              : "Berdasarkan jadwal, bukan jumlah akun",
            icon: Clock3,
            color: COLORS.amber,
            href: recapLink(
              "attendance",
              "BELUM_ABSEN",
              data?.today,
              data?.today,
            ),
          },
          {
            title: "Terlambat hari ini",
            value: c ? c.late : "—",
            foot: "Melewati toleransi pada jadwal shift",
            icon: ArrowDownRight,
            color: COLORS.red,
            href: recapLink(
              "attendance",
              "TERLAMBAT",
              data?.today,
              data?.today,
            ),
          },
          {
            title: "Cuti & izin hari ini",
            value: c ? c.leave : "—",
            foot: "Disetujui • tidak dihitung sebagai mangkir",
            icon: CalendarDays,
            color: COLORS.blue,
            href: recapLink("leave"),
          },
        ].map((k) => (
          <a
            key={k.title}
            href={k.href}
            className={`workspace-kpi ${k.accent ? "accent" : ""}`}
          >
            <div className="workspace-kpi-label">
              {k.title}
              <k.icon size={18} style={{ color: k.color }} />
            </div>
            <strong className="workspace-kpi-value">{k.value}</strong>
            <p className="workspace-kpi-foot">{k.foot}</p>
          </a>
        ))}
      </div>
      <div className="workspace-chart-grid">
        <ChartCard
          title="Kehadiran dibanding jadwal"
          description={`${period} hari terakhir · ${divisionLabel} · satu catatan per shift`}
          footer={
            <Legend
              items={[
                ["Shift terjadwal", COLORS.gray],
                ["Sudah hadir", COLORS.green],
                ["Cuti / izin", COLORS.blue],
              ]}
            />
          }
        >
          <div className="flex items-baseline gap-3 mb-4">
            <strong className="text-3xl font-bold tracking-tight">
              {q.isLoading ? "—" : totals.present}
            </strong>
            <span
              className="text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              kehadiran dari {totals.scheduled} shift terjadwal
            </span>
          </div>
          <div className="workspace-chart">
            {totals.scheduled ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.trend}
                  margin={{ top: 8, right: 10, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="siapAttendanceFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={COLORS.green}
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="100%"
                        stopColor={COLORS.green}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--border)"
                    strokeDasharray="3 5"
                  />
                  <XAxis
                    dataKey="label"
                    tick={axis}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={22}
                  />
                  <YAxis
                    tick={axis}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={tip}
                    labelStyle={{ color: "var(--text-base)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="scheduled"
                    name="Terjadwal"
                    stroke={COLORS.gray}
                    fill="transparent"
                    strokeDasharray="5 5"
                  />
                  <Area
                    type="monotone"
                    dataKey="attended"
                    name="Sudah hadir"
                    stroke={COLORS.green}
                    fill="url(#siapAttendanceFill)"
                    strokeWidth={3}
                  />
                  <Area
                    type="monotone"
                    dataKey="leave"
                    name="Cuti / izin"
                    stroke={COLORS.blue}
                    fill="transparent"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty
                text={
                  q.isLoading
                    ? "Menghitung jadwal…"
                    : "Belum ada jadwal kerja pada periode ini."
                }
              />
            )}
          </div>
        </ChartCard>
        <ChartCard
          title="Komposisi status hari ini"
          description="Shift belum dimulai dipisahkan dari ketidakhadiran."
        >
          {c?.scheduled ? (
            <>
              <div className="relative h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribution.filter((d) => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={74}
                      outerRadius={99}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {distribution
                        .filter((d) => d.value > 0)
                        .map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={tip} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <strong className="text-3xl font-bold">{c.scheduled}</strong>
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    shift terjadwal
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {distribution.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <i
                      className="w-2 h-2 rounded-full"
                      style={{ background: d.color }}
                    />
                    <span style={{ color: "var(--text-secondary)" }}>
                      {d.name}
                    </span>
                    <strong className="ml-auto">{d.value}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty text="Belum ada shift terjadwal hari ini." />
          )}
        </ChartCard>
      </div>
      <div className="workspace-chart-grid">
        <ChartCard
          title="Kesiapan tim per divisi"
          description="Shift yang sudah dimulai hari ini, di luar cuti yang disetujui."
          footer={
            <Legend
              items={[
                ["Sudah hadir", COLORS.green],
                ["Belum hadir", COLORS.amber],
              ]}
            />
          }
        >
          <div className="workspace-chart">
            {c?.due ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.coverage}
                  layout="vertical"
                  barSize={24}
                  margin={{ left: 0, right: 20, bottom: 5, top: 10 }}
                >
                  <CartesianGrid
                    horizontal={false}
                    stroke="var(--border)"
                    strokeDasharray="3 5"
                  />
                  <XAxis
                    type="number"
                    tick={axis}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={axis}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={tip}
                    cursor={{ fill: "var(--bg-hover)" }}
                  />
                  <Bar
                    dataKey="attended"
                    name="Sudah hadir"
                    stackId="coverage"
                    fill={COLORS.green}
                    radius={[5, 0, 0, 5]}
                  />
                  <Bar
                    dataKey="waiting"
                    name="Belum hadir"
                    stackId="coverage"
                    fill={COLORS.amber}
                    radius={[0, 5, 5, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty text="Belum ada shift yang mulai atau seluruh jadwal sedang cuti." />
            )}
          </div>
        </ChartCard>
        <ChartCard
          title="Tren keterlambatan"
          description="Jumlah kejadian dan rata-rata menit terlambat pada hari tersebut."
          footer={
            <Legend
              items={[
                ["Kejadian terlambat", COLORS.amber],
                ["Rata-rata menit", COLORS.red],
              ]}
            />
          }
        >
          <div className="workspace-chart">
            {totals.scheduled ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={data.trend}
                  margin={{ top: 20, left: -22, right: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--border)"
                    strokeDasharray="3 5"
                  />
                  <XAxis
                    dataKey="label"
                    tick={axis}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={30}
                  />
                  <YAxis
                    yAxisId="count"
                    tick={axis}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="minutes"
                    orientation="right"
                    tick={axis}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={tip} />
                  <Bar
                    yAxisId="count"
                    dataKey="late"
                    name="Kejadian"
                    fill={COLORS.amber}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={22}
                  />
                  <Line
                    yAxisId="minutes"
                    type="monotone"
                    dataKey="late_average"
                    name="Rata-rata menit"
                    stroke={COLORS.red}
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </div>
        </ChartCard>
      </div>
      <section className="workspace-card">
        <div className="workspace-card-head">
          <div>
            <h2>Antrean yang perlu keputusan</h2>
            <p>
              Semua pengajuan yang masih menunggu. Klik untuk membuka modul
              terkait.
            </p>
          </div>
          <ClipboardCheck size={20} style={{ color: "var(--accent)" }} />
        </div>
        <div className="workspace-card-body workspace-queue">
          {[
            {
              label: "Persetujuan perangkat",
              value: data?.pending.devices,
              icon: ShieldCheck,
              href: recapLink("devices"),
            },
            {
              label: "Verifikasi absensi offline",
              value: data?.pending.offline,
              icon: WifiOff,
              href: recapLink("devices"),
            },
            {
              label: "Pengajuan izin & cuti",
              value: data?.pending.leave,
              icon: CalendarDays,
              href: recapLink("leave"),
            },
            {
              label: "Laporan menunggu",
              value: data?.pending.reports,
              icon: FileText,
              href: "/laporan",
            },
          ].map((item) => (
            <a key={item.label} href={item.href}>
              <item.icon size={20} style={{ color: "var(--accent)" }} />
              <div className="flex-1">
                <span
                  className="block mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {item.label}
                </span>
                <strong>{item.value ?? "—"}</strong>
              </div>
              <ArrowUpRight size={17} />
            </a>
          ))}
        </div>
      </section>
      <div className="workspace-chart-grid">
        <section className="workspace-card">
          <div className="workspace-card-head">
            <div>
              <h2>Pengecualian terbaru</h2>
              <p>Belum absen, tidak lengkap, tidak hadir, dan keterlambatan.</p>
            </div>
            <a
              href={recapLink("attendance", "", data?.from, data?.today)}
              className="workspace-button"
            >
              Lihat rekap <ArrowRight size={14} />
            </a>
          </div>
          <div className="workspace-card-body">
            <div
              className="workspace-table-scroll"
              style={{ marginTop: 0, maxHeight: 365 }}
            >
              <table className="workspace-table">
                <thead>
                  <tr>
                    <th>Pegawai</th>
                    <th>Shift</th>
                    <th>Perlu perhatian</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data?.exceptions.map((r: any) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.nama}</strong>
                        <p
                          className="text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {r.area}
                        </p>
                      </td>
                      <td className="whitespace-nowrap">{r.date}</td>
                      <td>
                        <span
                          style={{
                            color:
                              r.status === "TIDAK_HADIR"
                                ? COLORS.red
                                : COLORS.amber,
                          }}
                        >
                          {labels[r.status] || r.status}
                        </span>
                        {r.terlambat && (
                          <p className="text-xs">Terlambat {r.menit} menit</p>
                        )}
                      </td>
                      <td>
                        <a
                          aria-label={`Lihat rekap ${r.nama}`}
                          href={recapLink("attendance", "", r.date, r.date)}
                        >
                          <ArrowUpRight size={17} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data?.exceptions.length && (
              <Empty text="Tidak ada pengecualian pada periode ini." />
            )}
          </div>
        </section>
        <ChartCard
          title="Pengajuan izin & cuti"
          description={`Pengajuan yang dibuat selama ${period} hari terakhir. Jumlah permohonan, bukan jumlah hari cuti.`}
        >
          {data?.leave_types.some((d: any) => d.value) ? (
            <>
              <div className="h-[190px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.leave_types}
                    barSize={35}
                    margin={{ left: -24, right: 10 }}
                  >
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="name"
                      tick={axis}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={axis}
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip contentStyle={tip} />
                    <Bar dataKey="value" name="Pengajuan" radius={[6, 6, 0, 0]}>
                      {data.leave_types.map((d: any, i: number) => (
                        <Cell
                          key={d.name}
                          fill={[COLORS.blue, COLORS.purple, COLORS.amber][i]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-5">
                {data.leave_status.map((s: any) => (
                  <div key={s.name} className="flex justify-between text-xs">
                    <span style={{ color: "var(--text-secondary)" }}>
                      {labels[s.name]}
                    </span>
                    <strong>{s.value}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty text="Belum ada pengajuan pada periode ini." />
          )}
        </ChartCard>
      </div>
      {!!data?.legacy_baseline && (
        <div className="workspace-notice flex items-start gap-3">
          <Info size={17} className="shrink-0 mt-0.5" />
          <span>
            Data historis menggunakan jadwal baseline saat pembaruan. Periksa
            detail sebelum memfinalisasi periode lama. Angka grafik adalah
            jumlah shift, bukan jumlah pegawai unik.
          </span>
        </div>
      )}
    </div>
  );
}
