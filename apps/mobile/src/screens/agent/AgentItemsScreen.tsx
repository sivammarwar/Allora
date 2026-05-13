import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

interface AgentItem { id: string; name: string; brandName: string | null; isActive: boolean; createdAt: string }
const emptyForm = { name: "", brandName: "" };

export default function AgentItemsScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<AgentItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: items = [], isLoading, refetch } = useQuery<AgentItem[]>({
    queryKey: ["agent-items", search],
    queryFn: () => api.get(`/api/agent/items?search=${encodeURIComponent(search)}`) as any,
    enabled: !!user,
  });

  const set = (k: keyof typeof emptyForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const createMut = useMutation({
    mutationFn: () => api.post("/api/agent/items", { name: form.name, brandName: form.brandName || null }) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent-items"] }); setShowForm(false); setForm(emptyForm); Alert.alert("✓ Created"); },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed"),
  });

  const updateMut = useMutation({
    mutationFn: () => api.put(`/api/agent/items/${editingItem!.id}`, { name: form.name, brandName: form.brandName || null }) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent-items"] }); setShowForm(false); setEditingItem(null); setForm(emptyForm); Alert.alert("✓ Updated"); },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/agent/items/${id}`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-items"] }),
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed"),
  });

  const openCreate = () => { setEditingItem(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (item: AgentItem) => { setEditingItem(item); setForm({ name: item.name, brandName: item.brandName ?? "" }); setShowForm(true); };

  return (
    <>
      <View style={s.screen}>
        <View style={s.topBar}>
          <TextInput style={s.searchInput} value={search} onChangeText={setSearch} placeholder="Search items…" placeholderTextColor="#9ca3af" />
          <TouchableOpacity style={s.addBtn} onPress={openCreate}><Text style={s.addBtnText}>+ New</Text></TouchableOpacity>
        </View>

        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          onRefresh={refetch}
          refreshing={isLoading}
          contentContainerStyle={items.length === 0 ? s.emptyWrap : s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🗂️</Text>
              <Text style={s.emptyTitle}>No items yet</Text>
              <Text style={s.emptySub}>Create catalog items that shops can order.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.itemCard}>
              <View style={s.itemAvatar}><Text style={s.itemAvatarText}>{item.name[0]?.toUpperCase()}</Text></View>
              <View style={s.itemInfo}>
                <Text style={s.itemName}>{item.name}</Text>
                {item.brandName && <Text style={s.itemBrand}>{item.brandName}</Text>}
                <Text style={s.itemDate}>{new Date(item.createdAt).toLocaleDateString("en-IN")}</Text>
              </View>
              <View style={s.itemActions}>
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}><Text>✏️</Text></TouchableOpacity>
                <TouchableOpacity style={s.deleteBtn} onPress={() => Alert.alert("Delete?", item.name, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => deleteMut.mutate(item.id) },
                ])}><Text>🗑️</Text></TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{editingItem ? "Edit Item" : "New Item"}</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.formBody}>
            {[
              { k: "name" as const, label: "Item name *" },
              { k: "brandName" as const, label: "Brand name (optional)" },
            ].map(({ k, label }) => (
              <View key={k} style={s.fieldWrap}>
                <Text style={s.fieldLabel}>{label}</Text>
                <TextInput style={s.fieldInput} value={form[k]} onChangeText={set(k)} placeholder={label} placeholderTextColor="#9ca3af" />
              </View>
            ))}
            <TouchableOpacity
              style={[s.submitBtn, (createMut.isPending || updateMut.isPending) && s.btnDisabled]}
              onPress={() => editingItem ? updateMut.mutate() : createMut.mutate()}
              disabled={createMut.isPending || updateMut.isPending || !form.name.trim()}
            >
              {createMut.isPending || updateMut.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>{editingItem ? "Update" : "Create"}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  topBar: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  searchInput: { flex: 1, height: 42, backgroundColor: "#f3f4f6", borderRadius: 12, paddingHorizontal: 14, fontSize: 14, color: "#111" },
  addBtn: { backgroundColor: BRAND_PRIMARY, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  list: { padding: 16, gap: 10 },
  emptyWrap: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 8 },
  emptySub: { fontSize: 13, color: BRAND_MUTED, textAlign: "center" },
  itemCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 14, gap: 12, shadowColor: "#000", shadowOpacity: 0.04, elevation: 2 },
  itemAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: `${BRAND_PRIMARY}18`, alignItems: "center", justifyContent: "center" },
  itemAvatarText: { fontSize: 18, fontWeight: "800", color: BRAND_PRIMARY },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: "700", color: "#111" },
  itemBrand: { fontSize: 11, color: BRAND_MUTED, marginTop: 2 },
  itemDate: { fontSize: 10, color: BRAND_MUTED, marginTop: 3 },
  itemActions: { flexDirection: "row", gap: 8 },
  editBtn: { width: 36, height: 36, backgroundColor: `${BRAND_PRIMARY}18`, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  deleteBtn: { width: 36, height: 36, backgroundColor: "#fee2e2", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  modal: { flex: 1, backgroundColor: "#fff" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111" },
  modalClose: { fontSize: 20, color: BRAND_MUTED, padding: 4 },
  formBody: { padding: 20, gap: 14 },
  fieldWrap: {},
  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#374151", marginBottom: 6 },
  fieldInput: { backgroundColor: "#f9fafb", borderRadius: 12, borderWidth: 1.5, borderColor: "#e5e7eb", paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#111" },
  submitBtn: { height: 52, borderRadius: 14, backgroundColor: BRAND_PRIMARY, alignItems: "center", justifyContent: "center", marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
