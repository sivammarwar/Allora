import React, { useRef, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../auth/AuthContext";
import { BRAND_PRIMARY } from "../../lib/config";
import type { AuthStackParams } from "../../navigation/types";

type Props = NativeStackScreenProps<AuthStackParams, "OTP">;

export default function OTPScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const { verifyOTP, signInWithOTP } = useAuth();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputs = useRef<TextInput[]>([]);

  const handleChange = (val: string, index: number) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) inputs.current[index + 1]?.focus();
    if (!digit && index > 0) inputs.current[index - 1]?.focus();
    if (next.every(Boolean)) verify(next.join(""));
  };

  const verify = async (code: string) => {
    setLoading(true);
    try {
      await verifyOTP(email, code);
      // Navigation resets automatically via RootNavigator watching user state
    } catch (err: any) {
      Alert.alert("Invalid OTP", err?.message ?? "Please check the code and try again.");
      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await signInWithOTP(email);
      Alert.alert("Sent!", "A new OTP has been sent to " + email);
    } catch {
      Alert.alert("Error", "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.h1}>Check your email</Text>
        <Text style={styles.sub}>
          We sent a 6-digit code to{"\n"}
          <Text style={styles.emailBold}>{email}</Text>
        </Text>

        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => { if (r) inputs.current[i] = r; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={(v) => handleChange(v, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              textAlign="center"
            />
          ))}
        </View>

        {loading && (
          <View style={styles.verifyingRow}>
            <ActivityIndicator color={BRAND_PRIMARY} />
            <Text style={styles.verifyingText}>Verifying…</Text>
          </View>
        )}

        <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resendBtn}>
          <Text style={styles.resendText}>
            {resending ? "Sending…" : "Didn't get it? Resend"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  back: { position: "absolute", top: 60, left: 28 },
  backText: { fontSize: 14, color: BRAND_PRIMARY, fontWeight: "600" },
  h1: { fontSize: 28, fontWeight: "800", color: "#111", marginBottom: 8 },
  sub: { fontSize: 14, color: "#6b7280", marginBottom: 36, lineHeight: 22 },
  emailBold: { color: "#111", fontWeight: "700" },
  otpRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  otpBox: {
    flex: 1, height: 56, borderRadius: 14, borderWidth: 1.5,
    borderColor: "#e5e7eb", fontSize: 22, fontWeight: "700",
    color: "#111", backgroundColor: "#fafafa", textAlign: "center",
  },
  otpBoxFilled: { borderColor: BRAND_PRIMARY, backgroundColor: "#fff5f7" },
  verifyingRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  verifyingText: { color: BRAND_PRIMARY, fontSize: 14 },
  resendBtn: { alignSelf: "center", marginTop: 8 },
  resendText: { color: BRAND_PRIMARY, fontSize: 14, fontWeight: "600" },
});
