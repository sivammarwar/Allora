import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../auth/AuthContext";
import UserNavigator from "./UserNavigator";
import HeroNavigator from "./HeroNavigator";
import AgentNavigator from "./AgentNavigator";
import DeliveryNavigator from "./DeliveryNavigator";
import SecretShopNavigator from "./SecretShopNavigator";
import { BRAND_PRIMARY } from "../lib/config";

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator color={BRAND_PRIMARY} size="large" />
      </View>
    );
  }

  // Staff roles with dedicated dashboards — require login
  if (user?.role === "HERO") return <HeroNavigator />;
  if (user?.role === "AGENT") return <AgentNavigator />;
  if (user?.role === "DELIVERY_BOY") return <DeliveryNavigator />;
  if (user?.role === "SECRET_SHOP") return <SecretShopNavigator />;

  // Guests (no user) and regular USERs both get the browseable home screen.
  // Booking/profile actions inside UserNavigator gate login when needed.
  return <UserNavigator />;
}
