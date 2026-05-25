"use client";
import Link from "next/link";
import { MapPin, Zap, ShieldCheck, Star, ChevronRight, Smartphone } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const AGRI = [
  { e: "🚜", en: "Tractor Repair", hi: "ट्रैक्टर मरम्मत" },
  { e: "💧", en: "Water Pump Servicing", hi: "वॉटर पंप सर्विसिंग" },
  { e: "🌱", en: "Crop Advisory", hi: "फसल सलाहकार" },
  { e: "🧪", en: "Soil Testing", hi: "मिट्टी जांच सेवा" },
  { e: "🔬", en: "Crop Disease Detection", hi: "फसल रोग पहचान" },
  { e: "👨‍🌾", en: "Farm Labour (Daily)", hi: "खेत मज़दूर (दैनिक)" },
  { e: "🏗️", en: "Heavy Machinery Repair", hi: "भारी मशीनरी मरम्मत" },
  { e: "🔒", en: "Field Fencing", hi: "खेत की बाड़बंदी" },
  { e: "🥬", en: "Vegetable Growing Labour", hi: "सब्ज़ी उत्पादन मज़दूर" },
  { e: "💦", en: "Irrigation Labour", hi: "सिंचाई मज़दूर" },
  { e: "🌿", en: "Crop Spraying", hi: "फसल छिड़काव" },
  { e: "🌾", en: "Managed Crop Cultivation", hi: "प्रबंधित फसल उत्पादन" },
];

const HOME = [
  { e: "⚡", en: "Electrician", hi: "इलेक्ट्रीशियन" },
  { e: "🔧", en: "Plumber", hi: "प्लंबर" },
  { e: "🚰", en: "Water Quality Testing + RO", hi: "जल गुणवत्ता जांच + RO" },
  { e: "🚿", en: "Drainage Cleaner", hi: "नाली सफाई" },
  { e: "💻", en: "Cyber Centre at Home", hi: "साइबर सेवा घर पर" },
];

const HEALTH = [
  { e: "🏥", en: "Nurse Home Visit", hi: "नर्स होम विज़िट" },
  { e: "🐄", en: "Veterinarian (Cow/Buffalo)", hi: "पशु चिकित्सक (गाय/भैंस)" },
  { e: "🐓", en: "Poultry Veterinarian", hi: "पोल्ट्री पशु चिकित्सक" },
  { e: "🐟", en: "Aquaculture Veterinarian", hi: "मत्स्य पशु चिकित्सक" },
];

function ServiceGrid({ items, hi }: { items: typeof AGRI; hi: boolean }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map(({ e, en, hi: h }) => (
        <div key={en} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white hover:border-brand-primary/30 transition-all p-3.5">
          <span className="text-xl flex-shrink-0">{e}</span>
          <span className="text-xs font-semibold text-gray-800 leading-snug">{hi ? h : en}</span>
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const { lang, setLang } = useLanguage();
  const hi = lang === "hi";

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center">
            <MapPin size={16} className="text-white" />
          </div>
          <span className="font-extrabold text-base tracking-tight">Bharat Services</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLang(lang === "en" ? "hi" : "en")} className="h-7 px-2.5 rounded-full border border-gray-200 text-[11px] font-semibold text-gray-700 hover:border-brand-primary/40 transition-all">
            {lang === "en" ? "हिं" : "EN"}
          </button>
          <Link href="/login" className="h-7 px-3 rounded-full bg-brand-primary text-white text-[11px] font-semibold flex items-center">
            {hi ? "लॉगिन" : "Login"}
          </Link>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-gradient-to-br from-brand-primary via-brand-primary/90 to-red-700 px-4 py-16 text-white text-center">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="relative max-w-lg mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/30">
            🇮🇳 {hi ? "भारतीय ग्रामीण जीवन को आसान बनाना" : "Bringing ease to rural Indian life"}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
            {hi ? "गांव का हर काम, एक ऐप पर" : "Every rural service, one app"}
          </h1>
          <p className="text-white/80 text-sm leading-relaxed max-w-sm mx-auto">
            {hi ? "सत्यापित किसान सहायक, मज़दूर, इलेक्ट्रीशियन, पशु चिकित्सक — सीधे आपके दरवाज़े पर।" : "Verified farm helpers, electricians, veterinarians, plumbers and 20+ more local heroes — at your doorstep."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <a href="https://play.google.com/store" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 bg-white text-gray-900 rounded-2xl px-6 py-3.5 font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95">
              <span className="text-2xl">▶</span>
              <div className="text-left">
                <p className="text-[10px] text-gray-500 leading-none">{hi ? "अभी पाएं" : "Get it on"}</p>
                <p className="font-extrabold leading-tight">Google Play</p>
              </div>
              <span className="ml-1 text-[9px] font-bold bg-brand-primary text-white px-1.5 py-0.5 rounded-full">{hi ? "जल्द" : "Soon"}</span>
            </a>
            <Link href="/dashboard" className="flex items-center justify-center gap-2 bg-white/15 border border-white/40 text-white rounded-2xl px-6 py-3.5 font-semibold text-sm hover:bg-white/25 transition-all active:scale-95">
              <Smartphone size={16} />
              {hi ? "ब्राउज़र में जारी रखें" : "Continue in Browser"}
              <ChevronRight size={14} />
            </Link>
          </div>
          <p className="text-white/50 text-[10px]">bharat333.com</p>
        </div>
      </section>

      <section className="py-6 px-4 bg-gray-50 border-b border-gray-100">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-4 text-center">
          {[
            { n: "22+", l: hi ? "सेवा प्रकार" : "Service Types" },
            { n: "3", l: hi ? "क्षेत्र" : "Sectors" },
            { n: "₹0", l: hi ? "पंजीकरण शुल्क" : "Registration" },
          ].map(({ n, l }) => (
            <div key={n}>
              <p className="text-2xl font-extrabold text-brand-primary">{n}</p>
              <p className="text-xs text-gray-500 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">🌾</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">{hi ? "कृषि सेवाएं" : "Agriculture"}</p>
              <h2 className="text-xl font-extrabold">{hi ? "किसान का हर काम आसान" : "Every farming task covered"}</h2>
            </div>
          </div>
          <ServiceGrid items={AGRI} hi={hi} />
        </div>
      </section>

      <section className="py-14 px-4 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">🏠</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">{hi ? "घर और बुनियादी ढांचा" : "Home & Infrastructure"}</p>
              <h2 className="text-xl font-extrabold">{hi ? "घर का हर काम" : "Home services & digital access"}</h2>
            </div>
          </div>
          <ServiceGrid items={HOME} hi={hi} />
        </div>
      </section>

      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">🏥</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">{hi ? "स्वास्थ्य और पशुपालन" : "Health & Veterinary"}</p>
              <h2 className="text-xl font-extrabold">{hi ? "इंसान और जानवर दोनों की देखभाल" : "Care for people & livestock"}</h2>
            </div>
          </div>
          <ServiceGrid items={HEALTH} hi={hi} />
        </div>
      </section>

      <section className="py-14 px-4 bg-green-50 border-y border-green-100">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <span className="text-4xl">🧪</span>
          <h2 className="text-xl font-extrabold">{hi ? "मिट्टी जांच — किसान का सबसे बड़ा हथियार" : "Soil Testing — the farmer's biggest asset"}</h2>
          <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
            {hi ? "एक फसल विशेषज्ञ बुक करें जो मिट्टी जांच कर बताएगा कि कौन सा उर्वरक कितनी मात्रा में डालें। खर्च कम, उत्पादन ज़्यादा।" : "Book a crop specialist who tests soil quality and recommends exact fertiliser quantities. Cut costs, increase yield — at the most affordable price."}
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 bg-green-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-green-700 transition-colors">
            <Zap size={13} />
            {hi ? "अभी बुक करें" : "Book now"}
          </Link>
        </div>
      </section>

      <section className="py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-extrabold">{hi ? "भरोसा · पारदर्शिता · स्थानीयता" : "Trust · Transparency · Locality"}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { icon: ShieldCheck, en: "Agent-Verified Heroes", hi: "एजेंट-सत्यापित हीरोज़", d_en: "Every provider physically visited & approved by a Regional Officer.", d_hi: "हर सेवा प्रदाता क्षेत्रीय अधिकारी द्वारा सत्यापित।" },
              { icon: MapPin, en: "Hyperlocal", hi: "हाइपरलोकल", d_en: "Only Heroes in your village or block. No random far-away listings.", d_hi: "केवल आपके गांव/ब्लॉक के हीरोज़। कोई दूर की लिस्टिंग नहीं।" },
              { icon: Star, en: "90% to Heroes", hi: "90% हीरो को", d_en: "Fair pay — Heroes keep 90% of every booking.", d_hi: "उचित भुगतान — हीरो हर बुकिंग का 90% रखते हैं।" },
            ].map(({ icon: Icon, en, hi: h, d_en, d_hi }) => (
              <div key={en} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                  <Icon size={18} className="text-brand-primary" />
                </div>
                <p className="font-bold text-sm">{hi ? h : en}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{hi ? d_hi : d_en}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 text-center bg-gradient-to-br from-brand-primary via-brand-primary/90 to-red-700 text-white">
        <div className="max-w-xl mx-auto space-y-5">
          <h2 className="text-2xl font-extrabold">{hi ? "आज ही शुरू करें" : "Get started today"}</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="https://play.google.com/store" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 bg-white text-gray-900 rounded-2xl px-6 py-3.5 font-bold text-sm active:scale-95">
              <span className="text-xl">▶</span>
              <div className="text-left">
                <p className="text-[10px] text-gray-500">Google Play</p>
                <p className="font-extrabold text-xs">{hi ? "जल्द आ रहा है" : "Coming Soon"}</p>
              </div>
            </a>
            <Link href="/dashboard" className="flex items-center justify-center gap-2 bg-white/15 border border-white/40 text-white rounded-2xl px-6 py-3.5 font-semibold text-sm active:scale-95">
              <Smartphone size={15} />
              {hi ? "ब्राउज़र में जारी रखें" : "Continue in Browser"}
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-primary flex items-center justify-center">
              <MapPin size={13} className="text-white" />
            </div>
            <span className="font-extrabold text-sm">Bharat Services</span>
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
