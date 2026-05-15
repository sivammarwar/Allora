import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { BRAND_MUTED } from "../../lib/config";
import { useLanguage } from "../../lib/i18n";

export default function PrivacyPolicyScreen() {
  const { t } = useLanguage();

  const sections = [
    { title: t("privacy.s1Title"), body: t("privacy.s1Body") },
    { title: t("privacy.s2Title"), body: t("privacy.s2Body") },
    { title: t("privacy.s3Title"), body: t("privacy.s3Body") },
    { title: t("privacy.s4Title"), body: t("privacy.s4Body") },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>{t("privacy.intro")}</Text>

      {sections.map((s) => (
        <View key={s.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{s.title}</Text>
          <Text style={styles.sectionBody}>{s.body}</Text>
        </View>
      ))}

      <Text style={styles.updated}>{t("privacy.updated")}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 14, color: "#374151", lineHeight: 22, marginBottom: 24 },
  section: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 8 },
  sectionBody: { fontSize: 13, color: "#374151", lineHeight: 20 },
  updated: { fontSize: 11, color: BRAND_MUTED, textAlign: "center", marginTop: 20 },
});
