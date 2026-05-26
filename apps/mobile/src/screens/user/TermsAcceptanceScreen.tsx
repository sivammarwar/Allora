import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY } from "../../lib/config";

// ── Content ──────────────────────────────────────────────────────────────────

const SECTIONS_EN = [
  { h: "1. Use of Services", pts: ["Bharat333 is a platform that connects users with verified local service providers (Professionals or Heroes).", "We do not directly provide services; we only facilitate bookings and connections.", "Only the service booked through the app will be delivered."] },
  { h: "2. Booking & Payments", pts: ["All services must be booked through the application.", "Service charges may vary depending on type, time, and location.", "Payments should be made through the app or available payment options.", "Additional work beyond the booked service may incur extra charges by mutual agreement."] },
  { h: "3. Professional Conduct Policy", pts: ["Users must treat all Professionals with respect and dignity.", "Professionals must be asked to perform only the service booked through the app.", "Professionals must not be forced or pressured to perform additional or personal work.", "No exploitation, misconduct, or inappropriate behavior is permitted.", "Avoid arguments or conflicts with the Professional.", "👉 For any issue, contact the Bharat333 Help Page for resolution."] },
  { h: "4. Safety & Responsibility", pts: ["Users must provide a safe and suitable working environment for the Professional.", "In case of any damage, accident, or dispute, Bharat333 acts only as a facilitator. Final responsibility lies with the involved parties."] },
  { h: "5. Cancellation & Refund", pts: ["Cancellation policies apply as per app guidelines.", "Last-minute cancellations may attract charges.", "Refunds will be processed based on service type and situation."] },
  { h: "6. Complaints & Support", pts: ["👉 For complaints, issues, or disputes, reach out via the Bharat333 Help Page.", "Direct confrontation without involving the platform is discouraged."] },
  { h: "7. Changes to Terms", pts: ["Bharat333 reserves the right to update these Terms at any time.", "Continued use of the app implies acceptance of the updated terms."] },
  { h: "8. User Consent", pts: ["By installing the app and booking services, you confirm that you have read, understood, and agreed to these Terms & Conditions."] },
];

const SECTIONS_HI = [
  { h: "1. सेवा का उपयोग", pts: ["Bharat333 एक प्लेटफॉर्म है जो उपयोगकर्ताओं को सत्यापित सेवा प्रदाताओं (Heroes) से जोड़ता है।", "हम स्वयं सेवा प्रदाता नहीं हैं; केवल बुकिंग और कनेक्शन की सुविधा देते हैं।", "केवल बुक की गई सेवा ही प्रदान की जाएगी।"] },
  { h: "2. बुकिंग और भुगतान", pts: ["सभी सेवाएं ऐप के माध्यम से बुक की जानी चाहिए।", "सेवा शुल्क प्रकार, समय और स्थान के अनुसार अलग हो सकता है।", "भुगतान ऐप के माध्यम से करें।", "अतिरिक्त कार्य के लिए अतिरिक्त शुल्क पूर्व सहमति से लागू हो सकता है।"] },
  { h: "3. प्रोफेशनल के प्रति व्यवहार", pts: ["सभी प्रोफेशनल्स का सम्मान करें।", "केवल बुक की गई सेवा ही करवाएं।", "अतिरिक्त या व्यक्तिगत कार्य के लिए दबाव न डालें।", "दुर्व्यवहार, शोषण या अनुचित आचरण वर्जित है।", "बहस या विवाद से बचें।", "👉 किसी भी समस्या के लिए Bharat333 Help Page से संपर्क करें।"] },
  { h: "4. सुरक्षा और जिम्मेदारी", pts: ["प्रोफेशनल के लिए सुरक्षित कार्य वातावरण प्रदान करें।", "किसी दुर्घटना या विवाद में Bharat333 केवल मध्यस्थ की भूमिका निभाएगा।"] },
  { h: "5. रद्दीकरण और रिफंड", pts: ["रद्दीकरण नीति ऐप के अनुसार लागू होगी।", "अंतिम समय में रद्द करने पर शुल्क लग सकता है।", "रिफंड सेवा और स्थिति के अनुसार होगा।"] },
  { h: "6. शिकायत और सहायता", pts: ["👉 Bharat333 Help Page पर संपर्क करें।", "बिना प्लेटफॉर्म को शामिल किए सीधे विवाद न करें।"] },
  { h: "7. नियमों में बदलाव", pts: ["Bharat333 इन नियमों को कभी भी अपडेट कर सकता है।", "ऐप का उपयोग जारी रखना अपडेटेड नियमों की स्वीकृति मानी जाएगी।"] },
  { h: "8. सहमति", pts: ["ऐप इंस्टॉल करने और सेवा बुक करने से आप इन सभी नियमों से सहमत होते हैं।"] },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { onAccepted: () => void; }

export default function TermsAcceptanceScreen({ onAccepted }: Props) {
  const [lang, setLang]       = useState<"en" | "hi">("en");
  const [checked, setChecked] = useState(false);
  const qc = useQueryClient();

  const accept = useMutation({
    mutationFn: () => api.post("/api/user/accept-terms"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-profile"] });
      onAccepted();
    },
  });

  const sections = lang === "en" ? SECTIONS_EN : SECTIONS_HI;
  const isHi = lang === "hi";

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>{isHi ? "नियम एवं शर्तें" : "Terms & Conditions"}</Text>
        <Text style={s.sub}>{isHi ? "Bharat Services (Bharat333) – उपयोगकर्ता" : "Bharat Services (Bharat333) – End Users"}</Text>
        <View style={s.langRow}>
          <TouchableOpacity style={[s.langBtn, lang === "en" && s.langActive]} onPress={() => setLang("en")}>
            <Text style={[s.langText, lang === "en" && s.langTextActive]}>English</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.langBtn, lang === "hi" && s.langActive]} onPress={() => setLang("hi")}>
            <Text style={[s.langText, lang === "hi" && s.langTextActive]}>हिंदी</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator>
        <Text style={s.welcome}>
          {isHi
            ? "Bharat Services (Bharat333) में आपका स्वागत है। हमारा ऐप इंस्टॉल करने, एक्सेस करने या उपयोग करने से आप निम्नलिखित नियमों और शर्तों से सहमत होते हैं।"
            : "Welcome to Bharat Services (Bharat333). By installing, accessing, or using our application, you agree to comply with the following Terms & Conditions."}
        </Text>
        {sections.map((sec) => (
          <View key={sec.h} style={s.section}>
            <Text style={s.secHeading}>{sec.h}</Text>
            {sec.pts.map((pt, i) => (
              <View key={i} style={s.ptRow}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.ptText}>{pt}</Text>
              </View>
            ))}
          </View>
        ))}
        <Text style={s.footer}>
          {isHi
            ? "धन्यवाद!\nBharat Services (Bharat333) – आपकी हर ग्रामीण जरूरत का आसान समाधान 🌾"
            : "Thank you for choosing Bharat Services (Bharat333)\nSimplifying Rural Life, One Service at a Time 🌾"}
        </Text>
      </ScrollView>

      {/* Footer */}
      <View style={s.footer2}>
        <TouchableOpacity style={s.checkRow} onPress={() => setChecked(!checked)} activeOpacity={0.7}>
          <View style={[s.checkbox, checked && s.checkboxChecked]}>
            {checked && <Text style={s.checkMark}>✓</Text>}
          </View>
          <Text style={s.checkLabel}>
            {isHi ? "मैंने नियम व शर्तें पढ़ ली हैं और मैं सहमत हूँ।" : "I have read and agree to the Terms & Conditions"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btn, (!checked || accept.isPending) && s.btnDisabled]}
          disabled={!checked || accept.isPending}
          onPress={() => accept.mutate()}
        >
          {accept.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>{isHi ? "स्वीकार करें और आगे बढ़ें" : "Accept & Continue"}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: "#fff" },
  header:         { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1, borderColor: "#f0f0f0", backgroundColor: "#fff" },
  title:          { fontSize: 22, fontWeight: "800", color: "#111", marginBottom: 2 },
  sub:            { fontSize: 13, color: "#666", marginBottom: 10 },
  langRow:        { flexDirection: "row", gap: 8 },
  langBtn:        { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#ddd" },
  langActive:     { backgroundColor: BRAND_PRIMARY, borderColor: BRAND_PRIMARY },
  langText:       { fontSize: 13, color: "#555", fontWeight: "600" },
  langTextActive: { color: "#fff" },
  scroll:         { flex: 1 },
  scrollContent:  { padding: 20, paddingBottom: 8 },
  welcome:        { fontSize: 13, color: "#444", lineHeight: 20, marginBottom: 16 },
  section:        { marginBottom: 16 },
  secHeading:     { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 6 },
  ptRow:          { flexDirection: "row", marginBottom: 4, paddingLeft: 4 },
  bullet:         { fontSize: 13, color: "#888", marginRight: 6, marginTop: 1 },
  ptText:         { flex: 1, fontSize: 13, color: "#444", lineHeight: 19 },
  footer:         { fontSize: 13, color: BRAND_PRIMARY, fontWeight: "600", textAlign: "center", marginTop: 8, marginBottom: 20, lineHeight: 20 },
  footer2:        { padding: 16, paddingBottom: 32, borderTopWidth: 1, borderColor: "#f0f0f0", backgroundColor: "#fff" },
  checkRow:       { flexDirection: "row", alignItems: "flex-start", marginBottom: 14, gap: 10 },
  checkbox:       { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#ccc", alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  checkboxChecked:{ borderColor: BRAND_PRIMARY, backgroundColor: BRAND_PRIMARY },
  checkMark:      { color: "#fff", fontSize: 13, fontWeight: "800" },
  checkLabel:     { flex: 1, fontSize: 13, color: "#333", lineHeight: 19 },
  btn:            { backgroundColor: BRAND_PRIMARY, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  btnDisabled:    { opacity: 0.4 },
  btnText:        { color: "#fff", fontSize: 15, fontWeight: "700" },
});

