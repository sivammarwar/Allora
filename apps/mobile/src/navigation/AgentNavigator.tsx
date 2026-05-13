import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View } from "react-native";
import AgentHomeScreen from "../screens/agent/AgentHomeScreen";
import AgentProfileScreen from "../screens/agent/AgentProfileScreen";
import AgentAreasScreen from "../screens/agent/AgentAreasScreen";
import AgentRequestsScreen from "../screens/agent/AgentRequestsScreen";
import AgentPriceControlScreen from "../screens/agent/AgentPriceControlScreen";
import AgentInventoryScreen from "../screens/agent/AgentInventoryScreen";
import AgentItemsScreen from "../screens/agent/AgentItemsScreen";
import AgentSlotConfigScreen from "../screens/agent/AgentSlotConfigScreen";
import AgentPaymentHistoryScreen from "../screens/agent/AgentPaymentHistoryScreen";
import AgentSecretOrdersScreen from "../screens/agent/AgentSecretOrdersScreen";
import AgentSecretShopsScreen from "../screens/agent/AgentSecretShopsScreen";
import { BRAND_PRIMARY, BRAND_MUTED } from "../lib/config";
import type { AgentTabParams } from "./types";

const Tab = createBottomTabNavigator<AgentTabParams>();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <View style={{ opacity: focused ? 1 : 0.5 }}><Text style={{ fontSize: 22 }}>{emoji}</Text></View>;
}

export default function AgentNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: BRAND_PRIMARY,
        tabBarInactiveTintColor: BRAND_MUTED,
        tabBarStyle: { backgroundColor: "#fff", borderTopColor: "#f3f4f6", height: 82, paddingBottom: 20 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="AgentHome"
        component={AgentHomeScreen}
        options={{ title: "Agent Dashboard", tabBarLabel: "Dashboard", tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }}
      />
      <Tab.Screen
        name="AgentAreas"
        component={AgentAreasScreen}
        options={{ title: "My Areas", tabBarLabel: "Areas", tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} /> }}
      />
      <Tab.Screen
        name="AgentRequests"
        component={AgentRequestsScreen}
        options={{ title: "Requests", tabBarLabel: "Requests", tabBarIcon: ({ focused }) => <TabIcon emoji="🛡️" focused={focused} /> }}
      />
      <Tab.Screen
        name="AgentPriceControl"
        component={AgentPriceControlScreen}
        options={{ title: "Price Control", tabBarLabel: "Pricing", tabBarIcon: ({ focused }) => <TabIcon emoji="💲" focused={focused} /> }}
      />
      <Tab.Screen
        name="AgentInventory"
        component={AgentInventoryScreen}
        options={{ title: "Inventory", tabBarLabel: "Inventory", tabBarIcon: ({ focused }) => <TabIcon emoji="🏪" focused={focused} /> }}
      />
      <Tab.Screen
        name="AgentItems"
        component={AgentItemsScreen}
        options={{ title: "Catalog Items", tabBarLabel: "Items", tabBarIcon: ({ focused }) => <TabIcon emoji="🗂️" focused={focused} /> }}
      />
      <Tab.Screen
        name="AgentSlotConfig"
        component={AgentSlotConfigScreen}
        options={{ title: "Slot Hours", tabBarLabel: "Slots", tabBarIcon: ({ focused }) => <TabIcon emoji="🕔" focused={focused} /> }}
      />
      <Tab.Screen
        name="AgentSecretOrders"
        component={AgentSecretOrdersScreen}
        options={{ title: "Secret Orders", tabBarLabel: "S.Orders", tabBarIcon: ({ focused }) => <TabIcon emoji="🛍️" focused={focused} /> }}
      />
      <Tab.Screen
        name="AgentSecretShops"
        component={AgentSecretShopsScreen}
        options={{ title: "Verify Shops", tabBarLabel: "Shops", tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }}
      />
      <Tab.Screen
        name="AgentPaymentHistory"
        component={AgentPaymentHistoryScreen}
        options={{ title: "Payments", tabBarLabel: "Payments", tabBarIcon: ({ focused }) => <TabIcon emoji="💳" focused={focused} /> }}
      />
      <Tab.Screen
        name="AgentProfile"
        component={AgentProfileScreen}
        options={{ title: "Profile", tabBarLabel: "Profile", tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}
