import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  ShoppingBag,
  Truck,
  ShieldCheck,
  Sparkles,
  Wallet,
  Clock,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Top bar */}
      <header className="border-b border-brand-border bg-brand-bg/80 backdrop-blur sticky top-0 z-20">
        <div className="container flex items-center justify-between py-4">
          <Link href="/" className="font-heading text-xl text-brand-text">
            Allora<span className="text-brand-primary">.</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-sm text-brand-text hover:bg-brand-surface transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm bg-brand-primary text-white hover:bg-brand-secondary transition-colors"
            >
              Get started
              <ArrowRight size={14} />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-16 sm:py-24 page-enter">
        <div className="max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-brand-primary mb-5">
            Local services · delivered in 50 minutes
          </p>
          <h1 className="font-heading text-4xl sm:text-6xl text-brand-text leading-tight">
            Your neighborhood,
            <br />
            <span className="text-brand-primary">on demand.</span>
          </h1>
          <p className="mt-6 text-lg text-brand-textMuted max-w-2xl leading-relaxed">
            Allora connects you to verified local heroes — your barber, tailor,
            chemist, kirana shop, electrician, and more — with a single tap.
            Real shops. Real people. Real fast.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-sm bg-brand-primary text-white hover:bg-brand-secondary transition-colors font-medium"
            >
              Order now
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/hero/login"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-sm border border-brand-border text-brand-text hover:bg-brand-surface transition-colors font-medium"
            >
              <ShoppingBag size={16} />
              Become a hero
            </Link>
            <Link
              href="/delivery/login"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-sm border border-brand-border text-brand-text hover:bg-brand-surface transition-colors font-medium"
            >
              <Truck size={16} />
              Drive with us
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-brand-textMuted">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-brand-primary" />
              Agent-verified shops
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} className="text-brand-primary" />
              50-min delivery
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wallet size={14} className="text-brand-primary" />
              UPI &amp; Cash on delivery
            </span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container py-12 sm:py-20 border-t border-brand-border">
        <div className="max-w-2xl mb-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-brand-primary mb-3">
            How it works
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl text-brand-text">
            Three taps. One delivery.
          </h2>
        </div>
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Step
            n="01"
            icon={<MapPin size={18} />}
            title="Share your location"
            body="We show you only the verified heroes serving your neighborhood, polygon-checked by our agents."
          />
          <Step
            n="02"
            icon={<ShoppingBag size={18} />}
            title="Pick your service"
            body="Order from the kirana, book a haircut, refill a prescription — same cart, multiple heroes."
          />
          <Step
            n="03"
            icon={<Truck size={18} />}
            title="Track in real time"
            body="A delivery partner picks up, brings it home in under an hour. Live ETA, live status."
          />
        </ol>
      </section>

      {/* Roles */}
      <section className="container py-12 sm:py-20 border-t border-brand-border">
        <div className="max-w-2xl mb-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-brand-primary mb-3">
            Built for everyone
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl text-brand-text">
            One platform, every side of the street.
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Role
            title="Customers"
            blurb="Find local services in seconds. Pay UPI or cash. Track every step."
            href="/login"
          />
          <Role
            title="Heroes"
            blurb="Run your shop digitally. Set pricing, manage products, accept orders."
            href="/hero/login"
          />
          <Role
            title="Delivery partners"
            blurb="Earn per delivery. Live job feed. Transparent payout from the Payment Manager."
            href="/delivery/login"
          />
          <Role
            title="Operators"
            blurb="Admins, agents and product managers — verify, curate, and grow your area."
            href="/login"
          />
        </div>
      </section>

      {/* Trust strip */}
      <section className="container py-12 sm:py-16 border-t border-brand-border">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Trust
            icon={<ShieldCheck size={18} />}
            title="Verified, not just listed"
            body="Every hero is visited and polygon-mapped by a Allora agent before going live."
          />
          <Trust
            icon={<Sparkles size={18} />}
            title="Hyperlocal, by design"
            body="Listings are filtered by your live location and each hero's service polygon — no fluff, no fakes."
          />
          <Trust
            icon={<Wallet size={18} />}
            title="Honest payouts"
            body="90% goes to the hero. Daily reconciliation by a dedicated Payment Manager."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 sm:py-24 border-t border-brand-border">
        <div className="max-w-2xl">
          <h2 className="font-heading text-3xl sm:text-5xl text-brand-text leading-tight">
            Ready to meet your <span className="text-brand-primary">heroes</span>?
          </h2>
          <p className="mt-4 text-brand-textMuted">
            Sign in with your email — we'll send a one-time code. No passwords,
            no friction.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-sm bg-brand-primary text-white hover:bg-brand-secondary transition-colors font-medium"
          >
            Continue with email
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-brand-border">
        <div className="container py-8 flex flex-wrap items-center justify-between gap-3 text-sm text-brand-textMuted">
          <p>© {new Date().getFullYear()} Allora. Local, delivered.</p>
          <p className="font-mono text-[11px] uppercase tracking-widest">
            Made for India
          </p>
        </div>
      </footer>
    </main>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="card-surface p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[11px] uppercase tracking-widest text-brand-primary">
          {n}
        </span>
        <span className="text-brand-primary">{icon}</span>
      </div>
      <h3 className="font-heading text-lg text-brand-text mb-1.5">{title}</h3>
      <p className="text-sm text-brand-textMuted leading-relaxed">{body}</p>
    </li>
  );
}

function Role({
  title,
  blurb,
  href,
}: {
  title: string;
  blurb: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="card-surface p-5 hover:shadow-soft-lg transition-shadow group"
    >
      <h3 className="font-heading text-lg text-brand-text mb-1.5 flex items-center justify-between">
        {title}
        <ArrowRight
          size={14}
          className="text-brand-textMuted group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all"
        />
      </h3>
      <p className="text-sm text-brand-textMuted leading-relaxed">{blurb}</p>
    </Link>
  );
}

function Trust({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="text-brand-primary mb-2">{icon}</div>
      <p className="font-medium text-brand-text mb-1">{title}</p>
      <p className="text-sm text-brand-textMuted leading-relaxed">{body}</p>
    </div>
  );
}
