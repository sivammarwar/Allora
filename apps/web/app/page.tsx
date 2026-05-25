"use client";
import Link from "next/link";
import { MapPin, Shield, Star, Zap, CheckCircle, Wrench, Droplets, Scissors, ShoppingBag, Tractor, Building2, ArrowRight } from "lucide-react";
import { PublicPageHeader } from "@/components/shared/PublicPageHeader";
import { useLanguage } from "@/lib/i18n";

export default function HomePage() {
  const { lang } = useLanguage();
  const hi = lang === "hi";
  return (
    <main className="min-h-screen bg-white">
      <PublicPageHeader />
      <section className="bg-gradient-to-br from-brand-primary/6 to-white border-b border-gray-100 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-brand-primary/10 text-brand-primary text-xs font-semibold px-3 py-1.5 rounded-full">
            <MapPin size={12} />{hi ? "स्थानीय सेवाएं · आपके दरवाज़े पर" : "Local services · at your doorstep"}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
            {hi ? "Bharat Services — कुशल और भरोसेमंद हाथ आपके पास" : "Bharat Services — Skilled & trusted help near you"}
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
            {hi ? "प्रशिक्षित और सत्यापित हीरोज़ से जुड़ें — इलेक्ट्रीशियन, प्लंबर, नाई, दर्जी और बहुत कुछ।" : "Book verified electricians, plumbers, barbers, tailors, masons and more — hyperlocal and agent-verified."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 h-11 px-7 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors">
              <Zap size={14} />{hi ? "सेवाएं देखें" : "Browse Services"}
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 h-11 px-7 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:border-brand-primary/40 transition-colors">
              {hi ? "लॉगिन / साइन अप" : "Login / Sign up"}<ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>
      <section className="py-10 px-4 border-b border-gray-100">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: CheckCircle, en: "Agent-verified Heroes", hi: "एजेंट-सत्यापित हीरोज़", d_en: "Every provider is physically verified before going live.", d_hi: "हर सेवा प्रदाता को व्यक्तिगत रूप से सत्यापित किया जाता है।" },
            { icon: MapPin,      en: "Hyperlocal by design",  hi: "हाइपरलोकल सेवाएं",     d_en: "Only Heroes in your exact area show up.", d_hi: "केवल आपके क्षेत्र के हीरोज़ दिखते हैं।" },
            { icon: Star,        en: "Rated & trusted",       hi: "रेटेड और भरोसेमंद",     d_en: "Real reviews after every booking.", d_hi: "हर बुकिंग के बाद असली समीक्षाएं।" },
          ].map(({ icon: Icon, en, hi: h, d_en, d_hi }) => (
            <div key={en} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center"><Icon size={16} className="text-brand-primary" /></div>
                <span className="font-bold text-gray-900 text-sm">{hi ? h : en}</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{hi ? d_hi : d_en}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-2">{hi ? "हमारी सेवाएं" : "Our Services"}</p>
            <h2 className="text-3xl font-extrabold text-gray-900">{hi ? "जो भी चाहिए — एक जगह" : "Everything you need — one place"}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { icon: Wrench,      en: "Electrician & Repairs",   hi: "इलेक्ट्रीशियन और मरम्मत" },
              { icon: Droplets,    en: "Plumbing",                 hi: "प्लंबिंग" },
              { icon: Scissors,    en: "Barber / Tailor",          hi: "नाई / दर्जी" },
              { icon: Building2,   en: "Mason & Construction",     hi: "राज मिस्त्री" },
              { icon: Tractor,     en: "Agriculture Labour",       hi: "कृषि मज़दूर" },
              { icon: ShoppingBag, en: "Shop & Delivery Help",     hi: "दुकान सहायता" },
            ].map(({ icon: Icon, en, hi: h }) => (
              <div key={en} className="rounded-xl border border-gray-100 bg-white p-4 flex items-center gap-3 hover:border-brand-primary/30 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/8 flex items-center justify-center"><Icon size={15} className="text-brand-primary" /></div>
                <span className="text-xs font-semibold text-gray-800">{hi ? h : en}</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-primary hover:underline">
              {hi ? "सभी सेवाएं देखें" : "See all services"}<ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>
      <section className="py-16 px-4 bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900">{hi ? "3 स्टेप्स में बुकिंग" : "3 taps and it's done"}</h2>
          </div>
          <div className="space-y-5">
            {[
              { n: "01", en: "Share your location",  hi: "अपनी लोकेशन शेयर करें", d_en: "We show only verified Heroes in your area.",     d_hi: "हम केवल आपके क्षेत्र के सत्यापित हीरोज़ दिखाते हैं।" },
              { n: "02", en: "Pick your service",    hi: "अपनी सेवा चुनें",        d_en: "Browse, see live pricing, add to cart.",         d_hi: "श्रेणियां देखें, लाइव मूल्य देखें, कार्ट में जोड़ें।" },
              { n: "03", en: "Get it done",          hi: "काम पूरा करें",           d_en: "Hero arrives and completes the job. UPI or cash.", d_hi: "हीरो आता है और काम पूरा करता है। UPI या नकद।" },
            ].map(({ n, en, hi: h, d_en, d_hi }) => (
              <div key={n} className="flex items-start gap-4 rounded-2xl bg-white border border-gray-100 p-5">
                <span className="text-2xl font-black text-brand-primary/20 leading-none mt-0.5">{n}</span>
                <div><p className="font-bold text-gray-900">{hi ? h : en}</p><p className="text-sm text-gray-500 mt-0.5">{hi ? d_hi : d_en}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-16 px-4 text-center">
        <div className="max-w-xl mx-auto space-y-5">
          <h2 className="text-2xl font-extrabold text-gray-900">{hi ? "आज ही शुरू करें" : "Get started today"}</h2>
          <p className="text-gray-500 text-sm">{hi ? "अभी अपने नज़दीकी सत्यापित हीरोज़ देखें।" : "See verified Heroes near you right now."}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 h-11 px-7 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors">
              <Zap size={14} />{hi ? "सेवाएं देखें" : "Browse Services"}
            </Link>
            <Link href="/about" className="inline-flex items-center justify-center gap-2 h-11 px-7 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:border-brand-primary/40 transition-colors">
              {hi ? "और जानें" : "Learn more"}
            </Link>
          </div>
        </div>
      </section>
      <div className="border-t border-gray-100 py-8 px-4 text-center space-y-2">
        <div className="flex justify-center gap-5 text-xs text-gray-400 mb-2">
          <Link href="/about" className="hover:text-brand-primary transition-colors">{hi ? "हमारे बारे में" : "About"}</Link>
          <Link href="/how-it-works" className="hover:text-brand-primary transition-colors">{hi ? "कैसे काम करता है" : "How it works"}</Link>
          <Link href="/contact" className="hover:text-brand-primary transition-colors">{hi ? "संपर्क करें" : "Contact"}</Link>
        </div>
        <p className="text-xs text-gray-400">© 2026 Bharat Services. Local, on demand. · Made for India 🇮🇳</p>
      </div>
    </main>
  );
}
