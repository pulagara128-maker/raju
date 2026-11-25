# Signature Dine (సిగ్నేచర్ డైన్) — Website & Operations Platform

Official web platform for **Signature Dine**, an Andhra restaurant located at **3rd Line, Brindavan Gardens, Guntur, Andhra Pradesh 522006, India**.

## Features

- **Public Restaurant Website**: Hero showcase, About Us, Today's Special (auto-hidden when disabled by the owner), searchable/filterable Food Menu across 10 categories, Food Gallery with lightbox, Google Rating summary (`4.6 / 5 · 2,080 reviews`), live IST (`Asia/Kolkata`) Opening Hours, and interactive Google Map.
- **Online Pickup Pre-Orders & WhatsApp Ordering**: Persistent cart drawer generating `SD-YYYYMMDD-XXXX` order references, optional delivery toggle, order status tracking by order number or mobile, and formatted WhatsApp order template (or clear setup notice when owner WhatsApp number is not yet configured).
- **Signature Dine Rewards (Loyalty Program)**: 10-stamp card lookup by phone number, configurable birthday discount %, duplicate-stamp protection per order, and staff stamp/redemption controls.
- **Lead Collection & Festival WhatsApp Campaigns**: Timed/exit-intent popup with explicit WhatsApp consent tracking, unsubscribe support, and 8 festival presets (`Christmas`, `New Year`, `Sankranti`, `Ugadi`, `Diwali`, `Eid`, `Dussehra`, `Holi`). Supports WhatsApp Cloud API when configured or generates personalized `wa.me` links in manual campaign mode.
- **Printable QR Code Menu (`/qr-menu`)**: Instant PNG/SVG downloads and printable A4 poster.
- **Private Guest Feedback**: Multi-criteria star ratings (`FB-...` reference) stored privately with CSV export in Admin.
- **Protected Admin Dashboard (`/admin`)**: Firebase Auth Google Sign-In protected portal for managing menu items, prices, images, opening hours, restaurant settings, orders, loyalty stamps, leads, festival campaigns, and private feedback.

## Environment Variables

See `.env.example` for all required and optional variables:

- `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME`: Cloud SQL PostgreSQL connection (automatically provisioned in AI Studio).
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps Platform key restricted by HTTP referrers and limited to Maps JavaScript API + Places API (New).
- `ADMIN_EMAILS`: Comma-separated list of authorized owner/staff Google emails (optional; if omitted, the first signed-in Google user claims initial admin access).
- `WHATSAPP_ACCESS_TOKEN` & `WHATSAPP_PHONE_NUMBER_ID`: Optional Meta WhatsApp Business Cloud API credentials for automated festival campaign sending.

## Development & Production

```bash
# Install dependencies
npm install

# Run full-stack development server (Express + Vite on port 3000)
npm run dev

# Build client bundle for production
npm run build

# Start production server
NODE_ENV=production npm start
```
