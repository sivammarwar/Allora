import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View } from "react-native";
import HeroHomeScreen from "../screens/hero/HeroHomeScreen";
import HeroRequestsScreen from "../screens/hero/HeroRequestsScreen";
import HeroSlotsScreen from "../screens/hero/HeroSlotsScreen";
import HeroProfileScreen from "../screens/hero/HeroProfileScreen";
import HeroServicesScreen from "../screens/hero/HeroServicesScreen";
import HeroEarningsScreen from "../screens/hero/HeroEarningsScreen";
import { BRAND_PRIMARY, BRAND_MUTED } from "../lib/config";
import type { HeroTabParams } from "./types";

const Tab = createBottomTabNavigator<HeroTabParams>();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <View style={{ opacity: focused ? 1 : 0.5 }}><Text style={{ fontSize: 22 }}>{emoji}</Text></View>;
}

export default function HeroNavigator() {
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
        name="HeroHome"
        component={HeroHomeScreen}
        options={{ title: "Dashboard", tabBarLabel: "Home", tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }}
      />
      <Tab.Screen
        name="HeroRequests"
        component={HeroRequestsScreen}
        options={{ title: "Requests", tabBarLabel: "Requests", tabBarIcon: ({ focused }) => <TabIcon emoji="📥" focused={focused} /> }}
      />
      <Tab.Screen
        name="HeroSlots"
        component={HeroSlotsScreen}
        options={{ title: "Slots", tabBarLabel: "Slots", tabBarIcon: ({ focused }) => <TabIcon emoji="🗓️" focused={focused} /> }}
      />
      <Tab.Screen
        name="HeroServices"
        component={HeroServicesScreen}
        options={{ title: "My Services", tabBarLabel: "Services", tabBarIcon: ({ focused }) => <TabIcon emoji="🛠️" focused={focused} /> }}
      />
      <Tab.Screen
        name="HeroEarnings"
        component={HeroEarningsScreen}
        options={{ title: "Earnings", tabBarLabel: "Earnings", tabBarIcon: ({ focused }) => <TabIcon emoji="💰" focused={focused} /> }}
      />
      <Tab.Screen
        name="HeroProfile"
        component={HeroProfileScreen}
        options={{ title: "Profile", tabBarLabel: "Profile", tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}
