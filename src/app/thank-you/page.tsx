import Link from "next/link";

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Thank you</p>
      <h1 className="mt-4 font-serif text-5xl text-stone-950">We’ve received your {type || "request"}.</h1>
      <p className="mt-5 text-lg leading-8 text-stone-600">A polished conversion success state is in place and ready to connect to real workflows, notifications, and CRM handling.</p>
      <Link href="/" className="mt-8 rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-stone-50">
        Return Home
      </Link>
    </div>
  );
}
