import { createFileRoute, Link } from "@tanstack/react-router";
import { AbsensiPage } from "./absensi";
export const Route = createFileRoute("/_authenticated/absensi_/$role")({
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
    <AbsensiPage key={role} division={section[0]} label={section[1]} />
  ) : (
    <div>
      Bagian tidak ditemukan. <Link to="/absensi">Kembali</Link>
    </div>
  );
}
