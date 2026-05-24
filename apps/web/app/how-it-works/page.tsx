"use client";

import Link from "next/link";
import { MapPin, ShoppingBag, CheckCircle, Shield, Zap } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { PublicPageHeader } from "@/components/shared/PublicPageHeader";

const C = {
  en: {
    badge: "Three taps. Done.",
    h1: "How Bharat Services works",
    intro: "From opening the app to a completed service — here is every step, explained.",
    steps: [
      { num: "01", title: "Share your location", desc: "We show you only verified heroes who actually serve your neighborhood — checked and confirmed by our agents. No random listings. Every result is physically nearby." },
      { num: "02", title: "Pick your service",   desc: "Book a haircut, refill a prescription, call an electrician — same cart, multiple heroes. See live pricing with any active discounts before you confirm." },
      { num: "03", title: "Get it done",         desc: "Your verified hero completes the service. Pay via UPI or cash. Rate the experience and rebook in one tap." },
    ],
    trustH2: "Why trust us?",
    trust: [
      { title: "Agent-verified",       desc: "Every hero is visited in person before activation." },
      { title: "Hyperlocal by design", desc: "Service areas are carefully defined — only real, nearby heroes show up for you." },
      { title: "90% to heroes",        desc: "Honest payouts — reconciled daily." },
    ],
    faqH2: "Frequently asked questions",
    faqs: [
      { q: "Who are 'Heroes'?",                  a: "Heroes are local service providers — barbers, tailors, electricians, chemists, and more. Each one is physically visited and verified by a Bharat Services Regional Officer before going live." },
      { q: "How does location matching work?",   a: "When you open Bharat Services we use your GPS location to show only the verified heroes who actually cover your area. Every hero's service zone is confirmed by our agents — so you only ever see providers who can genuinely reach you." },
      { q: "What payment methods are accepted?", a: "You can pay via UPI or cash on delivery / service completion. Razorpay handles all online transactions securely." },
      { q: "Can I cancel a booking?",            a: "Yes — cancellations are free before the hero is dispatched. Once underway, contact support at admin@bharat333.com for assistance." },
      { q: "How do heroes get paid?",            a: "Heroes receive 90% of every service charge. Reconciliation is handled daily by a dedicated Bharat Services Payment Manager." },
    ],
    ctaH2: "Ready to get started?",
    ctaDesc: "Your verified heroes are waiting.",
    ctaBtn: "Browse Services",
    footer: "© 2026 Bharat Services. Local, on demand. · Made for India 🇮🇳",
  },
  hi: {
    badge: "तीन टैप. हो गया।",
    h1: "Bharat Services कैसे काम करता है",
    intro: "ऐप खोलने से सेवा पूरी होने तक — यहाँ हर कदम समझाया गया है।",
    steps: [
      { num: "01", title: "अपना स्थान शेयर करें", desc: "हम आपको केवल वही सत्यापित हीरो दिखाते हैं जो वास्तव में आपके मोहल्ले में सेवा करते हैं — हमारे एजेंटों द्वारा जाँचे और पुष्टि किए गए। कोई रैंडम लिस्टिंग नहीं। हर नतीजा सिर्फ आसपास का है।" },
      { num: "02", title: "अपनी सेवा चुनें",       desc: "हेयरकट, दवाई मंगाएं, इलेक्ट्रीशियन बुलाएं — एक ही कार्ट, अनेक हीरोज़। कन्फ़र्म करने से पहले लाइव मूल्य और सक्रिय छूट देखें।" },
      { num: "03", title: "काम करवाएं",            desc: "आपका सत्यापित हीरो सेवा पूरी करता है। UPI या नकद भुगतान करें। अनुभव को रेट करें और एक टैप में दोबारा बुक करें।" },
    ],
    trustH2: "हम पर भरोसा क्यों?",
    trust: [
      { title: "एजेंट-सत्यापित",       desc: "हर हीरो को सक्रिय होने से पहले व्यक्तिगत रूप से दौरा किया जाता है।" },
      { title: "डिज़ाइन से हाइपरलोकल", desc: "सेवा क्षेत्र सावधानी से परिभाषित हैं — केवल असली, आसपास के हीरो दिखते हैं।" },
      { title: "हीरो को 90%",           desc: "ईमानदार भुगतान — दैनिक समाधान।" },
    ],
    faqH2: "अक्सर पूछे जाने वाले सवाल",
    faqs: [
      { q: "'हीरो' कौन हैं?",                   a: "हीरो स्थानीय सेवा प्रदाता हैं — नाई, दर्जी, इलेक्ट्रीशियन, केमिस्ट और बहुत कुछ। हर एक को लाइव होने से पहले एक Bharat Services रीजनल ऑफिसर द्वारा व्यक्तिगत रूप से सत्यापित किया जाता है।" },
      { q: "लोकेशन मैचिंग कैसे काम करती है?",    a: "जब आप Bharat Services खोलते हैं तो हम आपकी GPS लोकेशन का उपयोग करके केवल वही सत्यापित हीरो दिखाते हैं जो आपके क्षेत्र को कवर करते हैं। हर हीरो का सेवा क्षेत्र हमारे एजेंटों द्वारा पुष्टि किया जाता है।" },
      { q: "कौन से भुगतान तरीके स्वीकार हैं?",   a: "आप UPI या नकद भुगतान कर सकते हैं। Razorpay सभी ऑनलाइन लेनदेन सुरक्षित रूप से संभालता है।" },
      { q: "क्या मैं बुकिंग रद्द कर सकता हूँ?", a: "हाँ — हीरो के रवाना होने से पहले रद्दीकरण मुफ़्त है। एक बार शुरू होने के बाद, admin@bharat333.com पर सहायता के लिए संपर्क करें।" },
      { q: "हीरो को भुगतान कैसे होता है?",      a: "हीरो को हर सेवा शुल्क का 90% मिलता है। एक समर्पित Bharat Services पेमेंट मैनेजर द्वारा दैनिक समाधान किया जाता है।" },
    ],
    ctaH2: "शुरू करने के लिए तैयार हैं?",
    ctaDesc: "आपके सत्यापित हीरो प्रतीक्षा कर रहे हैं।",
    ctaBtn: "सेवाएं देखें",
    footer: "© 2026 Bharat Services. स्थानीय, मांग पर। · Made for India 🇮🇳",
  },
};

const ICONS = [MapPin, ShoppingBag, CheckCircle];

export default function HowItWorksPage() {
  const { lang } = useLanguage();
  const c = C[lang] ?? C.en;
  return (
    <main className="min-h-screen bg-white">
      <PublicPageHeader />

      {/* Header */}
      <section className="bg-gradient-to-br from-brand-primary/6 to-white border-b border-gray-100 py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 bg-brand-primary/10 text-brand-primary text-xs font-semibold px-3 py-1.5 rounded-full">
            <Zap size={12} /> {c.badge}
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{c.h1}</h1>
          <p className="text-gray-500 text-base leading-relaxed">{c.intro}</p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          {c.steps.map(({ num, title, desc }, i) => {
            const Icon = ICONS[i];
            return (
              <div key={num} className="flex gap-6 items-start">
                <div className="shrink-0 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center">
                    <Icon size={20} className="text-brand-primary" />
                  </div>
                  <span className="text-[10px] font-black text-brand-primary/40 tracking-widest">{num}</span>
                </div>
                <div className="pt-1 space-y-1.5">
                  <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Trust */}
      <section className="py-14 px-4 bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Shield size={18} className="text-brand-primary" />
            <h2 className="text-xl font-extrabold text-gray-900">{c.trustH2}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {c.trust.map(({ title, desc }) => (
              <div key={title} className="bg-white rounded-xl border border-gray-100 p-5 space-y-1.5">
                <p className="font-bold text-gray-900 text-sm">{title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-8">{c.faqH2}</h2>
          <div className="space-y-6 divide-y divide-gray-100">
            {c.faqs.map(({ q, a }) => (
              <div key={q} className="pt-6 first:pt-0 space-y-1.5">
                <h3 className="font-semibold text-gray-900 text-sm">{q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 px-4 border-t border-gray-100 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <h2 className="text-2xl font-extrabold text-gray-900">{c.ctaH2}</h2>
          <p className="text-sm text-gray-500">{c.ctaDesc}</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 h-11 px-8 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors">
            {c.ctaBtn}
          </Link>
        </div>
      </section>

      <div className="border-t border-gray-100 py-5 px-4 text-center">
        <p className="text-xs text-gray-400">{c.footer}</p>
      </div>
    </main>
  );
}
