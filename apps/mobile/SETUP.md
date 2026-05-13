# Allora Mobile App — Setup Guide

## Prerequisites
- Node.js 18+
- JDK 17
- Android Studio + Android SDK (API 34+)
- Xcode 15+ (iOS, macOS only)

---

## 1. Install dependencies

```bash
cd apps/mobile
npm install
```

## 2. Configure API URL

Edit `src/lib/config.ts`:
```ts
// For Android emulator → host machine
export const API_URL = __DEV__ ? "http://10.0.2.2:4000" : "https://your-production-api.com";

// For iOS simulator → host machine, use:
// export const API_URL = __DEV__ ? "http://localhost:4000" : "https://your-production-api.com";
```

---

## 3. Firebase Setup (required for Push Notifications)

### Android
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a project → Add Android app
3. Package name: `com.alloraapp`
4. Download `google-services.json`
5. Place it at: `apps/mobile/android/app/google-services.json`

### iOS
1. In Firebase Console → Add iOS app
2. Bundle ID: `com.alloraapp`
3. Download `GoogleService-Info.plist`
4. Place it at: `apps/mobile/ios/AlloraApp/GoogleService-Info.plist`
5. Add to Xcode project (drag & drop into project navigator)

---

## 4. iOS Pod install

```bash
cd ios && bundle exec pod install && cd ..
```

> **Note:** Requires CocoaPods. If not installed: `sudo gem install cocoapods`

---

## 5. Run the app

```bash
# Terminal 1 — Metro bundler
npx react-native start

# Terminal 2 — Android
npx react-native run-android

# Terminal 2 — iOS
npx react-native run-ios
```

---

## 6. Role-based navigation

| Role            | App shown         |
|-----------------|-------------------|
| `USER`          | User dashboard    |
| `HERO`          | Hero dashboard    |
| `AGENT`         | Agent dashboard   |
| `DELIVERY_BOY`  | Delivery dashboard|
| `ADMIN` etc.    | User dashboard    |

---

## 7. Environment notes

- Location uses `@react-native-community/geolocation` — permissions already declared in `AndroidManifest.xml`
- Maps navigation uses `Linking.openURL` → Google Maps deep link
- Socket.io connects to `/notifications` and `/service` namespaces
- JWT stored in `AsyncStorage` (`access_token` / `refresh_token`)
- FCM token sent to `/api/user/fcm-token` on login

---

## 8. Build release APK

```bash
cd android && ./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```
