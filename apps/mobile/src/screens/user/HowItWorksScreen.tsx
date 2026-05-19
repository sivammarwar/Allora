import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useLanguage } from "../../lib/i18n";

export default function HowItWorksScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const steps = [
    { num: "01", icon: "📍", title: t("howItWorks.step1Title"), desc: t("howItWorks.step1Desc") },
    { num: "02", icon: "🛒", title: t("howItWorks.step2Title"), desc: t("howItWorks.step2Desc") },
    { num: "03", icon: "✅", title: t("howItWorks.step3Title"), desc: t("howItWorks.step3Desc") },
  ];
  const trust = [
    { title: t("howItWorks.t1"), desc: t("howItWorks.t1d") },
    { title: t("howItWorks.t2"), desc: t("howItWorks.t2d") },
    { title: t("howItWorks.t3"), desc: t("howItWorks.t3d") },
  ];
  const faqs = [
    { q: t("howItWorks.faq1q"), a: t("howItWorks.faq1a") },
    { q: t("howItWorks.faq2q"), a: t("howItWorks.faq2a") },
    { q: t("howItWorks.faq3q"), a: t("howItWorks.faq3a") },
    { q: t("howItWorks.faq4q"), a: t("howItWorks.faq4a") },
    { q: t("howItWorks.faq5q"), a: t("howItWorks.faq5a") },
  ];

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      {/* Header */}
      <View style={s.hero}>
        <View style={s.badge}><Text style={s.badgeText}>⚡ {t("howItWorks.badge")}</Text></View>
        <Text style={s.heroTitle}>{t("howItWorks.title")}</Text>
        <Text style={s.heroBody}>{t("howItWorks.intro")}</Text>
      </View>

      {/* Steps */}
      <View style={s.section}>
        {steps.map(({ num, icon, title, desc }) => (
          <View key={num} style={s.stepRow}>
            <View style={s.stepLeft}>
              <View style={s.stepIcon}><Text style={{ fontSize: 20 }}>{icon}</Text></View>
              <Text style={s.stepNum}>{num}</Text>
            </View>
            <View style={s.stepRight}>
              <Text style={s.stepTitle}>{title}</Text>
              <Text style={s.stepDesc}>{desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Trust */}
      <View style={[s.section, s.sectionAlt]}>
        <View style={s.trustHeader}>
          <Text style={{ fontSize: 16 }}>🛡️</Text>
          <Text style={s.trustH2}>{t("howItWorks.trustTitle")}</Text>
        </View>
        {trust.map(({ title, desc }) => (
          <View key={title} style={s.card}>
            <Text style={s.cardTitle}>{title}</Text>
            <Text style={s.cardDesc}>{desc}</Text>
          </View>
        ))}
      </View>

      {/* FAQs */}
      <View style={s.section}>
        <Text style={s.faqH2}>{t("howItWorks.faqTitle")}</Text>
        {faqs.map(({ q, a }) => (
          <View key={q} style={s.faqItem}>
            <Text style={s.faqQ}>{q}</Text>
            <Text style={s.faqA}>{a}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <View style={[s.section, s.sectionAlt, { alignItems: "center" }]}>
        <Text style={s.ctaTitle}>{t("howItWorks.ctaTitle")}</Text>
        <Text style={s.ctaDesc}>{t("howItWorks.ctaDesc")}</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  hero: { backgroundColor: "#fdf2f8", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  badge: { backgroundColor: `${BRAND_PRIMARY}18`, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 12 },
  badgeText: { fontSize: 11, fontWeight: "700", color: BRAND_PRIMARY },
  heroTitle: { fontSize: 26, fontWeight: "900", color: "#111", marginBottom: 12 },
  heroBody: { fontSize: 14, color: "#555", lineHeight: 22 },
  section: { paddingHorizontal: 20, paddingVertical: 24 },
  sectionAlt: { backgroundColor: "#f9fafb", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#f3f4f6" },
  stepRow: { flexDirection: "row", gap: 16, marginBottom: 24 },
  stepLeft: { alignItems: "center", gap: 6 },
  stepIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: `${BRAND_PRIMARY}18`, alignItems: "center", justifyContent: "center" },
  stepNum: { fontSize: 10, fontWeight: "900", color: `${BRAND_PRIMARY}66`, letterSpacing: 2 },
  stepRight: { flex: 1, paddingTop: 4 },
  stepTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 6 },
  stepDesc: { fontSize: 13, color: "#666", lineHeight: 20 },
  trustHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  trustH2: { fontSize: 18, fontWeight: "800", color: "#111" },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginTop: 10, borderWidth: 1, borderColor: "#f0f0f0" },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 4 },
  cardDesc: { fontSize: 12, color: "#666", lineHeight: 18 },
  faqH2: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 16 },
  faqItem: { marginBottom: 18, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  faqQ: { fontSize: 14, fontWeight: "600", color: "#111", marginBottom: 6 },
  faqA: { fontSize: 13, color: "#666", lineHeight: 20 },
  ctaTitle: { fontSize: 22, fontWeight: "800", color: "#111", marginBottom: 8 },
  ctaDesc: { fontSize: 14, color: "#666" },
});
