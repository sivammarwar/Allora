import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, TextInput, Alert, ActivityIndicator } from "react-native";
import { BRAND_PRIMARY, BRAND_MUTED, API_URL } from "../../lib/config";
import { useLanguage } from "../../lib/i18n";
import axios from "axios";

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
  const { t, lang } = useLanguage();
  const isHi = lang === "hi";

  const faqs: FAQItem[] = [
    { q: t("help.q1"), a: t("help.a1") },
    { q: t("help.q2"), a: t("help.a2") },
    { q: t("help.q3"), a: t("help.a3") },
  ];

  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.message.trim()) {
      Alert.alert(isHi ? "त्रुटि" : "Error", isHi ? "कृपया सभी आवश्यक फ़ील्ड भरें।" : "Please fill all required fields.");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/contact`, { ...form, source: "mobile" });
      setSubmitted(true);
      setForm({ name: "", phone: "", email: "", address: "", message: "" });
      Alert.alert(
        isHi ? "सफल" : "Success",
        isHi ? "आपका संदेश भेज दिया गया है। हम जल्द ही आपसे संपर्क करेंगे।" : "Your message has been sent. We'll get back to you shortly."
      );
    } catch {
      Alert.alert(isHi ? "त्रुटि" : "Error", isHi ? "संदेश भेजने में विफल। कृपया पुनः प्रयास करें।" : "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>{t("help.faqTitle")}</Text>
      {faqs.map((f) => <FAQRow key={f.q} item={f} />)}

      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>{t("help.contactTitle")}</Text>

      <TouchableOpacity
        style={styles.contactCard}
        onPress={() => Linking.openURL("mailto:support@bharat333.com")}
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

      {/* Contact Form */}
      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
        {isHi ? "हमें संदेश भेजें" : "Send Us a Message"}
      </Text>

      {submitted ? (
        <View style={styles.successCard}>
          <Text style={styles.successText}>
            {isHi ? "संदेश भेजा गया! हम जल्द ही आपसे संपर्क करेंगे।" : "Message sent! We'll get back to you shortly."}
          </Text>
          <TouchableOpacity onPress={() => setSubmitted(false)} style={styles.sendAnother}>
            <Text style={styles.sendAnotherText}>{isHi ? "एक और संदेश भेजें" : "Send another message"}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.formWrap}>
          <TextInput
            style={styles.input}
            placeholder={isHi ? "पूरा नाम *" : "Full Name *"}
            placeholderTextColor="#9ca3af"
            value={form.name}
            onChangeText={(v) => setForm({ ...form, name: v })}
          />
          <TextInput
            style={styles.input}
            placeholder={isHi ? "फ़ोन नंबर *" : "Phone Number *"}
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={(v) => setForm({ ...form, phone: v })}
          />
          <TextInput
            style={styles.input}
            placeholder={isHi ? "ईमेल पता *" : "Email Address *"}
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(v) => setForm({ ...form, email: v })}
          />
          <TextInput
            style={styles.input}
            placeholder={isHi ? "सेवा का पता" : "Service Address"}
            placeholderTextColor="#9ca3af"
            value={form.address}
            onChangeText={(v) => setForm({ ...form, address: v })}
          />
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: "top" }]}
            placeholder={isHi ? "संदेश / प्रश्न *" : "Message / Query *"}
            placeholderTextColor="#9ca3af"
            multiline
            value={form.message}
            onChangeText={(v) => setForm({ ...form, message: v })}
          />
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>{isHi ? "सबमिट करें" : "Submit"}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  formWrap: { gap: 10 },
  input: {
    backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb",
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111",
  },
  submitBtn: {
    backgroundColor: BRAND_PRIMARY, borderRadius: 12, height: 48,
    alignItems: "center", justifyContent: "center", marginTop: 4,
  },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  successCard: {
    backgroundColor: "#f0fdf4", borderRadius: 14, borderWidth: 1, borderColor: "#bbf7d0",
    padding: 20, alignItems: "center", gap: 12,
  },
  successText: { fontSize: 14, fontWeight: "600", color: "#166534", textAlign: "center" },
  sendAnother: { paddingVertical: 6 },
  sendAnotherText: { fontSize: 13, color: BRAND_PRIMARY, fontWeight: "600" },
});
