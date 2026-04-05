"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Field = {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
};

export function SimpleForm({
  title,
  description,
  fields,
  submitLabel = "Submit",
  textarea,
}: {
  title: string;
  description?: string;
  fields: Field[];
  submitLabel?: string;
  textarea?: { name: string; label: string; placeholder?: string };
}) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="mb-6 space-y-2">
        <h3 className="font-serif text-2xl text-stone-950">{title}</h3>
        {description ? <p className="text-sm leading-6 text-stone-600">{description}</p> : null}
      </div>
      {submitted ? (
        <div className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-700">
          Thanks — this placeholder flow is ready to connect to Supabase and notification handling.
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <label className="text-sm text-stone-700">{field.label}</label>
                <Input name={field.name} type={field.type || "text"} placeholder={field.placeholder} />
              </div>
            ))}
          </div>
          {textarea ? (
            <div className="space-y-2">
              <label className="text-sm text-stone-700">{textarea.label}</label>
              <Textarea name={textarea.name} placeholder={textarea.placeholder} />
            </div>
          ) : null}
          <div className="flex items-start gap-3 rounded-2xl bg-stone-50 p-4 text-xs leading-5 text-stone-500">
            <input type="checkbox" className="mt-0.5" defaultChecked />
            <p>I agree to be contacted in relation to this enquiry and understand privacy, tracking, and marketing preferences may apply.</p>
          </div>
          <Button type="submit">{submitLabel}</Button>
        </form>
      )}
    </div>
  );
}
