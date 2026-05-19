import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useLanguage } from "../../lib/i18n";

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const skilled = [
    { title: t("about.s1"), desc: t("about.s1d") },
    { title: t("about.s2"), desc: t("about.s2d") },
    { title: t("about.s3"), desc: t("about.s3d") },
    { title: t("about.s4"), desc: t("about.s4d") },
  ];
  const unskilled = [
    { title: t("about.u1"), desc: t("about.u1d") },
    { title: t("about.u2"), desc: t("about.u2d") },
    { title: t("about.u3"), desc: t("about.u3d") },
  ];
  const whyChoose = [t("about.w1"), t("about.w2"), t("about.w3"), t("about.w4")];
  const traits = [t("about.trained"), t("about.verified"), t("about.trustworthy")];

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      {/* Hero */}
      <View style={s.hero}>
        <View style={s.badge}><Text style={s.badgeText}>📍 {t("about.badge")}</Text></View>
        <Text style={s.heroTitle}>{t("about.title")}</Text>
        <Text style={s.heroBody}>{t("about.intro")}</Text>
        <Text style={s.heroBody2}>{t("about.intro2")}</Text>
      </View>

      {/* What We Do */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>{t("about.whatWeDo")}</Text>
        <Text style={s.sectionTitle}>{t("about.whatWeDoDesc")}</Text>
        <Text style={s.sectionBody}>{t("about.whatWeDoBody")}</Text>
        <View style={s.chipRow}>
          {traits.map((tr) => (
            <View key={tr} style={s.chip}><Text style={s.chipText}>{tr}</Text></View>
          ))}
        </View>
      </View>

      {/* Skilled Services */}
      <View style={[s.section, s.sectionAlt]}>
        <Text style={s.sectionTitle}>{t("about.skilledTitle")}</Text>
        <Text style={s.sectionBody}>{t("about.skilledDesc")}</Text>
        {skilled.map(({ title, desc }) => (
          <View key={title} style={s.card}>
            <Text style={s.cardTitle}>{title}</Text>
            <Text style={s.cardDesc}>{desc}</Text>
          </View>
        ))}
      </View>

      {/* Non-Skilled Services */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>{t("about.unskilledTitle")}</Text>
        <Text style={s.sectionBody}>{t("about.unskilledDesc")}</Text>
        {unskilled.map(({ title, desc }) => (
          <View key={title} style={s.card}>
            <Text style={s.cardTitle}>{title}</Text>
            <Text style={s.cardDesc}>{desc}</Text>
          </View>
        ))}
      </View>

      {/* Mission */}
      <View style={[s.section, s.sectionAlt]}>
        <Text style={s.sectionLabel}>{t("about.missionTitle")}</Text>
        <Text style={s.sectionBody}>{t("about.mission")}</Text>
      </View>

      {/* Why Choose */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>{t("about.whyChoose")}</Text>
        {whyChoose.map((item) => (
          <View key={item} style={s.checkRow}>
            <Text style={s.checkIcon}>✓</Text>
            <Text style={s.checkText}>{item}</Text>
          </View>
        ))}
      </View>

      {/* Promise */}
      <View style={[s.section, s.sectionAlt]}>
        <Text style={s.sectionLabel}>{t("about.promiseTitle")}</Text>
        <Text style={s.sectionBody}>{t("about.promise")}</Text>
      </View>

      {/* Contact */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>{t("about.contactTitle")}</Text>
        <Text style={s.sectionBody}>{t("about.contactDesc")}</Text>
        <Text style={s.email}>support@bharat333.com</Text>
      </View>

      {/* Footer */}
      <View style={s.footer}>
        <Text style={s.closing}>{t("about.closing")}</Text>
        <Text style={s.footerText}>{t("about.footer")}</Text>
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
  heroBody: { fontSize: 14, color: "#555", lineHeight: 22, marginBottom: 10 },
  heroBody2: { fontSize: 13, color: "#888", lineHeight: 20 },
  section: { paddingHorizontal: 20, paddingVertical: 24 },
  sectionAlt: { backgroundColor: "#f9fafb", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#f3f4f6" },
  sectionLabel: { fontSize: 10, fontWeight: "800", color: BRAND_PRIMARY, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 },
  sectionTitle: { fontSize: 22, fontWeight: "800", color: "#111", marginBottom: 8 },
  sectionBody: { fontSize: 14, color: "#555", lineHeight: 22 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  chip: { backgroundColor: `${BRAND_PRIMARY}18`, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  chipText: { fontSize: 13, fontWeight: "700", color: BRAND_PRIMARY },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginTop: 12, borderWidth: 1, borderColor: "#f0f0f0" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 6 },
  cardDesc: { fontSize: 13, color: "#666", lineHeight: 20 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  checkIcon: { fontSize: 16, color: BRAND_PRIMARY, fontWeight: "700" },
  checkText: { fontSize: 14, color: "#333", flex: 1 },
  email: { fontSize: 15, fontWeight: "700", color: BRAND_PRIMARY, marginTop: 12 },
  footer: { paddingHorizontal: 20, paddingVertical: 24, borderTopWidth: 1, borderTopColor: "#f3f4f6", alignItems: "center" },
  closing: { fontSize: 14, fontWeight: "600", color: "#555", fontStyle: "italic", textAlign: "center", marginBottom: 8 },
  footerText: { fontSize: 11, color: BRAND_MUTED, textAlign: "center" },
});
