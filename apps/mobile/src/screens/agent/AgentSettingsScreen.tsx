import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import type { AgentStackParams } from "../../navigation/types";

type NavProp = NativeStackNavigationProp<AgentStackParams>;

export default function AgentSettingsScreen() {
  const navigation = useNavigation<NavProp>();

  const items = [
    { icon: "💰", label: "Price Control", onPress: () => navigation.navigate("AgentPriceControl") },
    { icon: "🕐", label: "Slot Hours", onPress: () => navigation.navigate("AgentSlotConfig") },
    { icon: "💳", label: "Payment History", onPress: () => navigation.navigate("AgentPaymentHistory") },
  ];

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.header}>
        <Text style={s.title}>Settings</Text>
        <Text style={s.sub}>Manage your preferences and configuration</Text>
      </View>

      <View style={s.menu}>
        {items.map(({ icon, label, onPress }) => (
          <TouchableOpacity key={label} style={s.row} onPress={onPress} activeOpacity={0.7}>
            <Text style={s.icon}>{icon}</Text>
            <Text style={s.label}>{label}</Text>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  header: { padding: 24, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  title: { fontSize: 22, fontWeight: "800", color: "#111" },
  sub: { fontSize: 13, color: BRAND_MUTED, marginTop: 4 },
  menu: { margin: 16, backgroundColor: "#fff", borderRadius: 16 },
  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f3f4f6",
  },
  icon: { fontSize: 18, marginRight: 14 },
  label: { flex: 1, fontSize: 14, color: "#111", fontWeight: "500" },
  chevron: { fontSize: 20, color: BRAND_MUTED },
});
