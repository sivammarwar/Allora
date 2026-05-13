import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, FlatList, StyleSheet, Image,
  TextInput, TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useSecretCart } from "../../lib/secretShopCart";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

interface InventoryItem {
  id: string; itemId: string; mrp: number | null; price: number; quantity: number;
  specification: string | null;
  item: { id: string; name: string; brandName: string | null; imageUrl: string | null; buyCount: number;
    category: { id: string; name: string; imageUrl: string | null } | null };
}
interface MeResponse {
  state: "needs_request" | "pending" | "verified";
  request?: { id: string; status: string; shopName: string };
  profile?: { id: string; shopName: string; isVerifiedByAgent: boolean };
}

function ProductCard({ inv }: { inv: InventoryItem }) {
  const { add, inc, dec, items: cartItems } = useSecretCart();
  const inCart = cartItems.find((c) => c.inventoryItemId === inv.id);
  const discount = inv.mrp && Number(inv.mrp) > Number(inv.price)
    ? Math.round((1 - Number(inv.price) / Number(inv.mrp)) * 100) : null;

  return (
    <View style={styles.productCard}>
      {inv.item.imageUrl ? (
        <Image source={{ uri: inv.item.imageUrl }} style={styles.productImg} resizeMode="cover" />
      ) : (
        <View style={styles.productImgPlaceholder}><Text style={styles.productImgIcon}>📦</Text></View>
      )}
      <View style={styles.productBody}>
        <Text style={styles.productName} numberOfLines={2}>{inv.item.name}</Text>
        {inv.item.brandName && <Text style={styles.productBrand}>{inv.item.brandName}</Text>}
        <View style={styles.productPriceRow}>
          <Text style={styles.productPrice}>₹{Number(inv.price)}</Text>
          {discount && <Text style={styles.productDiscount}>{discount}% off</Text>}
        </View>
        {inv.quantity === 0 ? (
          <View style={styles.outOfStock}><Text style={styles.outOfStockText}>Out of stock</Text></View>
        ) : inCart ? (
          <View style={styles.qtyRow}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => dec(inv.id)}>
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyVal}>{inCart.quantity}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => inc(inv.id)}>
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => add({ inventoryItemId: inv.id, name: inv.item.name, price: Number(inv.price), imageUrl: inv.item.imageUrl })}
          >
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const submit = useMutation({
    mutationFn: () => api.post("/api/secret-shop/register-request", {
      shopName: shopName.trim(), phone: phone.trim(), address: address.trim(),
      locationLat: 0, locationLng: 0,
    }) as any,
    onSuccess: () => { Alert.alert("Submitted!", "An agent will verify you shortly."); onSuccess(); },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed."),
  });

  const canSubmit = shopName.trim().length >= 2 && phone.trim().length >= 7 && address.trim().length >= 3;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Join Secret Shop</Text>
      <Text style={styles.pageSub}>Register your shop and start ordering from the agent inventory.</Text>
      {[
        { label: "Shop name", val: shopName, set: setShopName, kb: "default" as const },
        { label: "Phone", val: phone, set: setPhone, kb: "phone-pad" as const },
        { label: "Address", val: address, set: setAddress, kb: "default" as const },
      ].map(({ label, val, set, kb }) => (
        <View key={label} style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <TextInput style={styles.input} value={val} onChangeText={set}
            keyboardType={kb} placeholderTextColor="#9ca3af" placeholder={label} />
        </View>
      ))}
      <TouchableOpacity
        style={[styles.submitBtn, (!canSubmit || submit.isPending) && styles.btnDisabled]}
        onPress={() => submit.mutate()} disabled={!canSubmit || submit.isPending}
      >
        {submit.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit →</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

export default function SecretShopDashboardScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { load: loadCart, count } = useSecretCart();
  const [search, setSearch] = useState("");

  useEffect(() => { loadCart(); }, []);

  const { data: me, isLoading: loadingMe } = useQuery<MeResponse>({
    queryKey: ["secret-shop-me"],
    queryFn: () => api.get("/api/secret-shop/me") as any,
    enabled: !!user,
  });

  const { data: items = [], isLoading: loadingItems } = useQuery<InventoryItem[]>({
    queryKey: ["secret-shop-items", search],
    queryFn: () => api.get(`/api/secret-shop/items${search ? `?q=${encodeURIComponent(search)}` : ""}`) as any,
    enabled: me?.state === "verified",
  });

  if (loadingMe) return <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;

  if (!me || me.state === "needs_request") {
    return <RegisterForm onSuccess={() => qc.invalidateQueries({ queryKey: ["secret-shop-me"] })} />;
  }

  if (me.state === "pending") {
    const inProgress = me.request?.status === "IN_PROGRESS";
    return (
      <View style={styles.center}>
        <Text style={styles.pendingIcon}>{inProgress ? "🔄" : "⏳"}</Text>
        <Text style={styles.pendingTitle}>{inProgress ? "Agent is reviewing" : "Verification pending"}</Text>
        <Text style={styles.pendingSub}>
          {inProgress ? `Agent is reviewing "${me.request?.shopName}"` : "We've notified an agent to review your shop."}
        </Text>
      </View>
    );
  }

  // Verified — show store
  const catMap = new Map<string, InventoryItem[]>();
  for (const inv of items) {
    const cat = inv.item.category?.name ?? "Other";
    (catMap.get(cat) ?? catMap.set(cat, []).get(cat)!).push(inv);
  }
  const categories = Array.from(catMap.entries());

  const cartCount = count();

  return (
    <View style={{ flex: 1 }}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search products, brands…"
          placeholderTextColor="#9ca3af"
          clearButtonMode="while-editing"
        />
      </View>

      {loadingItems ? (
        <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {categories.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🛒</Text>
              <Text style={styles.emptyText}>No products available yet.</Text>
            </View>
          ) : (
            categories.map(([cat, invItems]) => (
              <View key={cat} style={styles.categorySection}>
                <Text style={styles.categoryName}>{cat}</Text>
                <FlatList
                  data={invItems}
                  keyExtractor={(i) => i.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.productList}
                  renderItem={({ item }) => <ProductCard inv={item} />}
                />
              </View>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Cart FAB */}
      {cartCount > 0 && (
        <View style={styles.cartFab}>
          <Text style={styles.cartFabText}>🛒  {cartCount} item{cartCount !== 1 ? "s" : ""} in cart</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  pendingIcon: { fontSize: 48, marginBottom: 14 },
  pendingTitle: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 10, textAlign: "center" },
  pendingSub: { fontSize: 13, color: BRAND_MUTED, textAlign: "center", lineHeight: 20 },
  pageTitle: { fontSize: 24, fontWeight: "800", color: "#111", marginBottom: 6 },
  pageSub: { fontSize: 13, color: BRAND_MUTED, marginBottom: 24, lineHeight: 20 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1.5, borderColor: "#e5e7eb", paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111" },
  submitBtn: { marginTop: 8, height: 52, borderRadius: 14, backgroundColor: BRAND_PRIMARY, alignItems: "center", justifyContent: "center" },
  btnDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", margin: 12, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: "#e5e7eb" },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: "#111" },
  categorySection: { marginBottom: 8 },
  categoryName: { fontSize: 16, fontWeight: "800", color: "#111", marginLeft: 16, marginBottom: 10 },
  productList: { paddingLeft: 16, gap: 10 },
  productCard: { width: 150, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
  productImg: { width: "100%", height: 110 },
  productImgPlaceholder: { width: "100%", height: 110, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  productImgIcon: { fontSize: 30 },
  productBody: { padding: 10 },
  productName: { fontSize: 12, fontWeight: "700", color: "#111", marginBottom: 2 },
  productBrand: { fontSize: 10, color: BRAND_MUTED, marginBottom: 6 },
  productPriceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  productPrice: { fontSize: 14, fontWeight: "800", color: BRAND_PRIMARY },
  productDiscount: { fontSize: 10, fontWeight: "700", color: "#16a34a" },
  outOfStock: { backgroundColor: "#fee2e2", borderRadius: 8, alignItems: "center", paddingVertical: 5 },
  outOfStockText: { fontSize: 10, fontWeight: "700", color: "#b91c1c" },
  qtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: `${BRAND_PRIMARY}18`, borderRadius: 8, paddingHorizontal: 4 },
  qtyBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  qtyBtnText: { fontSize: 18, fontWeight: "700", color: BRAND_PRIMARY },
  qtyVal: { fontSize: 13, fontWeight: "800", color: BRAND_PRIMARY },
  addBtn: { backgroundColor: BRAND_PRIMARY, borderRadius: 8, alignItems: "center", paddingVertical: 6 },
  addBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  empty: { alignItems: "center", padding: 48 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyText: { fontSize: 15, color: BRAND_MUTED },
  cartFab: {
    position: "absolute", bottom: 16, left: 16, right: 16,
    backgroundColor: BRAND_PRIMARY, borderRadius: 14, height: 50,
    alignItems: "center", justifyContent: "center",
    shadowColor: BRAND_PRIMARY, shadowOpacity: 0.4, elevation: 8,
  },
  cartFabText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
