"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { PublicPageHeader } from "@/components/shared/PublicPageHeader";

const EN_SECTIONS = [
  { t: "1. Information We Collect", b: "We collect the following personal data to provide our services effectively:\n\n• Phone Number\n• Email Address\n• Residential/Service Address\n• Payment Information\n\nNote: We do not collect or store any bank account details, debit/credit card details, or sensitive financial information. Payments are processed through secure third-party payment gateways." },
  { t: "2. How We Use Your Information", b: "We use your personal data strictly for service-related purposes:\n\n• Service Delivery: To provide and manage our services.\n• Communication: Phone number is used to contact you regarding your bookings or services. Email is used for sending invoices, booking confirmations, and important updates.\n• Service Execution: Your address is used to send our service professionals (\"Heroes\") to your location.\n\nWe do not use your data for any unrelated purposes without your consent." },
  { t: "3. Data Sharing and Disclosure", b: "We do not sell, rent, or trade your personal information to third parties.\n\nHowever, we may share your data in the following cases:\n\n• With our internal team and service professionals to fulfill your service request\n• With trusted third-party service providers (e.g., payment gateways)\n• When required by law, regulation, or legal process" },
  { t: "4. Data Security", b: "We take appropriate security measures to protect your personal data from unauthorized access, misuse, or disclosure, including:\n\n• Secure systems and restricted access\n• Use of trusted and secure payment gateways\n• Regular monitoring of data handling practices" },
  { t: "5. Data Retention", b: "We retain your personal data only for as long as necessary:\n\n• To provide our services\n• To comply with legal obligations\n• To resolve disputes and enforce agreements" },
  { t: "6. Your Rights", b: "As a user, you have the right to:\n\n• Access your personal data\n• Request correction or update of your data\n• Request deletion of your data (subject to legal requirements)\n• Opt out of non-essential communications\n\nTo exercise your rights, please contact us at admin@bharat333.com." },
  { t: "7. Cookies and Tracking Technologies", b: "If you use our website or app, we may use cookies or similar technologies to improve user experience and analyze usage. You can control cookie settings through your browser." },
  { t: "8. Legal Compliance", b: "Bharat333 complies with all applicable laws and regulations, including:\n\n• The Information Technology Act, 2000 (India)\n• The Digital Personal Data Protection Act, 2023 (DPDP Act)\n\nWe ensure that your data is collected and processed lawfully, fairly, and with your consent." },
  { t: "9. Policy Updates", b: "We may update this Privacy Policy from time to time based on changes in our business practices or legal requirements. Updated policies will be posted on this page with a revised effective date." },
  { t: "10. Contact Us", b: "If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us:\n\nCompany Name: Bharat333\nEmail: admin@bharat333.com\nPhone: +91 9158074740\nAddress: #508, Tower-B, Citrine Housing Co Society, Marunji, Pune, Pin Code- 411057" },
];

const HI_SECTIONS = [
  { t: "1. हम कौन सी जानकारी एकत्र करते हैं", b: "हम अपनी सेवाएं प्रभावी ढंग से प्रदान करने के लिए निम्नलिखित व्यक्तिगत डेटा एकत्र करते हैं:\n\n• फ़ोन नंबर\n• ईमेल पता\n• आवासीय/सेवा पता\n• भुगतान जानकारी\n\nनोट: हम कोई बैंक खाता विवरण, डेबिट/क्रेडिट कार्ड विवरण, या संवेदनशील वित्तीय जानकारी एकत्र या संग्रहीत नहीं करते।" },
  { t: "2. हम आपकी जानकारी का उपयोग कैसे करते हैं", b: "हम आपके व्यक्तिगत डेटा का उपयोग केवल सेवा-संबंधित उद्देश्यों के लिए करते हैं:\n\n• सेवा वितरण: हमारी सेवाएं प्रदान और प्रबंधित करने के लिए।\n• संचार: फ़ोन नंबर आपकी बुकिंग के संबंध में संपर्क के लिए। ईमेल चालान, बुकिंग पुष्टि और महत्वपूर्ण अपडेट भेजने के लिए।\n• सेवा निष्पादन: आपका पता हमारे सेवा पेशेवरों (\"हीरो\") को आपके स्थान पर भेजने के लिए।" },
  { t: "3. डेटा साझाकरण और प्रकटीकरण", b: "हम आपकी व्यक्तिगत जानकारी तीसरे पक्ष को नहीं बेचते, किराए पर नहीं देते।\n\nहालांकि, निम्नलिखित मामलों में डेटा साझा किया जा सकता है:\n\n• सेवा अनुरोध पूरा करने के लिए हमारी आंतरिक टीम और सेवा पेशेवरों के साथ\n• विश्वसनीय तृतीय-पक्ष सेवा प्रदाताओं (जैसे भुगतान गेटवे) के साथ\n• कानून द्वारा आवश्यक होने पर" },
  { t: "4. डेटा सुरक्षा", b: "हम आपके व्यक्तिगत डेटा को अनधिकृत पहुंच, दुरुपयोग या प्रकटीकरण से बचाने के लिए उचित सुरक्षा उपाय करते हैं।" },
  { t: "5. डेटा प्रतिधारण", b: "हम आपके व्यक्तिगत डेटा को केवल आवश्यक समय तक रखते हैं:\n\n• हमारी सेवाएं प्रदान करने के लिए\n• कानूनी दायित्वों का पालन करने के लिए\n• विवादों को हल करने के लिए" },
  { t: "6. आपके अधिकार", b: "एक उपयोगकर्ता के रूप में, आपको अधिकार है:\n\n• अपने व्यक्तिगत डेटा तक पहुंच\n• अपने डेटा में सुधार या अपडेट का अनुरोध\n• अपने डेटा को हटाने का अनुरोध\n• गैर-आवश्यक संचार से ऑप्ट आउट\n\nसंपर्क: admin@bharat333.com" },
  { t: "7. कुकीज़ और ट्रैकिंग तकनीक", b: "यदि आप हमारी वेबसाइट या ऐप का उपयोग करते हैं, तो हम उपयोगकर्ता अनुभव को बेहतर बनाने के लिए कुकीज़ का उपयोग कर सकते हैं।" },
  { t: "8. कानूनी अनुपालन", b: "Bharat333 सभी लागू कानूनों और विनियमों का अनुपालन करता है, जिसमें शामिल हैं:\n\n• सूचना प्रौद्योगिकी अधिनियम, 2000 (भारत)\n• डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023 (DPDP अधिनियम)" },
  { t: "9. नीति अपडेट", b: "हम समय-समय पर इस गोपनीयता नीति को अपडेट कर सकते हैं। अपडेट की गई नीतियां इस पृष्ठ पर संशोधित प्रभावी तिथि के साथ पोस्ट की जाएंगी।" },
  { t: "10. संपर्क करें", b: "कंपनी का नाम: Bharat333\nईमेल: admin@bharat333.com\nफ़ोन: +91 9158074740\nपता: #508, Tower-B, Citrine Housing Co Society, Marunji, Pune, Pin Code- 411057" },
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
            {isHi ? "गोपनीयता नीति — Bharat333" : "Privacy Policy — Bharat333"}
          </h1>
          <p className="text-sm text-gray-400">{isHi ? "प्रभावी तिथि: 17 मई 2026" : "Effective Date: 17th May 2026"}</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            {isHi
              ? "Bharat333 में आपका स्वागत है। हम आपकी व्यक्तिगत जानकारी की सुरक्षा के लिए प्रतिबद्ध हैं। यह गोपनीयता नीति बताती है कि हम आपकी सेवाओं का उपयोग करते समय आपके डेटा को कैसे एकत्र, उपयोग और सुरक्षित करते हैं।"
              : "Welcome to Bharat333. We value your trust and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our services."}
          </p>
        </div>

        {sections.map(({ t, b }) => (
          <section key={t} className="space-y-2">
            <h2 className="font-bold text-gray-900">{t}</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{b}</p>
          </section>
        ))}

        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
          {isHi
            ? "हमारी सेवाओं का उपयोग करके, आप इस गोपनीयता नीति की शर्तों से सहमत हैं।"
            : "By using our services, you agree to the terms of this Privacy Policy."}
        </div>

        <div className="pt-6 border-t border-gray-100 flex gap-4 text-xs text-gray-400">
          <Link href="/legal/terms" className="hover:text-brand-primary">{isHi ? "सेवा की शर्तें" : "Terms of Service"}</Link>
          <Link href="/legal/refund" className="hover:text-brand-primary">{isHi ? "रिफंड नीति" : "Refund Policy"}</Link>
          <Link href="/contact" className="hover:text-brand-primary">{isHi ? "संपर्क करें" : "Contact Us"}</Link>
        </div>
      </div>
    </main>
  );
}
