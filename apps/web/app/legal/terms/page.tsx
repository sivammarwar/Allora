import Link from "next/link";

export const metadata = { title: "Terms of Service · Allora" };

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-14 space-y-10">

        <div className="space-y-2">
          <Link href="/dashboard" className="text-xs text-brand-primary hover:underline">← Back to Allora</Link>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Terms of Service</h1>
          <p className="text-sm text-gray-400">Last updated: May 2026</p>
        </div>

        {[
          {
            title: "1. Acceptance",
            body: `By accessing or using Allora you agree to be bound by these Terms. If you do not agree, do not use the platform. These Terms apply to all users — Customers, Heroes, Agents, and Operators.`,
          },
          {
            title: "2. The platform",
            body: `Allora is a marketplace that connects customers with local service providers ("Heroes"). Allora is not itself a service provider. The contract for any service is between the Customer and the Hero. Allora facilitates discovery, booking, and payment.`,
          },
          {
            title: "3. Accounts",
            body: `You must provide a valid email address to create an account. You are responsible for all activity under your account. Accounts are non-transferable. We reserve the right to suspend or terminate accounts for violation of these Terms.`,
          },
          {
            title: "4. Hero verification",
            body: `Heroes are verified by Allora Regional Officers through an in-person visit. Verification confirms existence and service capability but does not constitute an endorsement or guarantee of service quality. Customers should exercise their own judgment.`,
          },
          {
            title: "5. Payments",
            body: `Service charges are displayed before booking confirmation. Payments are processed by Razorpay or PhonePe. Cash payments are settled directly with the Hero. Allora's platform fee is deducted before Hero payouts; Heroes receive 90% of the service charge.`,
          },
          {
            title: "6. Cancellations",
            body: `Cancellations made before a Hero is dispatched are free. Cancellations after dispatch may attract a cancellation fee at the Hero's discretion. See our Refund Policy for details.`,
          },
          {
            title: "7. Prohibited conduct",
            body: `You may not: (a) misuse the platform for fraudulent bookings; (b) harass, threaten, or abuse Heroes or Allora staff; (c) reverse-engineer or scrape the platform; (d) create fake reviews or ratings.`,
          },
          {
            title: "8. Limitation of liability",
            body: `To the maximum extent permitted by law, Allora's liability for any claim arising out of use of the platform is limited to the amount you paid for the relevant transaction. We are not liable for Hero conduct, service quality, or delivery delays.`,
          },
          {
            title: "9. Governing law",
            body: `These Terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of courts in Bangalore, Karnataka.`,
          },
          {
            title: "10. Contact",
            body: `Legal inquiries: hello@allora.app`,
          },
        ].map(({ title, body }) => (
          <section key={title} className="space-y-2">
            <h2 className="font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
          </section>
        ))}

        <div className="pt-6 border-t border-gray-100 flex gap-4 text-xs text-gray-400">
          <Link href="/legal/privacy" className="hover:text-brand-primary">Privacy Policy</Link>
          <Link href="/legal/refund" className="hover:text-brand-primary">Refund Policy</Link>
        </div>
      </div>
    </main>
  );
}
