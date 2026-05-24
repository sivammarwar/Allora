"use client";

import { useState } from "react";
import { Phone, Mail, MapPin, Clock, Wrench, MessageSquare, Star, CheckCircle, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { PublicPageHeader } from "@/components/shared/PublicPageHeader";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function ContactPage() {
  const { lang } = useLanguage();
  const isHi = lang === "hi";
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "web" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to submit");
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <PublicPageHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-primary/6 to-white border-b border-gray-100 py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            {isHi ? "संपर्क करें — Bharat333" : "Contact Us — Bharat333"}
          </h1>
          <p className="text-gray-500 text-base leading-relaxed">
            {isHi
              ? "हम आपकी मदद के लिए यहां हैं! चाहे आपका कोई सवाल हो, सहायता चाहिए हो, या सेवा बुक करनी हो — बेझिझक संपर्क करें।"
              : "We're here to help you! Whether you have a question, need support, or want to book a service, feel free to reach out to us."}
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">

        {/* Get in Touch */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6 space-y-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center mx-auto">
              <Phone size={20} className="text-brand-primary" />
            </div>
            <h3 className="font-bold text-gray-900">{isHi ? "फ़ोन" : "Phone"}</h3>
            <a href="tel:+919158074740" className="text-sm text-brand-primary font-semibold hover:underline">+91 9158074740</a>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6 space-y-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center mx-auto">
              <Mail size={20} className="text-brand-primary" />
            </div>
            <h3 className="font-bold text-gray-900">{isHi ? "ईमेल" : "Email"}</h3>
            <a href="mailto:admin@bharat333.com" className="text-sm text-brand-primary font-semibold hover:underline">admin@bharat333.com</a>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6 space-y-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center mx-auto">
              <MapPin size={20} className="text-brand-primary" />
            </div>
            <h3 className="font-bold text-gray-900">{isHi ? "पता" : "Address"}</h3>
            <p className="text-sm text-gray-600">#508, Tower-B, Citrine Housing Co Society, Marunji, Pune, 411057</p>
          </div>
        </section>

        {/* Working Hours */}
        <section className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6">
          <div className="flex items-center gap-3 mb-3">
            <Clock size={18} className="text-brand-primary" />
            <h2 className="text-lg font-extrabold text-gray-900">{isHi ? "कार्य समय" : "Working Hours"}</h2>
          </div>
          <p className="text-sm text-gray-600">
            {isHi ? "सोमवार – शनिवार: सुबह 9:00 बजे – शाम 7:00 बजे" : "Monday – Saturday: 9:00 AM – 7:00 PM"}
          </p>
        </section>

        {/* Customer Support */}
        <section className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6">
          <div className="flex items-center gap-3 mb-3">
            <Wrench size={18} className="text-brand-primary" />
            <h2 className="text-lg font-extrabold text-gray-900">{isHi ? "ग्राहक सहायता" : "Customer Support"}</h2>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            {isHi ? "सेवा से संबंधित किसी भी प्रश्न के लिए:" : "For any service-related queries like:"}
          </p>
          <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
            <li>{isHi ? "बुकिंग समस्याएं" : "Booking issues"}</li>
            <li>{isHi ? "सेवा में देरी" : "Service delays"}</li>
            <li>{isHi ? "शिकायत या फीडबैक" : "Complaints or feedback"}</li>
          </ul>
          <p className="text-sm text-gray-600 mt-3">
            {isHi
              ? "कृपया हमें कॉल करें या ईमेल करें, और हमारी टीम जल्द से जल्द आपकी सहायता करेगी।"
              : "Please call us or email us, and our team will assist you as soon as possible."}
          </p>
        </section>

        {/* Contact Form */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare size={18} className="text-brand-primary" />
            <h2 className="text-lg font-extrabold text-gray-900">{isHi ? "हमें संदेश भेजें" : "Send Us a Message"}</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            {isHi
              ? "नीचे दिया गया फ़ॉर्म भरें, और हम जल्द ही आपसे संपर्क करेंगे:"
              : "You can also fill out the form below, and we'll get back to you shortly:"}
          </p>

          {submitted ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center space-y-3">
              <CheckCircle size={36} className="mx-auto text-green-500" />
              <p className="font-bold text-gray-900">{isHi ? "संदेश भेजा गया!" : "Message Sent!"}</p>
              <p className="text-sm text-gray-600">
                {isHi ? "हम जल्द ही आपसे संपर्क करेंगे।" : "We'll get back to you shortly."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                required
                type="text"
                placeholder={isHi ? "पूरा नाम" : "Full Name"}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-12 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
              <input
                required
                type="tel"
                placeholder={isHi ? "फ़ोन नंबर" : "Phone Number"}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full h-12 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
              <input
                required
                type="email"
                placeholder={isHi ? "ईमेल पता" : "Email Address"}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full h-12 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
              <input
                type="text"
                placeholder={isHi ? "सेवा का पता" : "Service Address"}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full h-12 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
              <textarea
                required
                rows={4}
                placeholder={isHi ? "संदेश / प्रश्न" : "Message / Query"}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none"
              />
              {error && (
                <p className="text-sm text-red-500 font-medium">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="h-12 px-8 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {isHi ? "सबमिट करें" : "Submit"}
              </button>
            </form>
          )}
        </section>

        {/* Quick Response Promise */}
        <section className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6">
          <h2 className="text-lg font-extrabold text-gray-900 mb-3">{isHi ? "त्वरित प्रतिक्रिया का वादा" : "Quick Response Promise"}</h2>
          <p className="text-sm text-gray-600">
            {isHi ? "हम सभी प्रश्नों का उत्तर देने का लक्ष्य रखते हैं:" : "We aim to respond to all queries within:"}
          </p>
          <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4 list-disc">
            <li>{isHi ? "2-4 घंटे (कार्य समय के दौरान)" : "2–4 hours (during working hours)"}</li>
            <li>{isHi ? "24 घंटे के भीतर (अधिकतम)" : "Within 24 hours (maximum)"}</li>
          </ul>
        </section>

        {/* Why Contact */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: Star, en: "Fast and reliable service", hi: "तेज़ और विश्वसनीय सेवा" },
            { icon: CheckCircle, en: "Professional \"Heroes\" at your doorstep", hi: "आपके दरवाजे पर पेशेवर \"हीरो\"" },
            { icon: MessageSquare, en: "Dedicated customer support", hi: "समर्पित ग्राहक सहायता" },
          ].map(({ icon: Icon, en, hi }) => (
            <div key={en} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5 space-y-2 text-center">
              <Icon size={20} className="mx-auto text-brand-primary" />
              <p className="text-sm font-semibold text-gray-900">{isHi ? hi : en}</p>
            </div>
          ))}
        </section>

        {/* Footer Note */}
        <div className="text-center pt-8 border-t border-gray-100">
          <p className="text-sm text-gray-500 italic">
            {isHi
              ? "\"आपकी संतुष्टि हमारी प्राथमिकता है। Bharat333 को चुनने के लिए धन्यवाद।\""
              : "\"Your satisfaction is our priority. Thank you for choosing Bharat333.\""}
          </p>
        </div>
      </div>
    </main>
  );
}
