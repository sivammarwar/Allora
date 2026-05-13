import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, Image, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, ScrollView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

interface HeroProduct {
  id: string; productId: string; sellingPrice: number; isAvailable: boolean;
  product: { id: string; name: string; description: string | null; imageUrl: string | null; basePrice: number; category: { name: string } };
}
interface CatalogProduct {
  id: string; name: string; description: string | null; imageUrl: string | null; basePrice: number;
  category: { id: string; name: string };
}

export default function HeroProductsScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sellingPrices, setSellingPrices] = useState<Record<string, string>>({});

  const { data: myProducts = [], isLoading } = useQuery<HeroProduct[]>({
    queryKey: ["hero-my-products"],
    queryFn: () => api.get("/api/hero/my-products") as any,
    enabled: !!user,
  });

  const { data: catalog = [], isLoading: loadingCatalog } = useQuery<CatalogProduct[]>({
    queryKey: ["hero-catalog", search],
    queryFn: () => api.get(`/api/hero/catalog-products?search=${encodeURIComponent(search)}`) as any,
    enabled: modalOpen,
  });

  const addedIds = new Set(myProducts.map((p) => p.productId));
  const available = catalog.filter((p) => !addedIds.has(p.id));

  const addMut = useMutation({
    mutationFn: ({ productId, sellingPrice }: { productId: string; sellingPrice: number }) =>
      api.post("/api/hero/my-products", { productId, sellingPrice }) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hero-my-products"] });
      qc.invalidateQueries({ queryKey: ["hero-catalog"] });
      Alert.alert("✓ Added", "Product added to your store.");
      setModalOpen(false);
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/hero/my-products/${id}`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hero-my-products"] }),
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed"),
  });

  if (isLoading) return <View style={s.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;

  return (
    <>
      <View style={s.screen}>
        {/* Header bar */}
        <View style={s.topBar}>
          <Text style={s.topTitle}>{myProducts.length} products in your store</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => setModalOpen(true)}>
            <Text style={s.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={myProducts}
          keyExtractor={(p) => p.id}
          numColumns={2}
          contentContainerStyle={myProducts.length === 0 ? s.emptyWrap : s.grid}
          columnWrapperStyle={{ gap: 12 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🛍️</Text>
              <Text style={s.emptyTitle}>No products yet</Text>
              <Text style={s.emptySub}>Tap "+ Add" to pick products from the catalog.</Text>
            </View>
          }
          renderItem={({ item: hp }) => {
            const disc = hp.product.basePrice > 0
              ? Math.round(((hp.product.basePrice - hp.sellingPrice) / hp.product.basePrice) * 100)
              : 0;
            return (
              <View style={s.productCard}>
                {hp.product.imageUrl ? (
                  <Image source={{ uri: hp.product.imageUrl }} style={s.productImg} resizeMode="cover" />
                ) : (
                  <View style={s.productImgPlaceholder}><Text style={s.productImgIcon}>📦</Text></View>
                )}
                <View style={s.productBody}>
                  <Text style={s.productName} numberOfLines={2}>{hp.product.name}</Text>
                  <Text style={s.productCat}>{hp.product.category.name}</Text>
                  <View style={s.priceRow}>
                    <Text style={s.sellingPrice}>₹{hp.sellingPrice}</Text>
                    {disc > 0 && <Text style={s.discountBadge}>{disc}% off</Text>}
                  </View>
                  <View style={s.cardFooter}>
                    <View style={[s.availBadge, { backgroundColor: hp.isAvailable ? "#dcfce7" : "#f3f4f6" }]}>
                      <Text style={[s.availText, { color: hp.isAvailable ? "#15803d" : BRAND_MUTED }]}>
                        {hp.isAvailable ? "Available" : "Unavailable"}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => Alert.alert("Remove?", hp.product.name, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Remove", style: "destructive", onPress: () => deleteMut.mutate(hp.id) },
                    ])}>
                      <Text style={s.deleteBtn}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      </View>

      {/* Add from Catalog Modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Add from Catalog</Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <View style={s.searchBar}>
            <Text>🔍</Text>
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search products…"
              placeholderTextColor="#9ca3af"
            />
          </View>
          {loadingCatalog ? (
            <View style={s.center}><ActivityIndicator color={BRAND_PRIMARY} /></View>
          ) : (
            <FlatList
              data={available}
              keyExtractor={(p) => p.id}
              contentContainerStyle={s.catalogList}
              ListEmptyComponent={<Text style={s.emptySub}>No products available to add.</Text>}
              renderItem={({ item: p }) => (
                <View style={s.catalogCard}>
                  {p.imageUrl && <Image source={{ uri: p.imageUrl }} style={s.catalogImg} />}
                  <View style={s.catalogInfo}>
                    <Text style={s.catalogName}>{p.name}</Text>
                    <Text style={s.catalogCat}>{p.category.name}</Text>
                    <Text style={s.catalogBase}>Base: ₹{p.basePrice}</Text>
                  </View>
                  <View style={s.catalogPriceWrap}>
                    <Text style={s.catalogPriceLabel}>Your price</Text>
                    <TextInput
                      style={s.catalogPriceInput}
                      value={sellingPrices[p.id] ?? String(p.basePrice)}
                      onChangeText={(v) => setSellingPrices((prev) => ({ ...prev, [p.id]: v }))}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={s.catalogAddBtn}
                      onPress={() => {
                        const price = Number(sellingPrices[p.id] ?? p.basePrice);
                        if (price <= 0) { Alert.alert("Price must be > 0"); return; }
                        addMut.mutate({ productId: p.id, sellingPrice: price });
                      }}
                      disabled={addMut.isPending}
                    >
                      <Text style={s.catalogAddText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  topTitle: { fontSize: 14, color: BRAND_MUTED },
  addBtn: { backgroundColor: BRAND_PRIMARY, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  grid: { padding: 16, gap: 12 },
  emptyWrap: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 8 },
  emptySub: { fontSize: 13, color: BRAND_MUTED, textAlign: "center" },
  productCard: { flex: 1, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
  productImg: { width: "100%", height: 110 },
  productImgPlaceholder: { width: "100%", height: 110, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  productImgIcon: { fontSize: 30 },
  productBody: { padding: 10 },
  productName: { fontSize: 12, fontWeight: "700", color: "#111", marginBottom: 2 },
  productCat: { fontSize: 10, color: BRAND_MUTED, marginBottom: 6 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  sellingPrice: { fontSize: 15, fontWeight: "800", color: BRAND_PRIMARY },
  discountBadge: { fontSize: 10, color: "#16a34a", fontWeight: "700" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  availBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  availText: { fontSize: 9, fontWeight: "700" },
  deleteBtn: { fontSize: 16 },
  modal: { flex: 1, backgroundColor: "#fff" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111" },
  modalClose: { fontSize: 20, color: BRAND_MUTED, padding: 4 },
  searchBar: { flexDirection: "row", alignItems: "center", margin: 12, backgroundColor: "#f3f4f6", borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: "#111", marginLeft: 8 },
  catalogList: { padding: 16, gap: 10 },
  catalogCard: { flexDirection: "row", backgroundColor: "#f9fafb", borderRadius: 14, padding: 12, gap: 10, alignItems: "center" },
  catalogImg: { width: 52, height: 52, borderRadius: 10 },
  catalogInfo: { flex: 1 },
  catalogName: { fontSize: 13, fontWeight: "700", color: "#111" },
  catalogCat: { fontSize: 10, color: BRAND_MUTED },
  catalogBase: { fontSize: 11, color: BRAND_MUTED, marginTop: 2 },
  catalogPriceWrap: { alignItems: "center", gap: 6 },
  catalogPriceLabel: { fontSize: 9, color: BRAND_MUTED },
  catalogPriceInput: { width: 70, backgroundColor: "#fff", borderRadius: 8, borderWidth: 1.5, borderColor: "#e5e7eb", paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, textAlign: "center", color: "#111" },
  catalogAddBtn: { backgroundColor: BRAND_PRIMARY, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  catalogAddText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
