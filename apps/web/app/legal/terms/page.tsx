"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { PublicPageHeader } from "@/components/shared/PublicPageHeader";

const EN_S = [
  { t: "1. Acceptance",            b: "By accessing or using Bharat Services you agree to these Terms. They apply to all users — Customers, Heroes, Agents, and Operators." },
  { t: "2. The platform",          b: "Bharat Services is a marketplace connecting customers with local Heroes. Bharat Services is not itself a service provider. The contract for any service is between Customer and Hero." },
  { t: "3. Accounts",              b: "You must provide a valid email to create an account. You are responsible for all activity under your account. Accounts are non-transferable." },
  { t: "4. Hero verification",     b: "Heroes are verified by Bharat Services Regional Officers through an in-person visit. Verification confirms existence and capability but is not an endorsement of quality." },
  { t: "5. Payments",              b: "Service charges are displayed before booking confirmation. Payments are processed by Razorpay or PhonePe. Heroes receive 90% of the service charge." },
  { t: "6. Cancellations",         b: "Cancellations before dispatch are free. Cancellations after dispatch may attract a fee at the Hero's discretion. See our Refund Policy for details." },
  { t: "7. Prohibited conduct",    b: "You may not: (a) make fraudulent bookings; (b) harass Heroes or Bharat Services staff; (c) reverse-engineer the platform; (d) create fake reviews." },
  { t: "8. Limitation of liability", b: "Bharat Services's liability for any claim is limited to the amount paid for the relevant transaction. We are not liable for Hero conduct or service quality." },
  { t: "9. Governing law",         b: "These Terms are governed by the laws of India. Disputes are subject to the exclusive jurisdiction of courts in Bangalore, Karnataka." },
  { t: "10. Contact",              b: "Legal inquiries: support@bharat333.com" },
];

const HI_S = [
  { t: "1. स्वीकृति",              b: "Bharat Services का उपयोग करके आप इन शर्तों से सहमत होते हैं। ये सभी उपयोगकर्ताओं — ग्राहक, हीरो, एजेंट और ऑपरेटर — पर लागू होती हैं।" },
  { t: "2. प्लेटफ़ॉर्म",           b: "Bharat Services एक मार्केटप्लेस है जो ग्राहकों को स्थानीय हीरो से जोड़ता है। Bharat Services स्वयं सेवा प्रदाता नहीं है। सेवा का अनुबंध ग्राहक और हीरो के बीच है।" },
  { t: "3. खाते",                   b: "खाता बनाने के लिए वैध ईमेल आवश्यक है। आप अपने खाते की सभी गतिविधियों के लिए जिम्मेदार हैं। खाते हस्तांतरणीय नहीं हैं।" },
  { t: "4. हीरो सत्यापन",           b: "हीरो को Bharat Services रीजनल ऑफिसर व्यक्तिगत रूप से सत्यापित करते हैं। सत्यापन अस्तित्व और सेवा क्षमता की पुष्टि करता है, गुणवत्ता की गारंटी नहीं देता।" },
  { t: "5. भुगतान",                 b: "बुकिंग से पहले सेवा शुल्क दिखाया जाता है। भुगतान Razorpay या PhonePe द्वारा प्रोसेस होता है। हीरो को सेवा शुल्क का 90% मिलता है।" },
  { t: "6. रद्दीकरण",               b: "हीरो के रवाना होने से पहले रद्दीकरण मुफ़्त है। बाद में रद्द करने पर हीरो के विवेक पर शुल्क लग सकता है। विवरण के लिए हमारी रिफंड नीति देखें।" },
  { t: "7. प्रतिबंधित आचरण",        b: "आप निम्नलिखित नहीं कर सकते: (क) धोखाधड़ी की बुकिंग; (ख) हीरो या Bharat Services स्टाफ से दुर्व्यवहार; (ग) प्लेटफ़ॉर्म को रिवर्स-इंजीनियर करना; (घ) नकली समीक्षाएं।" },
  { t: "8. देयता की सीमा",          b: "किसी भी दावे के लिए Bharat Services की देयता लेनदेन की राशि तक सीमित है। हम हीरो के आचरण या सेवा गुणवत्ता के लिए उत्तरदायी नहीं हैं।" },
  { t: "9. शासी कानून",             b: "ये शर्तें भारत के कानूनों द्वारा शासित हैं। विवाद बैंगलोर, कर्नाटक के न्यायालयों के अधिकार क्षेत्र में होंगे।" },
  { t: "10. संपर्क",                b: "कानूनी पूछताछ: support@bharat333.com" },
];

export default function TermsPage() {
  const { lang } = useLanguage();
  const sections = lang === "hi" ? HI_S : EN_S;
  const isHi = lang === "hi";
  return (
    <main className="min-h-screen bg-white">
      <PublicPageHeader />
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-10">

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {isHi ? "सेवा की शर्तें" : "Terms of Service"}
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
          <Link href="/legal/privacy" className="hover:text-brand-primary">{isHi ? "गोपनीयता नीति" : "Privacy Policy"}</Link>
          <Link href="/legal/refund" className="hover:text-brand-primary">{isHi ? "रिफंड नीति" : "Refund Policy"}</Link>
        </div>
      </div>
    </main>
  );
}
