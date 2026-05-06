# Allora

Multi-role local service & delivery platform for India. Connects **Users**, **Heroes** (service providers), **Delivery Boys**, **Agents**, **Admins**, a **Product Manager**, and a **Payment Manager**.

> **Build status:** Foundation pass — Prisma schema, design system tokens, fonts, env template and workspace scaffolding are in place. Role dashboards, API routes, real-time, payments and maps land in subsequent passes.

---

## Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS (custom theme), Shadcn/UI
- **Backend:** Node.js + Express (TypeScript) — `apps/api`
- **DB:** PostgreSQL via Prisma ORM
- **Cache / OTP / pub-sub:** Redis
- **Auth:** Email + OTP (Nodemailer), JWT in HTTP-only cookies
- **Realtime:** Socket.io
- **Maps:** Mapbox GL JS (polygon drawing, live tracking)
- **Files:** Cloudinary
- **Payments:** Razorpay (UPI + COD QR)

---

## Repository layout

```
/
├── apps/
│   ├── web/           # Next.js 14 frontend
│   │   ├── app/       # App Router (layout, globals.css, pages)
│   │   ├── tailwind.config.ts
│   │   └── ...
│   └── api/           # Express + Prisma backend
│       └── prisma/
│           └── schema.prisma
├── .env.example       # Copy to .env and fill in
├── package.json       # npm workspaces root
└── README.md
```

---

## Prerequisites

- Node.js **18.18+**
- PostgreSQL **14+** running locally (or a remote DSN)
- Redis **6+** running locally (or a remote URL)

---

## Setup

```bash
# 1. Clone, then at repo root:
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL, JWT secrets, SMTP, Cloudinary,
# Razorpay, Mapbox, and seed account emails.

# 2. Install all workspaces
npm install

# 3. Generate Prisma client + run migrations
npm run prisma:migrate

# 4. Seed default Admin / Product Manager / Payment Manager accounts
npm run seed     # available after the API pass

# 5. Start both web and api in parallel
npm run dev
```

- Web: <http://localhost:3000>
- API: <http://localhost:4000>

---

## Design system

All visual tokens live in `apps/web/tailwind.config.ts` and `apps/web/app/globals.css`.

| Token              | Value                          |
| ------------------ | ------------------------------ |
| Background         | `#FFF0F3`                      |
| Surface            | `#FFF8F9`                      |
| Primary            | `#C0626A`                      |
| Secondary          | `#8B4A4A`                      |
| Text               | `#2E1A1A`                      |
| Text muted         | `#7A5050`                      |
| Border             | `#E8C9CC`                      |
| Success / Warn / Err | `#6AAF7A` / `#D4904A` / `#C0404A` |

Fonts (loaded via `next/font/google`):

- Headings: **Playfair Display** → `font-heading`
- Body / UI: **DM Sans** → `font-sans`
- Mono / codes: **JetBrains Mono** → `font-mono`

Global helpers: `card-surface`, `hover-warm`, `map-overlay-tint`, `page-enter`, `bg-brand-mesh`, `bg-brand-hero`, `shadow-soft`.

---

## Database schema

Defined in `apps/api/prisma/schema.prisma`. Models include:

`User`, `OTPRecord`, `Area`, `AgentProfile`, `AgentArea`, `HeroProfile`, `HeroSubcategoryPricing`, `DeliveryBoyProfile`, `VerificationRequest`, `Category`, `Subcategory`, `Product`, `HeroProduct`, `Order`, `OrderItem`, `ServiceBooking`, `PaymentRecord`, `Review`, `Notification`, `GlobalSetting`.

Run `npm run prisma:migrate` after editing the schema. All money fields are `Decimal(10,2)` (INR ₹). GeoJSON polygons stored as `Json` and validated server-side with `@turf/turf` before write.

---

## Roadmap

1. ✅ **Foundation** — Prisma schema (20 models), Tailwind theme, fonts, env template.
2. ✅ **API foundation** — Express + Helmet + CORS, OTP auth (rate-limited, refresh rotation), JWT + role-guard, Redis, Socket.io (`/notifications` + `/tracking`), Cloudinary / Razorpay / Nodemailer wrappers, seed script.
3. ✅ **Web foundation + Admin role** — TanStack Query API client, Socket.io client, role-aware login pages (User / Admin / Agent / PM / Pay), reusable Mapbox `PolygonDrawer` (20-point closed path with overlays), Admin Areas / Agents / Settings.
4. ✅ **Product Manager dashboard** — categories, subcategories (with HTML+assets service-page builder), products, Cloudinary image uploads via multer.
5. ✅ **Verification loop** — Hero & Delivery Boy self-registration via OTP, onboarding forms with Mapbox `LocationPicker`, area auto-detection by polygon containment (turf), Agent workspace + verification queue + verify-as-Hero (polygon drawer + delivery toggle) + verify-as-Delivery (shop multi-select), real-time `verification:status_update` notifications.
6. ✅ **Order lifecycle** — Hero pricing per subcategory + product picker; User catalog filtered by location/radius (polygon containment + Haversine fallback); cart (zustand + localStorage); checkout with Razorpay UPI online and Cash-on-Delivery; transactional Order + OrderItems + ServiceBookings + PaymentRecords; Razorpay verify endpoint + signature-verified webhook; Hero incoming-orders queue with mark-packed and assign-delivery; Delivery Boy active orders with mark-delivered + live-location streaming via `/tracking` socket; user order tracking with status timeline + real-time updates.
7. ✅ **Payment Manager dashboard** — overview tiles (today + pending), daily records table with date / hero / status / payment-method filters and totals, single-record settle + multi-select bulk-settle, per-hero and per-delivery-boy earnings breakdowns over a configurable range.
8. ✅ **Public landing page** — marketing home at `/` with hero, how-it-works, role CTAs (User / Hero / Delivery / Operator), trust strip and email-OTP CTA.
9. ✅ **Reviews & live tracking** — `POST /api/user/reviews`, `GET /api/user/reviews/me/:orderItemId`, and `GET /api/user/subcategories/:id/reviews` (avg + count + last 30); inline `ReviewWidget` per delivered order item with star input + edit; Mapbox `LiveTrackingMap` on user `/orders/[id]` showing pickup, drop-off and a pulsing live-position marker driven by the `/tracking` socket's `delivery:location_update` events.
10. ✅ **COD UPI QR** — `DeliveryBoyProfile.upiVpa` + `upiName` schema fields, `PUT /api/delivery/profile/upi` (regex-validated VPA), `UpiSettingsForm` on the delivery dashboard, and a `UpiQrCard` rendered on the user's `/orders/[id]` for COD orders that are at least `ASSIGNED_DELIVERY` — auto-generates a `upi://pay?...` deeplink + scannable QR (via `qrcode`) pre-filled with the partner's VPA, name, exact total and a `Allora #xxxxxxxx` note. Tap-to-pay opens the user's UPI app directly.
11. ⏳ **Remaining polish (optional)** — mobile QA at &lt;400px, stricter CSP for production, SMTP/Razorpay live-key setup checklist.

---

## License

Proprietary — Allora. All rights reserved.
