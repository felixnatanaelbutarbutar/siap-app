import { useFocusEffect } from "@react-navigation/native";
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Image,
} from "react-native";
import { Text, TextInput, Button, ActivityIndicator } from "react-native-paper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { CameraView } from "../../components/CameraView";
import {
  cancelLaporanReminderForHour,
  setupLaporan6JamReminders,
} from "../../services/laporanReminder";
import { useAuthStore } from "../../store/auth.store";

const STATUS_KEAMANAN = ["AMAN", "ADA_TEMUAN", "PERLU_PERIKSA"];

export const LaporanPerJamScreen = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string | null>(
    null,
  );
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [statusKeamanan, setStatusKeamanan] = useState(STATUS_KEAMANAN[0]);
  const [catatan, setCatatan] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const {
    data: schedule,
    isLoading: loadingAbsen,
    isError: scheduleError,
    refetch,
  } = useQuery({
    queryKey: ["laporanPerJam", "schedule", user?.id],
    queryFn: async () => (await api.get("/laporan/perjam/jadwal")).data.data,
    refetchInterval: 30000,
  });
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  const loadingLaporan = false;
  // Mutasi Kirim Laporan Terjadwal
  const mutation = useMutation({
    mutationFn: async () => {
      if (selectedHour === null || !fotoUrl)
        throw new Error("Data tidak lengkap");
      const formData = new FormData();
      formData.append("jam", selectedHour.toString());
      formData.append("checkpoint", selectedCheckpoint || "");
      formData.append("status_keamanan", statusKeamanan);
      formData.append("catatan", catatan);

      const filename = fotoUrl.split("/").pop() || "photo_perjam.jpg";
      const finalUri = fotoUrl.startsWith("file://")
        ? fotoUrl
        : `file://${fotoUrl}`;
      formData.append("foto", {
        uri: finalUri,
        name: filename,
        type: "image/jpeg",
      } as any);

      formData.append("lat", (coords?.lat ?? 0).toString());
      formData.append("lng", (coords?.lng ?? 0).toString());

      const res = await api.post("/laporan/perjam", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      if (selectedHour !== null) {
        void cancelLaporanReminderForHour(selectedHour);
      }
      Alert.alert("Sukses", "Laporan terjadwal berhasil dikirim.");
      queryClient.invalidateQueries({ queryKey: ["laporanPerJam"] });
      setModalVisible(false);
      resetForm();
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Gagal mengirim laporan terjadwal.",
      );
    },
  });

  const resetForm = () => {
    setStatusKeamanan(STATUS_KEAMANAN[0]);
    setCatatan("");
    setFotoUrl(null);
    setCoords(null);
    setSelectedHour(null);
    setSelectedCheckpoint(null);
  };

  useEffect(() => {
    void setupLaporan6JamReminders();
  }, []);
  const handleBukaForm = (slot: any) => {
    setSelectedHour(slot.hour);
    setSelectedCheckpoint(slot.at);
    setModalVisible(true);
  };

  const handlePhotoTaken = (uri: string, lat: number, lng: number) => {
    setFotoUrl(uri);
    setCoords({ lat, lng });
    setIsCameraOpen(false);
  };

  if (loadingAbsen || loadingLaporan) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#161d16" />
      </View>
    );
  }

  const shiftAktif = !!schedule?.active;
  const slots = schedule?.slots || [];
  return (
    <View style={styles.container}>
      <View
        style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 }}
      >
        <Text
          style={{
            color: "#087F5B",
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 1.5,
          }}
        >
          JADWAL LAPORAN • {user?.role}
        </Text>
        <Text
          style={{
            fontSize: 26,
            fontWeight: "700",
            color: "#103E32",
            marginTop: 8,
          }}
        >
          Laporan terjadwal
        </Text>
        <Text style={{ color: "#53695F", marginTop: 6 }}>
          {slots.filter((s: any) => s.report).length} dari {slots.length}{" "}
          laporan selesai
        </Text>
      </View>
      <Button
        onPress={() => refetch()}
        style={{ alignSelf: "flex-end", marginRight: 16 }}
      >
        Perbarui jadwal
      </Button>
      <ScrollView contentContainerStyle={styles.timelineContent}>
        <View
          style={{
            backgroundColor: "#E5F1EA",
            padding: 16,
            borderRadius: 16,
            marginBottom: 20,
          }}
        >
          <Text style={{ color: "#215B44", lineHeight: 21 }}>
            Jadwal dari admin sesuai shift Anda. Pengingat H-5 menit, seluruh
            jam dalam WIB.
          </Text>
          {schedule?.shift && (
            <Text style={{ marginTop: 8, fontWeight: "700", color: "#215B44" }}>
              Shift {schedule.shift.date} ·{" "}
              {new Date(Date.parse(schedule.shift.start_at) + 7 * 3600000)
                .toISOString()
                .slice(11, 16)}
              –
              {new Date(Date.parse(schedule.shift.end_at) + 7 * 3600000)
                .toISOString()
                .slice(11, 16)}
            </Text>
          )}
        </View>
        {scheduleError && (
          <Text>Jadwal gagal dimuat. Periksa koneksi dan coba kembali.</Text>
        )}
        {!scheduleError && !slots.length && (
          <Text>
            {schedule?.enabled === false
              ? "Admin belum mengaktifkan jadwal laporan untuk role Anda."
              : "Tidak ada waktu laporan yang sesuai dengan shift saat ini."}
          </Text>
        )}
        {!!slots.length && !shiftAktif && (
          <Text>
            Silakan absen masuk. Pengiriman laporan hanya tersedia selama shift
            aktif.
          </Text>
        )}
        {slots.map((slot: any) => {
          const hour = slot.hour;
          const lapor = slot.report;

          let circleColor = "#dce5d9"; // Default Abu-abu
          let statusText = "Menunggu waktu laporan";
          let canTap = false;

          if (lapor) {
            circleColor = "#1eaa52"; // Hijau
            statusText =
              lapor.status_keamanan === "AMAN"
                ? "Selesai · kondisi normal"
                : "Selesai · " +
                  lapor.status_keamanan.replace(/_/g, " ").toLowerCase();
          } else if (shiftAktif && Date.now() >= Date.parse(slot.at)) {
            circleColor = "#f1c40f"; // Kuning
            statusText = "Waktunya mengirim laporan";
            canTap = true;
          }

          return (
            <TouchableOpacity
              key={slot.at}
              style={styles.timelineRow}
              disabled={!canTap}
              onPress={() => handleBukaForm(slot)}
            >
              <View style={styles.timeBox}>
                <Text style={styles.timeText}>{slot.label}</Text>
                <Text style={{ fontSize: 10, color: "#53695F", marginTop: 4 }}>
                  {slot.date.slice(8, 10)}/{slot.date.slice(5, 7)}
                </Text>
              </View>
              <View style={[styles.circle, { backgroundColor: circleColor }]} />
              <View style={styles.statusBox}>
                <Text style={styles.statusText}>{statusText}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Modal Form */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            style={{ maxHeight: "90%" }}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.modalTitle}>
              LAPORAN PUKUL{" "}
              {slots.find((s: any) => s.at === selectedCheckpoint)?.label} WIB
            </Text>

            <Text style={styles.label}>KONDISI AREA / PEKERJAAN</Text>
            <View style={styles.statusGrid}>
              {STATUS_KEAMANAN.map((s) => (
                <TouchableOpacity
                  key={s}
                  activeOpacity={0.8}
                  style={[
                    styles.statusItem,
                    statusKeamanan === s && styles.statusItemActive,
                  ]}
                  onPress={() => setStatusKeamanan(s)}
                >
                  <Text
                    style={[
                      styles.statusItemText,
                      statusKeamanan === s && styles.statusItemTextActive,
                    ]}
                  >
                    {s === "AMAN"
                      ? "NORMAL / BAIK"
                      : s === "ADA_TEMUAN"
                        ? "ADA TEMUAN"
                        : "PERLU DIPERIKSA"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>FOTO BUKTI (WAJIB)</Text>
            {fotoUrl ? (
              <TouchableOpacity onPress={() => setIsCameraOpen(true)}>
                <Image source={{ uri: fotoUrl }} style={styles.fotoPreview} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.addFotoBtn}
                onPress={() => setIsCameraOpen(true)}
              >
                <Text style={styles.addFotoText}>+ AMBIL FOTO</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.label}>CATATAN</Text>
            <TextInput
              mode="flat"
              value={catatan}
              onChangeText={setCatatan}
              style={styles.input}
              underlineColor="#dce5d9"
              activeUnderlineColor="#006e2f"
            />

            <View style={styles.actionRow}>
              <Button
                mode="outlined"
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
                style={[styles.btn, { borderColor: "#087F5B" }]}
                labelStyle={{ color: "#087F5B" }}
              >
                BATAL
              </Button>
              <Button
                mode="contained"
                onPress={() => mutation.mutate()}
                loading={mutation.isPending}
                disabled={!fotoUrl || mutation.isPending}
                style={[styles.btn, { backgroundColor: "#087F5B" }]}
              >
                KIRIM
              </Button>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal Kamera */}
      <Modal
        visible={isCameraOpen}
        animationType="slide"
        onRequestClose={() => setIsCameraOpen(false)}
      >
        <CameraView
          jenis={null}
          onClose={() => setIsCameraOpen(false)}
          onPhotoTaken={handlePhotoTaken}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F7F4",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 16,
    color: "#161d16",
  },
  timelineContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    flexGrow: 1,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DDE8E1",
    minHeight: 90,
  },
  timeBox: {
    width: 52,
  },
  timeText: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#161d16",
  },
  circle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginHorizontal: 12,
  },
  statusBox: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    color: "#3d4a3d",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(22,29,22,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#F3F7F4",
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#161d16",
  },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#3d4a3d",
    marginTop: 16,
    marginBottom: 8,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#e8f0e4",
    borderWidth: 1,
    borderColor: "#bccbb9",
  },
  statusItemActive: {
    backgroundColor: "#087F5B",
    borderColor: "#087F5B",
  },
  statusItemText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#3d4a3d",
  },
  statusItemTextActive: {
    color: "#ffffff",
  },
  addFotoBtn: {
    height: 100,
    borderRadius: 12,
    backgroundColor: "#e8f0e4",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bccbb9",
    borderStyle: "dashed",
  },
  addFotoText: {
    fontWeight: "bold",
    color: "#087F5B",
  },
  fotoPreview: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    backgroundColor: "#dce5d9",
  },
  input: {
    backgroundColor: "#e8f0e4",
  },
  actionRow: {
    flexDirection: "row",
    marginTop: 24,
    gap: 12,
  },
  btn: {
    flex: 1,
    borderRadius: 12,
  },
});
