import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../auth/AuthContext";
import { BRAND_PRIMARY } from "../../lib/config";
import type { UserStackParams } from "../../navigation/types";

type Props = NativeStackScreenProps<UserStackParams, "GuestLogin">;

export default function GuestLoginScreen({ route, navigation }: Props) {
  const role = route.params?.role ?? "USER";
  const { signInWithOTP, loginWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"email" | "password">("email");
  const [loading, setLoading] = useState(false);

  const isHero = role === "HERO";

  const handleEmailNext = async () => {
    const e = email.trim().toLowerCase();
    if (!e.includes("@")) { Alert.alert("Invalid email", "Please enter a valid email address."); return; }
    setLoading(true);
    try {
      const { hasPassword } = await signInWithOTP(e, role);
      if (hasPassword) { setStep("password"); }
      else { navigation.replace("GuestOTP", { email: e, role }); }
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed. Please try again.");
    } finally { setLoading(false); }
  };

  const handlePasswordLogin = async () => {
    if (!password.trim()) { Alert.alert("Enter password", "Please enter your password."); return; }
    setLoading(true);
    try {
      await loginWithPassword(email.trim().toLowerCase(), password);
      navigation.pop(1);
    } catch (err: any) {
      Alert.alert("Incorrect password", err?.message ?? "Please check and try again.");
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    try {
      await signInWithOTP(email.trim().toLowerCase(), role);
      navigation.replace("GuestOTP", { email: email.trim().toLowerCase(), role });
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to send OTP.");
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>✕ Close</Text>
        </TouchableOpacity>

        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoPin}>{isHero ? "🦸" : "📍"}</Text>
          </View>
          <Text style={styles.logoText}>Allora</Text>
        </View>

        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{isHero ? "Hero Login" : "User Login"}</Text>
        </View>

        {step === "email" ? (
          <>
            <Text style={styles.h1}>{isHero ? "Welcome, Hero!" : "Welcome back!"}</Text>
            <Text style={styles.sub}>
              {isHero ? "Sign in to manage your services, slots & earnings." : "Sign in to book services near you."}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={handleEmailNext}
              returnKeyType="next"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleEmailNext}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Continue →</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.h1}>Enter your password</Text>
            <Text style={styles.sub}>{email}</Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handlePasswordLogin}
              returnKeyType="done"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handlePasswordLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In →</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot password? Sign in with OTP instead</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.legal}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flex: 1, padding: 28, justifyContent: "center" },
  back: { position: "absolute", top: 52, right: 24 },
  backText: { fontSize: 15, color: "#9ca3af", fontWeight: "600" },
  logoRow: { flexDirection: "row", alignItems: "center", marginBottom: 32 },
  logoBox: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: BRAND_PRIMARY, alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  logoPin: { fontSize: 20 },
  logoText: { fontSize: 26, fontWeight: "800", color: "#111" },
  roleBadge: { alignSelf: "flex-start", backgroundColor: "#f3f4f6", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 16 },
  roleBadgeText: { fontSize: 12, fontWeight: "700", color: "#374151", letterSpacing: 0.5 },
  h1: { fontSize: 26, fontWeight: "800", color: "#111", marginBottom: 8 },
  sub: { fontSize: 14, color: "#6b7280", marginBottom: 28 },
  input: {
    height: 52, borderWidth: 1.5, borderColor: "#e5e7eb",
    borderRadius: 14, paddingHorizontal: 16, fontSize: 15,
    color: "#111", marginBottom: 14, backgroundColor: "#fafafa",
  },
  btn: {
    height: 52, borderRadius: 14, backgroundColor: BRAND_PRIMARY,
    alignItems: "center", justifyContent: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  forgotBtn: { alignSelf: "center", marginTop: 14 },
  forgotText: { fontSize: 13, color: BRAND_PRIMARY, textDecorationLine: "underline" },
  legal: { fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 20, lineHeight: 16 },
});
