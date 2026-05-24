"use client";

import Link from "next/link";
import {
  MapPin, Shield, Star, Users, Zap, Heart, Mail,
  Wrench, Droplets, HardHat, PartyPopper,
  Tractor, Store, Building2, Rocket, CheckCircle, Handshake,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { PublicPageHeader } from "@/components/shared/PublicPageHeader";

export default function AboutPage() {
  const { lang } = useLanguage();
  const isHi = lang === "hi";

  return (
    <main className="min-h-screen bg-white">
      <PublicPageHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-primary/6 to-white border-b border-gray-100 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 bg-brand-primary/10 text-brand-primary text-xs font-semibold px-3 py-1.5 rounded-full">
            <MapPin size={12} /> {isHi ? "स्थानीय सेवाएं · मांग पर" : "Local services · on demand"}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
            {isHi ? "हमारे बारे में — Bharat Services" : "About Us — Bharat Services"}
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
            {isHi
              ? "Bharat Services में आपका स्वागत है, प्रशिक्षित, सत्यापित और विश्वसनीय \"हीरोज़\" से जुड़ने का आपका भरोसेमंद प्लेटफ़ॉर्म जो आपके दरवाज़े पर विभिन्न सेवाओं के लिए मदद का हाथ प्रदान करते हैं।"
              : "Welcome to Bharat Services, your trusted platform for connecting with trained, verified, and reliable \"Heroes\" who provide helping hands for a wide range of services at your doorstep."}
          </p>
          <p className="text-gray-400 text-base max-w-2xl mx-auto leading-relaxed">
            {isHi
              ? "हम रोज़मर्रा की सेवाओं को सरल, सुलभ और भरोसेमंद बनाने के लिए प्रतिबद्ध हैं — आपकी बुकिंग और नज़दीकी हीरोज़ की उपलब्धता के आधार पर कुशल और अकुशल दोनों प्रकार के कार्यबल प्रदान करते हैं।"
              : "We are committed to making everyday services simple, accessible, and dependable by offering both skilled and non-skilled workforce based on your booking and the availability of nearby Heroes."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors">
              <Zap size={14} /> {isHi ? "सेवाएं देखें" : "Browse Services"}
            </Link>
            <Link href="/hero/register" className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:border-brand-primary/40 transition-colors">
              {isHi ? "हीरो बनें" : "Become a Hero"}
            </Link>
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-2">
              {isHi ? "हम क्या करते हैं" : "What We Do"}
            </p>
            <h2 className="text-3xl font-extrabold text-gray-900">
              {isHi ? "सही काम के लिए सही व्यक्ति" : "The right person for the right job"}
            </h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              {isHi
                ? "Bharat Services सेवा प्रदाताओं और ग्राहकों के बीच की दूरी को पाटता है — जल्दी और कुशलता से।"
                : "At Bharat Services, we bridge the gap between service providers and customers by delivering the right person for the right job — quickly and efficiently."}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: CheckCircle, en: "Trained", hi: "प्रशिक्षित" },
              { icon: Shield, en: "Verified", hi: "सत्यापित" },
              { icon: Star, en: "Trustworthy", hi: "भरोसेमंद" },
            ].map(({ icon: Icon, en, hi }) => (
              <div key={en} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-brand-primary" />
                </div>
                <span className="font-bold text-gray-900">{isHi ? hi : en}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Skilled Services */}
      <section className="py-16 px-4 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-2">
              {isHi ? "हमारी सेवाएं" : "Our Services"}
            </p>
            <h2 className="text-3xl font-extrabold text-gray-900">
              {isHi ? "1. कुशल सेवाएं" : "1. Skilled Services"}
            </h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              {isHi
                ? "हमारे कुशल हीरोज़ अनुभवी पेशेवर हैं जो तकनीकी और विशेष कार्य संभालते हैं।"
                : "Our skilled Heroes are experienced professionals who handle technical and specialized work."}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                icon: Wrench,
                titleEn: "Electronics Appliance Repair & Services",
                titleHi: "इलेक्ट्रॉनिक्स उपकरण मरम्मत और सेवाएं",
                descEn: "AC, Fan, Water Cooler, TV, Stabilizer, Inverter, Water Filter, Washing Machine, and Home Wiring",
                descHi: "AC, पंखा, वॉटर कूलर, TV, स्टेबलाइज़र, इनवर्टर, वॉटर फ़िल्टर, वॉशिंग मशीन, और होम वायरिंग",
              },
              {
                icon: Droplets,
                titleEn: "Plumbing Repair & Services",
                titleHi: "प्लंबिंग मरम्मत और सेवाएं",
                descEn: "Water supply pipes, taps, hand pumps, motors",
                descHi: "पानी की सप्लाई पाइप, नल, हैंड पंप, मोटर",
              },
              {
                icon: HardHat,
                titleEn: "Raj Mistri (Mason Work)",
                titleHi: "राज मिस्त्री (मेसन कार्य)",
                descEn: "House construction and repair work",
                descHi: "घर निर्माण और मरम्मत कार्य",
              },
              {
                icon: PartyPopper,
                titleEn: "Decoration Services",
                titleHi: "सजावट सेवाएं",
                descEn: "Marriage, birthday, puja, events, and celebrations",
                descHi: "शादी, जन्मदिन, पूजा, इवेंट्स, और समारोह",
              },
            ].map(({ icon: Icon, titleEn, titleHi, descEn, descHi }) => (
              <div key={titleEn} className="rounded-2xl border border-gray-100 bg-white p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                  <Icon size={18} className="text-brand-primary" />
                </div>
                <h3 className="font-bold text-gray-900">{isHi ? titleHi : titleEn}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{isHi ? descHi : descEn}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Non-Skilled Services */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900">
              {isHi ? "2. अकुशल सेवाएं" : "2. Non-Skilled Services"}
            </h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              {isHi
                ? "हम दैनिक और श्रम-प्रधान कार्यों के लिए भरोसेमंद जनशक्ति भी प्रदान करते हैं।"
                : "We also provide dependable manpower for daily and labor-intensive work."}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: Tractor,
                titleEn: "Field Workers (Agriculture)",
                titleHi: "खेत मज़दूर (कृषि कार्य)",
                descEn: "Farming, crop work, harvesting, seeding, ploughing",
                descHi: "खेती, फसल कार्य, कटाई, बुआई, जुताई",
              },
              {
                icon: Store,
                titleEn: "Shop Helpers",
                titleHi: "दुकान सहायक",
                descEn: "Assistance in hardware stores, kirana shops, loading/unloading goods, and stock handling",
                descHi: "हार्डवेयर स्टोर, किराना दुकान, सामान लोडिंग/अनलोडिंग, और स्टॉक प्रबंधन में सहायता",
              },
              {
                icon: Building2,
                titleEn: "Construction Helpers",
                titleHi: "निर्माण सहायक",
                descEn: "Support work at construction sites (house, office, roads, streets)",
                descHi: "निर्माण स्थलों पर सहायता कार्य (घर, ऑफिस, सड़कें)",
              },
            ].map(({ icon: Icon, titleEn, titleHi, descEn, descHi }) => (
              <div key={titleEn} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                  <Icon size={18} className="text-brand-primary" />
                </div>
                <h3 className="font-bold text-gray-900">{isHi ? titleHi : titleEn}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{isHi ? descHi : descEn}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-4 bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center mx-auto">
            <Rocket size={20} className="text-brand-primary" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">
            {isHi ? "हमारा मिशन" : "Our Mission"}
          </p>
          <p className="text-gray-600 text-lg leading-relaxed max-w-xl mx-auto">
            {isHi
              ? "हमारा मिशन स्थानीय कामगारों को रोज़गार के अवसर प्रदान करके सशक्त बनाना है, साथ ही ग्राहकों को उनके दरवाज़े पर त्वरित, किफ़ायती और विश्वसनीय सेवाएं प्रदान करना है।"
              : "Our mission is to empower local workers by providing them with job opportunities while helping customers get quick, affordable, and reliable services at their doorstep."}
          </p>
        </div>
      </section>

      {/* Why Choose */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-2">
              {isHi ? "Bharat Services क्यों चुनें" : "Why Choose Bharat Services"}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { en: "Trusted and verified Heroes", hi: "भरोसेमंद और सत्यापित हीरोज़" },
              { en: "Wide range of services in one platform", hi: "एक प्लेटफ़ॉर्म पर सेवाओं की विस्तृत श्रृंखला" },
              { en: "Easy booking and quick availability", hi: "आसान बुकिंग और त्वरित उपलब्धता" },
              { en: "Focus on customer satisfaction", hi: "ग्राहक संतुष्टि पर ध्यान" },
            ].map(({ en, hi }) => (
              <div key={en} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                <CheckCircle size={18} className="text-brand-primary flex-shrink-0" />
                <span className="text-sm font-medium text-gray-800">{isHi ? hi : en}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Promise */}
      <section className="py-16 px-4 bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center mx-auto">
            <Handshake size={20} className="text-brand-primary" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">
            {isHi ? "हमारा वादा" : "Our Promise"}
          </p>
          <p className="text-gray-600 text-lg leading-relaxed max-w-xl mx-auto">
            {isHi
              ? "Bharat Services में, हम गुणवत्ता, भरोसे और सुविधा में विश्वास करते हैं। हर सेवा अनुरोध को सावधानी से संभाला जाता है ताकि आपको हर बार सबसे अच्छा अनुभव मिले।"
              : "At Bharat Services, we believe in quality, trust, and convenience. Every service request is handled with care to ensure you get the best experience every time."}
          </p>
        </div>
      </section>

      {/* Contact anchor */}
      <section id="contact" className="py-16 px-4">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center mx-auto">
            <Mail size={20} className="text-brand-primary" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">
            {isHi ? "संपर्क करें" : "Get in touch"}
          </h2>
          <p className="text-sm text-gray-500">
            {isHi ? "प्रश्न, साझेदारी या पूछताछ — हमें यहाँ लिखें:" : "Questions, partnerships or inquiries — reach us at:"}
          </p>
          <a href="mailto:admin@bharat333.com" className="text-brand-primary font-semibold text-base hover:underline">
            admin@bharat333.com
          </a>
          <div className="flex justify-center gap-3 pt-2">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-primary transition-colors">
              <Heart size={13} /> {isHi ? "सेवाओं पर वापस जाएं" : "Back to services"}
            </Link>
          </div>
        </div>
      </section>

      {/* Closing note */}
      <div className="border-t border-gray-100 py-8 px-4 text-center space-y-2">
        <p className="text-base font-semibold text-gray-700 italic">
          {isHi
            ? "\"Bharat Services — कुशल और मददगार हाथ आपके दरवाज़े पर।\""
            : "\"Bharat Services — Bringing skilled and helping hands to your doorstep.\""}
        </p>
        <p className="text-xs text-gray-400">
          {isHi ? "© 2026 Bharat Services. स्थानीय, मांग पर। · Made for India" : "© 2026 Bharat Services. Local, on demand. · Made for India"} 🇮🇳
        </p>
      </div>

    </main>
  );
}
