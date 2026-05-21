import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-center">
      <p className="text-7xl font-bold text-brand-primary mb-4">404</p>
      <h1 className="text-2xl font-semibold text-brand-text mb-2">Page not found</h1>
      <p className="text-brand-textMuted mb-8">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 rounded-full bg-brand-primary text-white font-medium hover:opacity-90 transition-opacity"
      >
        Go home
      </Link>
    </div>
  );
}
