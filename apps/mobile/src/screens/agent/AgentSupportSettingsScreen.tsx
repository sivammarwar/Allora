import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";

interface AgentSettings {
  supportPhone: string | null;
  supportWhatsapp: string | null;
}

export default function AgentSupportSettingsScreen() {
  const qc = useQueryClient();
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const { data, isLoading } = useQuery<AgentSettings>({
    queryKey: ["agent-support-settings"],
    queryFn: () => api.get("/api/agent/settings") as any,
  });

  useEffect(() => {
    if (data) {
      setPhone(data.supportPhone ?? "");
      setWhatsapp(data.supportWhatsapp ?? "");
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      api.patch("/api/agent/settings", {
        supportPhone: phone.trim() || null,
        supportWhatsapp: whatsapp.trim() || null,
      }) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-support-settings"] });
      Alert.alert("Saved", "Support settings updated successfully.");
    },
    onError: () => Alert.alert("Error", "Failed to save settings. Please try again."),
  });

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={s.header}>
        <Text style={s.title}>📞 Support Settings</Text>
        <Text style={s.sub}>Set the phone number and WhatsApp link shown to users in your area.</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={BRAND_PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <View style={s.card}>
          <View style={s.field}>
            <Text style={s.label}>Support Phone Number</Text>
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 9XXXXXXXXX"
              placeholderTextColor={BRAND_MUTED}
              keyboardType="phone-pad"
            />
            <Text style={s.hint}>Users can tap to call this number directly.</Text>
          </View>

          <View style={[s.field, { marginTop: 20 }]}>
            <Text style={s.label}>WhatsApp Link</Text>
            <TextInput
              style={s.input}
              value={whatsapp}
              onChangeText={setWhatsapp}
              placeholder="https://wa.me/919XXXXXXXXX"
              placeholderTextColor={BRAND_MUTED}
              keyboardType="url"
              autoCapitalize="none"
            />
            <Text style={s.hint}>Format: https://wa.me/91XXXXXXXXXX (no spaces or dashes)</Text>
          </View>

          <TouchableOpacity
            style={[s.saveBtn, save.isPending && { opacity: 0.6 }]}
            onPress={() => save.mutate()}
            disabled={save.isPending}
            activeOpacity={0.8}
          >
            {save.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.saveBtnText}>Save Settings</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={s.infoBox}>
        <Text style={s.infoText}>
          💡 Once saved, users whose location falls within your service area will see a support banner on their home screen with these contact details.{"\n\n"}Leave both fields empty to hide the banner for your area.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  header: { padding: 20, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  title: { fontSize: 20, fontWeight: "800", color: "#111" },
  sub: { fontSize: 13, color: BRAND_MUTED, marginTop: 4, lineHeight: 19 },
  card: { margin: 16, backgroundColor: "#fff", borderRadius: 16, padding: 18, shadowColor: "#000", shadowOpacity: 0.04, elevation: 2 },
  field: {},
  label: { fontSize: 13, fontWeight: "700", color: "#111", marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: "#111", backgroundColor: "#fafafa",
  },
  hint: { fontSize: 11, color: BRAND_MUTED, marginTop: 5 },
  saveBtn: {
    marginTop: 24, backgroundColor: BRAND_PRIMARY,
    borderRadius: 12, paddingVertical: 14, alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  infoBox: {
    margin: 16, marginTop: 4, backgroundColor: "#fffbeb",
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#fde68a",
  },
  infoText: { fontSize: 12, color: "#78350f", lineHeight: 18 },
});
