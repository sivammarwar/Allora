import React, { useEffect } from "react";
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { connectNotifications } from "../../lib/socket";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

interface Notif {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  type: string;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notifs = [], isLoading, refetch } = useQuery<Notif[]>({
    queryKey: ["notifications"],
    queryFn: () => api.get("/api/user/notifications") as any,
    enabled: !!user,
  });

  // Real-time new notifications via socket
  useEffect(() => {
    let socket: any;
    (async () => {
      socket = await connectNotifications();
      socket.on("notification:new", () =>
        qc.invalidateQueries({ queryKey: ["notifications"] })
      );
    })();
    return () => { socket?.off("notification:new"); };
  }, [qc]);

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/api/user/notifications/${id}/read`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post("/api/user/notifications/read-all") as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifs.filter((n) => !n.isRead).length;

  return (
    <View style={styles.screen}>
      {unreadCount > 0 && (
        <View style={styles.header}>
          <Text style={styles.unreadBadge}>{unreadCount} unread</Text>
          <TouchableOpacity onPress={() => markAllRead.mutate()}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={(n) => n.id}
          onRefresh={refetch}
          refreshing={isLoading}
          contentContainerStyle={notifs.length === 0 ? styles.emptyWrap : styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>Booking updates and alerts will appear here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.notifCard, !item.isRead && styles.notifUnread]}
              onPress={() => { if (!item.isRead) markRead.mutate(item.id); }}
              activeOpacity={0.85}
            >
              <View style={styles.notifDot}>
                {!item.isRead && <View style={styles.dot} />}
              </View>
              <View style={styles.notifBody}>
                <Text style={[styles.notifTitle, !item.isRead && styles.notifTitleBold]}>
                  {item.title}
                </Text>
                <Text style={styles.notifMsg} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.notifTime}>
                  {new Date(item.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short",
                  })}
                  {" · "}
                  {new Date(item.createdAt).toLocaleTimeString("en-IN", { timeStyle: "short" })}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  unreadBadge: { fontSize: 12, color: BRAND_PRIMARY, fontWeight: "700" },
  markAllText: { fontSize: 12, color: BRAND_MUTED, fontWeight: "600" },
  list: { paddingVertical: 8 },
  emptyWrap: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 8 },
  emptySub: { fontSize: 13, color: BRAND_MUTED, textAlign: "center" },
  notifCard: {
    flexDirection: "row", backgroundColor: "#fff",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f3f4f6",
  },
  notifUnread: { backgroundColor: "#fff5f7" },
  notifDot: { width: 20, paddingTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND_PRIMARY },
  notifBody: { flex: 1 },
  notifTitle: { fontSize: 14, color: "#111", marginBottom: 2 },
  notifTitleBold: { fontWeight: "700" },
  notifMsg: { fontSize: 13, color: BRAND_MUTED, lineHeight: 18 },
  notifTime: { fontSize: 11, color: "#9ca3af", marginTop: 5 },
});
