import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import type { UserStackParams } from "../../navigation/types";

type Props = NativeStackScreenProps<UserStackParams, "Rate">;

export default function RatingScreen({ route, navigation }: Props) {
  const { bookingId, heroName, serviceName } = route.params;
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      api.post(`/api/user/bookings/${bookingId}/review`, { rating, comment: comment.trim() || null }) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", bookingId] });
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      Alert.alert("Thank you!", "Your review has been submitted.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed to submit review."),
  });

  return (
    <View style={styles.screen}>
      <View style={styles.body}>
        <Text style={styles.heading}>Rate your experience</Text>
        <Text style={styles.sub}>
          How was your service{heroName ? ` with ${heroName}` : ""}?
        </Text>
        {serviceName && <Text style={styles.service}>{serviceName}</Text>}

        {/* Star selector */}
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((s) => (
            <TouchableOpacity key={s} onPress={() => setRating(s)} activeOpacity={0.8}>
              <Text style={[styles.star, s <= rating && styles.starFilled]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingLabel}>
          {rating === 0 ? "Tap to rate" : ["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
        </Text>

        {/* Comment */}
        <TextInput
          style={styles.textarea}
          placeholder="Share more about your experience (optional)"
          placeholderTextColor="#9ca3af"
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.submitBtn, (rating === 0 || submit.isPending) && styles.btnDisabled]}
          onPress={() => submit.mutate()}
          disabled={rating === 0 || submit.isPending}
        >
          {submit.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit Review</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  body: { flex: 1, padding: 28, justifyContent: "center" },
  heading: { fontSize: 26, fontWeight: "800", color: "#111", marginBottom: 8 },
  sub: { fontSize: 14, color: BRAND_MUTED, lineHeight: 20, marginBottom: 4 },
  service: { fontSize: 13, color: BRAND_PRIMARY, fontWeight: "600", marginBottom: 28 },
  stars: { flexDirection: "row", gap: 10, marginBottom: 10, justifyContent: "center" },
  star: { fontSize: 48, color: "#e5e7eb" },
  starFilled: { color: "#f59e0b" },
  ratingLabel: { textAlign: "center", fontSize: 14, fontWeight: "600", color: "#111", marginBottom: 28 },
  textarea: {
    backgroundColor: "#f9fafb", borderRadius: 14, borderWidth: 1.5,
    borderColor: "#e5e7eb", padding: 14, fontSize: 14, color: "#111",
    height: 110, marginBottom: 20,
  },
  submitBtn: {
    height: 52, borderRadius: 14, backgroundColor: BRAND_PRIMARY,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  btnDisabled: { opacity: 0.45 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  skipBtn: { alignSelf: "center" },
  skipText: { fontSize: 13, color: BRAND_MUTED },
});
