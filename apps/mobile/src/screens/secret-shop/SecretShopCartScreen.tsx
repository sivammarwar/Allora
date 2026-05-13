import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, Image,
  TouchableOpacity, ActivityIndicator, Alert, TextInput,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSecretCart } from "../../lib/secretShopCart";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";

export default function SecretShopCartScreen() {
  const qc = useQueryClient();
  const { items, inc, dec, remove, clear, total } = useSecretCart();
  const [notes, setNotes] = useState("");
  const [payMode, setPayMode] = useState<"COD" | "ONLINE">("COD");

  const placeOrder = useMutation({
    mutationFn: () =>
      api.post("/api/secret-shop/orders", {
        items: items.map((i) => ({ inventoryItemId: i.inventoryItemId, quantity: i.quantity })),
        notes: notes.trim() || null,
        paymentMode: payMode,
      }) as any,
    onSuccess: () => {
      clear();
      qc.invalidateQueries({ queryKey: ["secret-shop-orders"] });
      Alert.alert("Order placed! 🎉", "Your order has been submitted to the agent.");
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed to place order."),
  });

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySub}>Go to the shop and add some products.</Text>
      </View>
    );
  }

  const grandTotal = total();

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.inventoryItemId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.itemImg} resizeMode="cover" />
            ) : (
              <View style={styles.itemImgPlaceholder}><Text>📦</Text></View>
            )}
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.itemPrice}>₹{item.price} × {item.quantity} = ₹{(item.price * item.quantity).toFixed(0)}</Text>
            </View>
            <View style={styles.qtyControls}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => dec(item.inventoryItemId)}>
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyVal}>{item.quantity}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => inc(item.inventoryItemId)}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => remove(item.inventoryItemId)} style={styles.removeBtn}>
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            {/* Notes */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Order notes (optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any special instructions…"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Payment mode */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Payment mode</Text>
              <View style={styles.payRow}>
                {(["COD", "ONLINE"] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.payChip, payMode === mode && styles.payChipActive]}
                    onPress={() => setPayMode(mode)}
                  >
                    <Text style={[styles.payChipText, payMode === mode && styles.payChipTextActive]}>
                      {mode === "COD" ? "💵 Cash on Delivery" : "📱 Online"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Summary */}
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryVal}>₹{grandTotal.toFixed(0)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalVal}>₹{grandTotal.toFixed(0)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.orderBtn, placeOrder.isPending && styles.btnDisabled]}
              onPress={() => placeOrder.mutate()}
              disabled={placeOrder.isPending}
            >
              {placeOrder.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.orderBtnText}>Place Order →</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearBtn} onPress={() => Alert.alert("Clear cart?", undefined, [{ text: "Cancel", style: "cancel" }, { text: "Clear", style: "destructive", onPress: clear }])}>
              <Text style={styles.clearText}>Clear cart</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 8 },
  emptySub: { fontSize: 13, color: BRAND_MUTED, textAlign: "center" },
  list: { padding: 16, gap: 10, paddingBottom: 0 },
  cartItem: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 14, padding: 12, gap: 10,
    shadowColor: "#000", shadowOpacity: 0.04, elevation: 2,
  },
  itemImg: { width: 56, height: 56, borderRadius: 10 },
  itemImgPlaceholder: { width: 56, height: 56, borderRadius: 10, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: "700", color: "#111" },
  itemPrice: { fontSize: 12, color: BRAND_MUTED, marginTop: 3 },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: 4 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: `${BRAND_PRIMARY}18`, alignItems: "center", justifyContent: "center" },
  qtyBtnText: { fontSize: 16, fontWeight: "700", color: BRAND_PRIMARY },
  qtyVal: { fontSize: 14, fontWeight: "800", color: "#111", minWidth: 20, textAlign: "center" },
  removeBtn: { padding: 6 },
  removeText: { fontSize: 14, color: "#ef4444" },
  footer: { padding: 16 },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#374151", marginBottom: 8 },
  notesInput: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1.5, borderColor: "#e5e7eb", padding: 12, fontSize: 13, color: "#111", height: 80 },
  payRow: { flexDirection: "row", gap: 10 },
  payChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: "#e5e7eb", alignItems: "center" },
  payChipActive: { borderColor: BRAND_PRIMARY, backgroundColor: `${BRAND_PRIMARY}14` },
  payChipText: { fontSize: 12, fontWeight: "700", color: BRAND_MUTED },
  payChipTextActive: { color: BRAND_PRIMARY },
  summary: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.04, elevation: 2 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  summaryLabel: { fontSize: 13, color: BRAND_MUTED },
  summaryVal: { fontSize: 13, color: "#111", fontWeight: "600" },
  totalRow: { borderTopWidth: 1, borderTopColor: "#f3f4f6", marginTop: 4, paddingTop: 10 },
  totalLabel: { fontSize: 16, fontWeight: "800", color: "#111" },
  totalVal: { fontSize: 18, fontWeight: "800", color: BRAND_PRIMARY },
  orderBtn: { height: 52, borderRadius: 14, backgroundColor: BRAND_PRIMARY, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  btnDisabled: { opacity: 0.5 },
  orderBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  clearBtn: { alignSelf: "center" },
  clearText: { fontSize: 13, color: "#ef4444" },
});
