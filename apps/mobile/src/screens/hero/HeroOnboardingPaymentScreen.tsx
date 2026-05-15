import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
  AppState,
  AppStateStatus,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

interface InitiateResponse {
  redirectUrl: string;
  merchantTransactionId: string;
  amount: number;
}

interface StatusResponse {
  paid: boolean;
  state: string;
}

interface HeroOnboardingPaymentScreenProps {
  feeAmount: number;
  onPaid: () => void;
}

export default function HeroOnboardingPaymentScreen({
  feeAmount,
  onPaid,
}: HeroOnboardingPaymentScreenProps) {
  const { logout } = useAuth();
  const qc = useQueryClient();
  const [txnId, setTxnId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const initiateMutation = useMutation<InitiateResponse>({
    mutationFn: () => api.post("/api/hero/onboarding-payment/initiate") as any,
    onSuccess: async (data) => {
      setTxnId(data.merchantTransactionId);
      const can = await Linking.canOpenURL(data.redirectUrl);
      if (!can) {
        Alert.alert("Error", "Cannot open payment page. Please try again.");
        return;
      }
      await Linking.openURL(data.redirectUrl);
      setPolling(true);
    },
    onError: (e: any) => {
      Alert.alert("Payment Error", e?.error ?? e?.message ?? "Failed to start payment");
    },
  });

  // Poll status every 4s while payment is pending
  useEffect(() => {
    if (!polling || !txnId) return;
    const tick = async () => {
      try {
        const s = (await api.get(
          `/api/hero/onboarding-payment/status/${txnId}`
        )) as unknown as StatusResponse;
        if (s.paid) {
          setPolling(false);
          if (pollRef.current) clearInterval(pollRef.current);
          await qc.invalidateQueries({ queryKey: ["hero-me"] });
          onPaid();
        }
      } catch {
        // ignore transient errors
      }
    };
    tick();
    pollRef.current = setInterval(tick, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [polling, txnId]);

  // Re-trigger immediate status check when user returns to the app
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        next === "active" &&
        txnId
      ) {
        // app came to foreground — check status
        api
          .get(`/api/hero/onboarding-payment/status/${txnId}`)
          .then((s: any) => {
            if (s?.paid) {
              setPolling(false);
              qc.invalidateQueries({ queryKey: ["hero-me"] });
              onPaid();
            } else {
              setPolling(true);
            }
          })
          .catch(() => {});
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [txnId]);

  const onPay = () => initiateMutation.mutate();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="shield-checkmark" size={56} color={BRAND_PRIMARY} />
        </View>

        <Text style={styles.title}>You're verified! 🎉</Text>
        <Text style={styles.subtitle}>
          Complete your one-time onboarding fee to activate your hero dashboard
          and start receiving service requests.
        </Text>

        <View style={styles.feeCard}>
          <Text style={styles.feeLabel}>Onboarding fee</Text>
          <Text style={styles.feeAmount}>₹{feeAmount}</Text>
          <Text style={styles.feeNote}>One-time payment · Non-refundable</Text>
        </View>

        <View style={styles.benefits}>
          <Text style={styles.benefitsTitle}>What you get</Text>
          {[
            "Access to the full hero dashboard",
            "Receive real-time service requests",
            "Earnings tracking & analytics",
            "Slot management & availability",
          ].map((b) => (
            <View key={b} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={18} color={BRAND_PRIMARY} />
              <Text style={styles.benefitText}>{b}</Text>
            </View>
          ))}
        </View>

        {polling && (
          <View style={styles.pollingBox}>
            <ActivityIndicator color={BRAND_PRIMARY} />
            <Text style={styles.pollingText}>
              Waiting for payment confirmation… You can complete the payment in
              the PhonePe page that just opened. We'll detect it automatically.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.payBtn, initiateMutation.isPending && { opacity: 0.6 }]}
          onPress={onPay}
          disabled={initiateMutation.isPending || polling}
          activeOpacity={0.85}
        >
          {initiateMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="card" size={20} color="#fff" />
              <Text style={styles.payBtnText}>
                {polling ? "Waiting for payment…" : `Pay ₹${feeAmount} via PhonePe`}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {polling && (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setPolling(false);
              setTxnId(null);
            }}
          >
            <Text style={styles.retryBtnText}>Cancel and try again</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  iconWrap: {
    alignSelf: "center",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${BRAND_PRIMARY}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    color: "#111",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: BRAND_MUTED,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  feeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  feeLabel: { fontSize: 13, color: BRAND_MUTED, fontWeight: "600" },
  feeAmount: {
    fontSize: 44,
    fontWeight: "900",
    color: BRAND_PRIMARY,
    marginVertical: 6,
  },
  feeNote: { fontSize: 11, color: BRAND_MUTED },
  benefits: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  benefitText: { fontSize: 13, color: "#374151", flex: 1 },
  pollingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  pollingText: { flex: 1, fontSize: 12, color: "#92400e", lineHeight: 17 },
  payBtn: {
    backgroundColor: BRAND_PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  payBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  retryBtn: {
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  retryBtnText: { color: BRAND_MUTED, fontWeight: "600", fontSize: 13 },
  logoutBtn: { paddingVertical: 12, alignItems: "center" },
  logoutText: { color: "#ef4444", fontWeight: "600", fontSize: 13 },
});
