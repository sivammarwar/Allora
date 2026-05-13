import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

type FilterStatus = "PENDING" | "IN_PROGRESS" | "VERIFIED" | "REJECTED" | "ALL";

interface VerificationRequest {
  id: string;
  requestType: "HERO" | "DELIVERY_BOY";
  status: "PENDING" | "IN_PROGRESS" | "VERIFIED" | "REJECTED";
  details: any;
  requester: { id: string; email: string; name: string | null };
  createdAt: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING:     { bg: "#fef9c3", text: "#854d0e" },
  IN_PROGRESS: { bg: `${BRAND_PRIMARY}1a`, text: BRAND_PRIMARY },
  VERIFIED:    { bg: "#dcfce7", text: "#15803d" },
  REJECTED:    { bg: "#fee2e2", text: "#b91c1c" },
};

const FILTERS: FilterStatus[] = ["ALL", "PENDING", "IN_PROGRESS", "VERIFIED", "REJECTED"];

export default function AgentRequestsScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterStatus>("PENDING");

  const { data: rows = [], isLoading, refetch } = useQuery<VerificationRequest[]>({
    queryKey: ["agent-requests", filter],
    queryFn: () =>
      api.get(filter === "ALL" ? "/api/agent/requests" : `/api/agent/requests?status=${filter}`) as any,
    enabled: !!user,
  });

  const actionMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.patch(`/api/agent/requests/${id}/${action}`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-requests"] }),
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Action failed."),
  });

  const handleAction = (id: string, action: string, label: string) => {
    Alert.alert(`${label}?`, undefined, [
      { text: "Cancel", style: "cancel" },
      { text: label, onPress: () => actionMut.mutate({ id, action }) },
    ]);
  };

  return (
    <View style={styles.screen}>
      {/* Filters */}
      <FlatList
        data={FILTERS}
        horizontal
        keyExtractor={(f) => f}
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterBtn, filter === item && styles.filterActive]}
            onPress={() => setFilter(item)}
          >
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>
              {item.replace("_", " ")}
            </Text>
          </TouchableOpacity>
        )}
      />

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          onRefresh={refetch}
          refreshing={isLoading}
          contentContainerStyle={rows.length === 0 ? styles.emptyWrap : styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🛡️</Text>
              <Text style={styles.emptyTitle}>No {filter === "ALL" ? "" : filter.toLowerCase().replace("_"," ")} requests</Text>
            </View>
          }
          renderItem={({ item }) => {
            const sc = STATUS_COLORS[item.status] ?? { bg: "#f3f4f6", text: "#374151" };
            const name = item.details?.name ?? item.requester.name ?? item.requester.email;
            const detail = item.requestType === "HERO"
              ? item.details?.serviceName ?? "Hero"
              : item.details?.purpose ?? "Delivery partner";

            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.typeIcon, { backgroundColor: item.requestType === "HERO" ? `${BRAND_PRIMARY}18` : "#eff6ff" }]}>
                    <Text style={styles.typeEmoji}>{item.requestType === "HERO" ? "🦸" : "🚴"}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.reqName}>{name}</Text>
                    <Text style={styles.reqDetail}>{detail} · {item.requester.email}</Text>
                  </View>
                </View>

                <View style={styles.cardMeta}>
                  <View style={[styles.typeBadge, { backgroundColor: item.requestType === "HERO" ? `${BRAND_PRIMARY}18` : "#eff6ff" }]}>
                    <Text style={[styles.typeBadgeText, { color: item.requestType === "HERO" ? BRAND_PRIMARY : "#2563eb" }]}>
                      {item.requestType.replace("_", " ")}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>
                      {item.status.replace("_", " ")}
                    </Text>
                  </View>
                  <Text style={styles.date}>
                    {new Date(item.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </Text>
                </View>

                {/* Action buttons */}
                <View style={styles.actions}>
                  {item.status === "PENDING" && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.startBtn]}
                      onPress={() => handleAction(item.id, "start", "Start Review")}
                    >
                      <Text style={styles.startText}>Start Review →</Text>
                    </TouchableOpacity>
                  )}
                  {item.status === "IN_PROGRESS" && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.verifyBtn]}
                        onPress={() => handleAction(item.id, "verify", "Verify")}
                      >
                        <Text style={styles.verifyText}>Verify ✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => handleAction(item.id, "reject", "Reject")}
                      >
                        <Text style={styles.rejectText}>Reject ✗</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  filterBar: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6", flexGrow: 0 },
  filterList: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "#f3f4f6" },
  filterActive: { backgroundColor: BRAND_PRIMARY },
  filterText: { fontSize: 11, fontWeight: "700", color: BRAND_MUTED },
  filterTextActive: { color: "#fff" },
  list: { padding: 16, gap: 12 },
  emptyWrap: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.05, elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  typeIcon: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  typeEmoji: { fontSize: 20 },
  cardInfo: { flex: 1 },
  reqName: { fontSize: 15, fontWeight: "700", color: "#111" },
  reqDetail: { fontSize: 12, color: BRAND_MUTED, marginTop: 2 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typeBadgeText: { fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  date: { fontSize: 11, color: BRAND_MUTED, marginLeft: "auto" },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  startBtn: { backgroundColor: `${BRAND_PRIMARY}18` },
  startText: { color: BRAND_PRIMARY, fontSize: 13, fontWeight: "700" },
  verifyBtn: { backgroundColor: "#dcfce7" },
  verifyText: { color: "#15803d", fontSize: 13, fontWeight: "700" },
  rejectBtn: { borderWidth: 1.5, borderColor: "#ef4444" },
  rejectText: { color: "#ef4444", fontSize: 13, fontWeight: "700" },
});
