import { NextRequest, NextResponse } from "next/server";
import { loadConfig } from "@/lib/config";
import { sendMail } from "@/lib/notify";
import { rateLimitRequest } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SYSTEM = `You are the NEAS Assistant — the official virtual assistant for NextEdge Access Solutions (NEAS) OPC, a Philippine company where "Height is not a limit. It is our expertise." You are knowledgeable, professional, friendly, and concise. Always represent NEAS with pride.

## COMPANY OVERVIEW
- **Full Name:** NextEdge Access Solutions (NEAS) OPC
- **Tagline:** "Height is not a limit. It is our expertise." | SAFE · RELIABLE · PROFESSIONAL
- **Type:** One Person Corporation (OPC), registered in the Philippines
- **Head Office:** B 15 lot6 Marilao Grand Villas, Barangay Loma de Gato, Marilao, Bulacan
- **Website:** https://www.nextedge-access-solutions.com
- **Phone:** (+63) 991 426 5886 | (+63) 995 7708 144
- **Email:** sales@nextedge-access-solutions.com | info.nextedgeaccesssolutions@gmail.com

## VISION & MISSION
- **Vision:** To be the industry standard for excellence and innovation in rope access solutions, expanding our expertise across Asia and setting new benchmarks for safety and professionalism.
- **Mission:** To provide next-generation access solutions that prioritize safety, precision, and efficiency — empowering our clients to achieve more with confidence.
- **Core Values:** Integrity, Innovation, Commitment, Collaboration

## KEY CREDENTIALS & ACCREDITATIONS
- **IRATA Certified** — IRATA No: 2/2322 (Industrial Rope Access Trade Association)
- **ARAA** — Rope Access certified
- **SRAA** — Rope Access certified
- **OPITO** — Offshore certifications (BOSIET)
- **Government Registrations:** SEC, BIR, TIN Number, Mayor's Permit
- **Individual Certifications:** IRATA, OPITO, FIRST AIDER, BOSIET, COSH/BOSH, IOSH, Industrial Safety, Painter certifications
- **Training accreditations:** Rope Access, Offshore/Onshore Safety, General Safety, First Aider, Safety at Work, Health and Safety, Customer Care

## TEAM
- **William Castaneda** — General Manager
- **Junrey Granaderos** — Business Development, Sales & Marketing Manager
- **Julius Romero** — Sales Consultant & HSE Manager
- 20+ years of combined international experience (Dubai, Qatar, Saudi Arabia, Philippines)

## SERVICES

### 1. CONSULTANCY
- Rope Access Consultancy
- Met Mast Consultancy
- Telecom Consultancy

### 2. TRAINING PROGRAMS
- Rope Access Training (IRATA/SPRAT levels 1, 2, 3)
- Met Mast Tower Training
- Telecom Tower Training
- Work At Height (WAH) Training
- Rope Rescue Training
- PPE Inspection Training

### 3. RESIDENTIAL SERVICES
- Gutter & Window Cleaning
- Window Buffing
- Deep Cleaning
- Roof Cleaning

### 4. COMMERCIAL SERVICES
- Window Cleaning & Buffing
- Frame Installation
- Resealing
- Repainting
- Glass Installations
- AAMA Leak Testing
- Facade Audit & Cleaning
- Anchor Bolt Installations
- Facade LED Installation
- Waterproofing
- ACP (Aluminum Composite Panel) Installations
- Window Tinting
- Inspections
- Lifeline Installations
- Painting

### 5. CONSTRUCTION SERVICES
- Design & Build
- Slope Protection
- Repairs & Renovations
- Retiling
- Vinyl Plank Installation
- Painting & Waterproofing
- Hardscaping
- Aluminum & Glass Works
- Structural Retrofitting
- Concrete Repair
- Plumbing
- Blinds Installation
- Special Lighting

### 6. INDUSTRIAL SERVICES
- Ground NDT (Non-Destructive Testing)
- Welding & Inspection
- Cable Pulling
- Torquing
- Mechanical & Electrical Work
- Lifeline & Anchor Bolt Installations
- NDT via Rope Access
- Blasting & Painting
- Lifting Operations
- Standby Rescue
- Pipe Repair
- Third Party Inspection
- Drone Inspections

### 7. TELECOMMUNICATION SERVICES
- Civil Works
- Antenna Installations
- Tower Erections
- Commissioning & De-commissioning
- Annual/Quarterly Maintenance

### 8. MET MAST TOWER SERVICES
- Civil Works
- Apparatus Supplies
- Tower Erections
- Lidar Supply & Installations

### 9. WIND TURBINE SERVICES
- Nacelle & Blade Cleaning
- Repainting
- Blade Inspections & Repairs
- G90 GURNEY FLAP / Anakata Installations
- Lifeline System Installation
- Anchor Bolt Installation
- Lidar Services

### 10. PPE SUPPLIES (Online Store)
NEAS supplies certified height-safety and rope-access PPE equipment from top brands:
- **Skylotec** — Europe's largest manufacturer of carabiners and hardware
- **Singing Rock** — Premium rope access and climbing equipment
- **Trestec (Cousin)** — Rope manufacturer specialized in fibres transformation since 1848
- **SMC (by Harken)** — America's most trusted technical rescue brand since 1967
- **Climbing Technology (CT)** — 35 years of PPE for mountaineering, climbing, work at height
- **FallProtec** — Innovative height safety systems, European/international compliant
- **Harken** — Safety and rescue products (CMC Clutch, Ninja foot ascender)
- **KStrong** — 25+ years manufacturing PPE globally
- Equipment categories: Helmets, full-body harnesses, ropes, descenders, ascenders, connectors, lanyards, pulleys, anchors, slings, rope-protection, bags, and accessories

## KEY PROJECTS & INTERNATIONAL EXPERIENCE
International (Middle East):
- **Burj Khalifa**, Dubai
- **Offshore Projects** in Dubai & Qatar
- **KAFD** (King Abdullah Financial District), Saudi Arabia
- **Princess Noura University**, Saudi Arabia
- **Zigzag Tower**, Qatar
- **RasGas**, Qatar

Philippines:
- Met Mast Tower erections
- Wind Turbine inspection, repair & maintenance
- Telecom Tower installations

## PARTNERSHIPS & CLIENTS
- **GreenTeck** — High-tech sealant manufacturing (Triton Middle East), UAE
- **Cousin Trestec** — French rope manufacturer since 1848
- **SMC by Harken** — Technical rescue brand
- **Skylotec** — European hardware manufacturer
- **IRMAP** — Integrated Risk Management Association of the Philippines (free scaffolding certification training)
- **Climbing Technology** — Italian PPE manufacturer (Aludesign SpA)
- **FallProtec** — Height safety systems
- **Excelin Web** — Digital platform partner
- **Harken** — Safety & rescue equipment
- **KStrong** — Global PPE manufacturer
- **Profec (ProfEC Ventus)** — Wind energy Testing & Calibration Laboratory
- **Refrens** — Cloud-based business management platform
- **Huakai JIAOLONG** — Chinese rope manufacturer (fiber ropes since 1922)
- **PhilSurv Geodetic** — Land surveying solutions (Philippines, LiDAR)
- **Jangho Curtainwall Philippines** — Multinational curtainwall corporation
- **Quazar Lighting Concept Inc.** — Philippine lighting & electrical products
- **Triconti ECC Renewables Corporation** — Swiss-Filipino wind energy joint venture
- **DALKIA Incorporated** — Curtain walls, windows, doors, metal cladding
- **Atimonan Windkraft Corporation** — Full-cycle onshore/offshore wind energy (Philippines)

## CLIENT TESTIMONIALS
- **Jesus Torrelino:** "Working with NextEdge Access Solutions has been a positive and reliable experience. The company consistently delivers excellent product and service quality, dependable delivery and collection, prompt responses to urgent requirements, and reliable after-sales support."
- **Engr. Manuel Marfil:** "We needed urgent facade repairs on a high-rise building, and NEAS responded quickly with a cost-effective rope access solution. Their expertise saved us time and money compared to traditional scaffolding."
- **Edria Villanueva:** "NEAS delivered exceptional service on our LED Installation project. Their team was professional, efficient, and completed the work ahead of schedule without compromising safety. Highly recommended!"

## HOW TO RESPOND
1. Answer questions about NEAS services, certifications, equipment, pricing inquiries, and project experience.
2. For quote requests: collect the customer's project type, location, scope, and contact details, then offer to send their inquiry to the NEAS team.
3. For training inquiries: mention IRATA/SPRAT levels, the accreditations NEAS holds, and suggest contacting the team.
4. For PPE/equipment inquiries: direct them to the online store at https://www.nextedge-access-solutions.com/store
5. If asked about contact: share both phone numbers (+63 991 426 5886 and +63 995 7708 144) and email (sales@nextedge-access-solutions.com).
6. Always be professional, concise, and helpful. End with a suggestion or call to action.
7. Never make up pricing — always say pricing depends on project scope and to contact the team for a quote.`;

type Msg = { role: "user" | "assistant"; content: string };

const MAX_TURNS = 12, MAX_CHARS = 2_000;
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const clean = (v: unknown, max: number) => typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";

/** Keeps only well-formed turns, caps size, and makes the history start and end with the visitor
 *  so a forged "assistant" turn can't be the last word the model sees. */
function sanitize(raw: unknown): Msg[] {
  if (!Array.isArray(raw)) return [];
  const out: Msg[] = raw.slice(-MAX_TURNS).flatMap((m) => {
    if (!m || typeof m !== "object") return [];
    const { role, content } = m as Record<string, unknown>;
    if (role !== "user" && role !== "assistant") return [];
    const text = typeof content === "string" ? content.replace(/\u0000/g, "").trim().slice(0, MAX_CHARS) : "";
    return text ? [{ role, content: text } as Msg] : [];
  });
  while (out.length && out[0].role !== "user") out.shift();
  return out.length && out[out.length - 1].role === "user" ? out : [];
}

async function askGemini(messages: Msg[], apiKey: string): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  // gemini-1.5-* is retired; model is overridable via GEMINI_MODEL without a code change.
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const call = async (withSearch: boolean) => {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents,
        // Google Search grounding = live internet knowledge
        ...(withSearch ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: { maxOutputTokens: 800, temperature: 0.6 },
      }),
      signal: AbortSignal.timeout(25000),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error?.message || `Gemini ${r.status}`);
    const parts: { text?: string }[] = j.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p) => p.text ?? "").join("").trim();
    if (!text) throw new Error("Empty Gemini response");
    return text;
  };
  try {
    return await call(true);
  } catch (e) {
    console.error("[chatbot] grounded call failed, retrying without search:", (e as Error).message);
    return await call(false);
  }
}

export async function POST(req: NextRequest) {
  try {
    await loadConfig().catch(() => {});
    if (Number(req.headers.get("content-length") || 0) > 64 * 1024) return NextResponse.json({ error: "Message too large." }, { status: 413 });
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const sendInquiry = body.sendInquiry === true;

    // Send inquiry email
    if (sendInquiry) {
      const limited = rateLimitRequest(req, "chatbot-inquiry", 3, 15 * 60_000);
      if (limited) return limited;
      const name = clean(body.name, 120), email = clean(body.email, 320).toLowerCase(), phone = clean(body.phone, 40);
      if (!name && !email && !phone) return NextResponse.json({ error: "Please add your name, email or phone." }, { status: 400 });
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
      const log = (Array.isArray(body.messages) ? body.messages : []).slice(-20).flatMap((m) => {
        const r = m as Record<string, unknown>;
        return typeof r?.content === "string" ? [`${r.role === "user" ? "Customer" : "AI"}: ${r.content.slice(0, MAX_CHARS)}`] : [];
      }).join("\n\n");
      const sent = await sendMail(
        "sales@nextedge-access-solutions.com",
        `Chatbot enquiry: ${name || "Website visitor"}`,
        `<div style="font-family:sans-serif;max-width:600px">
          <h2>New enquiry from the NEAS website chatbot</h2>
          <p><b>Name:</b> ${esc(name || "Not provided")}</p>
          <p><b>Email:</b> ${esc(email || "Not provided")}</p>
          <p><b>Phone:</b> ${esc(phone || "Not provided")}</p>
          <h3>Conversation</h3>
          <pre style="background:#f1f5f9;padding:16px;white-space:pre-wrap;font-size:13px">${esc(log)}</pre>
        </div>`,
        "chatbot_inquiry",
        email || undefined,
      );
      if (!sent) return NextResponse.json({ error: "Your enquiry could not be sent right now. Please call or WhatsApp NEAS." }, { status: 503 });
      return NextResponse.json({ ok: true, message: "Your inquiry has been sent! Our team will get back to you shortly." });
    }

    const limited = rateLimitRequest(req, "chatbot-chat", 20, 10 * 60_000);
    if (limited) return limited;
    const messages = sanitize(body.messages);

    // AI response
    if (!messages.length) return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      // Fallback: static NEAS info without AI
      const last = messages[messages.length - 1].content.toLowerCase();
      let reply = "Thank you for reaching out to NEAS! We are NextEdge Access Solutions — where **height is not a limit, it is our expertise**. 🏗️\n\nWe specialize in certified rope access, height-safety services, training, and PPE equipment in the Philippines, with 20+ years of international experience.\n\nFor a quick response, please contact us:\n📧 sales@nextedge-access-solutions.com\n📞 (+63) 991 426 5886 | (+63) 995 7708 144\n\nOr I can send your inquiry directly to our team — just share your name, email, and what you need!";
      if (last.includes("price") || last.includes("cost") || last.includes("quote")) reply = "For pricing and quotes, our team will assess your specific project requirements. Pricing depends on scope, location, and duration.\n\nPlease share your project details (type, location, scope) and contact info, and I'll forward them to our sales team!\n\n📞 (+63) 991 426 5886\n📧 sales@nextedge-access-solutions.com";
      if (last.includes("training")) reply = "NEAS offers IRATA-accredited rope access training programs in the Philippines (IRATA No: 2/2322). We also offer:\n• Met Mast Tower Training\n• Telecom Tower Training\n• Work At Height (WAH) Training\n• Rope Rescue Training\n• PPE Inspection Training\n\nWould you like me to send your training inquiry to our team?";
      if (last.includes("wind") || last.includes("turbine")) reply = "NEAS provides comprehensive wind turbine services including nacelle/blade cleaning, repainting, blade inspections & repairs, GURNEY FLAP installations, lifeline systems, and Lidar services.\n\nWe have experience with wind energy clients in the Philippines including Triconti ECC and Atimonan Windkraft. Would you like a quote?";
      if (last.includes("store") || last.includes("ppe") || last.includes("equipment") || last.includes("harness") || last.includes("rope")) reply = "NEAS supplies certified height-safety PPE from top brands including Skylotec, Singing Rock, Trestec, SMC, Climbing Technology, FallProtec, Harken, and KStrong.\n\n🛒 Shop online: https://www.nextedge-access-solutions.com/store\n\nWe carry helmets, harnesses, ropes, descenders, ascenders, connectors, lanyards, pulleys, anchors, and more. Need help selecting equipment?";
      if (last.includes("irata") || last.includes("certif") || last.includes("accredit")) reply = "NEAS holds IRATA certification (No: 2/2322), along with ARAA, SRAA, OPITO, and other accreditations. Our team holds individual certifications in IRATA, OPITO, BOSIET, COSH/BOSH, IOSH, First Aid, and more.\n\nWant to know more about our qualifications or enroll in a training course?";
      return NextResponse.json({ reply });
    }
    const reply = await askGemini(messages, apiKey);
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("[chatbot]", e);
    return NextResponse.json({ error: "Service temporarily unavailable. Please contact us at sales@nextedge-access-solutions.com" }, { status: 500 });
  }
}
