"use client";
import Link from "next/link";
import { Shield, Lock, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const SERVICES_LEFT = [
  { n: 1,  e: "🚜", en: "Tractor Repair",                          hi: "ट्रैक्टर रिपेयर" },
  { n: 2,  e: "💧", en: "Water Pump Servicing",                    hi: "वॉटर पंप सर्विसिंग" },
  { n: 3,  e: "🌱", en: "Crop Advisory",                           hi: "फसल सलाह" },
  { n: 4,  e: "🧪", en: "Fast Soil Testing Services",              hi: "तेज मिट्टी जांच सेवाएं" },
  { n: 5,  e: "⚡", en: "Electrician (All Electronics Services)",  hi: "इलेक्ट्रीशियन (सभी इलेक्ट्रॉनिक सेवाएं)" },
  { n: 6,  e: "🔬", en: "Crop Disease Detection",                  hi: "फसल रोग पहचान" },
  { n: 7,  e: "💻", en: "Cyber Center at Home (All Online Services)", hi: "साइबर सेंटर घर पर (सभी ऑनलाइन सेवाएं)" },
  { n: 8,  e: "🔧", en: "Water Pipe Repair",                       hi: "पाइप रिपेयर" },
  { n: 9,  e: "👨‍🌾", en: "Farm Labour (Daily Basis)",             hi: "खेत मज़दूर (दैनिक आधार पर)" },
  { n: 10, e: "🏗️", en: "Harvester / Heavy Machinery Repair",     hi: "हार्वेस्टर / भारी मशीन रिपेयर" },
  { n: 11, e: "🪚", en: "Fencing for Fields",                      hi: "खेतों के लिए फेंसिंग" },
];

const SERVICES_RIGHT = [
  { n: 12, e: "🥬", en: "Labour for Vegetables Growing (₹2000–₹3000 per bigha)", hi: "सब्जी की खेती के लिए मज़दूर (₹2000–₹3000 प्रति बीघा)" },
  { n: 13, e: "💦", en: "Irrigation Labour (Package Based)",       hi: "सिंचाई मज़दूर (पैकेज आधारित)" },
  { n: 14, e: "🚰", en: "Water Quality Testing + RO",              hi: "पानी की गुणवत्ता जांच + RO" },
  { n: 15, e: "🚿", en: "Drainage Cleaner",                        hi: "नाली/ड्रेनेज सफाई" },
  { n: 16, e: "🏥", en: "Nurse Home Visit",                        hi: "नर्स होम विज़िट" },
  { n: 17, e: "🔩", en: "Plumbers",                                hi: "प्लंबर" },
  { n: 18, e: "🌿", en: "Crop Spraying (Pesticides + Insecticides + Fertilizer)", hi: "फसल छिड़काव (कीटनाशक + कीटनाशक + उर्वरक)" },
  { n: 19, e: "🐓", en: "Poultry Veterinarian",                    hi: "पोल्ट्री पशु चिकित्सक" },
  { n: 20, e: "🐟", en: "Aquaculture Veterinarian",                hi: "एक्वाकल्चर पशु चिकित्सक" },
  { n: 21, e: "🐄", en: "Veterinarian (Cow + Buffalo)",            hi: "पशु चिकित्सक (गाय + भैंस)" },
  { n: 22, e: "🌾", en: "Crop Cultivation (Based on Money or Part of Crop)", hi: "फसल की खेती (पैसे या फसल के हिस्से पर) (शर्तें लागू)" },
];

function GooglePlayBadge({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 bg-black text-white rounded-xl px-4 py-2.5 hover:bg-gray-900 transition-colors select-none"
      style={{ minWidth: 160 }}>
      <svg viewBox="0 0 24 24" className="w-6 h-6 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.18 23.76c.37.2.8.22 1.2.06l11.4-6.58-2.5-2.5L3.18 23.76z" fill="#EA4335"/>
        <path d="M20.82 10.7a1.6 1.6 0 0 0 0 2.6l1.5.87-1.73 1-1.5-.87-11.91-6.88 2.5-2.5L20.82 10.7z" fill="#FBBC04"/>
        <path d="M3.18.24C2.78.08 2.35.1 1.98.3A1.6 1.6 0 0 0 1.2 1.7v20.6l10.08-10.08L3.18.24z" fill="#4285F4"/>
        <path d="M13.28 12l-2.0-2.0L1.2 20.08l1.98 1.08 11.4-6.58L13.28 12z" fill="#34A853"/>
      </svg>
      <div className="text-left">
        <p className="text-[9px] leading-none text-gray-300">GET IT ON</p>
        <p className="text-sm font-bold leading-tight">Google Play</p>
      </div>
    </a>
  );
}

function AppStoreBadge({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 bg-black text-white rounded-xl px-4 py-2.5 hover:bg-gray-900 transition-colors select-none"
      style={{ minWidth: 160 }}>
      <svg viewBox="0 0 24 24" className="w-6 h-6 flex-shrink-0 fill-white" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
      <div className="text-left">
        <p className="text-[9px] leading-none text-gray-300">Download on the</p>
        <p className="text-sm font-bold leading-tight">App Store</p>
      </div>
    </a>
  );
}

function PhoneMockup({ hi }: { hi: boolean }) {
  const services = [
    { e: "🚜", en: "Tractor Repair",      hi: "ट्रैक्टर रिपेयर" },
    { e: "💧", en: "Water Pump Servicing",hi: "वॉटर पंप सर्विसिंग" },
    { e: "🌱", en: "Crop Advisory",       hi: "फसल सलाह" },
    { e: "🧪", en: "Soil Testing",        hi: "मिट्टी जांच" },
    { e: "⚡", en: "Electrician",         hi: "इलेक्ट्रीशियन" },
    { e: "🔬", en: "Crop Disease",        hi: "फसल रोग पहचान" },
    { e: "💻", en: "Cyber Center",        hi: "साइबर सेंटर घर पर" },
    { e: "🔧", en: "Water Pipe Repair",   hi: "पाइप रिपेयर" },
  ];
  return (
    <div className="relative mx-auto" style={{ width: 230, height: 470 }}>
      <div className="absolute inset-0 rounded-[36px] bg-gray-900 shadow-2xl border-4 border-gray-800" />
      <div className="absolute inset-[6px] rounded-[30px] bg-white overflow-hidden flex flex-col">
        <div className="bg-brand-primary px-3 py-2 flex items-center justify-between flex-shrink-0">
          <span className="text-white font-extrabold text-sm">{hi ? "भारत333" : "Bharat333"}</span>
          <span className="text-white text-lg">🔔</span>
        </div>
        <div className="bg-white px-3 py-1.5 border-b border-gray-100 flex items-center gap-1.5 flex-shrink-0">
          <span className="text-brand-primary text-xs">📍</span>
          <div>
            <p className="text-[8px] text-gray-400">{hi ? "आपका स्थान" : "Your Location"}</p>
            <p className="text-[9px] font-semibold text-gray-700">{hi ? "गांव रामपुर, जिला XYZ" : "Village Rampur, District XYZ"}</p>
          </div>
        </div>
        <div className="bg-amber-50 mx-2 mt-2 rounded-xl p-2 flex-shrink-0 border border-amber-100">
          <p className="text-[8px] font-bold text-amber-900">{hi ? "भारत के ग्रामीण भविष्य को सशक्त बनाएं" : "Empowering India's Rural Future"}</p>
          <p className="text-[7px] text-amber-700">{hi ? "ऐसी सेवाएं जो आपके साथ बढ़ती हैं।" : "Services that grow with you."}</p>
        </div>
        <div className="mx-2 mt-1.5 flex-shrink-0">
          <div className="rounded-lg border border-gray-200 px-2 py-1 flex items-center gap-1">
            <span className="text-gray-400 text-[9px]">🔍</span>
            <span className="text-[8px] text-gray-400">{hi ? "सेवा खोजें..." : "Search a service..."}</span>
          </div>
        </div>
        <div className="px-2 mt-2 flex-1 overflow-hidden">
          <p className="text-[8px] font-bold text-gray-800 mb-1.5">{hi ? "लोकप्रिय सेवाएं" : "Top Services"}</p>
          <div className="grid grid-cols-4 gap-1">
            {services.map(({ e, en, hi: h }) => (
              <div key={en} className="flex flex-col items-center gap-0.5">
                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-lg">{e}</div>
                <span className="text-[6px] text-center text-gray-600 leading-tight">{hi ? h : en}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mx-2 mb-2 mt-1.5 bg-gray-50 rounded-xl p-2 border border-gray-100 flex-shrink-0">
          <p className="text-[7px] font-bold text-gray-800">{hi ? "कोई सेवा नहीं मिल रही?" : "Need a service not listed?"}</p>
          <p className="text-[6px] text-gray-500 mt-0.5">{hi ? "अपनी आवश्यकता बताएं, हम मदद करेंगे।" : "Tell us your need and we'll help you."}</p>
          <div className="mt-1.5 bg-brand-primary rounded-lg px-2 py-1 text-center">
            <span className="text-[7px] font-bold text-white">{hi ? "अपनी आवश्यकता पोस्ट करें" : "Post Your Requirement"}</span>
          </div>
        </div>
        <div className="bg-white border-t border-gray-100 px-1 py-1 flex justify-around flex-shrink-0">
          {[
            { e: "🏠", l_en: "Home",     l_hi: "होम" },
            { e: "📋", l_en: "Bookings", l_hi: "बुकिंग" },
            { e: "📝", l_en: "Requests", l_hi: "अनुरोध" },
            { e: "💳", l_en: "Wallet",   l_hi: "वॉलेट" },
            { e: "👤", l_en: "Profile",  l_hi: "प्रोफाइल" },
          ].map(({ e, l_en, l_hi }) => (
            <div key={l_en} className="flex flex-col items-center gap-0.5">
              <span className="text-xs">{e}</span>
              <span className="text-[5px] text-gray-500">{hi ? l_hi : l_en}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-14 h-1.5 bg-gray-700 rounded-full" />
    </div>
  );
}

export default function HomePage() {
  const { lang, setLang } = useLanguage();
  const hi = lang === "hi";

  return (
    <main className="min-h-screen bg-white text-gray-900">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-brand-primary flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div>
            <span className="font-extrabold text-base text-gray-900 tracking-tight leading-none">{hi ? "भारत" : "Bharat"}</span>
            <br />
            <span className="font-extrabold text-base text-brand-primary tracking-tight leading-none">{hi ? "सर्विसेज" : "Services"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLang(lang === "en" ? "hi" : "en")}
            className="h-7 px-2.5 rounded-full border border-gray-200 text-[11px] font-semibold text-gray-700 hover:border-brand-primary/40 transition-all">
            {lang === "en" ? "हिं" : "EN"}
          </button>
          <Link href="/login" className="h-7 px-3 rounded-full bg-brand-primary text-white text-[11px] font-semibold flex items-center">
            {hi ? "लॉगिन" : "Login"}
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="px-4 pt-10 pb-6 max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* Left column */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight text-gray-900 mb-1">
              {hi ? (
                <>हम ग्रामीण जीवन<br />को बनाते हैं <span className="text-brand-primary">आसान।</span></>
              ) : (
                <>We provide ease<br />to <span className="text-brand-primary">rural life.</span></>
              )}
            </h1>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              {hi
                ? "एक ऐप, हर ग्रामीण जरूरत के लिए।\nविश्वसनीय स्थानीय हीरो। किफायती सेवाएं।"
                : "One App. Every Rural Need.\nTrusted Local Heroes. Affordable Services."}
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              <GooglePlayBadge href="https://play.google.com/store" />
              <AppStoreBadge href="https://apps.apple.com" />
            </div>
            <div className="mb-8">
              <Link href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-primary border border-brand-primary/30 rounded-xl px-4 py-2 hover:bg-brand-primary/5 transition-colors">
                {hi ? "ब्राउज़र में जारी रखें" : "Continue in Browser"} <ChevronRight size={14} />
              </Link>
            </div>

            {/* Services section */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🌾</span>
                <span className="font-extrabold text-sm text-gray-900 bg-red-50 border border-red-100 px-3 py-1 rounded-full text-brand-primary">
                  {hi ? "हमारी सेवाएं" : "Our Services"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                {/* Left column */}
                <div className="space-y-2">
                  {SERVICES_LEFT.map(({ n, e, en, hi: h }) => (
                    <div key={n} className="flex items-start gap-2">
                      <span className="text-brand-primary font-bold text-xs w-5 flex-shrink-0 mt-0.5">{n}</span>
                      <span className="text-base leading-none flex-shrink-0">{e}</span>
                      <span className="text-xs text-gray-700 leading-snug">{hi ? h : en}</span>
                    </div>
                  ))}
                </div>
                {/* Right column */}
                <div className="space-y-2 mt-2 sm:mt-0">
                  {SERVICES_RIGHT.map(({ n, e, en, hi: h }) => (
                    <div key={n} className="flex items-start gap-2">
                      <span className="text-brand-primary font-bold text-xs w-5 flex-shrink-0 mt-0.5">{n}</span>
                      <span className="text-base leading-none flex-shrink-0">{e}</span>
                      <span className="text-xs text-gray-700 leading-snug">{hi ? h : en}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trust note */}
            <div className="mt-4 flex items-start gap-2 text-xs text-gray-500 bg-green-50 border border-green-100 rounded-xl p-3">
              <span className="text-green-600 mt-0.5">🌱</span>
              <span>{hi
                ? "हमारा प्लेटफ़ॉर्म आपको आपके खेत, आवश्यकताओं और भरोसे के हीरोज़ से जोड़ता है।"
                : "Our platform connects you with verified local heroes who understand your land, your needs, and your trust."}</span>
            </div>
          </div>

          {/* Right column — phone mockup */}
          <div className="flex-shrink-0 flex justify-center w-full lg:w-auto lg:pt-4">
            <PhoneMockup hi={hi} />
          </div>
        </div>
      </section>

      {/* ── Trust pills ─────────────────────────────────────────── */}
      <section className="px-4 py-6 border-t border-gray-100 bg-gray-50">
        <div className="max-w-lg mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-5 py-2.5 shadow-sm">
            <div className="w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0">
              <Shield size={13} className="text-white" />
            </div>
            <span className="text-sm font-bold text-gray-800">{hi ? "सत्यापित हीरो" : "Verified Heroes"}</span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-5 py-2.5 shadow-sm">
            <div className="w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0">
              <Lock size={13} className="text-white" />
            </div>
            <span className="text-sm font-bold text-gray-800">{hi ? "सुरक्षित भुगतान" : "Secure Payments"}</span>
          </div>
        </div>
      </section>

      {/* ── App badges + footer ─────────────────────────────────── */}
      <section className="px-4 py-8 text-center border-t border-gray-100 bg-white">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
          <GooglePlayBadge href="https://play.google.com/store" />
          <AppStoreBadge href="https://apps.apple.com" />
        </div>
        <p className="text-xs text-gray-500 font-medium">
          {hi ? "अब पूरे भारत में उपलब्ध" : "Now live across India"} · bharat333.com
        </p>
      </section>

      <footer className="border-t border-gray-100 py-5 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-primary flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            </div>
            <span className="font-extrabold text-sm">{hi ? "भारत सर्विसेज" : "Bharat Services"}</span>
          </div>
          <div className="flex gap-5 text-xs text-gray-400">
            <Link href="/about" className="hover:text-brand-primary transition-colors">{hi ? "हमारे बारे में" : "About"}</Link>
            <Link href="/how-it-works" className="hover:text-brand-primary transition-colors">{hi ? "कैसे काम करता है" : "How it works"}</Link>
            <Link href="/contact" className="hover:text-brand-primary transition-colors">{hi ? "संपर्क" : "Contact"}</Link>
          </div>
          <p className="text-xs text-gray-400">© 2026 Bharat Services 🇮🇳</p>
        </div>
      </footer>
    </main>
  );
}
