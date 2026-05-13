import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../auth/AuthContext";
import { BRAND_PRIMARY } from "../../lib/config";
import type { AuthStackParams } from "../../navigation/types";

type Props = NativeStackScreenProps<AuthStackParams, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { signInWithOTP } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const e = email.trim().toLowerCase();
    if (!e.includes("@")) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      await signInWithOTP(e);
      navigation.navigate("OTP", { email: e });
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoPin}>📍</Text>
          </View>
          <Text style={styles.logoText}>Allora</Text>
        </View>

        <Text style={styles.h1}>Welcome back</Text>
        <Text style={styles.sub}>We'll send a one-time code to your email.</Text>

        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSend}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Send OTP →</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.legal}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 40 },
  logoBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: BRAND_PRIMARY,
    alignItems: "center", justifyContent: "center",
  },
  logoPin: { fontSize: 20 },
  logoText: { fontSize: 26, fontWeight: "800", color: "#111" },
  h1: { fontSize: 28, fontWeight: "800", color: "#111", marginBottom: 8 },
  sub: { fontSize: 14, color: "#6b7280", marginBottom: 32, lineHeight: 20 },
  input: {
    height: 52, borderRadius: 14, borderWidth: 1.5,
    borderColor: "#e5e7eb", paddingHorizontal: 16,
    fontSize: 15, color: "#111", marginBottom: 16,
    backgroundColor: "#fafafa",
  },
  btn: {
    height: 52, borderRadius: 14, backgroundColor: BRAND_PRIMARY,
    alignItems: "center", justifyContent: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  legal: { fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 24, lineHeight: 16 },
});
