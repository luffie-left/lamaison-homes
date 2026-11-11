export default function BookingTermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-500">La Maison Homes</p>
        <h1 className="font-serif text-4xl text-stone-950">Booking Terms &amp; Conditions</h1>
        <p className="text-sm leading-7 text-stone-600">
          These Booking Terms and Conditions govern all bookings made through the La Maison Homes website (<strong>lamaisonhomes.com.au</strong>) and any direct booking channel. By submitting a booking enquiry or completing a payment, you agree to be bound by these terms.
        </p>
        <p className="text-sm text-stone-500">Last updated: November 2026</p>
      </div>

      <div className="mt-12 space-y-10 text-sm leading-7 text-stone-600">

        <section>
          <h2 className="font-serif text-2xl text-stone-950">1. Booking confirmation</h2>
          <p className="mt-4">A booking is not confirmed until you have received a written booking confirmation from La Maison Homes. This confirmation will be issued by email following receipt of your deposit or full payment (as applicable).</p>
          <p className="mt-3">Submitting a booking enquiry or receiving an availability response does not constitute a confirmed booking. La Maison Homes reserves the right to decline any booking request at its discretion.</p>
          <p className="mt-3">Your booking confirmation will include the property name, stay dates, total price, check-in instructions summary, and a reference number. Please retain this for your records.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-stone-950">2. Payment terms</h2>
          <p className="mt-4">Stays of 28 nights or fewer are charged in full at the time of booking.</p>
          <p className="mt-3">Stays longer than 28 nights are charged in rolling 28-night blocks: the first 28 nights are charged in full at the time of booking, and each subsequent block of nights is charged no later than 14 days before the end of the prior block. For example, on a 40-night stay, nights 1&ndash;28 are charged at booking and nights 29&ndash;40 are due no later than 14 days before the end of night 28; on a 70-night stay, nights 29&ndash;56 are likewise due no later than 14 days before the end of night 28, and nights 57&ndash;70 no later than 14 days before the end of night 56.</p>
          <p className="mt-3">If a block payment is not received by its due date, La Maison Homes reserves the right to cancel the remaining nights of the booking and apply the cancellation policy in section 3 to the affected nights.</p>
          <p className="mt-3">All amounts are quoted and charged in Australian Dollars (AUD) inclusive of any applicable taxes and fees. Payments are processed through our secure PayPal-powered gateway.</p>
          <p className="mt-3">Please note: bookings made through this website are limited to stays of up to 28 nights. Longer stays are arranged through our team with a tailored rate and payment schedule &mdash; <a href="/contact" className="underline">contact us</a> to discuss an extended stay.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-stone-950">3. Cancellation policy</h2>
          <p className="mt-4">Cancellations must be submitted in writing to La Maison Homes by email at <a href="mailto:stay@lamaisonhomes.com.au" className="underline">stay@lamaisonhomes.com.au</a>. Your cancellation takes effect at the time we receive it.</p>
          <h3 className="mt-6 font-serif text-xl text-stone-900">3.1 How cancellation timing is measured</h3>
          <p className="mt-3">All cancellation periods are measured in Melbourne, Australia local time (AEDT/AEST as applicable), from 12:00 am (midnight, start of day) of your scheduled check-in date, to the moment we receive your cancellation notice.</p>
          <h3 className="mt-6 font-serif text-xl text-stone-900">3.2 Refund schedule</h3>
          <ul className="mt-4 space-y-3 list-disc list-outside pl-5">
            <li><strong className="text-stone-800">30 days or more before check-in:</strong> 100% refund of all amounts paid.</li>
            <li><strong className="text-stone-800">14 to 29 days before check-in:</strong> 50% refund of all amounts paid. The remaining 50% is forfeited.</li>
            <li><strong className="text-stone-800">Fewer than 14 days before check-in:</strong> No refund. The full booking value is forfeited.</li>
          </ul>
          <h3 className="mt-6 font-serif text-xl text-stone-900">3.3 What is refunded</h3>
          <p className="mt-3">Your refund is calculated on the total you paid through our website. The <strong className="text-stone-800">cleaning fee is refunded in full (100%) whenever any refund of accommodation is payable, including no-shows</strong> &mdash; it is charged only for stays that actually commence. Where a 50% accommodation refund applies, 50% of the accommodation charge and 100% of the cleaning fee is refunded.</p>
          <h3 className="mt-6 font-serif text-xl text-stone-900">3.4 Refund method and timeline</h3>
          <p className="mt-3">Refunds are issued to your <strong className="text-stone-800">original PayPal payment method only</strong>. We will initiate your refund within 5 business days of your cancellation taking effect; PayPal typically posts refunds to your account within a further 3 to 5 business days. PayPal&apos;s processing times are outside our control.</p>
          <h3 className="mt-6 font-serif text-xl text-stone-900">3.5 Processing fees</h3>
          <p className="mt-3">Where PayPal does not return its transaction processing fee to us on a refund, we absorb that cost &mdash; it is not deducted from your refund amount.</p>
          <h3 className="mt-6 font-serif text-xl text-stone-900">3.6 No-shows</h3>
          <p className="mt-3">If you do not arrive on your check-in date and have not contacted us to cancel or amend, the booking is treated as a cancellation with fewer than 14 days&apos; notice &mdash; no refund is payable.</p>
          <h3 className="mt-6 font-serif text-xl text-stone-900">3.7 Early departures</h3>
          <p className="mt-3">Unused nights after an early departure are non-refundable. Where the property&apos;s availability allows, we will gladly assist with re-booking or date changes &mdash; contact us as early as possible.</p>
          <h3 className="mt-6 font-serif text-xl text-stone-900">3.8 Cancellation by us</h3>
          <p className="mt-3">If we must cancel your booking for reasons within our control, you will receive a full 100% refund of all amounts paid, regardless of the notice period.</p>
          <p className="mt-4">We strongly recommend that guests take out travel insurance that includes coverage for accommodation cancellation.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-stone-950">4. Modifications</h2>
          <p className="mt-4">Requests to modify a confirmed booking &mdash; including changes to dates, property, or number of guests &mdash; must be submitted in writing and are subject to availability.</p>
          <p className="mt-3">Date extensions will be charged at the nightly rate applicable to the new dates and processed as a separate payment. Date reductions may be eligible for a partial refund subject to the cancellation policy above, applied from the date the modification is requested.</p>
          <p className="mt-3">Modifications requested less than 48 hours before check-in cannot be guaranteed and are at La Maison Homes&apos; discretion.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-stone-950">5. Check-in and check-out</h2>
          <p className="mt-4">Standard check-in is from <strong className="text-stone-800">3:00 pm</strong> on the arrival date. Standard check-out is by <strong className="text-stone-800">10:00 am</strong> on the departure date. Property-specific times may apply and will be stated in your booking confirmation.</p>
          <p className="mt-3">Early check-in and late check-out are subject to availability and must be requested in advance. Additional charges may apply.</p>
          <p className="mt-3">Failure to check out by the required time may result in an additional night&apos;s fee being charged.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-stone-950">6. Guest responsibilities</h2>
          <p className="mt-4">The lead guest named on the booking is responsible for the conduct of all guests and visitors during the stay. By completing a booking, the lead guest agrees to the La Maison Homes House Rules, which are incorporated into these terms by reference.</p>
          <p className="mt-3">Guests must not use the property in any way that breaches applicable laws, by-laws, or building regulations.</p>
          <p className="mt-3">La Maison Homes reserves the right to terminate a booking without refund where guests breach these terms or the house rules. In this event, guests must vacate the property immediately.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-stone-950">7. Security deposit</h2>
          <p className="mt-4">Unless otherwise specified on the property listing, a refundable security deposit is taken at or around the time of booking, separately from your booking payment. The deposit amount applicable to your property is shown on the listing page and in your booking confirmation.</p>
          <p className="mt-3">Where your payment method supports it, the deposit is taken as a temporary authorisation hold on your card via PayPal; otherwise it is charged to your PayPal account and refunded in full after check-out. In either case, no part of the deposit is retained unless required under this section.</p>
          <p className="mt-3">The deposit is refunded in full within 5 business days of check-out, subject to a satisfactory inspection of the property. Any amounts deducted for damage, additional cleaning, or breach of house rules will be itemised and notified to the guest.</p>
          <p className="mt-3">Where damage costs exceed the security deposit, La Maison Homes reserves the right to pursue the additional amount.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-stone-950">7A. Owners-corporation and building rules</h2>
          <p className="mt-4">Guests must comply with all owners-corporation by-laws, building rules, and regulations applicable to the property during their stay, including those relating to noise, common areas, waste disposal, parking, and access. Where a property is subject to particular building rules (for example, registration of guests at reception or restrictions on balcony use), these will be advised at the time of booking or before check-in.</p>
          <p className="mt-3">Breach of building rules that results in fines, notices, or remediation costs being issued against the property or its owner may be charged to the guest. This clause supplements, and does not replace, the House Rules incorporated under section 6.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-stone-950">8. Force majeure</h2>
          <p className="mt-4">La Maison Homes will not be liable for any failure to perform its obligations under a booking where such failure is caused by circumstances beyond its reasonable control, including but not limited to natural disasters, acts of government, pandemic-related restrictions, or building-level emergencies.</p>
          <p className="mt-3">In such circumstances, La Maison Homes will endeavour to offer an alternative property or date where possible. Where no suitable alternative is available, a refund of amounts paid may be offered at La Maison Homes&apos; discretion.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-stone-950">9. Liability</h2>
          <p className="mt-4">La Maison Homes takes reasonable care to ensure properties are safe and well-maintained. However, to the extent permitted by law, La Maison Homes does not accept liability for personal injury, property loss, or consequential loss arising from your stay, including incidents caused by third parties or factors outside our control.</p>
          <p className="mt-3">Nothing in these terms limits any rights you may have under the Australian Consumer Law.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-stone-950">10. Governing law</h2>
          <p className="mt-4">These terms are governed by the laws of Victoria, Australia. Any disputes arising from a booking will be subject to the exclusive jurisdiction of the courts of Victoria.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-stone-950">11. Contact</h2>
          <p className="mt-4">For questions about these terms or your booking, please contact us at <a href="mailto:stay@lamaisonhomes.com.au" className="underline">stay@lamaisonhomes.com.au</a>.</p>
        </section>

      </div>
    </div>
  );
}
