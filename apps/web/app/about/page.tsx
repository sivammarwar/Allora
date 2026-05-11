import Link from "next/link";
import { MapPin, Shield, Star, Users, Zap, Heart, Mail } from "lucide-react";

export const metadata = { title: "About Allora" };

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-primary/6 to-white border-b border-gray-100 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 bg-brand-primary/10 text-brand-primary text-xs font-semibold px-3 py-1.5 rounded-full">
            <MapPin size={12} /> Local services · on demand
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Your neighborhood,<br />on demand.
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
            Allora connects you to verified local heroes — your barber, tailor, chemist, kirana shop,
            electrician, and more — with a single tap. Real shops. Real people. Real fast.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors">
              <Zap size={14} /> Browse Services
            </Link>
            <Link href="/hero/register" className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:border-brand-primary/40 transition-colors">
              Become a Hero
            </Link>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-2">What we stand for</p>
            <h2 className="text-3xl font-extrabold text-gray-900">Built for everyone</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: Users,  title: "Customers",  desc: "Find local services in seconds. Pay UPI or cash. Track every step." },
              { icon: Star,   title: "Heroes",     desc: "Run your shop digitally. Set pricing, manage products, accept orders." },
              { icon: Shield, title: "Operators",  desc: "Admins, agents and product managers — verify, curate, and grow your area." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                  <Icon size={18} className="text-brand-primary" />
                </div>
                <h3 className="font-bold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-16 px-4 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-2">Our promise</p>
            <h2 className="text-3xl font-extrabold text-gray-900">Verified, not just listed</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { title: "Verified, not just listed",   desc: "Every hero is physically visited and verified by an Allora agent before going live." },
              { title: "Hyperlocal, by design",       desc: "Listings are filtered by your live location — only heroes who genuinely cover your area appear." },
              { title: "Honest payouts",              desc: "90% goes to the hero. Daily reconciliation by a dedicated Payment Manager." },
            ].map(({ title, desc }) => (
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
          <h2 className="text-2xl font-extrabold text-gray-900">Get in touch</h2>
          <p className="text-sm text-gray-500">Questions, partnerships or press inquiries — reach us at:</p>
          <a href="mailto:hello@allora.app" className="text-brand-primary font-semibold text-base hover:underline">
            hello@allora.app
          </a>
          <div className="flex justify-center gap-3 pt-2">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-primary transition-colors">
              <Heart size={13} /> Back to services
            </Link>
          </div>
        </div>
      </section>

      {/* Footer bottom */}
      <div className="border-t border-gray-100 py-5 px-4 text-center">
        <p className="text-xs text-gray-400">© 2026 Allora. Local, on demand. &nbsp;·&nbsp; Made for India 🇮🇳</p>
      </div>

    </main>
  );
}
