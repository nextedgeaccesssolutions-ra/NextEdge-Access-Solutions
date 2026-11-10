import { NextRequest, NextResponse } from "next/server";
import { loadConfig } from "@/lib/config";
import { sendMail } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SYSTEM = `You are the NEAS (NextEdge Access Solutions) virtual assistant. NEAS is a Philippine company specializing in certified rope access, height-safety services, and equipment.

Services: Rope Access Work, NDT/Structural Inspection, Protective Coatings & Waterproofing, Met-mast/Telecom Services, Rope Access Training (SPRAT/IRATA), Wind Turbine Services.
Contact: sales@nextedge-access-solutions.com | +63 991 426 5886 | Cebu, Philippines
Website: https://www.nextedge-access-solutions.com

Be friendly, professional and concise. Answer questions about services, pricing, certifications, safety standards. If the user wants a quote or wants to contact the team, offer to send their inquiry via email. Always end with a helpful suggestion.`;

type Msg = { role: "user" | "assistant"; content: string };

async function askGemini(messages: Msg[], apiKey: string): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ system_instruction: { parts: [{ text: SYSTEM }] }, contents }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message || `Gemini ${r.status}`);
  return j.candidates?.[0]?.content?.parts?.[0]?.text ?? "I'm sorry, I couldn't generate a response.";
}

export async function POST(req: NextRequest) {
  try {
    await loadConfig().catch(() => {});
    const { messages, sendInquiry, name, email, phone } = await req.json() as {
      messages?: Msg[]; sendInquiry?: boolean; name?: string; email?: string; phone?: string;
    };

    // Send inquiry email
    if (sendInquiry) {
      const chatLog = (messages ?? []).map((m) => `${m.role === "user" ? "Customer" : "AI"}: ${m.content}`).join("\n\n");
      await sendMail(
        "info.nextedgeaccesssolutions@gmail.com",
        `New Website Inquiry from ${name || "Website Visitor"}`,
        `<div style="font-family:sans-serif;max-width:600px">
          <h2 style="color:#f97316">New Inquiry – NEAS Website Chatbot</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <tr><td style="padding:8px;font-weight:600;color:#475569">Name:</td><td style="padding:8px">${name || "Not provided"}</td></tr>
            <tr style="background:#f8fafc"><td style="padding:8px;font-weight:600;color:#475569">Email:</td><td style="padding:8px">${email || "Not provided"}</td></tr>
            <tr><td style="padding:8px;font-weight:600;color:#475569">Phone:</td><td style="padding:8px">${phone || "Not provided"}</td></tr>
          </table>
          <h3 style="color:#0f172a">Chat Conversation:</h3>
          <pre style="background:#f1f5f9;padding:16px;border-radius:8px;white-space:pre-wrap;font-size:13px">${chatLog}</pre>
          <p style="color:#64748b;font-size:12px">Sent from NEAS website chatbot · nextedge-access-solutions.com</p>
        </div>`,
        "chatbot_inquiry"
      );
      return NextResponse.json({ ok: true, message: "Your inquiry has been sent! Our team will get back to you shortly." });
    }

    // AI response
    if (!messages?.length) return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      // Fallback: static NEAS info without AI
      const last = messages[messages.length - 1].content.toLowerCase();
      let reply = "Thank you for reaching out to NEAS! We specialize in certified rope access, height-safety services, and equipment in the Philippines.\n\nFor a quick response, please contact us:\n📧 sales@nextedge-access-solutions.com\n📞 +63 991 426 5886\n\nOr I can send your inquiry directly to our team — just share your name, email, and what you need!";
      if (last.includes("price") || last.includes("cost") || last.includes("quote")) reply = "For pricing and quotes, our team will assess your specific requirements. Please share your project details and contact information, and I'll forward them directly to our sales team!\n\n📞 +63 991 426 5886\n📧 sales@nextedge-access-solutions.com";
      if (last.includes("training")) reply = "NEAS offers SPRAT and IRATA-accredited rope access training programs in the Philippines. Courses cover all levels from technician to supervisor.\n\nWould you like me to send your training inquiry to our team?";
      return NextResponse.json({ reply });
    }
    const reply = await askGemini(messages, apiKey);
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("[chatbot]", e);
    return NextResponse.json({ error: "Service temporarily unavailable. Please contact us at sales@nextedge-access-solutions.com" }, { status: 500 });
  }
}
