"use client";

import { Form } from "react-aria-components/Form";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Fieldset, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TextField } from "@/components/ui/text-field";
import { Textarea } from "@/components/ui/textarea";

type FormStatus =
  | { type: "idle"; message: null }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export function ContactForm() {
  const [status, setStatus] = useState<FormStatus>({
    type: "idle",
    message: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);

    setIsSubmitting(true);
    setStatus({ type: "idle", message: null });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "Failed to send message");
      }

      form.reset();
      setStatus({
        type: "success",
        message: "Message sent. We will get back to you soon.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to send message. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      className="[--control-bg:var(--color-bg)]/30"
      onSubmit={handleSubmit}
    >
      <Fieldset>
        <TextField isRequired name="name">
          <Label>Name</Label>
          <Input placeholder="Your name" />
          <FieldError />
        </TextField>

        <TextField isRequired name="email" type="email">
          <Label>Email</Label>
          <Input type="email" placeholder="you@example.com" />
          <FieldError />
        </TextField>

        <TextField isRequired name="message">
          <Label>Message</Label>
          <Textarea placeholder="Your message..." className="h-32" />
          <FieldError />
        </TextField>

        {status.message && (
          <p
            className={
              status.type === "success"
                ? "text-sm text-emerald-600 dark:text-emerald-400"
                : "text-sm text-red-600 dark:text-red-400"
            }
          >
            {status.message}
          </p>
        )}

        <div data-slot="control">
          <Button type="submit" isDisabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send message"}
          </Button>
        </div>
      </Fieldset>
    </Form>
  );
}
