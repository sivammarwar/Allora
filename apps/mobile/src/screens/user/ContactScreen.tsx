import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  TextInput, TouchableOpacity, ActivityIndicator, Alert, Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BRAND_PRIMARY, BRAND_MUTED, API_URL } from "../../lib/config";
import { useLanguage } from "../../lib/i18n";

export default function ContactScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.message.trim()) {
      Alert.alert("Required", "Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "mobile" }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
      {/* Hero */}
      <View style={s.hero}>
        <Text style={s.heroTitle}>{t("contact.title")}</Text>
        <Text style={s.heroBody}>{t("contact.intro")}</Text>
      </View>

      {/* Contact cards */}
      <View style={s.cardsRow}>
        <TouchableOpacity style={s.contactCard} onPress={() => Linking.openURL("tel:+919158074740")}>
          <Text style={s.cardIcon}>📞</Text>
          <Text style={s.cardLabel}>{t("contact.phone")}</Text>
          <Text style={s.cardVal}>+91 9158074740</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.contactCard} onPress={() => Linking.openURL("mailto:support@bharat333.com")}>
          <Text style={s.cardIcon}>✉️</Text>
          <Text style={s.cardLabel}>{t("contact.email")}</Text>
          <Text style={s.cardVal}>support@bharat333.com</Text>
        </TouchableOpacity>
      </View>
      <View style={s.addressCard}>
        <Text style={s.cardIcon}>📍</Text>
        <Text style={s.cardLabel}>{t("contact.address")}</Text>
        <Text style={s.cardVal}>{t("contact.addressVal")}</Text>
      </View>

      {/* Working Hours */}
      <View style={s.infoCard}>
        <Text style={s.infoTitle}>🕐  {t("contact.workingHours")}</Text>
        <Text style={s.infoBody}>{t("contact.workingHoursVal")}</Text>
      </View>

      {/* Customer Support */}
      <View style={s.infoCard}>
        <Text style={s.infoTitle}>🔧  {t("contact.customerSupport")}</Text>
        <Text style={s.infoBody}>{t("contact.supportDesc")}</Text>
        <Text style={s.bullet}>• {t("contact.supportItem1")}</Text>
        <Text style={s.bullet}>• {t("contact.supportItem2")}</Text>
        <Text style={s.bullet}>• {t("contact.supportItem3")}</Text>
        <Text style={[s.infoBody, { marginTop: 8 }]}>{t("contact.supportNote")}</Text>
      </View>

      {/* Contact Form */}
      <View style={s.formSection}>
        <Text style={s.formTitle}>💬  {t("contact.sendMessage")}</Text>
        <Text style={s.formDesc}>{t("contact.formDesc")}</Text>

        {submitted ? (
          <View style={s.successBox}>
            <Text style={{ fontSize: 32 }}>✅</Text>
            <Text style={s.successTitle}>{t("contact.sent")}</Text>
            <Text style={s.successDesc}>{t("contact.sentDesc")}</Text>
          </View>
        ) : (
          <>
            <TextInput style={s.input} placeholder={t("contact.fullName")} placeholderTextColor={BRAND_MUTED}
              value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
            <TextInput style={s.input} placeholder={t("contact.phoneNumber")} placeholderTextColor={BRAND_MUTED}
              value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
            <TextInput style={s.input} placeholder={t("contact.emailAddress")} placeholderTextColor={BRAND_MUTED}
              value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={s.input} placeholder={t("contact.serviceAddress")} placeholderTextColor={BRAND_MUTED}
              value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} />
            <TextInput style={[s.input, { height: 100, textAlignVertical: "top" }]} placeholder={t("contact.messageQuery")} placeholderTextColor={BRAND_MUTED}
              value={form.message} onChangeText={(v) => setForm({ ...form, message: v })} multiline />
            <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
              {loading && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />}
              <Text style={s.submitText}>{t("contact.submit")}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Quick Response */}
      <View style={s.infoCard}>
        <Text style={s.infoTitle}>{t("contact.quickResponse")}</Text>
        <Text style={s.infoBody}>{t("contact.quickResponseDesc")}</Text>
        <Text style={s.bullet}>• {t("contact.qr1")}</Text>
        <Text style={s.bullet}>• {t("contact.qr2")}</Text>
      </View>

      {/* Footer */}
      <View style={s.footer}>
        <Text style={s.closing}>{t("contact.closing")}</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  hero: { backgroundColor: "#fdf2f8", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  heroTitle: { fontSize: 24, fontWeight: "900", color: "#111", marginBottom: 10 },
  heroBody: { fontSize: 14, color: "#555", lineHeight: 22 },
  cardsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 20 },
  contactCard: { flex: 1, backgroundColor: "#f9fafb", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#f0f0f0" },
  addressCard: { marginHorizontal: 20, marginTop: 10, backgroundColor: "#f9fafb", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#f0f0f0" },
  cardIcon: { fontSize: 22, marginBottom: 8 },
  cardLabel: { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 4 },
  cardVal: { fontSize: 12, color: BRAND_PRIMARY, fontWeight: "600", textAlign: "center" },
  infoCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: "#f9fafb", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#f0f0f0" },
  infoTitle: { fontSize: 16, fontWeight: "800", color: "#111", marginBottom: 8 },
  infoBody: { fontSize: 13, color: "#555", lineHeight: 20 },
  bullet: { fontSize: 13, color: "#555", marginLeft: 8, marginTop: 4 },
  formSection: { paddingHorizontal: 20, paddingTop: 24 },
  formTitle: { fontSize: 16, fontWeight: "800", color: "#111", marginBottom: 6 },
  formDesc: { fontSize: 13, color: "#666", marginBottom: 16 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", paddingHorizontal: 14, fontSize: 14, color: "#111", marginBottom: 10, backgroundColor: "#fff" },
  submitBtn: { flexDirection: "row", height: 48, borderRadius: 12, backgroundColor: BRAND_PRIMARY, alignItems: "center", justifyContent: "center", marginTop: 4 },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  successBox: { alignItems: "center", paddingVertical: 32, gap: 8 },
  successTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  successDesc: { fontSize: 13, color: "#666" },
  footer: { paddingHorizontal: 20, paddingVertical: 24, alignItems: "center" },
  closing: { fontSize: 13, fontStyle: "italic", color: "#666", textAlign: "center" },
});
