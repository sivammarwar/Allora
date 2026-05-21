/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { Component, useEffect } from "react";
import { StatusBar, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { LanguageProvider } from "./src/lib/i18n";
import RootNavigator from "./src/navigation/RootNavigator";
import { registerFCMToken, onForegroundNotification } from "./src/lib/notifications";

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <View style={errStyles.container}>
          <Text style={errStyles.title}>Something went wrong</Text>
          <Text style={errStyles.body}>Please restart the app.</Text>
          <TouchableOpacity style={errStyles.btn} onPress={() => this.setState({ hasError: false })}>
            <Text style={errStyles.btnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
const errStyles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", padding: 24 },
  title: { fontSize: 20, fontWeight: "700", color: "#1a1a1a", marginBottom: 8 },
  body:  { fontSize: 14, color: "#6b7280", marginBottom: 24, textAlign: "center" },
  btn:   { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999, backgroundColor: "#E63950" },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { 
      retry: 1, 
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
    },
  },
});

function AppInner() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    registerFCMToken();
    const unsub = onForegroundNotification((title, body) => {
      Toast.show({ type: "info", text1: title, text2: body, visibilityTime: 4000 });
    });
    return unsub;
  }, [user?.id]);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
          <AuthProvider>
            <AppInner />
          </AuthProvider>
        </LanguageProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
