import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useLanguage } from "../../lib/i18n";

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const sections = [
    { t: t("terms.s1t"), b: t("terms.s1b") },
    { t: t("terms.s2t"), b: t("terms.s2b") },
    { t: t("terms.s3t"), b: t("terms.s3b") },
    { t: t("terms.s4t"), b: t("terms.s4b") },
    { t: t("terms.s5t"), b: t("terms.s5b") },
    { t: t("terms.s6t"), b: t("terms.s6b") },
    { t: t("terms.s7t"), b: t("terms.s7b") },
    { t: t("terms.s8t"), b: t("terms.s8b") },
    { t: t("terms.s9t"), b: t("terms.s9b") },
    { t: t("terms.s10t"), b: t("terms.s10b") },
  ];

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <View style={s.header}>
        <Text style={s.title}>{t("terms.title")}</Text>
        <Text style={s.updated}>{t("terms.updated")}</Text>
      </View>
      {sections.map(({ t: title, b: body }) => (
        <View key={title} style={s.section}>
          <Text style={s.sectionTitle}>{title}</Text>
          <Text style={s.sectionBody}>{body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  title: { fontSize: 26, fontWeight: "900", color: "#111", marginBottom: 6 },
  updated: { fontSize: 12, color: BRAND_MUTED },
  section: { paddingHorizontal: 20, paddingVertical: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 6 },
  sectionBody: { fontSize: 13, color: "#555", lineHeight: 20 },
});
