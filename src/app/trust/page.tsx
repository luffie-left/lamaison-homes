import Link from "next/link";

import { SectionHeading } from "@/components/sections/section-heading";
import { trustBadges } from "@/data/mock-data";

export default function TrustPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Why trust La Maison"
        title="Booking confidence, from first enquiry to departure."
        description="Every La Maison stay is professionally managed, carefully selected, and backed by a team that takes its responsibilities to guests and owners seriously."
      />

      <div className="mt-8 max-w-3xl space-y-4 text-sm leading-7 text-stone-600">
        <p>Trust in short-stay accommodation is earned through consistency &mdash; not promises. At La Maison Homes, we&apos;ve structured our model around the things that matter most: property quality, transparent communication, secure payments, and reliable local support.</p>
        <p>Whether you&apos;re a guest booking a stay or an owner considering management, here&apos;s what you can expect from us.</p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        {trustBadges.map((badge) => (
          <span key={badge} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-stone-700">
            {badge}
          </span>
        ))}
      </div>

      <section className="mt-16">
        <h2 className="font-serif text-3xl text-stone-950">For guests</h2>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
            <h3 className="text-lg font-medium text-stone-950">Verified properties</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">Every property in our collection is personally assessed before it goes live. Listings are accurate &mdash; photos reflect the actual space, amenities are confirmed, and presentation standards are maintained between every stay.</p>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
            <h3 className="text-lg font-medium text-stone-950">Secure payments</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">All payments are processed through our secure PayPal-powered gateway. We do not store card details. Booking confirmations are issued in writing with a clear payment record. You&apos;ll always know exactly what you&apos;ve paid and when.</p>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
            <h3 className="text-lg font-medium text-stone-950">Hotel-grade cleanliness</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">Properties are cleaned to a structured standard between every stay. Linen is hotel-grade, bathrooms are fully restocked, and kitchens are left ready. We don&apos;t cut corners on turnover &mdash; it&apos;s one of the most important things we do.</p>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
            <h3 className="text-lg font-medium text-stone-950">Responsive local support</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">Our support team is Melbourne-based and available throughout your stay. If something isn&apos;t right, we respond &mdash; promptly and practically. You won&apos;t be left chasing a reply or waiting for a resolution that never comes.</p>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
            <h3 className="text-lg font-medium text-stone-950">Clear house rules and check-in instructions</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">Access details, house rules, and everything you need to know about your stay are delivered before you arrive. No surprises, no guesswork. If you have a question, ask &mdash; we&apos;re here.</p>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
            <h3 className="text-lg font-medium text-stone-950">Transparent cancellation terms</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">Our cancellation policy is stated clearly at the time of booking &mdash; not buried in fine print. We&apos;re fair and consistent. Full terms are available on our Booking Terms page before you commit.</p>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-serif text-3xl text-stone-950">For owners</h2>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
            <h3 className="text-lg font-medium text-stone-950">Professional management</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">We manage your property the way a good hotel would manage a room &mdash; with structured processes, consistent execution, and accountability at every step. Your asset is in capable hands.</p>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
            <h3 className="text-lg font-medium text-stone-950">Transparent monthly reporting</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">Every month you receive a clear statement: occupancy, revenue, expenses, and notes on anything that required attention. No unexplained charges, no vague summaries. You always know how your property is performing.</p>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
            <h3 className="text-lg font-medium text-stone-950">Guest screening and standards</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">We don&apos;t accept every booking. Guests are screened through platform identity verification and booking history review. We set and enforce clear house rules, and we take property care seriously.</p>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
            <h3 className="text-lg font-medium text-stone-950">Revenue optimisation</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">Pricing is managed dynamically across seasons, events, and demand cycles. We distribute your property across the right channels and prioritise direct bookings where possible to protect your net return.</p>
          </div>
        </div>
      </section>

      <section className="mt-16 rounded-[36px] bg-stone-950 p-8 text-stone-50 sm:p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Ready to proceed</p>
        <h2 className="mt-4 font-serif text-3xl">Book with confidence &mdash; or explore management.</h2>
        <p className="mt-4 max-w-xl text-sm leading-7 text-stone-300">Whether you&apos;re looking for your next Melbourne stay or considering La Maison for your property, we&apos;re happy to answer any questions before you commit.</p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/stays" className="rounded-full bg-stone-50 px-5 py-3 text-sm font-medium text-stone-950">Browse Stays</Link>
          <Link href="/host-with-us" className="rounded-full border border-stone-400/30 px-5 py-3 text-sm font-medium text-stone-50">Host with Us</Link>
        </div>
      </section>
    </div>
  );
}
