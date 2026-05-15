import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import DeliveryDashboardScreen from "../screens/delivery/DeliveryDashboardScreen";
import DeliveryOrdersScreen from "../screens/delivery/DeliveryOrdersScreen";
import DeliveryProfileScreen from "../screens/delivery/DeliveryProfileScreen";
import { BRAND_PRIMARY, BRAND_MUTED } from "../lib/config";
import type { DeliveryTabParams } from "./types";

const Tab = createBottomTabNavigator<DeliveryTabParams>();

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
function tabIcon(active: IoniconName, inactive: IoniconName) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
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
        options={{ title: "Dashboard", tabBarLabel: "Home", tabBarIcon: tabIcon("home", "home-outline") }}
      />
      <Tab.Screen
        name="DeliveryOrders"
        component={DeliveryOrdersScreen}
        options={{ title: "Orders", tabBarLabel: "Orders", tabBarIcon: tabIcon("cube", "cube-outline") }}
      />
      <Tab.Screen
        name="DeliveryProfile"
        component={DeliveryProfileScreen}
        options={{ title: "Profile", tabBarLabel: "Profile", tabBarIcon: tabIcon("person", "person-outline") }}
      />
    </Tab.Navigator>
  );
}
