import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
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

function PriceRow({ entry, onSave, saving }: { entry: PriceEntry; onSave: (d: any) => void; saving: boolean }) {
  const [base, setBase] = useState(entry.baseServiceCharge);
  const [disc, setDisc] = useState(entry.discountPercent);
  const [slot, setSlot] = useState(String(entry.slotDurationHours));
  const final = (Number(base) * (1 - Math.min(100, Number(disc)) / 100)).toFixed(0);

  return (
    <View style={styles.priceRow}>
      <View style={styles.priceRowHeader}>
        <Text style={styles.subName}>{entry.subcategory.name}</Text>
        <Text style={styles.subCat}>{entry.subcategory.category.name}</Text>
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

const HOURS = Array.from({ length: 25 }, (_, i) => i);

function CatConfigRow({ cfg, onSave, saving }: { cfg: CategoryConfig; onSave: (d: any) => void; saving: boolean }) {
  const [transport, setTransport] = useState(cfg.transportChargePerKm);
  const [d2, setD2] = useState(cfg.bulkDiscount2);
  const [d3, setD3] = useState(cfg.bulkDiscount3);
  const [d4, setD4] = useState(cfg.bulkDiscount4Plus);
  const [startHr, setStartHr] = useState(String(cfg.slotStartHour ?? 6));
  const [endHr, setEndHr] = useState(String(cfg.slotEndHour ?? 20));

  return (
    <View style={styles.catCard}>
      <Text style={styles.catName}>{cfg.category.name}</Text>
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
        <Text style={styles.saveBtnText}>💾 Save Category Config</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AgentPriceControlScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();

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

  const savePriceMut = useMutation({
    mutationFn: (d: any) => api.put("/api/agent/price-control", d) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent-price-control"] }); Alert.alert("✓ Saved"); },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed."),
  });

  const saveCatMut = useMutation({
    mutationFn: (d: any) => api.post("/api/agent/category-config", d) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent-category-config"] }); Alert.alert("✓ Saved"); },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed."),
  });

  if (loadingEntries || loadingCat) {
    return <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;
  }

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      {/* Category transport + bulk discounts */}
      {catConfigs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Config</Text>
          {catConfigs.map((cfg) => (
            <CatConfigRow key={cfg.id} cfg={cfg} onSave={saveCatMut.mutate} saving={saveCatMut.isPending} />
          ))}
        </View>
      )}

      {/* Subcategory base price + discount */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subcategory Pricing</Text>
        {entries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No subcategories configured yet.</Text>
          </View>
        ) : (
          entries.map((e) => (
            <PriceRow key={e.id} entry={e} onSave={savePriceMut.mutate} saving={savePriceMut.isPending} />
          ))
        )}
      </View>
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111", marginBottom: 12 },
  empty: { padding: 24, alignItems: "center" },
  emptyText: { color: BRAND_MUTED, fontSize: 14 },
  priceRow: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOpacity: 0.04, elevation: 2,
  },
  priceRowHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  subName: { fontSize: 14, fontWeight: "700", color: "#111" },
  subCat: { fontSize: 11, color: BRAND_MUTED },
  catCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOpacity: 0.04, elevation: 2,
  },
  catName: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 12 },
  priceFields: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  priceField: { width: "47%" },
  priceLabel: { fontSize: 11, color: BRAND_MUTED, marginBottom: 4 },
  priceInput: {
    backgroundColor: "#f9fafb", borderRadius: 8, borderWidth: 1.5, borderColor: "#e5e7eb",
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: "#111",
  },
  priceFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  finalPrice: { fontSize: 13, color: BRAND_PRIMARY, fontWeight: "700" },
  saveBtn: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10,
    backgroundColor: BRAND_PRIMARY, alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
