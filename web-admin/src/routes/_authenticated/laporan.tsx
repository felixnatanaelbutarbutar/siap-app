import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { WorkspaceDialog } from "../../components/WorkspaceDialog";
import { useNotificationStore } from "../../store/notificationStore";
import { api } from "../../services/api";
import { Eye, CheckCircle2, XCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/laporan")({
  beforeLoad: () => {
    throw redirect({ to: "/laporan/$role", params: { role: "satpam" } });
  },
});

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
const inputStyle = {
  background: "var(--bg-input)",
  color: "var(--text-base)",
  border: "1px solid var(--border-bright)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  outline: "none",
};

export function LaporanPage({
  division,
  label,
  patrol = true,
}: {
  division: string;
  label: string;
  patrol?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"HARIAN" | "PER_JAM">("HARIAN");
  const queryClient = useQueryClient();

  const decrementPending = useNotificationStore((s) => s.decrementPending);

  const [dateHarian, setDateHarian] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [statusHarian, setStatusHarian] = useState("SEMUA");
  const [selectedLaporan, setSelectedLaporan] = useState<any | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState("APPROVED");
  const [reviewKomentar, setReviewKomentar] = useState("");

  const { data: laporanHarian } = useQuery({
    queryKey: ["laporan-harian", division, dateHarian, statusHarian],
    queryFn: async () => {
      const params: any = { tanggal: dateHarian, divisi: division };
      if (statusHarian !== "SEMUA") params.status = statusHarian;
      const res = await api.get("/admin/laporan", { params });
      let data = res.data.data || [];
      return data.map((l: any) => ({
        id: l.id,
        waktu: format(new Date(l.created_at), "HH:mm"),
        nama: l.staff?.nama || l.pembuat?.nama || "-",
        divisi: l.divisi || l.staff?.divisi || "-",
        kategori: l.kategori || "-",
        judul: l.judul || l.kategori,
        status: l.status,
        deskripsi: l.deskripsi,
        foto_urls: l.foto_urls || [],
        komentar_admin: l.komentar_admin,
        reviewer: l.reviewer,
        reviewed_by: l.reviewed_by,
        reviewed_at: l.reviewed_at,
      }));
    },
  });

  const { data: laporanPerJamList, isLoading: loadingPerJam } = useQuery({
    queryKey: ["admin-laporan-perjam", division, dateHarian],
    enabled: patrol && activeTab === "PER_JAM",
    queryFn: async () => {
      const res = await api.get("/admin/laporan-perjam", {
        params: { tanggal: dateHarian, divisi: division },
      });
      return res.data.data || [];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      status: string;
      komentar: string;
    }) => {
      await api.patch(`/admin/laporan/${payload.id}/review`, {
        status: payload.status,
        komentar: payload.komentar,
      });
    },
    onSuccess: () => {
      decrementPending();
      setIsSheetOpen(false);
      setSelectedLaporan(null);
      queryClient.invalidateQueries({ queryKey: ["laporan-harian"] });
    },
  });

  const handleOpenSheet = (laporan: any) => {
    setSelectedLaporan(laporan);
    setReviewStatus("APPROVED");
    setReviewKomentar("");
    setIsSheetOpen(true);
  };

  const submitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLaporan)
      reviewMutation.mutate({
        id: selectedLaporan.id,
        status: reviewStatus,
        komentar: reviewKomentar,
      });
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const m: Record<string, { bg: string; text: string }> = {
      SUBMITTED: { bg: "rgba(255,164,43,0.12)", text: "var(--warning)" },
      PENDING: { bg: "rgba(255,164,43,0.12)", text: "var(--warning)" },
      APPROVED: { bg: "rgba(30,215,96,0.12)", text: "var(--accent)" },
      REJECTED: { bg: "rgba(243,114,127,0.12)", text: "var(--error)" },
    };
    const c = m[status] || {
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

  const timelineHours = Array.from({ length: 24 }).map((_, i) => i);

  const groupedPerJam = useMemo(() => {
    if (!Array.isArray(laporanPerJamList)) return [];
    const map = new Map<
      string,
      { staff: any; items: any[]; hours: Set<number> }
    >();
    laporanPerJamList.forEach((item: any) => {
      const staffId = item.staff_id;
      if (!map.has(staffId)) {
        map.set(staffId, {
          staff: item.staff || { nama: "Staff Satpam", nik: "-" },
          items: [],
          hours: new Set<number>(),
        });
      }
      const entry = map.get(staffId)!;
      entry.items.push(item);
      entry.hours.add(Number(item.jam));
    });
    return Array.from(map.values());
  }, [laporanPerJamList]);

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-base)" }}
        >
          Laporan {label}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Review dan kelola laporan {label}
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-full w-fit"
        style={{ background: "var(--bg-input)" }}
      >
        {(patrol
          ? (["HARIAN", "PER_JAM"] as const)
          : (["HARIAN"] as const)
        ).map((tab) => (
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
            {tab === "HARIAN" ? "Laporan Harian" : "Laporan Terjadwal"}
          </button>
        ))}
      </div>

      {activeTab === "HARIAN" && (
        <div className="space-y-4">
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
            <div>
              <label
                className="block text-xs font-bold uppercase mb-2"
                style={{ color: "var(--text-dim)", letterSpacing: "1px" }}
              >
                Status
              </label>
              <select
                value={statusHarian}
                onChange={(e) => setStatusHarian(e.target.value)}
                style={inputStyle}
              >
                <option value="SEMUA">Semua</option>
                <option value="SUBMITTED">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <table className="w-full">
              <thead>
                <tr>
                  {[
                    "Waktu",
                    "Pelapor",
                    "Kategori",
                    "Judul",
                    "Status",
                    "Ditinjau Oleh",
                    "",
                  ].map((h) => (
                    <th key={h} style={thStyle}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {laporanHarian?.map((log: any) => (
                  <tr
                    key={log.id}
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
                        fontFamily: "monospace",
                        color: "var(--accent)",
                      }}
                    >
                      {log.waktu}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        color: "var(--text-base)",
                        fontWeight: 600,
                      }}
                    >
                      {log.nama}
                    </td>
                    <td style={tdStyle}>{log.kategori}</td>
                    <td
                      style={{
                        ...tdStyle,
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {log.judul}
                    </td>
                    <td style={tdStyle}>
                      <StatusBadge status={log.status} />
                    </td>
                    <td style={tdStyle}>
                      {log.status !== "SUBMITTED" && log.status !== "DRAFT" ? (
                        <div>
                          <div
                            className="font-medium text-xs"
                            style={{ color: "var(--text-base)" }}
                          >
                            {log.reviewer?.nama || "Administrator SIAP"}
                          </div>
                          {log.reviewed_at && (
                            <div
                              className="text-[11px] mt-0.5"
                              style={{ color: "var(--text-dim)" }}
                            >
                              {format(
                                new Date(log.reviewed_at),
                                "dd MMM yyyy, HH:mm",
                                { locale: id },
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-dim)" }}>-</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <button
                        onClick={() => handleOpenSheet(log)}
                        aria-label="Lihat detail laporan"
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
                {(!laporanHarian || laporanHarian.length === 0) && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        ...tdStyle,
                        textAlign: "center",
                        padding: "40px 20px",
                        color: "var(--text-dim)",
                      }}
                    >
                      Tidak ada laporan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "PER_JAM" && (
        <div className="space-y-4">
          <div className="workspace-card p-5 flex flex-wrap gap-4 items-end">
            <label>
              Tanggal laporan
              <input
                type="date"
                value={dateHarian}
                onChange={(e) => setDateHarian(e.target.value)}
                className="workspace-input block mt-2"
              />
            </label>
            <p className="workspace-description">
              Laporan terjadwal {label} yang sudah dikirim. Jadwal dan
              penyimpanan dikelola melalui Pengaturan Laporan.
            </p>
          </div>
          {loadingPerJam ? (
            <p>Memuat laporan…</p>
          ) : groupedPerJam.length ? (
            groupedPerJam.map((group) => (
              <section
                key={group.staff.id || group.staff.nik}
                className="workspace-card p-5"
              >
                <h2 className="font-bold text-lg">{group.staff.nama}</h2>
                <p className="workspace-description">
                  {group.items.length} laporan terkirim
                </p>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                  {group.items.map((item: any) => (
                    <article
                      key={item.id}
                      className="rounded-xl border p-4 space-y-3"
                    >
                      <div className="flex justify-between">
                        <strong>
                          {String(item.jam).padStart(2, "0")}:
                          {String(item.menit || 0).padStart(2, "0")} WIB
                        </strong>
                        <span className="text-xs">
                          {item.status_keamanan === "AMAN"
                            ? "NORMAL"
                            : item.status_keamanan.replaceAll("_", " ")}
                        </span>
                      </div>
                      {item.foto_url && (
                        <a
                          href={item.foto_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={item.foto_url}
                            alt="Bukti laporan terjadwal"
                            className="w-full h-44 object-contain rounded-lg"
                          />
                        </a>
                      )}
                      <p className="workspace-description whitespace-pre-wrap">
                        {item.catatan || "Tidak ada catatan tambahan."}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="workspace-card p-8 text-center">
              Belum ada laporan terjadwal pada tanggal ini.
            </div>
          )}
        </div>
      )}

      {/* Review Sheet */}
      {isSheetOpen && (
        <WorkspaceDialog
          title="Review Laporan"
          description="Periksa pelapor, kronologi, dan bukti sebelum mengambil keputusan."
          onClose={() => setIsSheetOpen(false)}
        >
          {selectedLaporan && (
            <div className="space-y-5">
              <div
                className="p-4 rounded-xl space-y-3"
                style={{ background: "var(--bg-input)" }}
              >
                <div>
                  <p
                    className="text-xs font-bold uppercase mb-1"
                    style={{ color: "var(--text-dim)", letterSpacing: "1px" }}
                  >
                    Pelapor
                  </p>
                  <p
                    className="font-bold"
                    style={{ color: "var(--text-base)" }}
                  >
                    {selectedLaporan.nama}
                  </p>
                </div>
                <div>
                  <p
                    className="text-xs font-bold uppercase mb-1"
                    style={{ color: "var(--text-dim)", letterSpacing: "1px" }}
                  >
                    Kategori / Judul
                  </p>
                  <p style={{ color: "var(--text-secondary)" }}>
                    {selectedLaporan.kategori} — {selectedLaporan.judul}
                  </p>
                </div>
              </div>

              {selectedLaporan.deskripsi && (
                <div>
                  <p
                    className="text-xs font-bold uppercase mb-2"
                    style={{ color: "var(--text-dim)", letterSpacing: "1px" }}
                  >
                    Deskripsi
                  </p>
                  <p
                    className="text-sm p-4 rounded-xl"
                    style={{
                      color: "var(--text-secondary)",
                      background: "var(--bg-input)",
                      lineHeight: "1.6",
                    }}
                  >
                    {selectedLaporan.deskripsi}
                  </p>
                </div>
              )}

              {selectedLaporan.foto_urls?.length > 0 && (
                <div>
                  <p
                    className="text-xs font-bold uppercase mb-2"
                    style={{ color: "var(--text-dim)", letterSpacing: "1px" }}
                  >
                    Lampiran Foto
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedLaporan.foto_urls.map((url: string, i: number) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl overflow-hidden flex items-center justify-center"
                        style={{
                          background: "var(--bg-input)",
                          aspectRatio: "4/3",
                        }}
                      >
                        <img
                          src={url}
                          alt={`Foto ${i + 1}`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedLaporan.status === "SUBMITTED" ||
              selectedLaporan.status === "PENDING" ? (
                <form
                  onSubmit={submitReview}
                  className="space-y-4 pt-5"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <p
                    className="text-xs font-bold uppercase"
                    style={{ color: "var(--text-dim)", letterSpacing: "1px" }}
                  >
                    Keputusan
                  </p>
                  <div className="flex gap-3">
                    {[
                      {
                        val: "APPROVED",
                        label: "Setujui",
                        icon: CheckCircle2,
                        active: {
                          bg: "rgba(30,215,96,0.15)",
                          border: "var(--accent)",
                          text: "var(--accent)",
                        },
                        inactive: {
                          bg: "transparent",
                          border: "var(--border-bright)",
                          text: "var(--text-secondary)",
                        },
                      },
                      {
                        val: "REJECTED",
                        label: "Tolak",
                        icon: XCircle,
                        active: {
                          bg: "rgba(243,114,127,0.15)",
                          border: "var(--error)",
                          text: "var(--error)",
                        },
                        inactive: {
                          bg: "transparent",
                          border: "var(--border-bright)",
                          text: "var(--text-secondary)",
                        },
                      },
                    ].map(({ val, label, icon: Icon, active, inactive }) => {
                      const isActive = reviewStatus === val;
                      const c = isActive ? active : inactive;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setReviewStatus(val)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
                          style={{
                            background: c.bg,
                            border: `2px solid ${c.border}`,
                            color: c.text,
                          }}
                        >
                          <Icon className="w-4 h-4" /> {label}
                        </button>
                      );
                    })}
                  </div>
                  <textarea
                    value={reviewKomentar}
                    onChange={(e) => setReviewKomentar(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl p-3 text-sm resize-none outline-none"
                    style={{
                      background: "var(--bg-input)",
                      border: "1px solid var(--border-bright)",
                      color: "var(--text-base)",
                    }}
                    placeholder="Catatan (opsional)..."
                  />
                  <button
                    type="submit"
                    disabled={reviewMutation.isPending}
                    className="w-full font-bold py-3.5 rounded-full uppercase transition-all disabled:opacity-50"
                    style={{
                      background: "var(--accent)",
                      color: "var(--accent-text)",
                      letterSpacing: "1.4px",
                      fontSize: 14,
                    }}
                  >
                    {reviewMutation.isPending
                      ? "Memproses..."
                      : "Simpan Keputusan"}
                  </button>
                </form>
              ) : (
                <div
                  className="pt-5"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <div
                    className="p-4 rounded-xl space-y-3"
                    style={{ background: "var(--bg-input)" }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: "var(--text-dim)" }}
                      >
                        Keputusan Peninjau
                      </span>
                      <StatusBadge status={selectedLaporan.status} />
                    </div>
                    <div
                      className="text-xs pt-2 border-t"
                      style={{
                        borderColor: "var(--border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <p>
                        <span
                          className="font-semibold"
                          style={{ color: "var(--text-base)" }}
                        >
                          {selectedLaporan.status === "APPROVED"
                            ? "Disetujui oleh:"
                            : "Ditolak oleh:"}
                        </span>{" "}
                        <span
                          className="font-bold"
                          style={{
                            color:
                              selectedLaporan.status === "APPROVED"
                                ? "var(--accent)"
                                : "var(--error)",
                          }}
                        >
                          {selectedLaporan.reviewer?.nama ||
                            "Administrator SIAP"}
                        </span>
                        {selectedLaporan.reviewer?.nik
                          ? ` (${selectedLaporan.reviewer.nik})`
                          : ""}
                      </p>
                      {selectedLaporan.reviewed_at && (
                        <p
                          className="mt-1 text-[11px]"
                          style={{ color: "var(--text-dim)" }}
                        >
                          Waktu Keputusan:{" "}
                          {format(
                            new Date(selectedLaporan.reviewed_at),
                            "dd MMMM yyyy, HH:mm",
                            { locale: id },
                          )}
                        </p>
                      )}
                    </div>
                    {selectedLaporan.komentar_admin && (
                      <div
                        className="p-3 rounded-lg text-xs"
                        style={{
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <p
                          className="font-semibold mb-1 text-[11px]"
                          style={{ color: "var(--text-dim)" }}
                        >
                          Catatan / Komentar:
                        </p>
                        <p style={{ color: "var(--text-base)" }}>
                          {selectedLaporan.komentar_admin}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </WorkspaceDialog>
      )}
    </div>
  );
}
