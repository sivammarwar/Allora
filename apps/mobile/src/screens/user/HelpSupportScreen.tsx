import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from "react-native";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useLanguage } from "../../lib/i18n";

interface FAQItem { q: string; a: string; }

function FAQRow({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity style={styles.faqItem} onPress={() => setOpen((v) => !v)} activeOpacity={0.8}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQ}>{item.q}</Text>
        <Text style={styles.faqChevron}>{open ? "▲" : "▼"}</Text>
      </View>
      {open && <Text style={styles.faqA}>{item.a}</Text>}
    </TouchableOpacity>
  );
}

export default function HelpSupportScreen() {
  const { t } = useLanguage();

  const faqs: FAQItem[] = [
    { q: t("help.q1"), a: t("help.a1") },
    { q: t("help.q2"), a: t("help.a2") },
    { q: t("help.q3"), a: t("help.a3") },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>{t("help.faqTitle")}</Text>
      {faqs.map((f) => <FAQRow key={f.q} item={f} />)}

      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>{t("help.contactTitle")}</Text>

      <TouchableOpacity
        style={styles.contactCard}
        onPress={() => Linking.openURL("mailto:support@allora.app")}
        activeOpacity={0.85}
      >
        <Text style={styles.contactIcon}>✉️</Text>
        <View>
          <Text style={styles.contactLabel}>Email</Text>
          <Text style={styles.contactValue}>{t("help.email")}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.contactCard}
        onPress={() => Linking.openURL("https://wa.me/911234567890")}
        activeOpacity={0.85}
      >
        <Text style={styles.contactIcon}>💬</Text>
        <View>
          <Text style={styles.contactLabel}>WhatsApp</Text>
          <Text style={styles.contactValue}>{t("help.whatsapp")}</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: BRAND_MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  faqItem: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10,
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  faqHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  faqQ: { flex: 1, fontSize: 14, fontWeight: "600", color: "#111", marginRight: 8 },
  faqChevron: { fontSize: 11, color: BRAND_MUTED },
  faqA: { fontSize: 13, color: "#374151", lineHeight: 20, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  contactCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  contactIcon: { fontSize: 28 },
  contactLabel: { fontSize: 11, color: BRAND_MUTED, marginBottom: 2 },
  contactValue: { fontSize: 14, fontWeight: "600", color: BRAND_PRIMARY },
});
