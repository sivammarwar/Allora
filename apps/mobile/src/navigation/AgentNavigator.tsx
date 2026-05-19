import React from "react";
import { TouchableOpacity, Alert } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useAuth } from "../auth/AuthContext";
import AgentHomeScreen from "../screens/agent/AgentHomeScreen";
import AgentProfileScreen from "../screens/agent/AgentProfileScreen";
import AgentAreasScreen from "../screens/agent/AgentAreasScreen";
import AgentRequestsScreen from "../screens/agent/AgentRequestsScreen";
import AgentHeroesScreen from "../screens/agent/AgentHeroesScreen";
import AgentPriceControlScreen from "../screens/agent/AgentPriceControlScreen";
import AgentPaymentHistoryScreen from "../screens/agent/AgentPaymentHistoryScreen";
import AgentBookingHistoryScreen from "../screens/agent/AgentBookingHistoryScreen";
import AgentRequestDetailScreen from "../screens/agent/AgentRequestDetailScreen";
import AgentSlotConfigScreen from "../screens/agent/AgentSlotConfigScreen";
import { BRAND_PRIMARY, BRAND_MUTED } from "../lib/config";
import type { AgentTabParams, AgentStackParams } from "./types";

const Tab = createBottomTabNavigator<AgentTabParams>();
const Stack = createNativeStackNavigator<AgentStackParams>();

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function tabIcon(active: IoniconName, inactive: IoniconName) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

function LogoutButton() {
  const { logout } = useAuth();
  return (
    <TouchableOpacity
      onPress={() =>
        Alert.alert("Log out", "Are you sure?", [
          { text: "Cancel", style: "cancel" },
          { text: "Log out", style: "destructive", onPress: logout },
        ])
      }
      style={{ marginRight: 12 }}
    >
      <Ionicons name="log-out-outline" size={22} color="#ef4444" />
    </TouchableOpacity>
  );
}

function AgentTabs() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
        headerTitleStyle: { fontSize: 17, fontWeight: "700", color: "#111" },
        headerRight: () => <LogoutButton />,
        tabBarActiveTintColor: BRAND_PRIMARY,
        tabBarInactiveTintColor: BRAND_MUTED,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#f0f0f0",
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom || 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="AgentHome"
        component={AgentHomeScreen}
        options={{
          title: "Dashboard",
          tabBarLabel: "Home",
          tabBarIcon: tabIcon("home", "home-outline"),
        }}
      />
      <Tab.Screen
        name="AgentRequests"
        component={AgentRequestsScreen}
        options={{
          title: "Requests",
          tabBarLabel: "Verify",
          tabBarIcon: tabIcon("shield-checkmark", "shield-checkmark-outline"),
        }}
      />
      <Tab.Screen
        name="AgentBookings"
        component={AgentBookingHistoryScreen}
        options={{
          title: "Booking History",
          tabBarLabel: "Bookings",
          tabBarIcon: tabIcon("calendar", "calendar-outline"),
        }}
      />
      <Tab.Screen
        name="AgentPrices"
        component={AgentPriceControlScreen}
        options={{
          title: "Prices",
          tabBarLabel: "Prices",
          tabBarIcon: tabIcon("pricetag", "pricetag-outline"),
        }}
      />
      <Tab.Screen
        name="AgentProfile"
        component={AgentProfileScreen}
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: tabIcon("person", "person-outline"),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AgentNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AgentTabs" component={AgentTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="AgentAreas"
        component={AgentAreasScreen}
        options={{ title: "Service Areas", headerTintColor: BRAND_PRIMARY }}
      />
      <Stack.Screen
        name="AgentHeroes"
        component={AgentHeroesScreen}
        options={{ title: "My Heroes", headerTintColor: BRAND_PRIMARY }}
      />
      <Stack.Screen
        name="AgentBookingHistory"
        component={AgentBookingHistoryScreen}
        options={{ title: "Booking History", headerTintColor: BRAND_PRIMARY }}
      />
      <Stack.Screen
        name="AgentPriceControl"
        component={AgentPriceControlScreen}
        options={{ title: "Price Control", headerTintColor: BRAND_PRIMARY }}
      />
      <Stack.Screen
        name="AgentPaymentHistory"
        component={AgentPaymentHistoryScreen}
        options={{ title: "Payment History", headerTintColor: BRAND_PRIMARY }}
      />
      <Stack.Screen
        name="AgentSlotConfig"
        component={AgentSlotConfigScreen}
        options={{ title: "Slot Hours", headerTintColor: BRAND_PRIMARY }}
      />
      <Stack.Screen
        name="AgentRequestDetail"
        component={AgentRequestDetailScreen}
        options={{ title: "Request Detail", headerTintColor: BRAND_PRIMARY }}
      />
    </Stack.Navigator>
  );
}
