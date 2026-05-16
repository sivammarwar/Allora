"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { PublicPageHeader } from "@/components/shared/PublicPageHeader";

const EN_S = [
  { t: "1. Pre-dispatch cancellations",  b: "If you cancel before the Hero is dispatched, you receive a full refund within 5–7 business days to your original payment method." },
  { t: "2. Post-dispatch cancellations", b: "If you cancel after the Hero is en route or has arrived, a 20% cancellation fee may be deducted. The remainder is refunded within 5–7 business days." },
  { t: "3. Service not delivered",       b: "If a Hero fails to deliver through no fault of yours, you are entitled to a full refund. Raise a dispute within 24 hours at support@bharat333.com with your booking ID." },
  { t: "4. Service quality disputes",    b: "If you are dissatisfied with a completed service, contact us within 48 hours. We will investigate and may offer a partial or full refund, or arrange a re-service." },
  { t: "5. Cash payments",               b: "Cash refunds are settled directly with the Hero and facilitated by your Bharat Services Regional Officer. Contact support@bharat333.com to initiate." },
  { t: "6. Non-refundable situations",   b: "No refund if: (a) the service was completed as described; (b) cancellation was after completion; (c) the issue arose from incorrect information you provided." },
  { t: "7. Refund timeline",             b: "Online refunds are processed within 2 business days of approval. Credit to your account typically takes 3–5 additional business days depending on your bank." },
  { t: "8. Contact",                     b: "Refund inquiries: support@bharat333.com — include your booking ID and a brief description." },
];

const HI_S = [
  { t: "1. डिस्पैच से पहले रद्दीकरण",    b: "हीरो के रवाना होने से पहले रद्द करने पर आपको 5–7 कार्य दिवसों में मूल भुगतान विधि पर पूर्ण रिफंड मिलेगा।" },
  { t: "2. डिस्पैच के बाद रद्दीकरण",     b: "हीरो के रास्ते में या पहुंचने के बाद रद्द करने पर 20% रद्दीकरण शुल्क काटा जा सकता है। शेष राशि 5–7 कार्य दिवसों में वापस की जाएगी।" },
  { t: "3. सेवा न मिलने पर",              b: "यदि हीरो आपकी गलती के बिना सेवा देने में विफल रहता है, तो आप पूर्ण रिफंड के हकदार हैं। 24 घंटे में support@bharat333.com पर बुकिंग ID के साथ विवाद दर्ज करें।" },
  { t: "4. सेवा गुणवत्ता विवाद",          b: "यदि आप पूरी हुई सेवा से असंतुष्ट हैं, 48 घंटे के भीतर संपर्क करें। हम जांच कर आंशिक/पूर्ण रिफंड या पुनः सेवा की व्यवस्था करेंगे।" },
  { t: "5. नकद भुगतान",                   b: "नकद रिफंड हीरो के साथ सीधे और आपके Bharat Services रीजनल ऑफिसर की सहायता से होता है। शुरू करने के लिए support@bharat333.com पर संपर्क करें।" },
  { t: "6. गैर-वापसी योग्य स्थितियां",   b: "रिफंड नहीं होगा यदि: (क) सेवा पूरी हो गई थी; (ख) रद्दीकरण सेवा पूर्ण होने के बाद था; (ग) समस्या आपकी गलत जानकारी से उत्पन्न हुई।" },
  { t: "7. रिफंड समयसीमा",                b: "ऑनलाइन रिफंड स्वीकृति के 2 कार्य दिवसों में प्रोसेस होता है। आपके बैंक के आधार पर खाते में 3–5 अतिरिक्त कार्य दिवस लग सकते हैं।" },
  { t: "8. संपर्क",                       b: "रिफंड पूछताछ: support@bharat333.com — बुकिंग ID और समस्या का संक्षिप्त विवरण जरूर शामिल करें।" },
];

export default function RefundPage() {
  const { lang } = useLanguage();
  const sections = lang === "hi" ? HI_S : EN_S;
  const isHi = lang === "hi";
  return (
    <main className="min-h-screen bg-white">
      <PublicPageHeader />
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-10">

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {isHi ? "रिफंड नीति" : "Refund Policy"}
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
          <Link href="/legal/terms" className="hover:text-brand-primary">{isHi ? "सेवा की शर्तें" : "Terms of Service"}</Link>
        </div>
      </div>
    </main>
  );
}
