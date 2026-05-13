import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import HomeScreen from "../screens/user/HomeScreen";
import BookingsScreen from "../screens/user/BookingsScreen";
import ProfileScreen from "../screens/user/ProfileScreen";
import CategoryDetailScreen from "../screens/user/CategoryDetailScreen";
import SubcategoryDetailScreen from "../screens/user/SubcategoryDetailScreen";
import OrderDetailScreen from "../screens/user/OrderDetailScreen";
import NotificationsScreen from "../screens/user/NotificationsScreen";
import RatingScreen from "../screens/user/RatingScreen";
import { BRAND_PRIMARY, BRAND_MUTED } from "../lib/config";
import type { UserTabParams, UserStackParams } from "./types";

const Tab = createBottomTabNavigator<UserTabParams>();
const Stack = createNativeStackNavigator<UserStackParams>();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={{ opacity: focused ? 1 : 0.5 }}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
    </View>
  );
}

function UserTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND_PRIMARY,
        tabBarInactiveTintColor: BRAND_MUTED,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#f3f4f6",
          height: 82,
          paddingBottom: 20,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: "Home", tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{ tabBarLabel: "Bookings", tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Notifications", tabBarLabel: "Alerts", tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Profile", tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function UserNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="UserTabs" component={UserTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="CategoryDetail"
        component={CategoryDetailScreen}
        options={{ title: "Category", headerTintColor: BRAND_PRIMARY }}
      />
      <Stack.Screen
        name="SubcategoryDetail"
        component={SubcategoryDetailScreen}
        options={{ title: "Book Service", headerTintColor: BRAND_PRIMARY }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ title: "Order", headerTintColor: BRAND_PRIMARY }}
      />
      <Stack.Screen
        name="Rate"
        component={RatingScreen}
        options={{ title: "Leave a Review", headerTintColor: BRAND_PRIMARY }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Notifications", headerTintColor: BRAND_PRIMARY }}
      />
    </Stack.Navigator>
  );
}
