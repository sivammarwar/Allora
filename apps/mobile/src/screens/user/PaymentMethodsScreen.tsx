import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useLanguage } from "../../lib/i18n";

export default function PaymentMethodsScreen() {
  const { t } = useLanguage();

  const methods = [
    { icon: "💵", title: t("payment.cashOnDelivery"), desc: t("payment.cashDesc"), available: true },
    { icon: "📱", title: t("payment.upi"), desc: t("payment.upiDesc"), available: true },
  ];

  return (
    <View style={styles.screen}>
      <Text style={styles.info}>{t("payment.info")}</Text>

      {methods.map((m) => (
        <View key={m.title} style={styles.card}>
          <View style={styles.iconBox}>
            <Text style={styles.iconText}>{m.icon}</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.methodTitle}>{m.title}</Text>
            <Text style={styles.methodDesc}>{m.desc}</Text>
          </View>
          <View style={styles.availableBadge}>
            <Text style={styles.availableText}>✓</Text>
          </View>
        </View>
      ))}

      <Text style={styles.note}>{t("payment.note")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  info: { fontSize: 13, color: BRAND_MUTED, marginBottom: 16 },
  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: "#f3f4f6",
    alignItems: "center", justifyContent: "center", marginRight: 14,
  },
  iconText: { fontSize: 22 },
  cardBody: { flex: 1 },
  methodTitle: { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 3 },
  methodDesc: { fontSize: 12, color: BRAND_MUTED, lineHeight: 17 },
  availableBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: "#dcfce7",
    alignItems: "center", justifyContent: "center",
  },
  availableText: { fontSize: 14, color: "#16a34a", fontWeight: "700" },
  note: { fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 20, lineHeight: 18 },
});
