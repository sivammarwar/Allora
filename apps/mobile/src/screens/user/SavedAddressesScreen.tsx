import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Modal,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useLanguage } from "../../lib/i18n";

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}

const EMPTY_FORM = { label: "", address: "" };

export default function SavedAddressesScreen() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: addresses = [], isLoading } = useQuery<SavedAddress[]>({
    queryKey: ["saved-addresses"],
    queryFn: () => api.get("/api/user/saved-addresses") as any,
  });

  const addMutation = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) =>
      api.post("/api/user/saved-addresses", data) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-addresses"] });
      setModalVisible(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Could not save address."),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/user/saved-addresses/${id}/default`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-addresses"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/user/saved-addresses/${id}`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-addresses"] }),
  });

  const handleDelete = (id: string) => {
    Alert.alert(t("addresses.delete"), "Remove this address?", [
      { text: t("addresses.cancel"), style: "cancel" },
      { text: t("addresses.delete"), style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={addresses}
        keyExtractor={(a) => a.id}
        contentContainerStyle={addresses.length === 0 ? styles.emptyWrap : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyTitle}>{t("addresses.empty")}</Text>
            <Text style={styles.emptySub}>{t("addresses.emptySub")}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.iconBox}>
                <Text style={styles.iconText}>📍</Text>
              </View>
              <View style={styles.cardInfo}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{item.label}</Text>
                  {item.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultText}>{t("addresses.default")}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.addressText} numberOfLines={2}>{item.address}</Text>
              </View>
            </View>
            <View style={styles.actions}>
              {!item.isDefault && (
                <TouchableOpacity
                  onPress={() => setDefaultMutation.mutate(item.id)}
                  style={styles.actionBtn}
                >
                  <Text style={styles.actionBtnText}>{t("addresses.setDefault")}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>{t("addresses.delete")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
        <Text style={styles.addBtnText}>{t("addresses.addNew")}</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("addresses.addNew")}</Text>
            <TouchableOpacity onPress={() => { setModalVisible(false); setForm(EMPTY_FORM); }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalLabel}>{t("addresses.label")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("addresses.label")}
            placeholderTextColor="#9ca3af"
            value={form.label}
            onChangeText={(v) => setForm((f) => ({ ...f, label: v }))}
          />
          <Text style={styles.modalLabel}>{t("addresses.address")}</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder={t("addresses.address")}
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            value={form.address}
            onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
          />
          <TouchableOpacity
            style={[styles.saveBtn, addMutation.isPending && styles.saveBtnDisabled]}
            onPress={() => {
              if (!form.label.trim() || !form.address.trim()) {
                Alert.alert("Required", "Please fill in both fields.");
                return;
              }
              addMutation.mutate(form);
            }}
            disabled={addMutation.isPending}
          >
            {addMutation.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>{t("addresses.save")}</Text>}
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 8 },
  emptySub: { fontSize: 13, color: BRAND_MUTED, textAlign: "center" },
  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardLeft: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  iconBox: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: "#f3f4f6",
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  iconText: { fontSize: 18 },
  cardInfo: { flex: 1 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  label: { fontSize: 14, fontWeight: "700", color: "#111" },
  defaultBadge: { backgroundColor: "#fff5f7", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: "#fecdd3" },
  defaultText: { fontSize: 10, fontWeight: "700", color: BRAND_PRIMARY },
  addressText: { fontSize: 13, color: BRAND_MUTED, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, height: 34, borderRadius: 8, borderWidth: 1.5, borderColor: BRAND_PRIMARY, alignItems: "center", justifyContent: "center" },
  actionBtnText: { fontSize: 12, fontWeight: "600", color: BRAND_PRIMARY },
  deleteBtn: { height: 34, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1.5, borderColor: "#ef4444", alignItems: "center", justifyContent: "center" },
  deleteBtnText: { fontSize: 12, fontWeight: "600", color: "#ef4444" },
  addBtn: {
    position: "absolute", bottom: 24, left: 16, right: 16,
    height: 52, borderRadius: 14, backgroundColor: BRAND_PRIMARY,
    alignItems: "center", justifyContent: "center",
  },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  modal: { flex: 1, padding: 24, backgroundColor: "#fff" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  modalClose: { fontSize: 18, color: BRAND_MUTED },
  modalLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    height: 48, borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12,
    paddingHorizontal: 14, fontSize: 14, color: "#111", backgroundColor: "#fafafa", marginBottom: 16,
  },
  inputMulti: { height: 90, paddingTop: 12, textAlignVertical: "top" },
  saveBtn: { height: 52, borderRadius: 14, backgroundColor: BRAND_PRIMARY, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
