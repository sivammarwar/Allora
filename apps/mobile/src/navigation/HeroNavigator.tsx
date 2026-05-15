import React from "react";
import { View, ActivityIndicator } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import HeroHomeScreen from "../screens/hero/HeroHomeScreen";
import HeroRequestsScreen from "../screens/hero/HeroRequestsScreen";
import HeroSlotsScreen from "../screens/hero/HeroSlotsScreen";
import HeroProfileScreen from "../screens/hero/HeroProfileScreen";
import HeroEarningsScreen from "../screens/hero/HeroEarningsScreen";
import HeroOnboardingPaymentScreen from "../screens/hero/HeroOnboardingPaymentScreen";
import { api } from "../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../lib/config";
import type { HeroTabParams } from "./types";

const Tab = createBottomTabNavigator<HeroTabParams>();

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
function tabIcon(active: IoniconName, inactive: IoniconName) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

export default function HeroNavigator() {
  const qc = useQueryClient();
  const { data: me, isLoading } = useQuery<any>({
    queryKey: ["hero-me"],
    queryFn: () => api.get("/api/hero/me") as any,
    retry: false,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator color={BRAND_PRIMARY} size="large" />
      </View>
    );
  }

  if (me?.state === "payment_required") {
    return (
      <HeroOnboardingPaymentScreen
        feeAmount={me.feeAmount ?? 999}
        validityMonths={me.validityMonths ?? 12}
        expired={me.expired ?? false}
        previousExpiresAt={me.profile?.onboardingExpiresAt ?? null}
        onPaid={() => qc.invalidateQueries({ queryKey: ["hero-me"] })}
      />
    );
  }

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
        options={{ title: "Dashboard", tabBarLabel: "Home", tabBarIcon: tabIcon("home", "home-outline") }}
      />
      <Tab.Screen
        name="HeroRequests"
        component={HeroRequestsScreen}
        options={{ title: "Requests", tabBarLabel: "Requests", tabBarIcon: tabIcon("arrow-down-circle", "arrow-down-circle-outline") }}
      />
      <Tab.Screen
        name="HeroSlots"
        component={HeroSlotsScreen}
        options={{ title: "Slots", tabBarLabel: "Slots", tabBarIcon: tabIcon("calendar", "calendar-outline") }}
      />
      <Tab.Screen
        name="HeroEarnings"
        component={HeroEarningsScreen}
        options={{ title: "Earnings", tabBarLabel: "Earnings", tabBarIcon: tabIcon("wallet", "wallet-outline") }}
      />
      <Tab.Screen
        name="HeroProfile"
        component={HeroProfileScreen}
        options={{ title: "Profile", tabBarLabel: "Profile", tabBarIcon: tabIcon("person", "person-outline") }}
      />
    </Tab.Navigator>
  );
}
