import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View } from "react-native";
import DeliveryDashboardScreen from "../screens/delivery/DeliveryDashboardScreen";
import DeliveryOrdersScreen from "../screens/delivery/DeliveryOrdersScreen";
import DeliveryProfileScreen from "../screens/delivery/DeliveryProfileScreen";
import { BRAND_PRIMARY, BRAND_MUTED } from "../lib/config";
import type { DeliveryTabParams } from "./types";

const Tab = createBottomTabNavigator<DeliveryTabParams>();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <View style={{ opacity: focused ? 1 : 0.5 }}><Text style={{ fontSize: 22 }}>{emoji}</Text></View>;
}

export default function DeliveryNavigator() {
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
        name="DeliveryDashboard"
        component={DeliveryDashboardScreen}
        options={{ title: "Dashboard", tabBarLabel: "Home", tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }}
      />
      <Tab.Screen
        name="DeliveryOrders"
        component={DeliveryOrdersScreen}
        options={{ title: "Orders", tabBarLabel: "Orders", tabBarIcon: ({ focused }) => <TabIcon emoji="📦" focused={focused} /> }}
      />
      <Tab.Screen
        name="DeliveryProfile"
        component={DeliveryProfileScreen}
        options={{ title: "Profile", tabBarLabel: "Profile", tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}
