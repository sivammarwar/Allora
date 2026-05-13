import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

interface CatalogItem { id: string; name: string; brandName: string | null }
interface InventoryItem {
  id: string; itemId: string; quantity: number; mrp: number | null;
  price: number; specification: string | null; isActive: boolean;
  item: CatalogItem;
}

const emptyForm = { itemId: "", itemName: "", quantity: "", mrp: "", price: "", specification: "" };

export default function AgentInventoryScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);

  const { data: inventory = [], isLoading, refetch } = useQuery<InventoryItem[]>({
    queryKey: ["agent-inventory", search],
    queryFn: () => api.get(`/api/agent/inventory?search=${encodeURIComponent(search)}`) as any,
    enabled: !!user,
  });

  const { data: catalog = [] } = useQuery<CatalogItem[]>({
    queryKey: ["agent-items-catalog", catalogSearch],
    queryFn: () => api.get(`/api/agent/items?search=${encodeURIComponent(catalogSearch)}`) as any,
    enabled: showCatalogPicker,
  });

  const set = (k: keyof typeof emptyForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const addMut = useMutation({
    mutationFn: () => api.post("/api/agent/inventory", {
      itemId: form.itemId, quantity: Number(form.quantity),
      mrp: form.mrp ? Number(form.mrp) : null,
      price: Number(form.price), specification: form.specification || null,
    }) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-inventory"] });
      setShowForm(false); setForm(emptyForm);
      Alert.alert("✓ Added");
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed"),
  });

  const updateMut = useMutation({
    mutationFn: () => api.put(`/api/agent/inventory/${editingId}`, {
      quantity: Number(form.quantity),
      mrp: form.mrp ? Number(form.mrp) : null,
      price: Number(form.price), specification: form.specification || null,
    }) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-inventory"] });
      setShowForm(false); setEditingId(null); setForm(emptyForm);
      Alert.alert("✓ Updated");
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/agent/inventory/${id}`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-inventory"] }),
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed"),
  });

  const openEdit = (inv: InventoryItem) => {
    setEditingId(inv.id);
    setForm({ itemId: inv.itemId, itemName: inv.item.name, quantity: String(inv.quantity), mrp: inv.mrp ? String(inv.mrp) : "", price: String(inv.price), specification: inv.specification ?? "" });
    setShowForm(true);
  };

  return (
    <>
      <View style={s.screen}>
        <View style={s.topBar}>
          <View style={s.searchBar}>
            <TextInput style={s.searchInput} value={search} onChangeText={setSearch} placeholder="Search inventory…" placeholderTextColor="#9ca3af" />
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => { setEditingId(null); setForm(emptyForm); setShowForm(true); }}>
            <Text style={s.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={inventory}
          keyExtractor={(i) => i.id}
          style={{ flex: 1 }}
          contentContainerStyle={inventory.length === 0 ? s.emptyWrap : s.list}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🏪</Text>
              <Text style={s.emptyTitle}>No inventory yet</Text>
              <Text style={s.emptySub}>Tap "+ Add" to add items to your inventory.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.invCard}>
              <View style={s.invInfo}>
                <Text style={s.invName}>{item.item.name}</Text>
                {item.item.brandName && <Text style={s.invBrand}>{item.item.brandName}</Text>}
                <Text style={s.invMeta}>Qty: {item.quantity} · ₹{item.price}{item.mrp ? ` (MRP ₹${item.mrp})` : ""}</Text>
                {item.specification && <Text style={s.invSpec}>{item.specification}</Text>}
              </View>
              <View style={s.invActions}>
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}><Text style={s.editBtnText}>✏️</Text></TouchableOpacity>
                <TouchableOpacity style={s.deleteBtn} onPress={() => Alert.alert("Remove?", item.item.name, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Remove", style: "destructive", onPress: () => deleteMut.mutate(item.id) },
                ])}><Text style={s.deleteBtnText}>🗑️</Text></TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>

      {/* Add/Edit Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{editingId ? "Edit Item" : "Add to Inventory"}</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.formBody}>
            {!editingId && (
              <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>Select Item from Catalog</Text>
                <TouchableOpacity style={s.pickerBtn} onPress={() => setShowCatalogPicker(true)}>
                  <Text style={form.itemName ? s.pickerSelected : s.pickerPlaceholder}>
                    {form.itemName || "Tap to pick item…"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {[
              { k: "quantity" as const, label: "Quantity", kb: "numeric" as const },
              { k: "price" as const, label: "Price (₹)", kb: "numeric" as const },
              { k: "mrp" as const, label: "MRP (₹, optional)", kb: "numeric" as const },
              { k: "specification" as const, label: "Specification (optional)", kb: "default" as const },
            ].map(({ k, label, kb }) => (
              <View key={k} style={s.fieldWrap}>
                <Text style={s.fieldLabel}>{label}</Text>
                <TextInput style={s.fieldInput} value={form[k]} onChangeText={set(k)}
                  keyboardType={kb} placeholder={label} placeholderTextColor="#9ca3af" />
              </View>
            ))}
            <TouchableOpacity
              style={[s.submitBtn, (addMut.isPending || updateMut.isPending) && s.btnDisabled]}
              onPress={() => editingId ? updateMut.mutate() : addMut.mutate()}
              disabled={addMut.isPending || updateMut.isPending}
            >
              {addMut.isPending || updateMut.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>{editingId ? "Update" : "Add"}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Catalog Picker Modal */}
      <Modal visible={showCatalogPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCatalogPicker(false)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Pick Item</Text>
            <TouchableOpacity onPress={() => setShowCatalogPicker(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <View style={s.searchBar}>
            <TextInput style={[s.searchInput, { flex: 1 }]} value={catalogSearch} onChangeText={setCatalogSearch} placeholder="Search…" placeholderTextColor="#9ca3af" />
          </View>
          <FlatList
            data={catalog}
            keyExtractor={(i) => i.id}
            contentContainerStyle={s.list}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.catalogRow} onPress={() => { setForm((f) => ({ ...f, itemId: item.id, itemName: item.name })); setShowCatalogPicker(false); }}>
                <Text style={s.catalogName}>{item.name}</Text>
                {item.brandName && <Text style={s.catalogBrand}>{item.brandName}</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  topBar: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  searchBar: { flex: 1, flexDirection: "row", backgroundColor: "#f3f4f6", borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, height: 42, fontSize: 14, color: "#111" },
  addBtn: { backgroundColor: BRAND_PRIMARY, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  list: { padding: 16, gap: 10 },
  emptyWrap: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 8 },
  emptySub: { fontSize: 13, color: BRAND_MUTED, textAlign: "center" },
  invCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.04, elevation: 2 },
  invInfo: { flex: 1 },
  invName: { fontSize: 14, fontWeight: "700", color: "#111" },
  invBrand: { fontSize: 11, color: BRAND_MUTED },
  invMeta: { fontSize: 12, color: "#4b5563", marginTop: 4 },
  invSpec: { fontSize: 11, color: BRAND_MUTED, fontStyle: "italic", marginTop: 2 },
  invActions: { flexDirection: "row", gap: 8 },
  editBtn: { width: 36, height: 36, backgroundColor: `${BRAND_PRIMARY}18`, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  editBtnText: { fontSize: 16 },
  deleteBtn: { width: 36, height: 36, backgroundColor: "#fee2e2", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  deleteBtnText: { fontSize: 16 },
  modal: { flex: 1, backgroundColor: "#fff" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111" },
  modalClose: { fontSize: 20, color: BRAND_MUTED, padding: 4 },
  formBody: { padding: 20, gap: 14 },
  fieldWrap: {},
  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#374151", marginBottom: 6 },
  fieldInput: { backgroundColor: "#f9fafb", borderRadius: 12, borderWidth: 1.5, borderColor: "#e5e7eb", paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#111" },
  pickerBtn: { backgroundColor: "#f9fafb", borderRadius: 12, borderWidth: 1.5, borderColor: "#e5e7eb", paddingHorizontal: 14, paddingVertical: 12 },
  pickerSelected: { fontSize: 14, color: "#111" },
  pickerPlaceholder: { fontSize: 14, color: "#9ca3af" },
  submitBtn: { height: 52, borderRadius: 14, backgroundColor: BRAND_PRIMARY, alignItems: "center", justifyContent: "center", marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  catalogRow: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f3f4f6" },
  catalogName: { fontSize: 14, fontWeight: "600", color: "#111" },
  catalogBrand: { fontSize: 11, color: BRAND_MUTED, marginTop: 2 },
});
