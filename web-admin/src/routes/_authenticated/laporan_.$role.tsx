import { createFileRoute, Link } from "@tanstack/react-router";
import { LaporanPage } from "./laporan";
export const Route = createFileRoute("/_authenticated/laporan_/$role")({
  component: Section,
});
function Section() {
  const { role } = Route.useParams();
  const section = (
    {
      satpam: ["KEAMANAN", "Satpam"],
      cs: ["CLEANING_SERVICE", "Cleaning Service"],
      utility: ["UTILITY", "Utility"],
    } as Record<string, string[]>
  )[role];
  return section ? (
    <LaporanPage
      key={role}
      division={section[0]}
      label={section[1]}
      patrol
    />
  ) : (
    <div>
      Bagian tidak ditemukan. <Link to="/laporan">Kembali ke laporan</Link>
    </div>
  );
}
