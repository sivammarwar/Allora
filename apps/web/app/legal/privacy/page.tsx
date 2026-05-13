"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { PublicPageHeader } from "@/components/shared/PublicPageHeader";

const EN_SECTIONS = [
  { t: "1. Information we collect",      b: "We collect information you provide directly — name, email, phone — plus GPS coordinates (to match nearby heroes), booking history, and ratings." },
  { t: "2. How we use your information", b: "Your location matches you to verified heroes only. We never sell location data. Email is used for OTP auth and notifications. Booking data processes service requests and payments." },
  { t: "3. Data sharing",                b: "We share your name and contact with your booked hero only. Payment processors (Razorpay, PhonePe) handle transactions under their own policies. We do not sell data to advertisers." },
  { t: "4. Data retention",              b: "Account data is kept while your account is active. Booking records are kept 7 years for accounting. Request deletion at hello@allora.app." },
  { t: "5. Security",                    b: "All data in transit is encrypted with TLS. Passwords are never stored — we use one-time email codes. Credentials live in environment variables only." },
  { t: "6. Your rights",                 b: "You may access, correct, or delete your data. Email hello@allora.app and we respond within 30 days." },
  { t: "7. Changes to this policy",      b: "We may update this policy; significant changes are notified by email. Continued use after notice constitutes acceptance." },
  { t: "8. Contact",                     b: "Privacy inquiries: hello@allora.app" },
];

const HI_SECTIONS = [
  { t: "1. हम क्या जानकारी एकत्र करते हैं",         b: "हम आपका नाम, ईमेल, फोन, GPS निर्देशांक (हीरो मिलान के लिए), बुकिंग इतिहास और रेटिंग एकत्र करते हैं।" },
  { t: "2. जानकारी का उपयोग कैसे करते हैं",          b: "लोकेशन केवल सत्यापित हीरो मिलान के लिए। लोकेशन डेटा बेचा नहीं जाता। ईमेल OTP और सूचनाओं के लिए। बुकिंग डेटा सेवा और भुगतान प्रक्रिया के लिए।" },
  { t: "3. डेटा साझाकरण",                            b: "आपका विवरण केवल बुक किए गए हीरो के साथ साझा होता है। Razorpay, PhonePe अपनी नीति के तहत काम करते हैं। विज्ञापनदाताओं को डेटा नहीं बेचा जाता।" },
  { t: "4. डेटा प्रतिधारण",                          b: "खाता सक्रिय रहने तक डेटा सुरक्षित रहता है। बुकिंग रिकॉर्ड 7 साल तक रखे जाते हैं। hello@allora.app पर डिलीट का अनुरोध करें।" },
  { t: "5. सुरक्षा",                                 b: "सभी डेटा TLS एन्क्रिप्शन से सुरक्षित है। पासवर्ड संग्रहीत नहीं होते — केवल ईमेल OTP से लॉगिन। क्रेडेंशियल environment variables में।" },
  { t: "6. आपके अधिकार",                             b: "आप अपना डेटा देख, सुधार या हटा सकते हैं। hello@allora.app पर ईमेल करें, 30 दिन में जवाब मिलेगा।" },
  { t: "7. नीति में बदलाव",                          b: "नीति समय-समय पर अपडेट हो सकती है। महत्वपूर्ण बदलाव ईमेल से सूचित किए जाएंगे।" },
  { t: "8. संपर्क",                                  b: "गोपनीयता संबंधी पूछताछ: hello@allora.app" },
];

export default function PrivacyPage() {
  const { lang } = useLanguage();
  const sections = lang === "hi" ? HI_SECTIONS : EN_SECTIONS;
  const isHi = lang === "hi";
  return (
    <main className="min-h-screen bg-white">
      <PublicPageHeader />
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-10">

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {isHi ? "गोपनीयता नीति" : "Privacy Policy"}
          </h1>
          <p className="text-sm text-gray-400">{isHi ? "अंतिम अपडेट: मई 2026" : "Last updated: May 2026"}</p>
        </div>

        {sections.map(({ t, b }) => (
          <section key={t} className="space-y-2">
            <h2 className="font-bold text-gray-900">{t}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{b}</p>
          </section>
        ))}

        <div className="pt-6 border-t border-gray-100 flex gap-4 text-xs text-gray-400">
          <Link href="/legal/terms" className="hover:text-brand-primary">{isHi ? "सेवा की शर्तें" : "Terms of Service"}</Link>
          <Link href="/legal/refund" className="hover:text-brand-primary">{isHi ? "रिफंड नीति" : "Refund Policy"}</Link>
        </div>
      </div>
    </main>
  );
}
