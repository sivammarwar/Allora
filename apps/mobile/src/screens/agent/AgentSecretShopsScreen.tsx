import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Linking,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

interface ShopRequest {
  id: string; shopName: string; phone: string; address: string;
  locationLat: number; locationLng: number; purpose: string | null;
  status: string; createdAt: string;
  user: { id: string; email: string; name: string | null };
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING:  { bg: "#fef9c3", text: "#854d0e" },
  APPROVED: { bg: "#dcfce7", text: "#15803d" },
  REJECTED: { bg: "#fee2e2", text: "#b91c1c" },
};

export default function AgentSecretShopsScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAddress, setEditAddress] = useState("");

  const { data: requests = [], isLoading, refetch } = useQuery<ShopRequest[]>({
    queryKey: ["agent-secret-shop-requests"],
    queryFn: () => api.get("/api/agent/secret-shop-requests") as any,
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const updateAddressMut = useMutation({
    mutationFn: ({ id, address }: { id: string; address: string }) =>
      api.patch(`/api/agent/secret-shop-requests/${id}/address`, { address }) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent-secret-shop-requests"] }); setEditingId(null); Alert.alert("✓ Address updated"); },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed"),
  });

  const verifyMut = useMutation({
    mutationFn: ({ requestId, action }: { requestId: string; action: "approve" | "reject" }) =>
      api.post("/api/agent/secret-shop-requests/verify", { requestId, action }) as any,
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["agent-secret-shop-requests"] }); Alert.alert(vars.action === "approve" ? "✓ Shop verified!" : "Rejected"); },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed"),
  });

  return (
    <FlatList
      data={requests}
      keyExtractor={(r) => r.id}
      style={s.screen}
      contentContainerStyle={requests.length === 0 ? s.emptyWrap : s.list}
      onRefresh={refetch}
      refreshing={isLoading}
      ListEmptyComponent={
        isLoading ? <View style={s.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View> : (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🏪</Text>
            <Text style={s.emptyTitle}>No pending requests</Text>
            <Text style={s.emptySub}>New secret shop registrations will appear here.</Text>
          </View>
        )
      }
      renderItem={({ item: req }) => {
        const sc = STATUS_COLORS[req.status] ?? { bg: "#f3f4f6", text: "#374151" };
        const isEditing = editingId === req.id;
        return (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View>
                <Text style={s.shopName}>{req.shopName}</Text>
                <Text style={s.userEmail}>{req.user.name ?? req.user.email}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                <Text style={[s.statusText, { color: sc.text }]}>{req.status}</Text>
              </View>
            </View>

            <View style={s.infoRows}>
              <Text style={s.infoRow}>📞 {req.phone}</Text>
              {isEditing ? (
                <View style={s.editAddressRow}>
                  <TextInput style={s.editInput} value={editAddress} onChangeText={setEditAddress} placeholder="New address…" placeholderTextColor="#9ca3af" />
                  <TouchableOpacity style={s.editSaveBtn} onPress={() => updateAddressMut.mutate({ id: req.id, address: editAddress })} disabled={updateAddressMut.isPending}>
                    <Text style={s.editSaveText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingId(null)}><Text style={s.editCancelText}>✕</Text></TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={s.addressRow} onPress={() => { setEditingId(req.id); setEditAddress(req.address); }}>
                  <Text style={s.infoRow}>📍 {req.address}</Text>
                  <Text style={s.editIcon}>✏️</Text>
                </TouchableOpacity>
              )}
              {req.purpose && <Text style={s.infoRow}>💬 {req.purpose}</Text>}
              <Text style={s.infoRow}>🗓️ {new Date(req.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</Text>
            </View>

            {req.locationLat !== 0 && (
              <TouchableOpacity style={s.mapsBtn} onPress={() => Linking.openURL(`https://www.google.com/maps?q=${req.locationLat},${req.locationLng}`)}>
                <Text style={s.mapsBtnText}>📍 View on Maps</Text>
              </TouchableOpacity>
            )}

            {req.status === "PENDING" && (
              <View style={s.actions}>
                <TouchableOpacity style={s.approveBtn} onPress={() => Alert.alert("Verify shop?", req.shopName, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Verify ✓", onPress: () => verifyMut.mutate({ requestId: req.id, action: "approve" }) },
                ])} disabled={verifyMut.isPending}>
                  <Text style={s.approveBtnText}>Verify Shop ✓</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.rejectBtn} onPress={() => Alert.alert("Reject?", req.shopName, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Reject", style: "destructive", onPress: () => verifyMut.mutate({ requestId: req.id, action: "reject" }) },
                ])} disabled={verifyMut.isPending}>
                  <Text style={s.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 12 },
  emptyWrap: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 8 },
  emptySub: { fontSize: 13, color: BRAND_MUTED, textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  shopName: { fontSize: 16, fontWeight: "800", color: "#111" },
  userEmail: { fontSize: 11, color: BRAND_MUTED, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  infoRows: { gap: 6, marginBottom: 12 },
  infoRow: { fontSize: 12, color: "#4b5563" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  editIcon: { fontSize: 12 },
  editAddressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  editInput: { flex: 1, backgroundColor: "#f3f4f6", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: "#111" },
  editSaveBtn: { backgroundColor: BRAND_PRIMARY, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  editSaveText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  editCancelText: { fontSize: 16, color: BRAND_MUTED, padding: 4 },
  mapsBtn: { backgroundColor: `${BRAND_PRIMARY}14`, borderRadius: 10, height: 38, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  mapsBtnText: { fontSize: 12, fontWeight: "700", color: BRAND_PRIMARY },
  actions: { flexDirection: "row", gap: 10 },
  approveBtn: { flex: 1, height: 42, borderRadius: 10, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center" },
  approveBtnText: { fontSize: 13, fontWeight: "700", color: "#15803d" },
  rejectBtn: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: "#ef4444", alignItems: "center", justifyContent: "center" },
  rejectBtnText: { fontSize: 13, fontWeight: "700", color: "#ef4444" },
});
