import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, Modal, Dimensions,
} from "react-native";
import { WebView } from "react-native-webview";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

const MAPBOX_TOKEN = "pk.eyJ1Ijoic2l2YW1tYXJ3YXIiLCJhIjoiY200MXdyeWdiMGRqNjJqczV6dHVzNHJjZCJ9.sMvMBnpMgSIafMfStmfkRQ";

interface AgentArea {
  id: string; name: string; code: string;
  polygon?: { type: string; coordinates: number[][][] };
}

function buildMapHtml(polygon: { type: string; coordinates: number[][][] }, name: string): string {
  const coords = polygon.coordinates[0];
  const lats = coords.map(c => c[1]);
  const lngs = coords.map(c => c[0]);
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;

  const geoJson = JSON.stringify({
    type: "Feature",
    properties: { name },
    geometry: polygon,
  });

  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no"/>
<script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
<link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet"/>
<style>body{margin:0;padding:0}#map{width:100%;height:100vh}</style>
</head><body>
<div id="map"></div>
<script>
mapboxgl.accessToken='${MAPBOX_TOKEN}';
var map=new mapboxgl.Map({container:'map',style:'mapbox://styles/mapbox/streets-v12',center:[${centerLng},${centerLat}],zoom:12});
map.on('load',function(){
  map.addSource('area',{type:'geojson',data:${geoJson}});
  map.addLayer({id:'area-fill',type:'fill',source:'area',paint:{'fill-color':'#c0626a','fill-opacity':0.3}});
  map.addLayer({id:'area-border',type:'line',source:'area',paint:{'line-color':'#c0626a','line-width':2.5}});
  var bounds=new mapboxgl.LngLatBounds();
  ${JSON.stringify(coords)}.forEach(function(c){bounds.extend(c)});
  map.fitBounds(bounds,{padding:50});
});
</script>
</body></html>`;
}

export default function AgentAreasScreen() {
  const { user } = useAuth();
  const [mapArea, setMapArea] = useState<AgentArea | null>(null);

  const { data: areas = [], isLoading, refetch } = useQuery<AgentArea[]>({
    queryKey: ["agent-areas"],
    queryFn: () => api.get("/api/agent/areas") as any,
    enabled: !!user,
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;
  }

  return (
    <>
      <FlatList
        data={areas}
        keyExtractor={(a) => a.id}
        style={styles.screen}
        contentContainerStyle={areas.length === 0 ? styles.emptyWrap : styles.list}
        onRefresh={refetch}
        refreshing={isLoading}
        ListHeaderComponent={
          <Text style={styles.heading}>
            {areas.length} area{areas.length !== 1 ? "s" : ""} assigned to you
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyTitle}>No areas assigned</Text>
            <Text style={styles.emptySub}>Contact your admin to get service areas assigned to you.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.areaIcon}>
                <Text style={styles.areaIconText}>{item.name[0]?.toUpperCase() ?? "A"}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.areaName}>{item.name}</Text>
                <Text style={styles.areaCode}>{item.code}</Text>
              </View>
            </View>
            {item.polygon && (
              <TouchableOpacity
                style={styles.mapBtn}
                onPress={() => setMapArea(item)}
              >
                <Text style={styles.mapBtnText}>�️ View on Map</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* Map Modal */}
      <Modal visible={!!mapArea} animationType="slide" onRequestClose={() => setMapArea(null)}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>{mapArea?.name ?? "Area"}</Text>
            <Text style={styles.modalSub}>{mapArea?.code}</Text>
          </View>
          <TouchableOpacity onPress={() => setMapArea(null)} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕ Close</Text>
          </TouchableOpacity>
        </View>
        {mapArea?.polygon && (
          <WebView
            originWhitelist={["*"]}
            source={{ html: buildMapHtml(mapArea.polygon, mapArea.name) }}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
          />
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 12 },
  emptyWrap: { flex: 1 },
  heading: { fontSize: 14, color: BRAND_MUTED, marginBottom: 8 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 8 },
  emptySub: { fontSize: 13, color: BRAND_MUTED, textAlign: "center" },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.05, elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  areaIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: `${BRAND_PRIMARY}18`, alignItems: "center", justifyContent: "center", marginRight: 14,
  },
  areaIconText: { fontSize: 20, fontWeight: "800", color: BRAND_PRIMARY },
  cardInfo: { flex: 1 },
  areaName: { fontSize: 16, fontWeight: "700", color: "#111" },
  areaCode: { fontFamily: "monospace", fontSize: 11, color: BRAND_MUTED, marginTop: 2 },
  mapBtn: {
    height: 42, borderRadius: 10, backgroundColor: `${BRAND_PRIMARY}14`,
    alignItems: "center", justifyContent: "center",
  },
  mapBtnText: { fontSize: 13, fontWeight: "700", color: BRAND_PRIMARY },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16, paddingTop: 52, backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  modalSub: { fontSize: 11, color: BRAND_MUTED, fontFamily: "monospace", marginTop: 2 },
  closeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: "#f3f4f6" },
  closeBtnText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  webview: { flex: 1 },
});
