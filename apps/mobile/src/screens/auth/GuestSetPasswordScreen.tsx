import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import type { UserStackParams } from "../../navigation/types";

type Props = NativeStackScreenProps<UserStackParams, "GuestSetPassword">;

export default function GuestSetPasswordScreen({ route, navigation }: Props) {
  const { popsAfterDone = 1 } = route.params ?? {};
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = password.length >= 8 && password === confirm;

  const handleSubmit = async () => {
    if (password.length < 8) {
      Alert.alert("Password too short", "Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Passwords don't match", "Please re-enter the same password.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/set-password", { password });
      // Pop this + GuestOTP + GuestLogin off the stack
      navigation.pop(popsAfterDone);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to set password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.pop(popsAfterDone);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.iconWrap}>
          <Ionicons name="key" size={40} color={BRAND_PRIMARY} />
        </View>

        <Text style={styles.h1}>Set your password</Text>
        <Text style={styles.sub}>
          Create a password so you can sign in faster next time without OTP.
        </Text>

        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="New password (min 8 chars)"
            placeholderTextColor="#9ca3af"
            secureTextEntry={!show}
            autoCapitalize="none"
            autoCorrect={false}
            value={password}
            onChangeText={setPassword}
            autoFocus
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShow((s) => !s)}
          >
            <Ionicons name={show ? "eye-off" : "eye"} size={20} color={BRAND_MUTED} />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          placeholderTextColor="#9ca3af"
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          value={confirm}
          onChangeText={setConfirm}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
        />

        <TouchableOpacity
          style={[styles.btn, (!canSubmit || loading) && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Save Password</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} disabled={loading}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { padding: 28, paddingTop: 80 },
  iconWrap: {
    alignSelf: "center",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${BRAND_PRIMARY}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  h1: { fontSize: 26, fontWeight: "800", color: "#111", marginBottom: 8, textAlign: "center" },
  sub: { fontSize: 14, color: BRAND_MUTED, marginBottom: 28, textAlign: "center", lineHeight: 21 },
  inputWrap: { position: "relative", marginBottom: 14 },
  input: {
    height: 52, borderWidth: 1.5, borderColor: "#e5e7eb",
    borderRadius: 14, paddingHorizontal: 16, fontSize: 15,
    color: "#111", marginBottom: 14, backgroundColor: "#fafafa",
  },
  eyeBtn: {
    position: "absolute", right: 14, top: 16,
    padding: 4,
  },
  btn: {
    height: 52, borderRadius: 14, backgroundColor: BRAND_PRIMARY,
    alignItems: "center", justifyContent: "center", marginTop: 6,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  skipBtn: { alignItems: "center", paddingVertical: 16, marginTop: 4 },
  skipText: { fontSize: 14, color: BRAND_MUTED, fontWeight: "600" },
});
