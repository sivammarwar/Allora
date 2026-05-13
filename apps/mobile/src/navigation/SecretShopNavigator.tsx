import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View } from "react-native";
import { useSecretCart } from "../lib/secretShopCart";
import SecretShopDashboardScreen from "../screens/secret-shop/SecretShopDashboardScreen";
import SecretShopCartScreen from "../screens/secret-shop/SecretShopCartScreen";
import SecretShopOrdersScreen from "../screens/secret-shop/SecretShopOrdersScreen";
import SecretShopProfileScreen from "../screens/secret-shop/SecretShopProfileScreen";
import { BRAND_PRIMARY, BRAND_MUTED } from "../lib/config";
import type { SecretShopTabParams } from "./types";

const Tab = createBottomTabNavigator<SecretShopTabParams>();

function TabIcon({ emoji, focused, badge }: { emoji: string; focused: boolean; badge?: number }) {
  return (
    <View style={{ opacity: focused ? 1 : 0.5 }}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      {badge != null && badge > 0 && (
        <View style={{
          position: "absolute", top: -4, right: -8,
          backgroundColor: "#ef4444", borderRadius: 10,
          minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
        }}>
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>
            {badge > 9 ? "9+" : badge}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function SecretShopNavigator() {
  const cartCount = useSecretCart((s) => s.count());

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#10b981",
        tabBarInactiveTintColor: BRAND_MUTED,
        tabBarStyle: { backgroundColor: "#fff", borderTopColor: "#f3f4f6", height: 82, paddingBottom: 20 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="SecretShopHome"
        component={SecretShopDashboardScreen}
        options={{ title: "Shop", tabBarLabel: "Shop", tabBarIcon: ({ focused }) => <TabIcon emoji="🏪" focused={focused} /> }}
      />
      <Tab.Screen
        name="SecretShopCart"
        component={SecretShopCartScreen}
        options={{ title: "Cart", tabBarLabel: "Cart", tabBarIcon: ({ focused }) => <TabIcon emoji="🛒" focused={focused} badge={cartCount} /> }}
      />
      <Tab.Screen
        name="SecretShopOrders"
        component={SecretShopOrdersScreen}
        options={{ title: "My Orders", tabBarLabel: "Orders", tabBarIcon: ({ focused }) => <TabIcon emoji="📦" focused={focused} /> }}
      />
      <Tab.Screen
        name="SecretShopProfile"
        component={SecretShopProfileScreen}
        options={{ title: "Profile", tabBarLabel: "Profile", tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}
