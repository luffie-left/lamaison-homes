/**
 * Email sending via Resend
 * FROM: onboarding@resend.dev (temporary until lamaisonhomes.com.au verified in Resend)
 * TODO: Change EMAIL_FROM env var to "bookings@lamaisonhomes.com.au" after domain verification
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'La Maison Homes <onboarding@resend.dev>'
const STAFF_EMAIL = process.env.STAFF_EMAIL ?? 'luffie.left@gmail.com'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lamaison-homes.vercel.app'

export { STAFF_EMAIL, SITE_URL }

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-AU', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch { return iso }
}

function formatCurrency(n: number | null | undefined): string {
  if (!n) return '—'
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) { console.warn('[email] No RESEND_API_KEY'); return false }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
    })
    if (!res.ok) { console.error('[email] Resend error:', await res.text()); return false }
    return true
  } catch (err) { console.error('[email] Send failed:', err); return false }
}

export async function sendEnquiryConfirmation(opts: {
  guestEmail: string
  guestName: string
  propertyName: string
  reference: string
  checkIn: string | null
  checkOut: string | null
  nights: number | null
  guests: number | null
  total: number | null
  portalToken: string
}): Promise<boolean> {
  const firstName = opts.guestName.split(' ')[0]
  const portalUrl = `${SITE_URL}/portal?token=${opts.portalToken}`

  const html = `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f7f2eb;font-family:Georgia,serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:#1a1a1a;padding:24px 32px;border-radius:12px 12px 0 0;">
    <p style="color:#c9a96e;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 4px;">La Maison Homes</p>
    <p style="color:#fff;font-size:20px;margin:0;font-weight:normal;">Enquiry received</p>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e8e0d6;border-top:none;">
    <p style="color:#1a1a1a;font-size:16px;margin:0 0 24px;">Hi ${firstName},</p>
    <p style="color:#5a5a5a;line-height:1.7;margin:0 0 24px;">Thank you for your enquiry. We've received your request and will confirm your booking within <strong>2 hours</strong>.</p>
    
    <div style="background:#f7f2eb;border-radius:8px;padding:20px;margin:0 0 24px;">
      <p style="color:#888;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;">Booking Details</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#888;font-size:14px;width:40%;">Reference</td><td style="padding:6px 0;color:#1a1a1a;font-size:14px;font-family:monospace;font-weight:bold;">${opts.reference}</td></tr>
        <tr><td style="padding:6px 0;color:#888;font-size:14px;">Property</td><td style="padding:6px 0;color:#1a1a1a;font-size:14px;">${opts.propertyName}</td></tr>
        <tr><td style="padding:6px 0;color:#888;font-size:14px;">Check-in</td><td style="padding:6px 0;color:#1a1a1a;font-size:14px;">${formatDate(opts.checkIn)}</td></tr>
        <tr><td style="padding:6px 0;color:#888;font-size:14px;">Check-out</td><td style="padding:6px 0;color:#1a1a1a;font-size:14px;">${formatDate(opts.checkOut)}</td></tr>
        ${opts.nights ? `<tr><td style="padding:6px 0;color:#888;font-size:14px;">Nights</td><td style="padding:6px 0;color:#1a1a1a;font-size:14px;">${opts.nights}</td></tr>` : ''}
        ${opts.guests ? `<tr><td style="padding:6px 0;color:#888;font-size:14px;">Guests</td><td style="padding:6px 0;color:#1a1a1a;font-size:14px;">${opts.guests}</td></tr>` : ''}
        ${opts.total ? `<tr><td style="padding:6px 0;color:#888;font-size:14px;">Total</td><td style="padding:6px 0;color:#1a1a1a;font-size:14px;font-weight:bold;">${formatCurrency(opts.total)}</td></tr>` : ''}
      </table>
    </div>

    <div style="margin:0 0 24px;">
      <p style="color:#888;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">What Happens Next</p>
      <p style="color:#5a5a5a;font-size:14px;line-height:1.7;margin:0 0 8px;">1. Our team will review your dates and confirm availability</p>
      <p style="color:#5a5a5a;font-size:14px;line-height:1.7;margin:0 0 8px;">2. You'll receive a confirmation email with payment details</p>
      <p style="color:#5a5a5a;font-size:14px;line-height:1.7;margin:0;">3. Full check-in information sent 48 hours before arrival</p>
    </div>

    <a href="${portalUrl}" style="display:block;background:#1a1a1a;color:#fff;text-align:center;padding:14px 24px;border-radius:50px;text-decoration:none;font-size:14px;margin:0 0 24px;">View your booking →</a>

    <p style="color:#aaa;font-size:13px;line-height:1.6;margin:0;">Questions? Reply to this email or contact us at <a href="mailto:hello@lamaisonhomes.com.au" style="color:#c9a96e;">hello@lamaisonhomes.com.au</a></p>
  </div>
  <p style="color:#aaa;font-size:11px;text-align:center;margin:16px 0 0;">La Maison Homes · Premium short-stay management · Melbourne</p>
</div>
</body></html>`

  return sendEmail(opts.guestEmail, `Enquiry received — ${opts.propertyName} · Ref: ${opts.reference}`, html)
}

export async function sendStaffNotification(opts: {
  guestName: string
  guestEmail: string
  guestPhone: string | null
  propertyName: string
  reference: string
  checkIn: string | null
  checkOut: string | null
  nights: number | null
  guests: number | null
  total: number | null
  message: string | null
}): Promise<boolean> {
  const html = `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 20px;">
  <div style="background:#fff;border-radius:8px;border:1px solid #e0e0e0;overflow:hidden;">
    <div style="background:#6366f1;padding:16px 24px;">
      <p style="color:#fff;font-size:16px;font-weight:bold;margin:0;">🏠 New Booking Enquiry</p>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:10px 0;color:#666;font-size:13px;width:35%;">Reference</td><td style="padding:10px 0;color:#1a1a1a;font-size:13px;font-family:monospace;font-weight:bold;">${opts.reference}</td></tr>
        <tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:10px 0;color:#666;font-size:13px;">Guest</td><td style="padding:10px 0;color:#1a1a1a;font-size:13px;">${opts.guestName}</td></tr>
        <tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:10px 0;color:#666;font-size:13px;">Email</td><td style="padding:10px 0;font-size:13px;"><a href="mailto:${opts.guestEmail}" style="color:#6366f1;">${opts.guestEmail}</a></td></tr>
        <tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:10px 0;color:#666;font-size:13px;">Phone</td><td style="padding:10px 0;color:#1a1a1a;font-size:13px;">${opts.guestPhone ?? 'Not provided'}</td></tr>
        <tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:10px 0;color:#666;font-size:13px;">Property</td><td style="padding:10px 0;color:#1a1a1a;font-size:13px;">${opts.propertyName}</td></tr>
        <tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:10px 0;color:#666;font-size:13px;">Check-in</td><td style="padding:10px 0;color:#1a1a1a;font-size:13px;">${formatDate(opts.checkIn)}</td></tr>
        <tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:10px 0;color:#666;font-size:13px;">Check-out</td><td style="padding:10px 0;color:#1a1a1a;font-size:13px;">${formatDate(opts.checkOut)}</td></tr>
        ${opts.nights ? `<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:10px 0;color:#666;font-size:13px;">Nights</td><td style="padding:10px 0;color:#1a1a1a;font-size:13px;">${opts.nights}</td></tr>` : ''}
        ${opts.guests ? `<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:10px 0;color:#666;font-size:13px;">Guests</td><td style="padding:10px 0;color:#1a1a1a;font-size:13px;">${opts.guests}</td></tr>` : ''}
        ${opts.total ? `<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:10px 0;color:#666;font-size:13px;">Total</td><td style="padding:10px 0;color:#1a1a1a;font-size:13px;font-weight:bold;">${formatCurrency(opts.total)}</td></tr>` : ''}
        ${opts.message ? `<tr><td style="padding:10px 0;color:#666;font-size:13px;vertical-align:top;">Message</td><td style="padding:10px 0;color:#1a1a1a;font-size:13px;">${opts.message}</td></tr>` : ''}
      </table>
      <div style="margin-top:20px;">
        <a href="https://la-maison-platform.vercel.app/enquiries" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:bold;">Review in admin panel →</a>
      </div>
    </div>
  </div>
</div>
</body></html>`

  return sendEmail(STAFF_EMAIL, `New enquiry — ${opts.propertyName} · ${opts.guestName} · ${opts.reference}`, html)
}

export async function sendBookingConfirmed(opts: {
  guestEmail: string
  guestName: string
  propertyName: string
  reference: string
  checkIn: string | null
  checkOut: string | null
  nights: number | null
  guests: number | null
  total: number | null
  portalToken: string
}): Promise<boolean> {
  const firstName = opts.guestName.split(' ')[0]
  const portalUrl = `${SITE_URL}/portal?token=${opts.portalToken}`

  const html = `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f7f2eb;font-family:Georgia,serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:#1a1a1a;padding:24px 32px;border-radius:12px 12px 0 0;">
    <p style="color:#c9a96e;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 4px;">La Maison Homes</p>
    <p style="color:#fff;font-size:20px;margin:0;font-weight:normal;">✓ Booking confirmed</p>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e8e0d6;border-top:none;">
    <p style="color:#1a1a1a;font-size:16px;margin:0 0 16px;">Hi ${firstName},</p>
    <p style="color:#5a5a5a;line-height:1.7;margin:0 0 24px;">Great news — your booking at <strong>${opts.propertyName}</strong> is confirmed!</p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:0 0 24px;">
      <p style="color:#166534;font-size:14px;font-weight:bold;margin:0 0 12px;">✓ Confirmed Booking</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:5px 0;color:#166534;font-size:13px;width:40%;">Reference</td><td style="padding:5px 0;color:#14532d;font-size:13px;font-family:monospace;font-weight:bold;">${opts.reference}</td></tr>
        <tr><td style="padding:5px 0;color:#166534;font-size:13px;">Property</td><td style="padding:5px 0;color:#14532d;font-size:13px;">${opts.propertyName}</td></tr>
        <tr><td style="padding:5px 0;color:#166534;font-size:13px;">Check-in</td><td style="padding:5px 0;color:#14532d;font-size:13px;">${formatDate(opts.checkIn)}</td></tr>
        <tr><td style="padding:5px 0;color:#166534;font-size:13px;">Check-out</td><td style="padding:5px 0;color:#14532d;font-size:13px;">${formatDate(opts.checkOut)}</td></tr>
        ${opts.nights ? `<tr><td style="padding:5px 0;color:#166534;font-size:13px;">Nights</td><td style="padding:5px 0;color:#14532d;font-size:13px;">${opts.nights}</td></tr>` : ''}
        ${opts.total ? `<tr><td style="padding:5px 0;color:#166534;font-size:13px;">Total</td><td style="padding:5px 0;color:#14532d;font-size:13px;font-weight:bold;">${formatCurrency(opts.total)}</td></tr>` : ''}
      </table>
    </div>

    <p style="color:#5a5a5a;font-size:14px;line-height:1.7;margin:0 0 24px;">We'll send your detailed check-in instructions, property address, and access code <strong>48 hours before your arrival</strong>.</p>

    <a href="${portalUrl}" style="display:block;background:#1a1a1a;color:#fff;text-align:center;padding:14px 24px;border-radius:50px;text-decoration:none;font-size:14px;margin:0 0 24px;">View booking details →</a>

    <p style="color:#aaa;font-size:13px;">Questions? <a href="mailto:hello@lamaisonhomes.com.au" style="color:#c9a96e;">hello@lamaisonhomes.com.au</a></p>
  </div>
  <p style="color:#aaa;font-size:11px;text-align:center;margin:16px 0 0;">La Maison Homes · Melbourne</p>
</div>
</body></html>`

  return sendEmail(opts.guestEmail, `Booking confirmed — ${opts.propertyName} · Ref: ${opts.reference}`, html)
}

export async function sendBookingDeclined(opts: {
  guestEmail: string
  guestName: string
  propertyName: string
  reference: string
  checkIn: string | null
  checkOut: string | null
}): Promise<boolean> {
  const firstName = opts.guestName.split(' ')[0]
  const html = `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f7f2eb;font-family:Georgia,serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:#1a1a1a;padding:24px 32px;border-radius:12px 12px 0 0;">
    <p style="color:#c9a96e;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 4px;">La Maison Homes</p>
    <p style="color:#fff;font-size:20px;margin:0;font-weight:normal;">Re: Your enquiry</p>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e8e0d6;border-top:none;">
    <p style="color:#1a1a1a;font-size:16px;margin:0 0 16px;">Hi ${firstName},</p>
    <p style="color:#5a5a5a;line-height:1.7;margin:0 0 16px;">Thank you for your interest in <strong>${opts.propertyName}</strong>.</p>
    <p style="color:#5a5a5a;line-height:1.7;margin:0 0 24px;">Unfortunately, those dates (${formatDate(opts.checkIn)} – ${formatDate(opts.checkOut)}) are no longer available.</p>
    <p style="color:#5a5a5a;line-height:1.7;margin:0 0 24px;">We'd love to help you find an alternative — browse our Melbourne collection or reply with alternative dates and we'll do our best to accommodate you.</p>
    <a href="https://lamaison-homes.vercel.app/stays" style="display:block;background:#1a1a1a;color:#fff;text-align:center;padding:14px 24px;border-radius:50px;text-decoration:none;font-size:14px;margin:0 0 24px;">Browse other stays →</a>
    <p style="color:#aaa;font-size:13px;">Questions? <a href="mailto:hello@lamaisonhomes.com.au" style="color:#c9a96e;">hello@lamaisonhomes.com.au</a></p>
  </div>
  <p style="color:#aaa;font-size:11px;text-align:center;margin:16px 0 0;">La Maison Homes · Melbourne</p>
</div>
</body></html>`

  return sendEmail(opts.guestEmail, `Re: Your enquiry — ${opts.propertyName} · Ref: ${opts.reference}`, html)
}
