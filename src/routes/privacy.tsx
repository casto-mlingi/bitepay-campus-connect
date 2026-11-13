import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — BitePay" },
      {
        name: "description",
        content:
          "How BitePay handles your data: account and sales records, mobile money payments, device storage, and privacy-friendly visitor analytics.",
      },
      { property: "og:title", content: "Privacy Policy — BitePay" },
      {
        property: "og:description",
        content:
          "How BitePay handles your data: account and sales records, mobile money payments, device storage, and privacy-friendly visitor analytics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to BitePay
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last updated: 13 November 2026</p>

        <div className="mt-8 space-y-8">
          <Section title="1. What BitePay is">
            <p>
              BitePay is a point-of-sale, stock and prepaid wallet system used by shops,
              supermarkets, restaurants, bars, hotels and canteens. This policy explains what
              information the app handles, and how.
            </p>
          </Section>

          <Section title="2. Information you give us">
            <p>When a business or customer uses BitePay, the app stores:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Account details: name, phone number, email address and password or PIN.</li>
              <li>
                Business records: sales, orders, stock counts, expenses, staff records and shift
                reports entered by the business.
              </li>
              <li>
                Customer wallet records: phone number, wallet balance, top-ups and purchases.
              </li>
            </ul>
            <p>
              This information belongs to the business that entered it and is used only to run the
              service: processing sales, keeping balances correct and producing reports.
            </p>
          </Section>

          <Section title="3. Payments">
            <p>
              Mobile money top-ups and payments are processed by AzamPay. When you pay, your phone
              number and the payment amount are sent to AzamPay to complete the transaction.
              AzamPay's own privacy policy explains how it handles that data.
            </p>
            <p>
              For Lipa Namba payments, the business may connect a phone that reads payment
              confirmation SMS messages. The app reads only the payment details needed to confirm a
              sale (amount, reference number and sender) and does not read personal messages.
            </p>
          </Section>

          <Section title="4. What is stored on your device">
            <p>BitePay works offline, so it stores some information in your browser or app:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Your sign-in session, so you stay logged in.</li>
              <li>
                A local copy of recent business data, so sales keep working without internet and
                sync when the connection returns.
              </li>
              <li>Your language preference.</li>
              <li>
                Cached app files (through a service worker) so the app opens quickly and works
                offline.
              </li>
            </ul>
            <p>
              This data stays on your device and under your control. Clearing your browser or app
              data removes it.
            </p>
          </Section>

          <Section title="5. Visitor analytics">
            <p>
              This site uses Lovable's visitor analytics to understand how the app is used. It uses
              no cookies, stores nothing on the visitor's device, doesn't keep IP addresses and
              doesn't identify visitors.
            </p>
            <p>
              It records the pages visited, where visitors came from, their country, browser,
              operating system and device type, how long they stay, how fast pages load, errors, and
              which buttons and links are clicked. Page visits, time on page, page speed, errors
              and clicks are recorded for every visitor, without cookies and without identifying
              anyone.
            </p>
            <p>
              Detailed data is kept for 90 days and daily summaries for a year. Lovable collects
              this data for us.{" "}
              <a
                href="https://lovable.dev/privacy"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary hover:underline"
              >
                Lovable's privacy policy
              </a>{" "}
              explains how it handles it.
            </p>
          </Section>

          <Section title="6. Who we share data with">
            <p>We do not sell personal data. Data is shared only with:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>AzamPay, to process mobile money payments you make.</li>
              <li>
                Lovable, which hosts the app and provides the privacy-friendly analytics described
                above.
              </li>
            </ul>
          </Section>

          <Section title="7. Your choices">
            <p>
              Business owners can correct or delete their business records from inside the app. To
              delete an account or ask about your data, contact us using the details below.
            </p>
          </Section>

          <Section title="8. Contact">
            <p>
              Questions about this policy or your data: WhatsApp{" "}
              <a
                href="https://wa.me/qr/ZEMXKSGCS52ZG1"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary hover:underline"
              >
                +255 765 03 5656
              </a>
              .
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
