import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import LocationPickerModal, { PickedLocation } from "../../components/LocationPickerModal";

interface Category { id: string; name: string; type: "PRODUCT" | "SERVICE"; }
interface Subcategory { id: string; name: string; categoryId: string; }
interface NearbyAgent { id: string; name: string; isAssigned: boolean; distanceKm: number; matchedAreaName?: string; }

export default function HeroRegisterScreen({ onSubmitted }: { onSubmitted: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [purpose, setPurpose] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [locationName, setLocationName] = useState("");

  const { data: cats = [] } = useQuery<Category[]>({
    queryKey: ["public", "categories"],
    queryFn: async () => {
      try { return await api.get("/api/user/categories") as any; }
      catch { return []; }
    },
  });

  const { data: allSubs = [] } = useQuery<Subcategory[]>({
    queryKey: ["public", "subcategories"],
    queryFn: async () => {
      try {
        const rows = await api.get("/api/user/subcategories") as any;
        return rows.map((s: any) => ({ id: s.id, name: s.name, categoryId: s.categoryId }));
      } catch { return []; }
    },
  });

  const serviceCats = useMemo(() => cats.filter(c => c.type === "SERVICE"), [cats]);
  const subOptions = useMemo(
    () => allSubs.filter(s => selectedCatIds.includes(s.categoryId)),
    [allSubs, selectedCatIds]
  );

  const { data: nearbyAgents = [], isFetching: fetchingAgents } = useQuery<NearbyAgent[]>({
    queryKey: ["agents-nearby", location?.lat, location?.lng],
    queryFn: async () => {
      if (!location) return [];
      try { return await api.get(`/api/user/agents-nearby?lat=${location.lat}&lng=${location.lng}&radius=40`) as any; }
      catch { return []; }
    },
    enabled: !!location,
  });

  useEffect(() => {
    if (!nearbyAgents.length || selectedAgentId) return;
    const assigned = nearbyAgents.find(a => a.isAssigned);
    if (assigned) setSelectedAgentId(assigned.id);
  }, [nearbyAgents, selectedAgentId]);

  const submit = useMutation({
    mutationFn: () => {
      if (!location) throw new Error("Location is required");
      return api.post("/api/hero/register-request", {
        name: name.trim(),
        serviceName: serviceName.trim() || null,
        shopName: shopName.trim() || null,
        categoryIds: selectedCatIds,
        subcategoryIds: selectedSubIds.length > 0 ? selectedSubIds : null,
        phone: phone.trim(),
        address: address.trim(),
        locationLat: location.lat,
        locationLng: location.lng,
        purpose: purpose.trim() || null,
        preferredAgentId: selectedAgentId,
      }) as any;
    },
    onSuccess: () => {
      Alert.alert("Submitted!", "An agent will verify you shortly.");
      onSubmitted();
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? e?.error ?? "Submission failed"),
  });

  const canSubmit =
    name.trim().length >= 1 &&
    serviceName.trim().length >= 2 &&
    selectedCatIds.length >= 1 &&
    selectedSubIds.length >= 1 &&
    phone.trim().length >= 7 &&
    address.trim().length >= 3 &&
    !!location &&
    !!selectedAgentId;

  const toggleCat = (id: string) => {
    setSelectedCatIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    setSelectedSubIds([]);
  };

  const toggleSub = (id: string) => {
    setSelectedSubIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>Register your service</Text>
      <Text style={styles.sub}>We'll send your details to an agent in your area for verification.</Text>

      {/* Name & Phone */}
      <Text style={styles.label}>Full name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#9ca3af" />

      <Text style={styles.label}>Phone</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" placeholderTextColor="#9ca3af" />

      <Text style={styles.label}>Service name</Text>
      <TextInput style={styles.input} value={serviceName} onChangeText={setServiceName} placeholder="e.g. Sharma Cleaning" placeholderTextColor="#9ca3af" />

      <Text style={styles.label}>Shop name (optional)</Text>
      <TextInput style={styles.input} value={shopName} onChangeText={setShopName} placeholder="Optional" placeholderTextColor="#9ca3af" />

      {/* Categories */}
      <Text style={styles.label}>Service Categories ({selectedCatIds.length} selected)</Text>
      <View style={styles.chipContainer}>
        {serviceCats.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[styles.chip, selectedCatIds.includes(c.id) && styles.chipActive]}
            onPress={() => toggleCat(c.id)}
          >
            <Text style={[styles.chipText, selectedCatIds.includes(c.id) && styles.chipTextActive]}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Subcategories */}
      {subOptions.length > 0 && (
        <>
          <Text style={styles.label}>Subcategories ({selectedSubIds.length} selected)</Text>
          <View style={styles.chipContainer}>
            {subOptions.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[styles.chip, selectedSubIds.includes(s.id) && styles.chipActive]}
                onPress={() => toggleSub(s.id)}
              >
                <Text style={[styles.chipText, selectedSubIds.includes(s.id) && styles.chipTextActive]}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Address */}
      <Text style={styles.label}>Address</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Your shop/service address" placeholderTextColor="#9ca3af" />

      {/* Location */}
      <Text style={styles.label}>Location on map</Text>
      <TouchableOpacity style={styles.mapBtn} onPress={() => setShowMap(true)}>
        <Text style={styles.mapBtnText} numberOfLines={2}>
          {location ? `📍 ${locationName || `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}` : "📍 Tap to select location"}
        </Text>
      </TouchableOpacity>

      <LocationPickerModal
        visible={showMap}
        initialLoc={location}
        onConfirm={(loc: PickedLocation) => {
          setLocation({ lat: loc.lat, lng: loc.lng });
          if (loc.name) {
            setAddress(loc.name);
            setLocationName(loc.name);
          }
          setSelectedAgentId(null);
          setShowMap(false);
        }}
        onClose={() => setShowMap(false)}
      />

      {/* Agent Selection */}
      {location && (
        <View style={styles.agentSection}>
          <Text style={styles.label}>
            Select an agent ({nearbyAgents.length} within 40km)
            {fetchingAgents && " …"}
          </Text>
          {nearbyAgents.length === 0 && !fetchingAgents && (
            <Text style={styles.noAgent}>No agents in your area. Contact support.</Text>
          )}
          {nearbyAgents.map(agent => (
            <TouchableOpacity
              key={agent.id}
              style={[styles.agentCard, selectedAgentId === agent.id && styles.agentCardActive]}
              onPress={() => setSelectedAgentId(agent.id)}
            >
              <View style={styles.agentRadio}>
                <View style={[styles.radioOuter, selectedAgentId === agent.id && styles.radioOuterActive]}>
                  {selectedAgentId === agent.id && <View style={styles.radioInner} />}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.agentName}>{agent.name || "Agent"}</Text>
                <Text style={styles.agentDist}>
                  {agent.isAssigned ? "Assigned to your area" : `${agent.distanceKm}km away`}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Description */}
      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, { height: 80, textAlignVertical: "top" }]}
        value={purpose}
        onChangeText={setPurpose}
        placeholder="Tell us about your services"
        placeholderTextColor="#9ca3af"
        multiline
      />

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, (!canSubmit || submit.isPending) && styles.submitBtnDisabled]}
        onPress={() => submit.mutate()}
        disabled={!canSubmit || submit.isPending}
      >
        {submit.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Submit for verification</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20 },
  h1: { fontSize: 24, fontWeight: "800", color: "#111", marginBottom: 6 },
  sub: { fontSize: 13, color: BRAND_MUTED, marginBottom: 24 },
  label: { fontSize: 12, fontWeight: "700", color: "#374151", marginBottom: 6, marginTop: 14 },
  input: {
    height: 48, borderWidth: 1.5, borderColor: "#e5e7eb",
    borderRadius: 12, paddingHorizontal: 14, fontSize: 14,
    color: "#111", backgroundColor: "#fafafa",
  },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, backgroundColor: "#f3f4f6", borderWidth: 1.5, borderColor: "#e5e7eb",
  },
  chipActive: { backgroundColor: `${BRAND_PRIMARY}15`, borderColor: BRAND_PRIMARY },
  chipText: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  chipTextActive: { color: BRAND_PRIMARY },
  mapBtn: {
    height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: "#e5e7eb",
    backgroundColor: "#fafafa", justifyContent: "center", paddingHorizontal: 14,
  },
  mapBtnText: { fontSize: 14, color: "#374151" },
  agentSection: { marginTop: 8 },
  noAgent: { fontSize: 13, color: BRAND_MUTED, marginTop: 8 },
  agentCard: {
    flexDirection: "row", alignItems: "center", padding: 14,
    borderRadius: 12, borderWidth: 1.5, borderColor: "#e5e7eb", marginTop: 8,
  },
  agentCardActive: { borderColor: BRAND_PRIMARY, backgroundColor: `${BRAND_PRIMARY}08` },
  agentRadio: { marginRight: 12 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: "#d1d5db", alignItems: "center", justifyContent: "center",
  },
  radioOuterActive: { borderColor: BRAND_PRIMARY },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: BRAND_PRIMARY },
  agentName: { fontSize: 14, fontWeight: "600", color: "#111" },
  agentDist: { fontSize: 11, color: BRAND_MUTED, marginTop: 2 },
  submitBtn: {
    height: 52, borderRadius: 14, backgroundColor: BRAND_PRIMARY,
    alignItems: "center", justifyContent: "center", marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
