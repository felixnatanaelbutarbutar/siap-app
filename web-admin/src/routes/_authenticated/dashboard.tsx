import { DashboardAnalytics } from "../../components/DashboardAnalytics";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { api, SOCKET_URL } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { format } from "date-fns";
import {
  ShieldCheck,
  Sparkles,
  Wrench,
  AlertTriangle,
  Activity,
  Radio,
} from "lucide-react";
import {
  ModernMap,
  type MapCircleItem,
  type MapMarkerItem,
} from "../../components/ModernMap";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const ROLE_COLORS: Record<string, string> = {
  SATPAM: "#1ed760",
  CS: "#539df5",
  UTILITY: "#ffa42b",
  INACTIVE: "#6d6d6d",
};

// Dark card container
const DarkCard = ({ children, className = "", style = {} }: any) => (
  <div
    className={`rounded-xl overflow-hidden ${className}`}
    style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border)",
      ...style,
    }}
  >
    {children}
  </div>
);

function DashboardPage() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const [liveLocations, setLiveLocations] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  const { data: areaList } = useQuery({
    queryKey: ["area-tugas"],
    queryFn: async () => {
      const { data } = await api.get("/admin/area-tugas");
      return data.data || [];
    },
  });

  const { data: initialLocations } = useQuery({
    queryKey: ["dashboard-live-tracking"],
    queryFn: async () => {
      const { data } = await api.get("/admin/dashboard/live-tracking");
      return data.data || [];
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (initialLocations) {
      setLiveLocations(
        initialLocations.map((loc: any) => ({
          ...loc,
          lastUpdate: loc.updated_at
            ? new Date(loc.updated_at).getTime()
            : Date.now(),
        })),
      );
    }
  }, [initialLocations]);

  const { data: recentActivities } = useQuery({
    queryKey: ["dashboard-activities"],
    queryFn: async () => {
      const { data } = await api.get("/admin/dashboard/activities");
      return data.data || [];
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (recentActivities) setActivities(recentActivities);
  }, [recentActivities]);

  useEffect(() => {
    if (!token) return;

    const s = io(SOCKET_URL, { auth: { token } });

    s.on("location:snapshot", (snapshot: any[]) => {
      if (!Array.isArray(snapshot)) return;
      setLiveLocations(
        snapshot.map((loc) => ({
          ...loc,
          lastUpdate: loc.updated_at
            ? new Date(loc.updated_at).getTime()
            : Date.now(),
        })),
      );
    });

    s.on("location:updated", (data: any) => {
      if (!data?.staff_id) return;
      setLiveLocations((prev) => {
        const idx = prev.findIndex((l) => l.staff_id === data.staff_id);
        const updated = { ...data, lastUpdate: Date.now() };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...updated };
          return next;
        }
        return [...prev, updated];
      });
    });

    s.on("absensi:new", (data: any) => {
      const act = {
        id: `ws-abs-${Date.now()}`,
        nama: data.nama,
        role: data.divisi,
        waktu: data.waktu || new Date().toISOString(),
        aksi: `Melakukan absensi ${String(data.jenis || "").replace("_", " ")}`,
      };
      setActivities((prev) => [act, ...prev].slice(0, 10));
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["workforce", "analytics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-live-tracking"] });
    });

    s.on("laporan:new", (data: any) => {
      const act = {
        id: `ws-lap-${Date.now()}`,
        nama: data.nama,
        role: data.divisi,
        waktu: new Date().toISOString(),
        aksi: `Mengirim laporan: ${data.kategori || "Baru"}`,
      };
      setActivities((prev) => [act, ...prev].slice(0, 10));
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["workforce", "analytics"] });
    });

    s.on("serah_terima:new", (data: any) => {
      const act = {
        id: `ws-st-${Date.now()}`,
        nama: data.nama,
        role: data.divisi,
        waktu: new Date().toISOString(),
        aksi: `Memulai serah terima ${data.jenis || ""}`,
      };
      setActivities((prev) => [act, ...prev].slice(0, 10));
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["workforce", "analytics"] });
    });

    return () => {
      s.disconnect();
    };
  }, [token, queryClient]);

  const mapData = useMemo(() => {
    const validLive = liveLocations.filter(
      (loc) =>
        Number.isFinite(Number(loc.lat)) && Number.isFinite(Number(loc.lng)),
    );
    const validAreas = (areaList || []).filter(
      (a: any) =>
        Number.isFinite(Number(a.lat)) && Number.isFinite(Number(a.lng)),
    );

    const center: [number, number] =
      validLive.length > 0
        ? [Number(validLive[0].lat), Number(validLive[0].lng)]
        : validAreas.length > 0
          ? [Number(validAreas[0].lat), Number(validAreas[0].lng)]
          : [-6.2088, 106.8456];

    const circles: MapCircleItem[] = validAreas.map((area: any) => ({
      id: String(area.id),
      lat: Number(area.lat),
      lng: Number(area.lng),
      radiusMeters: Math.min(
        Number(area.radius_meter ?? area.radius ?? 200),
        2500,
      ),
      label: area.nama,
      color: "#1ed760",
    }));

    const markers: MapMarkerItem[] = [
      ...validAreas.map((area: any) => ({
        id: `area-${area.id}`,
        lat: Number(area.lat),
        lng: Number(area.lng),
        title: area.nama,
        subtitle: `Area Tugas • Radius ${area.radius_meter ?? area.radius}m`,
        color: "#1ed760",
        variant: "area" as const,
      })),
      ...validLive.map((loc) => {
        const isInactive = Date.now() - loc.lastUpdate > 300000;
        const color = isInactive
          ? ROLE_COLORS.INACTIVE
          : ROLE_COLORS[loc.role] || ROLE_COLORS.INACTIVE;
        return {
          id: `staff-${loc.staff_id || loc.id}`,
          lat: Number(loc.lat),
          lng: Number(loc.lng),
          title: loc.nama,
          subtitle: `${loc.role} • ${loc.status_absensi || "Aktif"}`,
          color,
          variant: "staff" as const,
          pulse: !isInactive,
        };
      }),
    ];

    return {
      center,
      circles,
      markers,
      hasDynamicCenter: validLive.length > 0 || validAreas.length > 0,
    };
  }, [liveLocations, areaList]);

  return (
    <div className="workspace-page space-y-6 animate-fadeInUp">
      <DashboardAnalytics />

      {/* Map & Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <DarkCard className="xl:col-span-2">
          <div
            className="flex items-center gap-3 px-5 py-3.5"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: "var(--accent)",
                boxShadow: "0 0 8px rgba(30,215,96,0.6)",
              }}
            />
            <span
              className="text-sm font-bold"
              style={{ color: "var(--text-base)" }}
            >
              Live Tracking
            </span>
            <span
              className="ml-auto text-xs"
              style={{ color: "var(--text-dim)" }}
            >
              {liveLocations.length} aktif
            </span>
          </div>
          <div className="h-[380px] relative z-0">
            {typeof window !== "undefined" && (
              <ModernMap
                center={mapData.center}
                zoom={15.2}
                pitch={35}
                defaultStyle="standar"
                circles={mapData.circles}
                markers={mapData.markers}
                followCenter={mapData.hasDynamicCenter}
              />
            )}
            {liveLocations.length === 0 && (
              <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-md"
                  style={{
                    background: "rgba(24, 24, 24, 0.88)",
                    color: "#e5e5e5",
                    border: "1px solid rgba(255,255,255,0.14)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <Radio className="w-3.5 h-3.5" style={{ color: "#1ed760" }} />
                  Belum ada staff live tracking
                </div>
              </div>
            )}
          </div>
        </DarkCard>

        <DarkCard className="flex flex-col" style={{ height: "440px" }}>
          <div
            className="flex items-center gap-3 px-5 py-3.5"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <Activity className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <span
              className="text-sm font-bold"
              style={{ color: "var(--text-base)" }}
            >
              Aktivitas Terbaru
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Activity
                  className="w-8 h-8 mb-2"
                  style={{ color: "#2a2a2a" }}
                />
                <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                  Belum ada aktivitas
                </p>
              </div>
            ) : (
              activities.map((act: any, i: number) => (
                <div
                  key={act.id || i}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors"
                  style={{ cursor: "default" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-input)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                    style={{
                      background: "var(--bg-input)",
                      color: "var(--accent)",
                      border: "1px solid #2a2a2a",
                    }}
                  >
                    {act.nama?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--text-base)" }}
                    >
                      {act.nama}
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {act.aksi}
                    </p>
                  </div>
                  <span
                    className="text-[11px] flex-shrink-0"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {format(new Date(act.waktu), "HH:mm")}
                  </span>
                </div>
              ))
            )}
          </div>
        </DarkCard>
      </div>
    </div>
  );
}
