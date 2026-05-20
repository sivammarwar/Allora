import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput, Image,
  TouchableOpacity, ActivityIndicator, Alert, Modal, Platform,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiClient } from "../../lib/api";
import { API_URL, BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { launchImageLibrary } from "react-native-image-picker";
import { useAuth } from "../../auth/AuthContext";
import { storage } from "../../lib/storage";

interface RequestDetail {
  id: string;
  requestType: "HERO" | "DELIVERY_BOY";
  status: "PENDING" | "IN_PROGRESS" | "VERIFIED" | "REJECTED";
  areaId: string | null;
  details: any;
  requester: { id: string; email: string; name: string | null };
  createdAt: string;
}
interface Category { id: string; name: string; type: "PRODUCT" | "SERVICE" }
interface Subcategory { id: string; name: string; categoryId: string }
interface ShopForDelivery {
  id: string; shopName: string | null; serviceName: string;
  user: { name: string | null; email: string };
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING:     { bg: "#fef9c3", text: "#854d0e" },
  IN_PROGRESS: { bg: `${BRAND_PRIMARY}1a`, text: BRAND_PRIMARY },
  VERIFIED:    { bg: "#dcfce7", text: "#15803d" },
  REJECTED:    { bg: "#fee2e2", text: "#b91c1c" },
};

export default function AgentRequestDetailScreen() {
  const route = useRoute<any>();
  const { id } = route.params as { id: string };
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<RequestDetail>({
    queryKey: ["agent-request-detail", id],
    queryFn: () => api.get(`/api/agent/requests/${id}`) as any,
    enabled: !!user,
  });

  // ── Set status mutation ──
  const setStatusMut = useMutation({
    mutationFn: (status: string) => api.put(`/api/agent/requests/${id}/status`, { status }) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-request-detail", id] });
      qc.invalidateQueries({ queryKey: ["agent-requests"] });
      Alert.alert("Status updated");
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed"),
  });

  // ── Hero verify state ──
  const [heroModalOpen, setHeroModalOpen] = useState(false);
  const [shopName, setShopName] = useState("");
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [requiresDelivery, setRequiresDelivery] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ── Delivery verify state ──
  const [dboyModalOpen, setDboyModalOpen] = useState(false);
  const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);

  // ── Categories/subcategories queries ──
  const { data: cats = [] } = useQuery<Category[]>({
    queryKey: ["categories-all"],
    queryFn: () => api.get("/api/user/categories") as any,
    enabled: heroModalOpen,
  });
  const { data: allSubs = [] } = useQuery<Subcategory[]>({
    queryKey: ["subcategories-all-verify"],
    queryFn: async () => {
      const rows: any[] = await api.get("/api/user/subcategories") as any;
      return rows.map((s: any) => ({ id: s.id, name: s.name, categoryId: s.categoryId }));
    },
    enabled: heroModalOpen,
  });

  const hasServiceCats = selectedCatIds.some(cid => cats.find(c => c.id === cid)?.type === "SERVICE");
  const subOptions = useMemo(
    () => allSubs.filter(s => selectedCatIds.includes(s.categoryId) && cats.find(c => c.id === s.categoryId)?.type === "SERVICE"),
    [allSubs, selectedCatIds, cats]
  );

  // ── Shops for delivery boy verify ──
  const { data: shops = [] } = useQuery<ShopForDelivery[]>({
    queryKey: ["agent-heroes-needing-delivery"],
    queryFn: () => api.get("/api/agent/heroes-needing-delivery") as any,
    enabled: dboyModalOpen,
  });

  // Prefill hero modal from request details
  useEffect(() => {
    if (!heroModalOpen || !data?.details) return;
    setShopName(data.details.shopName ?? "");
    setSelectedCatIds(data.details.categoryIds ?? []);
    setSelectedSubIds(data.details.subcategoryIds ?? []);
    setPhotoUrl(data.details.profileImageUrl ?? null);
  }, [heroModalOpen, data]);

  // ── Hero verify mutation ──
  const verifyHeroMut = useMutation({
    mutationFn: () => {
      if (!shopName.trim()) throw new Error("Shop name is required");
      if (selectedCatIds.length === 0) throw new Error("Select at least one category");
      if (hasServiceCats && selectedSubIds.length === 0) throw new Error("Select at least one subcategory");
      if (!photoUrl) throw new Error("Upload a shop/hero photo");
      return api.post("/api/agent/verify/hero", {
        requestId: id,
        requiresDelivery,
        categoryIds: selectedCatIds,
        subcategoryIds: hasServiceCats ? selectedSubIds : [],
        shopName: shopName.trim(),
        profileImageUrl: photoUrl,
      }) as any;
    },
    onSuccess: () => {
      Alert.alert("Hero verified!");
      setHeroModalOpen(false);
      qc.invalidateQueries({ queryKey: ["agent-request-detail", id] });
      qc.invalidateQueries({ queryKey: ["agent-requests"] });
      qc.invalidateQueries({ queryKey: ["agent-stats"] });
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Verification failed"),
  });

  // ── Delivery verify mutation ──
  const verifyDeliveryMut = useMutation({
    mutationFn: () => api.post("/api/agent/verify/delivery-boy", { requestId: id, shopIds: selectedShopIds }) as any,
    onSuccess: () => {
      Alert.alert("Delivery boy verified!");
      setDboyModalOpen(false);
      qc.invalidateQueries({ queryKey: ["agent-request-detail", id] });
      qc.invalidateQueries({ queryKey: ["agent-requests"] });
      qc.invalidateQueries({ queryKey: ["agent-stats"] });
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Verification failed"),
  });

  // ── Image upload ──
  const pickAndUploadImage = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: "photo", quality: 0.8 });
      if (result.didCancel || !result.assets?.[0]?.uri) return;
      const asset = result.assets[0];
      setUploading(true);
      console.log("[Upload] Asset details:", {
        uri: asset.uri,
        type: asset.type,
        fileName: asset.fileName,
        fileSize: asset.fileSize,
      });
      
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        type: asset.type ?? "image/jpeg",
        name: asset.fileName ?? "photo.jpg",
      } as any);
      
      const res = await fetch(`${API_URL}/api/upload/image?folder=heroes`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      console.log("[Upload] Response status:", res.status);
      
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.log("[Upload] Error data:", data);
        throw new Error(data?.error ?? `Upload failed (${res.status})`);
      }
      const json = await res.json();
      console.log("[Upload] Success, URL:", json.url);
      setPhotoUrl(json.url);
    } catch (e: any) {
      console.log("[Upload] Exception:", e);
      Alert.alert("Upload error", e?.message ?? "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;
  }
  if (!data) {
    return <View style={styles.center}><Text style={styles.emptyText}>Request not found.</Text></View>;
  }

  const isHero = data.requestType === "HERO";
  const canStart = data.status === "PENDING";
  const canVerify = data.status === "IN_PROGRESS";
  const isFinal = data.status === "VERIFIED" || data.status === "REJECTED";
  const sc = STATUS_COLORS[data.status] ?? { bg: "#f3f4f6", text: "#374151" };
  const name = data.details?.name ?? data.requester.name ?? data.requester.email;

  return (
    <>
      <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
        {/* Header card */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.reqName}>{name}</Text>
            <View style={[styles.badge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.badgeText, { color: sc.text }]}>{data.status.replace("_", " ")}</Text>
            </View>
          </View>

          <View style={[styles.badge, { backgroundColor: isHero ? `${BRAND_PRIMARY}18` : "#eff6ff", alignSelf: "flex-start", marginBottom: 12 }]}>
            <Text style={[styles.badgeText, { color: isHero ? BRAND_PRIMARY : "#2563eb" }]}>
              {data.requestType.replace("_", " ")}
            </Text>
          </View>

          {/* Details */}
          <View style={styles.detailGrid}>
            <DetailRow label="Email" value={data.requester.email} />
            {data.details?.phone && <DetailRow label="Phone" value={data.details.phone} />}
            {data.details?.address && <DetailRow label="Address" value={data.details.address} />}
            {isHero && data.details?.serviceName && <DetailRow label="Service" value={data.details.serviceName} />}
            {isHero && data.details?.shopName && <DetailRow label="Shop name" value={data.details.shopName} />}
            {data.details?.purpose && <DetailRow label="Notes" value={data.details.purpose} />}
            <DetailRow label="Submitted" value={new Date(data.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })} />
          </View>

          {/* Profile image */}
          {data.details?.profileImageUrl && (
            <Image source={{ uri: data.details.profileImageUrl }} style={styles.profileImg} />
          )}

          {/* Categories */}
          {isHero && data.details?.categoryIds?.length > 0 && (
            <View style={styles.catSection}>
              <Text style={styles.catLabel}>Requested categories:</Text>
              {data.details.categoryIds.map((cid: string, i: number) => (
                <Text key={cid} style={styles.catItem}>• Category ID: {cid}</Text>
              ))}
            </View>
          )}
        </View>

        {/* Action buttons */}
        {!isFinal && (
          <View style={styles.actionCard}>
            {canStart && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: BRAND_PRIMARY }]}
                onPress={() => setStatusMut.mutate("IN_PROGRESS")}
                disabled={setStatusMut.isPending}
              >
                <Text style={styles.actionBtnText}>
                  {setStatusMut.isPending ? "Updating…" : "📍 I'm on the way (Start Review)"}
                </Text>
              </TouchableOpacity>
            )}
            {canVerify && isHero && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#15803d" }]}
                onPress={() => setHeroModalOpen(true)}
              >
                <Text style={styles.actionBtnText}>🛡️ Verify as Hero</Text>
              </TouchableOpacity>
            )}
            {canVerify && !isHero && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#2563eb" }]}
                onPress={() => setDboyModalOpen(true)}
              >
                <Text style={styles.actionBtnText}>🚴 Verify as Delivery Boy</Text>
              </TouchableOpacity>
            )}
            {!isFinal && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#ef4444" }]}
                onPress={() => Alert.alert("Reject?", "Are you sure you want to reject this request?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Reject", style: "destructive", onPress: () => setStatusMut.mutate("REJECTED") },
                ])}
              >
                <Text style={[styles.actionBtnText, { color: "#ef4444" }]}>Reject Request</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Hero Verify Modal ── */}
      <Modal visible={heroModalOpen} animationType="slide" onRequestClose={() => setHeroModalOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Verify Hero</Text>
            <TouchableOpacity onPress={() => setHeroModalOpen(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalDesc}>
              Confirm the shop details and assign categories. These values are locked after verification.
            </Text>

            {/* Shop name */}
            <Text style={styles.fieldLabel}>Shop name *</Text>
            <TextInput style={styles.input} value={shopName} onChangeText={setShopName} placeholder="e.g. Mahakal Salon" />

            {/* Categories */}
            <Text style={styles.fieldLabel}>Categories * ({selectedCatIds.length} selected)</Text>
            <View style={styles.checkList}>
              {cats.length === 0 ? (
                <Text style={styles.checkEmpty}>Loading categories…</Text>
              ) : (
                cats.map((c) => {
                  const checked = selectedCatIds.includes(c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.checkItem}
                      onPress={() => setSelectedCatIds(prev =>
                        prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id]
                      )}
                    >
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                        {checked && <Text style={styles.checkMark}>✓</Text>}
                      </View>
                      <Text style={styles.checkLabel}>{c.name} ({c.type.toLowerCase()})</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Subcategories (if service categories selected) */}
            {hasServiceCats && (
              <>
                <Text style={styles.fieldLabel}>Subcategories * ({selectedSubIds.length} selected)</Text>
                <View style={styles.checkList}>
                  {subOptions.length === 0 ? (
                    <Text style={styles.checkEmpty}>No subcategories under selected service categories.</Text>
                  ) : (
                    subOptions.map((s) => {
                      const checked = selectedSubIds.includes(s.id);
                      return (
                        <TouchableOpacity
                          key={s.id}
                          style={styles.checkItem}
                          onPress={() => setSelectedSubIds(prev =>
                            prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                          )}
                        >
                          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                            {checked && <Text style={styles.checkMark}>✓</Text>}
                          </View>
                          <Text style={styles.checkLabel}>{s.name}</Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </>
            )}

            {/* Photo upload */}
            <Text style={styles.fieldLabel}>Shop / hero photo *</Text>
            {photoUrl ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: photoUrl }} style={styles.photoImg} />
                <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhotoUrl(null)}>
                  <Text style={{ color: "#ef4444", fontSize: 13, fontWeight: "700" }}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadBtn} onPress={pickAndUploadImage} disabled={uploading}>
                <Text style={styles.uploadBtnText}>{uploading ? "Uploading…" : "📷 Tap to upload photo (max 5MB)"}</Text>
              </TouchableOpacity>
            )}

            {/* Requires delivery */}
            <TouchableOpacity
              style={styles.checkItem}
              onPress={() => setRequiresDelivery(prev => !prev)}
            >
              <View style={[styles.checkbox, requiresDelivery && styles.checkboxChecked]}>
                {requiresDelivery && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.checkLabel}>This service requires a delivery partner</Text>
            </TouchableOpacity>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, (verifyHeroMut.isPending || !shopName.trim() || selectedCatIds.length === 0 || (hasServiceCats && selectedSubIds.length === 0) || !photoUrl) && styles.btnDisabled]}
              onPress={() => verifyHeroMut.mutate()}
              disabled={verifyHeroMut.isPending || !shopName.trim() || selectedCatIds.length === 0 || (hasServiceCats && selectedSubIds.length === 0) || !photoUrl}
            >
              <Text style={styles.submitBtnText}>
                {verifyHeroMut.isPending ? "Verifying…" : "Confirm Verification"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Delivery Boy Verify Modal ── */}
      <Modal visible={dboyModalOpen} animationType="slide" onRequestClose={() => setDboyModalOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assign Shops</Text>
            <TouchableOpacity onPress={() => setDboyModalOpen(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.modalDesc}>
              Select the verified shops that this delivery boy will serve.
            </Text>
            {shops.length === 0 ? (
              <Text style={styles.checkEmpty}>
                No verified heroes that require delivery yet. Verify a hero with "requires delivery" enabled first.
              </Text>
            ) : (
              <View style={styles.checkList}>
                {shops.map((s) => {
                  const checked = selectedShopIds.includes(s.id);
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.checkItem}
                      onPress={() => setSelectedShopIds(prev =>
                        prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                      )}
                    >
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                        {checked && <Text style={styles.checkMark}>✓</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.checkLabel}>{s.shopName ?? s.serviceName}</Text>
                        <Text style={{ fontSize: 11, color: BRAND_MUTED }}>{s.user.email}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            <TouchableOpacity
              style={[styles.submitBtn, (verifyDeliveryMut.isPending || selectedShopIds.length === 0) && styles.btnDisabled]}
              onPress={() => verifyDeliveryMut.mutate()}
              disabled={verifyDeliveryMut.isPending || selectedShopIds.length === 0}
            >
              <Text style={styles.submitBtnText}>
                {verifyDeliveryMut.isPending ? "Assigning…" : "Confirm Assignment"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: BRAND_MUTED, fontSize: 14 },
  card: {
    margin: 16, backgroundColor: "#fff", borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.05, elevation: 2,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  reqName: { fontSize: 20, fontWeight: "800", color: "#111", flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  detailGrid: { marginTop: 8, gap: 8 },
  detailRow: { flexDirection: "row", gap: 8 },
  detailLabel: { fontSize: 12, color: BRAND_MUTED, width: 80, fontWeight: "600" },
  detailValue: { fontSize: 13, color: "#111", flex: 1 },
  profileImg: { width: 100, height: 100, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  catSection: { marginTop: 12 },
  catLabel: { fontSize: 12, color: BRAND_MUTED, fontWeight: "600", marginBottom: 4 },
  catItem: { fontSize: 12, color: "#111", paddingLeft: 8 },
  actionCard: { marginHorizontal: 16, gap: 10 },
  actionBtn: {
    paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center",
  },
  actionBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  // Modal styles
  modalContainer: { flex: 1, backgroundColor: "#f9fafb" },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16, paddingTop: 52, backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  closeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: "#f3f4f6" },
  closeBtnText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  modalDesc: { fontSize: 13, color: BRAND_MUTED, marginBottom: 16, lineHeight: 18 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#111", marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: "#fff", borderRadius: 10, borderWidth: 1.5, borderColor: "#e5e7eb",
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#111",
  },
  checkList: {
    backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb",
    maxHeight: 200, paddingVertical: 4,
  },
  checkEmpty: { padding: 16, textAlign: "center", color: BRAND_MUTED, fontSize: 13 },
  checkItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#d1d5db",
    alignItems: "center", justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: BRAND_PRIMARY, borderColor: BRAND_PRIMARY },
  checkMark: { color: "#fff", fontSize: 13, fontWeight: "700" },
  checkLabel: { fontSize: 14, color: "#111", flex: 1 },
  photoPreview: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  photoImg: { width: 80, height: 80, borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb" },
  removePhotoBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#fee2e2" },
  uploadBtn: {
    paddingVertical: 30, borderRadius: 12, borderWidth: 2, borderStyle: "dashed",
    borderColor: "#d1d5db", alignItems: "center", justifyContent: "center", backgroundColor: "#fff",
  },
  uploadBtnText: { color: BRAND_MUTED, fontSize: 13 },
  submitBtn: {
    marginTop: 20, paddingVertical: 14, borderRadius: 12,
    backgroundColor: BRAND_PRIMARY, alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },
});
