import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Switch,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { connectNotifications } from "../../lib/socket";
import { useAuth } from "../../auth/AuthContext";

interface MeResponse {
  state: "needs_request" | "pending" | "verified";
  request?: { id: string; status: string };
  profile?: any;
}

interface RegForm {
  name: string; phone: string; address: string; purpose: string;
}

export default function DeliveryDashboardScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery<MeResponse>({
    queryKey: ["delivery-me"],
    queryFn: () => api.get("/api/delivery/me") as any,
    enabled: !!user,
  });

  // Real-time verification updates
  useEffect(() => {
    let socket: any;
    (async () => {
      socket = await connectNotifications();
      socket.on("verification:status_update", () =>
        qc.invalidateQueries({ queryKey: ["delivery-me"] })
      );
    })();
    return () => { socket?.off("verification:status_update"); };
  }, [qc]);

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;
  }

  if (!data || data.state === "needs_request") {
    return <RegisterForm onSuccess={() => qc.invalidateQueries({ queryKey: ["delivery-me"] })} />;
  }

  if (data.state === "pending") {
    const inProgress = data.request?.status === "IN_PROGRESS";
    return (
      <View style={styles.center}>
        <Text style={styles.pendingIcon}>{inProgress ? "🔄" : "⏳"}</Text>
        <Text style={styles.pendingTitle}>
          {inProgress ? "Agent is on the way" : "Verification pending"}
        </Text>
        <Text style={styles.pendingSub}>
          {inProgress
            ? "Your agent will verify your details shortly."
            : "We've notified the agent for your area. You'll be updated here."}
        </Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => refetch()}>
          <Text style={styles.refreshText}>Refresh status</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Verified
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.verifiedBanner}>
        <Text style={styles.verifiedIcon}>✅</Text>
        <View>
          <Text style={styles.verifiedTitle}>You're verified!</Text>
          <Text style={styles.verifiedSub}>Go to Orders tab to see your active jobs.</Text>
        </View>
      </View>

      {data.profile && (
        <View style={styles.profileCard}>
          <Text style={styles.cardTitle}>Your Profile</Text>
          <InfoRow label="Name" value={data.profile.name} />
          <InfoRow label="Phone" value={data.profile.phone} />
          <InfoRow label="Address" value={data.profile.address} />
          {data.profile.upiVpa && <InfoRow label="UPI ID" value={data.profile.upiVpa} />}
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState<RegForm>({ name: "", phone: "", address: "", purpose: "" });
  const set = (k: keyof RegForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = useMutation({
    mutationFn: () =>
      api.post("/api/delivery/register-request", {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        locationLat: 0,
        locationLng: 0,
        purpose: form.purpose.trim() || null,
      }) as any,
    onSuccess: () => {
      Alert.alert("Submitted!", "An agent will verify you shortly.");
      onSuccess();
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Submission failed."),
  });

  const canSubmit = form.name.trim().length >= 1 && form.phone.trim().length >= 7 && form.address.trim().length >= 3;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Join as delivery partner</Text>
      <Text style={styles.pageSub}>We'll send your details to an agent for verification.</Text>

      {[
        { label: "Full name", key: "name" as keyof RegForm, keyboardType: "default" as const },
        { label: "Phone number", key: "phone" as keyof RegForm, keyboardType: "phone-pad" as const },
        { label: "Your address", key: "address" as keyof RegForm, keyboardType: "default" as const },
        { label: "Why do you want to join? (optional)", key: "purpose" as keyof RegForm, keyboardType: "default" as const },
      ].map(({ label, key, keyboardType }) => (
        <View key={key} style={styles.fieldWrap}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={[styles.input, key === "purpose" && styles.textarea]}
            value={form[key]}
            onChangeText={set(key)}
            keyboardType={keyboardType}
            autoCapitalize={key === "phone" ? "none" : "words"}
            multiline={key === "purpose"}
            numberOfLines={key === "purpose" ? 3 : 1}
            placeholderTextColor="#9ca3af"
            placeholder={label}
          />
        </View>
      ))}

      <TouchableOpacity
        style={[styles.submitBtn, (!canSubmit || submit.isPending) && styles.btnDisabled]}
        onPress={() => submit.mutate()}
        disabled={!canSubmit || submit.isPending}
      >
        {submit.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Submit for verification →</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  pendingIcon: { fontSize: 52, marginBottom: 16 },
  pendingTitle: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 10, textAlign: "center" },
  pendingSub: { fontSize: 14, color: BRAND_MUTED, textAlign: "center", lineHeight: 22 },
  refreshBtn: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: BRAND_PRIMARY },
  refreshText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  verifiedBanner: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#dcfce7", borderRadius: 16, padding: 18, marginBottom: 20,
  },
  verifiedIcon: { fontSize: 36 },
  verifiedTitle: { fontSize: 18, fontWeight: "800", color: "#15803d" },
  verifiedSub: { fontSize: 12, color: "#166534", marginTop: 2 },
  profileCard: { backgroundColor: "#fff", borderRadius: 16, padding: 18, shadowColor: "#000", shadowOpacity: 0.04, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 14 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f3f4f6" },
  infoLabel: { fontSize: 13, color: BRAND_MUTED },
  infoValue: { fontSize: 13, fontWeight: "600", color: "#111", maxWidth: "60%", textAlign: "right" },
  pageTitle: { fontSize: 26, fontWeight: "800", color: "#111", marginBottom: 6 },
  pageSub: { fontSize: 14, color: BRAND_MUTED, marginBottom: 24, lineHeight: 20 },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "700", color: "#374151", marginBottom: 6 },
  input: {
    backgroundColor: "#fff", borderRadius: 12, borderWidth: 1.5,
    borderColor: "#e5e7eb", paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: "#111",
  },
  textarea: { height: 80, textAlignVertical: "top" },
  submitBtn: {
    marginTop: 8, height: 52, borderRadius: 14,
    backgroundColor: BRAND_PRIMARY, alignItems: "center", justifyContent: "center",
  },
  btnDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
