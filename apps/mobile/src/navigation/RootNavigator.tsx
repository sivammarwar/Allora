import React from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import AuthNavigator from "./AuthNavigator";
import UserNavigator from "./UserNavigator";
import HeroNavigator from "./HeroNavigator";
import { BRAND_PRIMARY } from "../lib/config";
import type { RootStackParams } from "./types";

const Stack = createNativeStackNavigator<RootStackParams>();

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator color={BRAND_PRIMARY} size="large" />
      </View>
    );
  }

  if (!user) {
    return <AuthNavigator />;
  }

  if (user.role === "HERO") return <HeroNavigator />;

  // USER, AGENT, DELIVERY_BOY, etc. → User app for now
  return <UserNavigator />;
}
