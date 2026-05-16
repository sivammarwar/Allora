"use client";

import Link from "next/link";
import { MapPin, Shield, Star, Users, Zap, Heart, Mail } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { PublicPageHeader } from "@/components/shared/PublicPageHeader";

const CONTENT = {
  en: {
    badge: "Local services · on demand",
    h1: "Your neighborhood,\non demand.",
    intro: "Bharat Services connects you to verified local heroes — your barber, tailor, chemist, kirana shop, electrician, and more — with a single tap. Real shops. Real people. Real fast.",
    browse: "Browse Services",
    becomeHero: "Become a Hero",
    valuesTag: "What we stand for",
    valuesH2: "Built for everyone",
    values: [
      { title: "Customers",  desc: "Find local services in seconds. Pay UPI or cash. Track every step." },
      { title: "Heroes",     desc: "Run your shop digitally. Set pricing, manage products, accept orders." },
      { title: "Operators",  desc: "Admins, agents and product managers — verify, curate, and grow your area." },
    ],
    pillarsTag: "Our promise",
    pillarsH2: "Verified, not just listed",
    pillars: [
      { title: "Verified, not just listed",  desc: "Every hero is physically visited and verified by a Bharat Services agent before going live." },
      { title: "Hyperlocal, by design",      desc: "Listings are filtered by your live location — only heroes who genuinely cover your area appear." },
      { title: "Honest payouts",             desc: "90% goes to the hero. Daily reconciliation by a dedicated Payment Manager." },
    ],
    contactH2: "Get in touch",
    contactDesc: "Questions, partnerships or press inquiries — reach us at:",
    backLink: "Back to services",
    footer: "© 2026 Bharat Services. Local, on demand. · Made for India 🇮🇳",
  },
  hi: {
    badge: "स्थानीय सेवाएं · मांग पर",
    h1: "आपका पड़ोस,\nमांग पर।",
    intro: "Bharat Services आपको सत्यापित स्थानीय हीरोज़ से जोड़ता है — आपका नाई, दर्जी, केमिस्ट, किराना दुकान, इलेक्ट्रीशियन और भी बहुत कुछ — एक टैप में। असली दुकानें। असली लोग। बेहद तेज़।",
    browse: "सेवाएं देखें",
    becomeHero: "हीरो बनें",
    valuesTag: "हम किसके लिए खड़े हैं",
    valuesH2: "सभी के लिए बना",
    values: [
      { title: "ग्राहक",    desc: "सेकंडों में स्थानीय सेवाएं खोजें। UPI या नकद भुगतान करें। हर कदम ट्रैक करें।" },
      { title: "हीरोज़",    desc: "अपनी दुकान डिजिटली चलाएं। मूल्य निर्धारित करें, उत्पाद प्रबंधित करें, ऑर्डर स्वीकारें।" },
      { title: "ऑपरेटर",   desc: "एडमिन, एजेंट और प्रोडक्ट मैनेजर — अपने क्षेत्र को सत्यापित करें, क्यूरेट करें और बढ़ाएं।" },
    ],
    pillarsTag: "हमारा वादा",
    pillarsH2: "सत्यापित, सिर्फ सूचीबद्ध नहीं",
    pillars: [
      { title: "सत्यापित, सिर्फ सूचीबद्ध नहीं",  desc: "हर हीरो को लाइव होने से पहले एक Bharat Services एजेंट द्वारा व्यक्तिगत रूप से सत्यापित किया जाता है।" },
      { title: "डिज़ाइन से हाइपरलोकल",           desc: "लिस्टिंग आपके लाइव स्थान से फ़िल्टर की जाती है — केवल वही हीरो दिखते हैं जो वास्तव में आपके क्षेत्र में सेवा देते हैं।" },
      { title: "ईमानदार भुगतान",                  desc: "90% हीरो को जाता है। एक समर्पित पेमेंट मैनेजर द्वारा दैनिक समाधान।" },
    ],
    contactH2: "संपर्क करें",
    contactDesc: "प्रश्न, साझेदारी या प्रेस पूछताछ — हमें यहाँ लिखें:",
    backLink: "सेवाओं पर वापस जाएं",
    footer: "© 2026 Bharat Services. स्थानीय, मांग पर। · Made for India 🇮🇳",
  },
};

export default function AboutPage() {
  const { lang } = useLanguage();
  const c = CONTENT[lang] ?? CONTENT.en;
  return (
    <main className="min-h-screen bg-white">
      <PublicPageHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-primary/6 to-white border-b border-gray-100 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 bg-brand-primary/10 text-brand-primary text-xs font-semibold px-3 py-1.5 rounded-full">
            <MapPin size={12} /> {c.badge}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
            {c.h1.split("\n").map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)}
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">{c.intro}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors">
              <Zap size={14} /> {c.browse}
            </Link>
            <Link href="/hero/register" className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:border-brand-primary/40 transition-colors">
              {c.becomeHero}
            </Link>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-2">{c.valuesTag}</p>
            <h2 className="text-3xl font-extrabold text-gray-900">{c.valuesH2}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {([{ icon: Users }, { icon: Star }, { icon: Shield }] as const).map(({ icon: Icon }, i) => {
              const { title, desc } = c.values[i];
              return (
              <div key={title} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                  <Icon size={18} className="text-brand-primary" />
                </div>
                <h3 className="font-bold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            );
            })}
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-16 px-4 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-2">{c.pillarsTag}</p>
            <h2 className="text-3xl font-extrabold text-gray-900">{c.pillarsH2}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {c.pillars.map(({ title, desc }) => (
              <div key={title} className="space-y-2">
                <div className="w-2 h-2 rounded-full bg-brand-primary" />
                <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact anchor */}
      <section id="contact" className="py-16 px-4">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center mx-auto">
            <Mail size={20} className="text-brand-primary" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">{c.contactH2}</h2>
          <p className="text-sm text-gray-500">{c.contactDesc}</p>
          <a href="mailto:support@bharat333.com" className="text-brand-primary font-semibold text-base hover:underline">
            support@bharat333.com
          </a>
          <div className="flex justify-center gap-3 pt-2">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-primary transition-colors">
              <Heart size={13} /> {c.backLink}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer bottom */}
      <div className="border-t border-gray-100 py-5 px-4 text-center">
        <p className="text-xs text-gray-400">{c.footer}</p>
      </div>

    </main>
  );
}
