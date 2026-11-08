export type ContactInput = {
  name: string;
  company: string;
  email: string;
  phone: string;
  service: string;
  message: string;
};

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";

export function validateContactInput(value: unknown): { data?: ContactInput; error?: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { error: "Invalid enquiry." };
  const b = value as Record<string, unknown>;
  const data: ContactInput = {
    name: clean(b.name, 120),
    company: clean(b.company, 160),
    email: clean(b.email, 320).toLowerCase(),
    phone: clean(b.phone, 40),
    service: clean(b.service, 120),
    message: clean(b.message, 3_000),
  };

  if (!data.name || !data.email || !data.message) return { error: "Please enter your name, email and project message." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { error: "Enter a valid email address." };
  const phoneDigits = data.phone.replace(/\D/g, "");
  if (data.phone && (!/^[+0-9][0-9\s().-]{6,39}$/.test(data.phone) || phoneDigits.length < 7 || phoneDigits.length > 15)) return { error: "Enter a valid phone number." };
  if (data.message.length < 10) return { error: "Please provide at least 10 characters about your enquiry." };
  return { data };
}
