import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, FlatList, Modal,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

interface SubcategoryOption { id: string; name: string; category: { id: string; name: string; type: string } }
interface PriceEntry {
  id: string; subcategoryId: string;
  baseServiceCharge: string; discountPercent: string; slotDurationHours: number;
  subcategory: SubcategoryOption;
}
interface CategoryConfig {
  id: string; categoryId: string;
  transportChargePerKm: string; bulkDiscount2: string; bulkDiscount3: string; bulkDiscount4Plus: string;
  slotStartHour: number; slotEndHour: number;
  category: { id: string; name: string; type: string };
}
interface CategoryOption { id: string; name: string; type: string }

// ── Existing price row (edit) ──
function PriceRow({ entry, onSave, onDelete, saving }: { entry: PriceEntry; onSave: (d: any) => void; onDelete: () => void; saving: boolean }) {
  const [base, setBase] = useState(entry.baseServiceCharge);
  const [disc, setDisc] = useState(entry.discountPercent);
  const [slot, setSlot] = useState(String(entry.slotDurationHours));
  const final = (Number(base) * (1 - Math.min(100, Number(disc)) / 100)).toFixed(0);

  return (
    <View style={styles.priceRow}>
      <View style={styles.priceRowHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.subName}>{entry.subcategory.name}</Text>
          <Text style={styles.subCat}>{entry.subcategory.category.name}</Text>
        </View>
        <TouchableOpacity onPress={() => Alert.alert("Remove", `Remove pricing for ${entry.subcategory.name}?`, [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: onDelete },
        ])}>
          <Text style={{ color: "#ef4444", fontSize: 13, fontWeight: "600" }}>Remove</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.priceFields}>
        <View style={styles.priceField}>
          <Text style={styles.priceLabel}>Base (₹)</Text>
          <TextInput style={styles.priceInput} value={base} onChangeText={setBase} keyboardType="numeric" />
        </View>
        <View style={styles.priceField}>
          <Text style={styles.priceLabel}>Discount %</Text>
          <TextInput style={styles.priceInput} value={disc} onChangeText={setDisc} keyboardType="numeric" />
        </View>
        <View style={styles.priceField}>
          <Text style={styles.priceLabel}>Slot hrs</Text>
          <TextInput style={styles.priceInput} value={slot} onChangeText={setSlot} keyboardType="numeric" />
        </View>
      </View>
      <View style={styles.priceFooter}>
        <Text style={styles.finalPrice}>Final: ₹{final}</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={() => onSave({ subcategoryId: entry.subcategoryId, baseServiceCharge: Number(base), discountPercent: Number(disc), slotDurationHours: Number(slot) })}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Existing category config row (edit) ──
function CatConfigRow({ cfg, onSave, onDelete, saving }: { cfg: CategoryConfig; onSave: (d: any) => void; onDelete: () => void; saving: boolean }) {
  const [transport, setTransport] = useState(cfg.transportChargePerKm);
  const [d2, setD2] = useState(cfg.bulkDiscount2);
  const [d3, setD3] = useState(cfg.bulkDiscount3);
  const [d4, setD4] = useState(cfg.bulkDiscount4Plus);
  const [startHr, setStartHr] = useState(String(cfg.slotStartHour ?? 6));
  const [endHr, setEndHr] = useState(String(cfg.slotEndHour ?? 20));

  return (
    <View style={styles.catCard}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Text style={styles.catName}>{cfg.category.name}</Text>
        <TouchableOpacity onPress={() => Alert.alert("Remove", `Remove config for ${cfg.category.name}?`, [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: onDelete },
        ])}>
          <Text style={{ color: "#ef4444", fontSize: 13, fontWeight: "600" }}>Remove</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.priceFields}>
        <View style={styles.priceField}>
          <Text style={styles.priceLabel}>Transport/km (₹)</Text>
          <TextInput style={styles.priceInput} value={transport} onChangeText={setTransport} keyboardType="numeric" />
        </View>
        <View style={styles.priceField}>
          <Text style={styles.priceLabel}>Bulk 2 (%)</Text>
          <TextInput style={styles.priceInput} value={d2} onChangeText={setD2} keyboardType="numeric" />
        </View>
        <View style={styles.priceField}>
          <Text style={styles.priceLabel}>Bulk 3 (%)</Text>
          <TextInput style={styles.priceInput} value={d3} onChangeText={setD3} keyboardType="numeric" />
        </View>
        <View style={styles.priceField}>
          <Text style={styles.priceLabel}>Bulk 4+ (%)</Text>
          <TextInput style={styles.priceInput} value={d4} onChangeText={setD4} keyboardType="numeric" />
        </View>
      </View>
      <Text style={[styles.sectionTitle, { fontSize: 13, marginTop: 10, marginBottom: 6 }]}>Slot Hours</Text>
      <View style={styles.priceFields}>
        <View style={styles.priceField}>
          <Text style={styles.priceLabel}>Start hour</Text>
          <TextInput style={styles.priceInput} value={startHr} onChangeText={setStartHr} keyboardType="numeric" placeholder="6" />
        </View>
        <View style={styles.priceField}>
          <Text style={styles.priceLabel}>End hour</Text>
          <TextInput style={styles.priceInput} value={endHr} onChangeText={setEndHr} keyboardType="numeric" placeholder="20" />
        </View>
      </View>
      <Text style={{ fontSize: 11, color: BRAND_MUTED, marginBottom: 10 }}>
        Slots: {startHr.padStart(2, "0")}:00 – {endHr.padStart(2, "0")}:00
      </Text>
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.btnDisabled]}
        onPress={() => onSave({
          categoryId: cfg.categoryId,
          transportChargePerKm: Number(transport),
          bulkDiscount2: Number(d2), bulkDiscount3: Number(d3), bulkDiscount4Plus: Number(d4),
          slotStartHour: Number(startHr), slotEndHour: Number(endHr),
        })}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>Save Category Config</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AgentPriceControlScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // ── add category modal state ──
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [catSearch, setCatSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<CategoryOption | null>(null);
  const [newTransport, setNewTransport] = useState("0");
  const [newD2, setNewD2] = useState("0");
  const [newD3, setNewD3] = useState("0");
  const [newD4, setNewD4] = useState("0");
  const [newStartHr, setNewStartHr] = useState("6");
  const [newEndHr, setNewEndHr] = useState("20");

  // ── add subcategory modal state ──
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [subSearch, setSubSearch] = useState("");
  const [selectedSub, setSelectedSub] = useState<SubcategoryOption | null>(null);
  const [newBase, setNewBase] = useState("0");
  const [newDisc, setNewDisc] = useState("0");
  const [newSlot, setNewSlot] = useState("1");

  // ── queries ──
  const { data: entries = [], isLoading: loadingEntries } = useQuery<PriceEntry[]>({
    queryKey: ["agent-price-control"],
    queryFn: () => api.get("/api/agent/price-control") as any,
    enabled: !!user,
  });

  const { data: catConfigs = [], isLoading: loadingCat } = useQuery<CategoryConfig[]>({
    queryKey: ["agent-category-config"],
    queryFn: () => api.get("/api/agent/category-config") as any,
    enabled: !!user,
  });

  const { data: allCategories = [] } = useQuery<CategoryOption[]>({
    queryKey: ["categories-service-all"],
    queryFn: async () => {
      const rows: any[] = await api.get("/api/user/categories") as any;
      return rows.filter((c: any) => c.type === "SERVICE");
    },
    enabled: addCatOpen,
  });

  const { data: allSubcategories = [] } = useQuery<SubcategoryOption[]>({
    queryKey: ["subcategories-service-all"],
    queryFn: async () => {
      const rows: any[] = await api.get("/api/user/subcategories") as any;
      return rows
        .filter((s: any) => s.categoryType === "SERVICE")
        .map((s: any) => ({ id: s.id, name: s.name, category: { id: s.categoryId, name: s.categoryName, type: "SERVICE" } }));
    },
    enabled: addSubOpen,
  });

  const configuredCatIds = new Set(catConfigs.map((c) => c.categoryId));
  const availableCats = allCategories.filter(
    (c) => !configuredCatIds.has(c.id) && c.name.toLowerCase().includes(catSearch.toLowerCase())
  );

  const controlledSubIds = new Set(entries.map((e) => e.subcategoryId));
  const availableSubs = allSubcategories.filter(
    (s) => !controlledSubIds.has(s.id) &&
      (s.name.toLowerCase().includes(subSearch.toLowerCase()) || s.category.name.toLowerCase().includes(subSearch.toLowerCase()))
  );

  // ── mutations ──
  const savePriceMut = useMutation({
    mutationFn: (d: any) => api.put(`/api/agent/price-control/${d._id}`, d) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent-price-control"] }); Alert.alert("Saved"); },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed."),
  });

  const addPriceMut = useMutation({
    mutationFn: (d: any) => api.post("/api/agent/price-control", d) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-price-control"] });
      Alert.alert("Added");
      setAddSubOpen(false); setSelectedSub(null); setSubSearch(""); setNewBase("0"); setNewDisc("0"); setNewSlot("1");
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed."),
  });

  const deletePriceMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/agent/price-control/${id}`) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent-price-control"] }); Alert.alert("Removed"); },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed."),
  });

  const saveCatMut = useMutation({
    mutationFn: (d: any) => api.post("/api/agent/category-config", d) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent-category-config"] }); Alert.alert("Saved"); },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed."),
  });

  const addCatMut = useMutation({
    mutationFn: (d: any) => api.post("/api/agent/category-config", d) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-category-config"] });
      Alert.alert("Category config added");
      setAddCatOpen(false); setSelectedCat(null); setCatSearch("");
      setNewTransport("0"); setNewD2("0"); setNewD3("0"); setNewD4("0"); setNewStartHr("6"); setNewEndHr("20");
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed."),
  });

  const deleteCatMut = useMutation({
    mutationFn: (categoryId: string) => api.delete(`/api/agent/category-config/${categoryId}`) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent-category-config"] }); Alert.alert("Removed"); },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed."),
  });

  if (loadingEntries || loadingCat) {
    return <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;
  }

  return (
    <>
      <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
        {/* ── Section 1: Category Config ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Category Config</Text>
              <Text style={styles.sectionSub}>Transport, bulk discounts & slot hours</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setAddCatOpen(true)}>
              <Text style={styles.addBtnText}>+ Add Category</Text>
            </TouchableOpacity>
          </View>

          {catConfigs.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No categories configured yet. Tap "Add Category" to start.</Text>
            </View>
          ) : (
            catConfigs.map((cfg) => (
              <CatConfigRow
                key={cfg.id}
                cfg={cfg}
                onSave={saveCatMut.mutate}
                onDelete={() => deleteCatMut.mutate(cfg.categoryId)}
                saving={saveCatMut.isPending}
              />
            ))
          )}
        </View>

        {/* ── Section 2: Subcategory Pricing ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Subcategory Pricing</Text>
              <Text style={styles.sectionSub}>Base charge, discount & slot duration</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setAddSubOpen(true)}>
              <Text style={styles.addBtnText}>+ Add Subcategory</Text>
            </TouchableOpacity>
          </View>

          {entries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No subcategories configured yet. Tap "Add Subcategory" to start.</Text>
            </View>
          ) : (
            entries.map((e) => (
              <PriceRow
                key={e.id}
                entry={e}
                onSave={(d: any) => savePriceMut.mutate({ ...d, _id: e.id })}
                onDelete={() => deletePriceMut.mutate(e.id)}
                saving={savePriceMut.isPending}
              />
            ))
          )}
        </View>
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ── Add Category Modal ── */}
      <Modal visible={addCatOpen} animationType="slide" onRequestClose={() => setAddCatOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Category Config</Text>
            <TouchableOpacity onPress={() => setAddCatOpen(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search service category..."
              value={catSearch}
              onChangeText={(t) => { setCatSearch(t); setSelectedCat(null); }}
            />
            {selectedCat ? (
              <View style={styles.selectedChip}>
                <Text style={styles.selectedChipText}>{selectedCat.name}</Text>
                <TouchableOpacity onPress={() => setSelectedCat(null)}>
                  <Text style={{ color: BRAND_PRIMARY, fontWeight: "700", fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pickList}>
                {availableCats.length === 0 ? (
                  <Text style={styles.pickEmpty}>{allCategories.length === 0 ? "Loading…" : "All categories configured"}</Text>
                ) : (
                  availableCats.map((c) => (
                    <TouchableOpacity key={c.id} style={styles.pickItem} onPress={() => setSelectedCat(c)}>
                      <Text style={styles.pickItemText}>{c.name}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
            <View style={styles.priceFields}>
              <View style={styles.priceField}>
                <Text style={styles.priceLabel}>Transport/km (₹)</Text>
                <TextInput style={styles.priceInput} value={newTransport} onChangeText={setNewTransport} keyboardType="numeric" />
              </View>
              <View style={styles.priceField}>
                <Text style={styles.priceLabel}>Bulk 2 (%)</Text>
                <TextInput style={styles.priceInput} value={newD2} onChangeText={setNewD2} keyboardType="numeric" />
              </View>
              <View style={styles.priceField}>
                <Text style={styles.priceLabel}>Bulk 3 (%)</Text>
                <TextInput style={styles.priceInput} value={newD3} onChangeText={setNewD3} keyboardType="numeric" />
              </View>
              <View style={styles.priceField}>
                <Text style={styles.priceLabel}>Bulk 4+ (%)</Text>
                <TextInput style={styles.priceInput} value={newD4} onChangeText={setNewD4} keyboardType="numeric" />
              </View>
              <View style={styles.priceField}>
                <Text style={styles.priceLabel}>Slot Start Hour</Text>
                <TextInput style={styles.priceInput} value={newStartHr} onChangeText={setNewStartHr} keyboardType="numeric" />
              </View>
              <View style={styles.priceField}>
                <Text style={styles.priceLabel}>Slot End Hour</Text>
                <TextInput style={styles.priceInput} value={newEndHr} onChangeText={setNewEndHr} keyboardType="numeric" />
              </View>
            </View>
            <TouchableOpacity
              style={[styles.saveBtn, { marginTop: 16, width: "100%" }, (!selectedCat || addCatMut.isPending) && styles.btnDisabled]}
              disabled={!selectedCat || addCatMut.isPending}
              onPress={() => addCatMut.mutate({
                categoryId: selectedCat!.id,
                transportChargePerKm: Number(newTransport),
                bulkDiscount2: Number(newD2), bulkDiscount3: Number(newD3), bulkDiscount4Plus: Number(newD4),
                slotStartHour: Number(newStartHr), slotEndHour: Number(newEndHr),
              })}
            >
              <Text style={styles.saveBtnText}>{addCatMut.isPending ? "Adding…" : "Add Category Config"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Add Subcategory Modal ── */}
      <Modal visible={addSubOpen} animationType="slide" onRequestClose={() => setAddSubOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Subcategory Pricing</Text>
            <TouchableOpacity onPress={() => setAddSubOpen(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search subcategory..."
              value={subSearch}
              onChangeText={(t) => { setSubSearch(t); setSelectedSub(null); }}
            />
            {selectedSub ? (
              <View style={styles.selectedChip}>
                <View>
                  <Text style={styles.selectedChipText}>{selectedSub.name}</Text>
                  <Text style={{ fontSize: 11, color: BRAND_MUTED }}>{selectedSub.category.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedSub(null)}>
                  <Text style={{ color: BRAND_PRIMARY, fontWeight: "700", fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pickList}>
                {availableSubs.length === 0 ? (
                  <Text style={styles.pickEmpty}>{allSubcategories.length === 0 ? "Loading…" : "No more subcategories to add"}</Text>
                ) : (
                  availableSubs.map((s) => (
                    <TouchableOpacity key={s.id} style={styles.pickItem} onPress={() => setSelectedSub(s)}>
                      <Text style={styles.pickItemText}>{s.name}</Text>
                      <Text style={{ fontSize: 11, color: BRAND_MUTED }}>{s.category.name}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
            <View style={styles.priceFields}>
              <View style={styles.priceField}>
                <Text style={styles.priceLabel}>Base charge (₹)</Text>
                <TextInput style={styles.priceInput} value={newBase} onChangeText={setNewBase} keyboardType="numeric" />
              </View>
              <View style={styles.priceField}>
                <Text style={styles.priceLabel}>Discount (%)</Text>
                <TextInput style={styles.priceInput} value={newDisc} onChangeText={setNewDisc} keyboardType="numeric" />
              </View>
              <View style={styles.priceField}>
                <Text style={styles.priceLabel}>Slot duration (hrs)</Text>
                <TextInput style={styles.priceInput} value={newSlot} onChangeText={setNewSlot} keyboardType="numeric" />
              </View>
            </View>
            {Number(newDisc) > 0 && Number(newBase) > 0 && (
              <Text style={{ fontSize: 13, color: BRAND_PRIMARY, fontWeight: "700", marginTop: 8 }}>
                Final: ₹{(Number(newBase) * (1 - Number(newDisc) / 100)).toFixed(0)} ({newDisc}% off)
              </Text>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, { marginTop: 16, width: "100%" }, (!selectedSub || addPriceMut.isPending) && styles.btnDisabled]}
              disabled={!selectedSub || addPriceMut.isPending}
              onPress={() => addPriceMut.mutate({
                subcategoryId: selectedSub!.id,
                baseServiceCharge: Number(newBase),
                discountPercent: Number(newDisc),
                slotDurationHours: Number(newSlot),
              })}
            >
              <Text style={styles.saveBtnText}>{addPriceMut.isPending ? "Adding…" : "Add Subcategory Pricing"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  section: { padding: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111" },
  sectionSub: { fontSize: 11, color: BRAND_MUTED, marginTop: 2 },
  empty: { padding: 24, alignItems: "center" },
  emptyText: { color: BRAND_MUTED, fontSize: 14, textAlign: "center" },
  addBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: BRAND_PRIMARY,
  },
  addBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  priceRow: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOpacity: 0.04, elevation: 2,
  },
  priceRowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  subName: { fontSize: 14, fontWeight: "700", color: "#111" },
  subCat: { fontSize: 11, color: BRAND_MUTED },
  catCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOpacity: 0.04, elevation: 2,
  },
  catName: { fontSize: 15, fontWeight: "700", color: "#111" },
  priceFields: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10, marginTop: 8 },
  priceField: { width: "47%" },
  priceLabel: { fontSize: 11, color: BRAND_MUTED, marginBottom: 4 },
  priceInput: {
    backgroundColor: "#f9fafb", borderRadius: 8, borderWidth: 1.5, borderColor: "#e5e7eb",
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: "#111",
  },
  priceFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  finalPrice: { fontSize: 13, color: BRAND_PRIMARY, fontWeight: "700" },
  saveBtn: {
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10,
    backgroundColor: BRAND_PRIMARY, alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
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
  searchInput: {
    backgroundColor: "#fff", borderRadius: 10, borderWidth: 1.5, borderColor: "#e5e7eb",
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#111", marginBottom: 12,
  },
  selectedChip: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: `${BRAND_PRIMARY}15`, borderRadius: 10, borderWidth: 1, borderColor: `${BRAND_PRIMARY}30`,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  selectedChipText: { fontSize: 14, fontWeight: "600", color: "#111" },
  pickList: {
    backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb",
    maxHeight: 200, marginBottom: 12,
  },
  pickEmpty: { padding: 16, textAlign: "center", color: BRAND_MUTED, fontSize: 13 },
  pickItem: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  pickItemText: { fontSize: 14, fontWeight: "600", color: "#111" },
});
