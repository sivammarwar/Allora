import Link from "next/link";

export const metadata = { title: "Refund Policy · Allora" };

export default function RefundPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-14 space-y-10">

        <div className="space-y-2">
          <Link href="/dashboard" className="text-xs text-brand-primary hover:underline">← Back to Allora</Link>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Refund Policy</h1>
          <p className="text-sm text-gray-400">Last updated: May 2026</p>
        </div>

        {[
          {
            title: "1. Pre-dispatch cancellations",
            body: `If you cancel a booking before the Hero has been dispatched, you will receive a full refund of any online payment within 5–7 business days to your original payment method.`,
          },
          {
            title: "2. Post-dispatch cancellations",
            body: `If you cancel after the Hero is en route or has arrived, a cancellation fee equal to 20% of the service charge may be deducted. The remaining amount will be refunded within 5–7 business days.`,
          },
          {
            title: "3. Service not delivered",
            body: `If a Hero fails to deliver the booked service through no fault of yours, you are entitled to a full refund. Please raise a dispute within 24 hours of the scheduled service time by emailing hello@allora.app with your booking ID.`,
          },
          {
            title: "4. Service quality disputes",
            body: `If you are dissatisfied with the quality of a completed service, contact us within 48 hours. We will investigate and, at our discretion, offer a partial or full refund, or arrange a re-service at no additional charge.`,
          },
          {
            title: "5. Cash payments",
            body: `Refunds for cash payments are settled directly with the Hero and facilitated by your Allora Regional Officer. Contact hello@allora.app to initiate.`,
          },
          {
            title: "6. Non-refundable situations",
            body: `Refunds will not be issued if: (a) the service was completed as described; (b) the cancellation was made after service completion; (c) the issue arose from information you provided incorrectly at the time of booking.`,
          },
          {
            title: "7. Refund timeline",
            body: `Online refunds are processed within 2 business days of approval by our team. Credit to your account depends on your bank and typically takes 3–5 additional business days.`,
          },
          {
            title: "8. Contact",
            body: `Refund inquiries: hello@allora.app. Please include your booking ID and a brief description of the issue.`,
          },
        ].map(({ title, body }) => (
          <section key={title} className="space-y-2">
            <h2 className="font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
          </section>
        ))}

        <div className="pt-6 border-t border-gray-100 flex gap-4 text-xs text-gray-400">
          <Link href="/legal/privacy" className="hover:text-brand-primary">Privacy Policy</Link>
          <Link href="/legal/terms" className="hover:text-brand-primary">Terms of Service</Link>
        </div>
      </div>
    </main>
  );
}
