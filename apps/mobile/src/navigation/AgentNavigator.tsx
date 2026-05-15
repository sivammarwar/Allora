import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
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
import type { AgentTabParams } from "./types";

const Tab = createBottomTabNavigator<AgentTabParams>();

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
function tabIcon(active: IoniconName, inactive: IoniconName) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
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
        options={{ title: "Agent Dashboard", tabBarLabel: "Dashboard", tabBarIcon: tabIcon("bar-chart", "bar-chart-outline") }}
      />
      <Tab.Screen
        name="AgentAreas"
        component={AgentAreasScreen}
        options={{ title: "My Areas", tabBarLabel: "Areas", tabBarIcon: tabIcon("map", "map-outline") }}
      />
      <Tab.Screen
        name="AgentRequests"
        component={AgentRequestsScreen}
        options={{ title: "Requests", tabBarLabel: "Requests", tabBarIcon: tabIcon("shield-checkmark", "shield-checkmark-outline") }}
      />
      <Tab.Screen
        name="AgentHeroes"
        component={AgentHeroesScreen}
        options={{ title: "Verified Heroes", tabBarLabel: "Heroes", tabBarIcon: tabIcon("people", "people-outline") }}
      />
      <Tab.Screen
        name="AgentPriceControl"
        component={AgentPriceControlScreen}
        options={{ title: "Price Control", tabBarLabel: "Pricing", tabBarIcon: tabIcon("pricetag", "pricetag-outline") }}
      />
      <Tab.Screen
        name="AgentInventory"
        component={AgentInventoryScreen}
        options={{ title: "Inventory", tabBarLabel: "Inventory", tabBarIcon: tabIcon("storefront", "storefront-outline") }}
      />
      <Tab.Screen
        name="AgentItems"
        component={AgentItemsScreen}
        options={{ title: "Catalog Items", tabBarLabel: "Items", tabBarIcon: tabIcon("folder-open", "folder-open-outline") }}
      />
      <Tab.Screen
        name="AgentSlotConfig"
        component={AgentSlotConfigScreen}
        options={{ title: "Slot Hours", tabBarLabel: "Slots", tabBarIcon: tabIcon("time", "time-outline") }}
      />
      <Tab.Screen
        name="AgentSecretOrders"
        component={AgentSecretOrdersScreen}
        options={{ title: "Secret Orders", tabBarLabel: "S.Orders", tabBarIcon: tabIcon("bag", "bag-outline") }}
      />
      <Tab.Screen
        name="AgentSecretShops"
        component={AgentSecretShopsScreen}
        options={{ title: "Verify Shops", tabBarLabel: "Shops", tabBarIcon: tabIcon("business", "business-outline") }}
      />
      <Tab.Screen
        name="AgentPaymentHistory"
        component={AgentPaymentHistoryScreen}
        options={{ title: "Payments", tabBarLabel: "Payments", tabBarIcon: tabIcon("card", "card-outline") }}
      />
      <Tab.Screen
        name="AgentProfile"
        component={AgentProfileScreen}
        options={{ title: "Profile", tabBarLabel: "Profile", tabBarIcon: tabIcon("person", "person-outline") }}
      />
    </Tab.Navigator>
  );
}
