import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import HomeScreen from "../screens/user/HomeScreen";
import BookingsScreen from "../screens/user/BookingsScreen";
import CategoriesScreen from "../screens/user/CategoriesScreen";
import ProfileScreen from "../screens/user/ProfileScreen";
import CategoryDetailScreen from "../screens/user/CategoryDetailScreen";
import SubcategoryDetailScreen from "../screens/user/SubcategoryDetailScreen";
import OrderDetailScreen from "../screens/user/OrderDetailScreen";
import NotificationsScreen from "../screens/user/NotificationsScreen";
import RatingScreen from "../screens/user/RatingScreen";
import PaymentScreen from "../screens/shared/PaymentScreen";
import GuestLoginScreen from "../screens/auth/GuestLoginScreen";
import GuestOTPScreen from "../screens/auth/GuestOTPScreen";
import GuestSetPasswordScreen from "../screens/auth/GuestSetPasswordScreen";
import MyReviewsScreen from "../screens/user/MyReviewsScreen";
import SavedAddressesScreen from "../screens/user/SavedAddressesScreen";
import PaymentMethodsScreen from "../screens/user/PaymentMethodsScreen";
import HelpSupportScreen from "../screens/user/HelpSupportScreen";
import PrivacyPolicyScreen from "../screens/user/PrivacyPolicyScreen";
import AboutScreen from "../screens/user/AboutScreen";
import HowItWorksScreen from "../screens/user/HowItWorksScreen";
import TermsScreen from "../screens/user/TermsScreen";
import RefundPolicyScreen from "../screens/user/RefundPolicyScreen";
import ContactScreen from "../screens/user/ContactScreen";
import { BRAND_PRIMARY, BRAND_MUTED } from "../lib/config";
import { useLanguage } from "../lib/i18n";
import type { UserTabParams, UserStackParams } from "./types";

const Tab = createBottomTabNavigator<UserTabParams>();
const Stack = createNativeStackNavigator<UserStackParams>();

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function tabIcon(active: IoniconName, inactive: IoniconName) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

function UserTabs() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const tabBarHeight = 56 + insets.bottom;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
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
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t("nav.home"),
          tabBarIcon: tabIcon("home", "home-outline"),
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          tabBarLabel: t("nav.bookings"),
          tabBarIcon: tabIcon("calendar", "calendar-outline"),
        }}
      />
      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          tabBarLabel: t("nav.categories"),
          tabBarIcon: tabIcon("grid", "grid-outline"),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: t("nav.alerts"),
          tabBarLabel: t("nav.alerts"),
          tabBarIcon: tabIcon("notifications", "notifications-outline"),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t("nav.profile"),
          tabBarIcon: tabIcon("person", "person-outline"),
        }}
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
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ title: "Pay", headerTintColor: BRAND_PRIMARY, presentation: "modal" }}
      />
      <Stack.Screen
        name="GuestLogin"
        component={GuestLoginScreen}
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="GuestOTP"
        component={GuestOTPScreen}
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="GuestSetPassword"
        component={GuestSetPasswordScreen}
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="MyReviews"
        component={MyReviewsScreen}
        options={{ title: "My Reviews", headerTintColor: BRAND_PRIMARY }}
      />
      <Stack.Screen
        name="SavedAddresses"
        component={SavedAddressesScreen}
        options={{ title: "Saved Addresses", headerTintColor: BRAND_PRIMARY }}
      />
      <Stack.Screen
        name="PaymentMethods"
        component={PaymentMethodsScreen}
        options={{ title: "Payment Methods", headerTintColor: BRAND_PRIMARY }}
      />
      <Stack.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
        options={{ title: "Help & Support", headerTintColor: BRAND_PRIMARY }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: "Privacy Policy", headerTintColor: BRAND_PRIMARY }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{ title: "About", headerTintColor: BRAND_PRIMARY }}
      />
      <Stack.Screen
        name="HowItWorks"
        component={HowItWorksScreen}
        options={{ title: "How It Works", headerTintColor: BRAND_PRIMARY }}
      />
      <Stack.Screen
        name="Terms"
        component={TermsScreen}
        options={{ title: "Terms of Service", headerTintColor: BRAND_PRIMARY }}
      />
      <Stack.Screen
        name="RefundPolicy"
        component={RefundPolicyScreen}
        options={{ title: "Refund Policy", headerTintColor: BRAND_PRIMARY }}
      />
      <Stack.Screen
        name="Contact"
        component={ContactScreen}
        options={{ title: "Contact Us", headerTintColor: BRAND_PRIMARY }}
      />
    </Stack.Navigator>
  );
}
