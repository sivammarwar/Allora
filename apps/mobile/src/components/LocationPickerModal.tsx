import React, { useRef, useState } from "react";
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BRAND_PRIMARY, BRAND_MUTED, MAPBOX_TOKEN } from "../lib/config";

export interface PickedLocation {
  lat: number;
  lng: number;
  name: string;
}

interface Props {
  visible: boolean;
  initialLoc?: { lat: number; lng: number } | null;
  onConfirm: (loc: PickedLocation) => void;
  onClose: () => void;
}

function buildHtml(lat: number, lng: number, token: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<link href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet"/>
<script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, sans-serif; }
  html, body { width: 100%; height: 100%; overflow: hidden; }
  #map { position: absolute; inset: 0; }

  /* ── Search bar ── */
  #search-wrap {
    position: absolute; top: 12px; left: 12px; right: 12px; z-index: 10;
  }
  #search-row {
    display: flex; align-items: center; gap: 8px;
  }
  #search-input {
    flex: 1; height: 44px; border-radius: 12px;
    border: 1.5px solid #e5e7eb; background: #fff;
    padding: 0 14px; font-size: 14px; font-weight: 500; color: #111;
    outline: none; box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  }
  #search-input:focus { border-color: #E63950; }
  #locate-btn {
    width: 44px; height: 44px; border-radius: 12px;
    background: #fff; border: 1.5px solid #e5e7eb;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 20px; flex-shrink: 0;
  }
  #suggestions {
    background: #fff; border-radius: 12px; margin-top: 6px;
    border: 1px solid #e5e7eb; overflow: hidden;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    display: none;
  }
  .suggestion {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px; border-bottom: 1px solid #f3f4f6;
    cursor: pointer; font-size: 13px; color: #111;
  }
  .suggestion:last-child { border-bottom: none; }
  .suggestion:hover { background: #fff5f7; }
  .sug-icon {
    width: 28px; height: 28px; border-radius: 8px;
    background: #fff5f7; display: flex; align-items: center;
    justify-content: center; flex-shrink: 0; font-size: 14px;
  }

  /* ── Crosshair pin ── */
  #pin {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -100%);
    z-index: 5; pointer-events: none; display: flex; flex-direction: column; align-items: center;
  }
  .pin-circle {
    width: 40px; height: 40px; border-radius: 50%;
    background: #E63950; border: 4px solid #fff;
    box-shadow: 0 4px 14px rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center;
  }
  .pin-dot { width: 10px; height: 10px; border-radius: 50%; background: #fff; }
  .pin-stem { width: 3px; height: 18px; background: #E63950; border-radius: 0 0 3px 3px; }
  .pin-shadow { width: 12px; height: 4px; border-radius: 50%; background: rgba(0,0,0,0.2); margin-top: 2px; }

  /* ── Bottom bar ── */
  #bottom-bar {
    position: absolute; bottom: 0; left: 0; right: 0; z-index: 10;
    background: #fff; border-top: 1px solid #f3f4f6;
    padding: 14px 16px 20px;
  }
  #addr-label { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; }
  #addr-text { font-size: 14px; font-weight: 600; color: #111; min-height: 20px; }
  #confirm-btn {
    margin-top: 12px; width: 100%; height: 48px; border-radius: 14px;
    background: #E63950; color: #fff; font-size: 16px; font-weight: 700;
    border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  #confirm-btn:disabled { opacity: 0.5; }
</style>
</head>
<body>
<div id="map"></div>
<div id="pin">
  <div class="pin-circle"><div class="pin-dot"></div></div>
  <div class="pin-stem"></div>
  <div class="pin-shadow"></div>
</div>

<div id="search-wrap">
  <div id="search-row">
    <input id="search-input" type="text" placeholder="Search area, city, landmark…" autocomplete="off"/>
    <button id="locate-btn" onclick="locateMe()">📍</button>
  </div>
  <div id="suggestions"></div>
</div>

<div id="bottom-bar">
  <div id="addr-label">Selected location</div>
  <div id="addr-text">Move the map to pin a location…</div>
  <button id="confirm-btn" onclick="confirm()" disabled>✓ &nbsp;Confirm this location</button>
</div>

<script>
mapboxgl.accessToken = '${token}';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [${lng}, ${lat}],
  zoom: 14,
});

map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

let currentAddress = '';
let debounce;

function geocodeCenter(lng, lat) {
  fetch(\`https://api.mapbox.com/geocoding/v5/mapbox.places/\${lng},\${lat}.json?access_token=${token}&types=neighborhood,locality,place,district&language=en\`)
    .then(r => r.json())
    .then(d => {
      const name = d.features?.[0]?.place_name ?? lat.toFixed(4)+', '+lng.toFixed(4);
      currentAddress = name;
      document.getElementById('addr-text').textContent = name;
      document.getElementById('confirm-btn').disabled = false;
    })
    .catch(() => {
      currentAddress = lat.toFixed(4)+', '+lng.toFixed(4);
      document.getElementById('addr-text').textContent = currentAddress;
      document.getElementById('confirm-btn').disabled = false;
    });
}

map.on('load', () => geocodeCenter(${lng}, ${lat}));

map.on('moveend', () => {
  const c = map.getCenter();
  clearTimeout(debounce);
  debounce = setTimeout(() => geocodeCenter(c.lng, c.lat), 400);
});

// Search
const searchInput = document.getElementById('search-input');
const sugBox = document.getElementById('suggestions');
let searchDebounce;

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  clearTimeout(searchDebounce);
  if (q.length < 2) { sugBox.style.display='none'; return; }
  searchDebounce = setTimeout(() => {
    fetch(\`https://api.mapbox.com/geocoding/v5/mapbox.places/\${encodeURIComponent(q)}.json?access_token=${token}&types=neighborhood,locality,place,district,address&language=en&limit=6\`)
      .then(r => r.json())
      .then(d => {
        const features = d.features ?? [];
        if (!features.length) { sugBox.style.display='none'; return; }
        sugBox.innerHTML = features.map(f =>
          \`<div class="suggestion" onclick="flyTo(\${f.center[0]}, \${f.center[1]}, '\${f.place_name.replace(/'/g,"\\'")}')">\`+
          \`<div class="sug-icon">📍</div><span>\${f.place_name}</span></div>\`
        ).join('');
        sugBox.style.display = 'block';
      })
      .catch(() => sugBox.style.display='none');
  }, 320);
});

function flyTo(lng, lat, name) {
  map.flyTo({ center: [lng, lat], zoom: 14, duration: 800 });
  searchInput.value = name;
  sugBox.style.display = 'none';
  currentAddress = name;
  document.getElementById('addr-text').textContent = name;
  document.getElementById('confirm-btn').disabled = false;
}

function locateMe() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(pos => {
    map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 14, duration: 800 });
  });
}

function confirm() {
  const c = map.getCenter();
  const msg = JSON.stringify({ type: 'confirm', lat: c.lat, lng: c.lng, name: currentAddress });
  window.ReactNativeWebView.postMessage(msg);
}

// Hide suggestions when tapping map
map.on('click', () => { sugBox.style.display='none'; searchInput.blur(); });
</script>
</body>
</html>`;
}

export default function LocationPickerModal({ visible, initialLoc, onConfirm, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  const defaultLat = initialLoc?.lat ?? 18.5204;
  const defaultLng = initialLoc?.lng ?? 73.8567;

  const html = buildHtml(defaultLat, defaultLng, MAPBOX_TOKEN);

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "confirm") {
        onConfirm({ lat: msg.lat, lng: msg.lng, name: msg.name });
      }
    } catch {}
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Choose location</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Map */}
        <View style={styles.mapWrap}>
          {loading && (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={BRAND_PRIMARY} />
              <Text style={styles.loaderText}>Loading map…</Text>
            </View>
          )}
          <WebView
            ref={webRef}
            source={{ html }}
            style={styles.webview}
            onLoadEnd={() => setLoading(false)}
            onMessage={handleMessage}
            javaScriptEnabled
            geolocationEnabled
            allowsInlineMediaPlayback
            originWhitelist={["*"]}
            mixedContentMode="always"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center",
  },
  closeText: { fontSize: 14, color: "#6b7280", fontWeight: "700" },
  mapWrap: { flex: 1, position: "relative" },
  webview: { flex: 1 },
  loader: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    zIndex: 10,
  },
  loaderText: { marginTop: 12, fontSize: 14, color: BRAND_MUTED },
});
