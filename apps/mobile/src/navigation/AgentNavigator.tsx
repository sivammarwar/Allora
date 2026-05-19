import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AgentHomeScreen from "../screens/agent/AgentHomeScreen";
import AgentProfileScreen from "../screens/agent/AgentProfileScreen";
import AgentAreasScreen from "../screens/agent/AgentAreasScreen";
import AgentRequestsScreen from "../screens/agent/AgentRequestsScreen";
import AgentHeroesScreen from "../screens/agent/AgentHeroesScreen";
import AgentPriceControlScreen from "../screens/agent/AgentPriceControlScreen";
import AgentInventoryScreen from "../screens/agent/AgentInventoryScreen";
import AgentItemsScreen from "../screens/agent/AgentItemsScreen";
import AgentSlotConfigScreen from "../screens/agent/AgentSlotConfigScreen";
import AgentPaymentHistoryScreen from "../screens/agent/AgentPaymentHistoryScreen";
import AgentSecretOrdersScreen from "../screens/agent/AgentSecretOrdersScreen";
import AgentSecretShopsScreen from "../screens/agent/AgentSecretShopsScreen";
import { BRAND_PRIMARY, BRAND_MUTED } from "../lib/config";

interface MenuItem { id: string; label: string; icon: string; screen: React.ComponentType; }

const MENU_ITEMS: MenuItem[] = [
  { id: "home", label: "Dashboard", icon: "bar-chart-outline", screen: AgentHomeScreen },
  { id: "areas", label: "My Areas", icon: "map-outline", screen: AgentAreasScreen },
  { id: "requests", label: "Requests", icon: "shield-checkmark-outline", screen: AgentRequestsScreen },
  { id: "heroes", label: "Verified Heroes", icon: "people-outline", screen: AgentHeroesScreen },
  { id: "pricing", label: "Price Control", icon: "pricetag-outline", screen: AgentPriceControlScreen },
  // { id: "inventory", label: "Inventory", icon: "storefront-outline", screen: AgentInventoryScreen },
  // { id: "items", label: "Catalog Items", icon: "folder-open-outline", screen: AgentItemsScreen },
  { id: "slots", label: "Slot Hours", icon: "time-outline", screen: AgentSlotConfigScreen },
  // { id: "sorders", label: "Secret Orders", icon: "bag-outline", screen: AgentSecretOrdersScreen },
  // { id: "shops", label: "Verify Shops", icon: "business-outline", screen: AgentSecretShopsScreen },
  { id: "payments", label: "Payments", icon: "card-outline", screen: AgentPaymentHistoryScreen },
  { id: "profile", label: "Profile", icon: "person-outline", screen: AgentProfileScreen },
];

export default function AgentNavigator() {
  const [selectedId, setSelectedId] = useState("home");
  const selectedItem = MENU_ITEMS.find((item) => item.id === selectedId) ?? MENU_ITEMS[0];
  const ScreenComponent = selectedItem.screen;

  return (
    <View style={styles.root}>
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>Regional Officer</Text>
        </View>
        <ScrollView style={styles.sidebarList} showsVerticalScrollIndicator={false}>
          {MENU_ITEMS.map((item) => {
            const isActive = item.id === selectedId;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                onPress={() => setSelectedId(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon as any} size={20} color={isActive ? BRAND_PRIMARY : BRAND_MUTED} style={styles.sidebarIcon} />
                <Text style={[styles.sidebarLabel, isActive && styles.sidebarLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.content}>
        <View style={styles.contentHeader}>
          <Text style={styles.contentTitle}>{selectedItem.label}</Text>
        </View>
        <View style={styles.contentBody}>
          <ScreenComponent />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: "#fff" },
  sidebar: { flex: 35, backgroundColor: "#f5f5f5", borderRightWidth: 1, borderRightColor: "#e5e7eb", paddingTop: 8 },
  sidebarHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  sidebarTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  sidebarList: { flex: 1 },
  sidebarItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderLeftWidth: 3, borderLeftColor: "transparent" },
  sidebarItemActive: { backgroundColor: "#fff", borderLeftColor: BRAND_PRIMARY },
  sidebarIcon: { marginRight: 12 },
  sidebarLabel: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  sidebarLabelActive: { color: BRAND_PRIMARY, fontWeight: "700" },
  content: { flex: 65, backgroundColor: "#fff" },
  contentHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  contentTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  contentBody: { flex: 1 },
});
