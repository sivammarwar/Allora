import React, { useState } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity,
} from "react-native";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RazorpayCheckout = require("react-native-razorpay").default ?? require("react-native-razorpay");
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

// Route params — both secret-shop and regular order payments use this screen
type PaymentParams = {
  Payment: {
    orderId: string;
    amount: number;           // in INR (e.g. 250.00)
    description: string;
    type: "secret-shop" | "booking";
    onSuccessGoBack?: boolean;
  };
};

type PaymentRouteProp = RouteProp<PaymentParams, "Payment">;

export default function PaymentScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute<PaymentRouteProp>();
  const qc = useQueryClient();
  const { orderId, amount, description, type } = route.params;
  const [loading, setLoading] = useState(false);

  // Step 1 – create Razorpay order on backend
  const createOrder = useMutation({
    mutationFn: () =>
      api.post("/api/payments/create-order", {
        amount: Math.round(amount * 100), // paise
        orderId,
        type,
      }) as any,
  });

  // Step 2 – verify payment on backend
  const verifyPayment = useMutation({
    mutationFn: (data: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => api.post("/api/payments/verify", { ...data, orderId, type }) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["secret-shop-orders"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      Alert.alert("Payment Successful! 🎉", "Your payment has been confirmed.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    },
    onError: (e: any) => Alert.alert("Verification Failed", e?.message ?? "Please contact support."),
  });

  const handlePay = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const orderData = await createOrder.mutateAsync() as { keyId: string; amount: number; razorpayOrderId: string };

      const options = {
        description,
        image: "https://your-logo-url.png", // replace with actual logo
        currency: "INR",
        key: orderData.keyId,                // returned by backend
        amount: orderData.amount,            // in paise from backend
        name: "Allora",
        order_id: orderData.razorpayOrderId,
        prefill: {
          email: user.email ?? "",
          contact: "",
          name: user.name ?? "",
        },
        theme: { color: BRAND_PRIMARY },
      };

      const paymentData = await RazorpayCheckout.open(options);
      await verifyPayment.mutateAsync(paymentData as any);
    } catch (err: any) {
      if (err?.code !== 0) {
        // code 0 = user dismissed
        Alert.alert("Payment Failed", err?.description ?? "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.screen}>
      <View style={s.card}>
        <Text style={s.icon}>💳</Text>
        <Text style={s.title}>Complete Payment</Text>
        <Text style={s.desc}>{description}</Text>

        <View style={s.amountBox}>
          <Text style={s.amountLabel}>Amount</Text>
          <Text style={s.amount}>₹{amount.toFixed(2)}</Text>
        </View>

        <View style={s.infoRows}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Order ID</Text>
            <Text style={s.infoVal}>#{orderId.slice(-10).toUpperCase()}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Payment gateway</Text>
            <Text style={s.infoVal}>Razorpay</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[s.payBtn, (loading || verifyPayment.isPending) && s.btnDisabled]}
          onPress={handlePay}
          disabled={loading || verifyPayment.isPending}
        >
          {loading || verifyPayment.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.payBtnText}>Pay ₹{amount.toFixed(0)} →</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.secure}>🔒 Secured by Razorpay</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb", justifyContent: "center", padding: 24 },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 28, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.07, elevation: 4 },
  icon: { fontSize: 44, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "800", color: "#111", marginBottom: 6 },
  desc: { fontSize: 13, color: BRAND_MUTED, textAlign: "center", marginBottom: 24 },
  amountBox: { backgroundColor: `${BRAND_PRIMARY}10`, borderRadius: 16, paddingHorizontal: 32, paddingVertical: 16, alignItems: "center", marginBottom: 20, width: "100%" },
  amountLabel: { fontSize: 11, color: BRAND_MUTED, fontWeight: "700", letterSpacing: 1.2, marginBottom: 4 },
  amount: { fontSize: 36, fontWeight: "800", color: BRAND_PRIMARY },
  infoRows: { width: "100%", marginBottom: 24 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f3f4f6" },
  infoLabel: { fontSize: 13, color: BRAND_MUTED },
  infoVal: { fontSize: 13, fontWeight: "600", color: "#111" },
  payBtn: { width: "100%", height: 56, borderRadius: 16, backgroundColor: BRAND_PRIMARY, alignItems: "center", justifyContent: "center", marginBottom: 12, shadowColor: BRAND_PRIMARY, shadowOpacity: 0.3, elevation: 4 },
  btnDisabled: { opacity: 0.5 },
  payBtnText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  cancelBtn: { paddingVertical: 8 },
  cancelText: { fontSize: 14, color: BRAND_MUTED },
  secure: { textAlign: "center", fontSize: 12, color: BRAND_MUTED, marginTop: 20 },
});
