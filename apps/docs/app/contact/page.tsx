import { ContactForm } from "@/components/contact-form";

export const metadata = {
  title: "Contact Support - OpenPortal",
  description: "Contact OpenPortal support.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-12 sm:py-16">
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Contact support
        </h1>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Send a message about OpenPortal. We will reply to the email address
          you provide.
        </p>
      </div>
      <ContactForm />
    </main>
  );
}
