import React, { useState } from "react";
import {
  View, Text, ScrollView, Switch, TouchableOpacity,
  ActivityIndicator, Alert, StyleSheet, Modal,
  TextInput, KeyboardAvoidingView, Platform, Pressable,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../../lib/api";
import { BRAND_PRIMARY } from "../../lib/config";

interface Hero {
  id: string;
  shopName: string | null;
  serviceName: string | null;
  phone: string;
  address: string | null;
  categoryIds: string[];
  subcategoryIds: string[];
  createdAt: string;
  user: { name: string | null; email: string };
  hasPaidOnboardingFee: boolean;
  onboardingPaidAt: string | null;
  onboardingExpiresAt: string | null;
  onboardingFeePaid: number | null;
  onboardingValidityMonths: number | null;
}

interface Subcategory {
  id: string;
  name: string;
  categoryName: string;
}

interface EditForm {
  shopName: string;
  serviceName: string;
  phone: string;
  address: string;
}

export default function AgentHeroesScreen() {
  const qc = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editHero, setEditHero] = useState<Hero | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ shopName: "", serviceName: "", phone: "", address: "" });

  // ── Fetch heroes (api interceptor already unwraps .data) ──────────────────
  const { data: heroes = [], isLoading } = useQuery<Hero[]>({
    queryKey: ["agent", "verified-heroes"],
    queryFn: () => api.get("/api/agent/verified-heroes") as any,
  });

  // ── Fetch subcategory name map ─────────────────────────────────────────────
  const { data: allSubs = [] } = useQuery<Subcategory[]>({
    queryKey: ["user", "all-subcategories-search"],
    queryFn: () => api.get("/api/user/subcategories") as any,
    staleTime: 10 * 60 * 1000,
  });
  const subMap = React.useMemo(() => {
    const m: Record<string, string> = {};
    allSubs.forEach((s) => { m[s.id] = s.name; });
    return m;
  }, [allSubs]);

  // ── Payment toggle ─────────────────────────────────────────────────────────
  const toggle = useMutation({
    mutationFn: ({ id, paid }: { id: string; paid: boolean }) =>
      api.patch(`/api/agent/verified-heroes/${id}/payment-status`, { paid }) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent", "verified-heroes"] }); setPendingId(null); },
    onError: () => { Alert.alert("Error", "Failed to update payment status"); setPendingId(null); },
  });

  // ── Edit hero ──────────────────────────────────────────────────────────────
  const editMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EditForm> }) =>
      api.put(`/api/agent/verified-heroes/${id}`, data) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent", "verified-heroes"] }); setEditHero(null); },
    onError: () => Alert.alert("Error", "Failed to update hero"),
  });

  // ── Delete hero ────────────────────────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/agent/verified-heroes/${id}`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent", "verified-heroes"] }),
    onError: () => Alert.alert("Error", "Failed to remove hero"),
  });

  const handleToggle = (hero: Hero) => {
    const expiresAt = hero.onboardingExpiresAt ? new Date(hero.onboardingExpiresAt) : null;
    const active = hero.hasPaidOnboardingFee && (!expiresAt || expiresAt.getTime() > Date.now());
    if (active) {
      Alert.alert("Mark Unpaid?", `${hero.shopName ?? hero.user.name ?? "This hero"} will lose dashboard access.`, [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", style: "destructive", onPress: () => { setPendingId(hero.id); toggle.mutate({ id: hero.id, paid: false }); } },
      ]);
    } else {
      setPendingId(hero.id);
      toggle.mutate({ id: hero.id, paid: true });
    }
  };

  const openEdit = (hero: Hero) => {
    setEditForm({
      shopName: hero.shopName ?? "",
      serviceName: hero.serviceName ?? "",
      phone: hero.phone ?? "",
      address: hero.address ?? "",
    });
    setEditHero(hero);
  };

  const handleDelete = (hero: Hero) => {
    Alert.alert(
      "Remove Hero?",
      `This will revoke ${hero.shopName ?? hero.user.name ?? "this hero"}'s verification. Their account will return to user status.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove", style: "destructive",
          onPress: () => deleteMut.mutate(hero.id),
        },
      ]
    );
  };

  if (isLoading) {
    return <View style={s.center}><ActivityIndicator size="large" color={BRAND_PRIMARY} /></View>;
  }

  if (heroes.length === 0) {
    return (
      <View style={s.center}>
        <Ionicons name="people-outline" size={48} color="#ccc" />
        <Text style={s.emptyText}>No verified heroes yet</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={s.sectionHeader}>{heroes.length} Verified Hero{heroes.length !== 1 ? "s" : ""}</Text>
        {heroes.map((hero) => {
          const expiresAt = hero.onboardingExpiresAt ? new Date(hero.onboardingExpiresAt) : null;
          const expired = expiresAt !== null && expiresAt.getTime() < Date.now();
          const active = hero.hasPaidOnboardingFee && !expired;
          const heroName = hero.shopName ?? hero.serviceName ?? hero.user.name ?? "—";
          const verifiedDate = new Date(hero.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
          const subNames = hero.subcategoryIds.map((id) => subMap[id]).filter(Boolean);

          return (
            <View key={hero.id} style={s.card}>
              {/* Header row */}
              <View style={s.row}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{heroName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{heroName}</Text>
                  {hero.serviceName && hero.shopName && (
                    <Text style={s.subName}>{hero.serviceName}</Text>
                  )}
                </View>
                {pendingId === hero.id ? (
                  <ActivityIndicator size="small" color={BRAND_PRIMARY} />
                ) : (
                  <Switch
                    value={active}
                    onValueChange={() => handleToggle(hero)}
                    trackColor={{ true: "#22c55e", false: "#d1d5db" }}
                    thumbColor="#fff"
                  />
                )}
              </View>

              {/* Contact info */}
              <View style={s.infoRow}>
                <Ionicons name="mail-outline" size={13} color="#9ca3af" />
                <Text style={s.infoText}>{hero.user.email}</Text>
              </View>
              <View style={s.infoRow}>
                <Ionicons name="call-outline" size={13} color="#9ca3af" />
                <Text style={s.infoText}>{hero.phone}</Text>
              </View>
              {hero.address ? (
                <View style={s.infoRow}>
                  <Ionicons name="location-outline" size={13} color="#9ca3af" />
                  <Text style={s.infoText} numberOfLines={2}>{hero.address}</Text>
                </View>
              ) : null}
              <View style={s.infoRow}>
                <Ionicons name="calendar-outline" size={13} color="#9ca3af" />
                <Text style={s.infoText}>Verified {verifiedDate}</Text>
              </View>

              {/* Services */}
              {subNames.length > 0 && (
                <View style={s.chipsWrap}>
                  {subNames.map((name) => (
                    <View key={name} style={s.chip}>
                      <Text style={s.chipText}>{name}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Status badge */}
              <View style={[s.badge, active ? s.badgeActive : s.badgeInactive]}>
                <Ionicons name={active ? "checkmark-circle" : "alert-circle"} size={13} color={active ? "#16a34a" : "#d97706"} />
                <Text style={[s.badgeText, { color: active ? "#16a34a" : "#d97706" }]}>
                  {active ? "Paid · Active" : expired ? "Expired" : "Unpaid"}
                </Text>
              </View>

              {/* Validity details */}
              {active && expiresAt && (
                <View style={s.validityBox}>
                  <Text style={s.validityText}>
                    Valid until <Text style={{ fontWeight: "700", color: "#111" }}>
                      {expiresAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </Text>
                    {hero.onboardingValidityMonths ? ` (${hero.onboardingValidityMonths} mo)` : ""}
                  </Text>
                  {hero.onboardingFeePaid != null && (
                    <Text style={s.validityText}>
                      Paid ₹{hero.onboardingFeePaid}
                      {hero.onboardingPaidAt ? ` · ${new Date(hero.onboardingPaidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
                    </Text>
                  )}
                </View>
              )}

              {!hero.hasPaidOnboardingFee && (
                <Text style={s.hint}>Toggle ON only after the hero has paid you offline. Validity is locked at this moment.</Text>
              )}

              {/* Action buttons */}
              <View style={s.actions}>
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(hero)}>
                  <Ionicons name="pencil-outline" size={14} color={BRAND_PRIMARY} />
                  <Text style={[s.actionText, { color: BRAND_PRIMARY }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.removeBtn}
                  onPress={() => handleDelete(hero)}
                  disabled={deleteMut.isPending}
                >
                  {deleteMut.isPending ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={14} color="#ef4444" />
                      <Text style={[s.actionText, { color: "#ef4444" }]}>Remove</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ── Edit Modal ──────────────────────────────────────────────────────── */}
      <Modal visible={!!editHero} animationType="slide" transparent onRequestClose={() => setEditHero(null)}>
        <Pressable style={s.overlay} onPress={() => setEditHero(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.sheet}>
            <Pressable onPress={() => {}}>
              {/* Drag handle */}
              <View style={s.handle} />
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>Edit Hero</Text>
                <TouchableOpacity onPress={() => setEditHero(null)}>
                  <Ionicons name="close" size={22} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <Text style={s.label}>Shop Name</Text>
              <TextInput
                style={s.input}
                value={editForm.shopName}
                onChangeText={(v) => setEditForm((f) => ({ ...f, shopName: v }))}
                placeholder="Shop name"
                placeholderTextColor="#9ca3af"
              />

              <Text style={s.label}>Service Name</Text>
              <TextInput
                style={s.input}
                value={editForm.serviceName}
                onChangeText={(v) => setEditForm((f) => ({ ...f, serviceName: v }))}
                placeholder="Service name"
                placeholderTextColor="#9ca3af"
              />

              <Text style={s.label}>Phone</Text>
              <TextInput
                style={s.input}
                value={editForm.phone}
                onChangeText={(v) => setEditForm((f) => ({ ...f, phone: v }))}
                placeholder="Phone number"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
              />

              <Text style={s.label}>Address</Text>
              <TextInput
                style={[s.input, { height: 80, textAlignVertical: "top" }]}
                value={editForm.address}
                onChangeText={(v) => setEditForm((f) => ({ ...f, address: v }))}
                placeholder="Full address"
                placeholderTextColor="#9ca3af"
                multiline
              />

              <TouchableOpacity
                style={[s.saveBtn, editMut.isPending && { opacity: 0.6 }]}
                disabled={editMut.isPending}
                onPress={() => editHero && editMut.mutate({
                  id: editHero.id,
                  data: {
                    shopName: editForm.shopName || undefined,
                    serviceName: editForm.serviceName || undefined,
                    phone: editForm.phone || undefined,
                    address: editForm.address || undefined,
                  },
                })}
              >
                {editMut.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.saveBtnText}>Save Changes</Text>
                }
              </TouchableOpacity>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb" },
  emptyText: { marginTop: 12, fontSize: 14, color: "#9ca3af" },
  sectionHeader: { fontSize: 13, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#ede9fe", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#7c3aed" },
  name: { fontSize: 15, fontWeight: "700", color: "#111827" },
  subName: { fontSize: 12, color: "#6b7280", marginTop: 1 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginBottom: 4 },
  infoText: { fontSize: 12, color: "#6b7280", flex: 1 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8, marginBottom: 4 },
  chip: { backgroundColor: "#ede9fe", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  chipText: { fontSize: 11, color: "#6d28d9", fontWeight: "600" },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: "flex-start", marginTop: 10 },
  badgeActive: { backgroundColor: "#dcfce7" },
  badgeInactive: { backgroundColor: "#fef3c7" },
  badgeText: { fontSize: 11, fontWeight: "700" },
  validityBox: { marginTop: 6, backgroundColor: "#f9fafb", borderRadius: 8, padding: 8, gap: 2 },
  validityText: { fontSize: 11, color: "#6b7280" },
  hint: { marginTop: 8, fontSize: 11, color: "#d97706", fontStyle: "italic", lineHeight: 16 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14, borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 12 },
  editBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: BRAND_PRIMARY, backgroundColor: "#f5f3ff" },
  removeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fff5f5" },
  actionText: { fontSize: 13, fontWeight: "600" },
  // Modal / Edit sheet
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb", alignSelf: "center", marginBottom: 16 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  label: { fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#111" },
  saveBtn: { marginTop: 20, backgroundColor: BRAND_PRIMARY, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
