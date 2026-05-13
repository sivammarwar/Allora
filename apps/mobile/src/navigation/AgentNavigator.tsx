import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View } from "react-native";
import AgentHomeScreen from "../screens/agent/AgentHomeScreen";
import AgentProfileScreen from "../screens/agent/AgentProfileScreen";
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
        component={AgentHomeScreen}
        options={{ title: "Areas", tabBarLabel: "Areas", tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} /> }}
      />
      <Tab.Screen
        name="AgentProfile"
        component={AgentProfileScreen}
        options={{ title: "Profile", tabBarLabel: "Profile", tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}
