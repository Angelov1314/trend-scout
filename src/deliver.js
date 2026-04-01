/**
 * Delivery module — sends reports via Gmail and/or WhatsApp.
 *
 * Gmail: Uses Google Gmail API with OAuth2 or App Password via nodemailer.
 * WhatsApp: Uses Twilio WhatsApp API (free sandbox for personal use).
 */
import nodemailer from "nodemailer";

/**
 * Convert markdown report to simple HTML for email.
 */
function markdownToHtml(md) {
  return md
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match
        .split("|")
        .filter(Boolean)
        .map((c) => c.trim());
      return "<tr>" + cells.map((c) => `<td>${c}</td>`).join("") + "</tr>";
    })
    .replace(/(<tr>.*<\/tr>\n?)+/g, "<table border='1' cellpadding='4' cellspacing='0'>$&</table>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/\n{2,}/g, "<br><br>")
    .replace(/---/g, "<hr>");
}

/**
 * Send report via Gmail (using App Password or SMTP).
 *
 * Required env vars:
 *   GMAIL_USER     — your Gmail address
 *   GMAIL_APP_PASS — 16-char app password (not your main password)
 *   GMAIL_TO       — recipient email (can be same as GMAIL_USER)
 */
export async function sendViaGmail(report, subject, { html } = {}) {
  const { GMAIL_USER, GMAIL_APP_PASS, GMAIL_TO } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASS) {
    console.warn("[deliver] Gmail not configured — skipping. Set GMAIL_USER and GMAIL_APP_PASS.");
    return false;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASS,
    },
  });

  await transporter.sendMail({
    from: `Trend Scout <${GMAIL_USER}>`,
    to: GMAIL_TO || GMAIL_USER,
    subject: subject || `Trend Scout Daily — ${new Date().toISOString().slice(0, 10)}`,
    text: report,
    html: html || markdownToHtml(report),
  });

  console.log(`[deliver] Gmail sent to ${GMAIL_TO || GMAIL_USER}`);
  return true;
}

/**
 * Send report via WhatsApp (Twilio API).
 *
 * Required env vars:
 *   TWILIO_SID        — Twilio Account SID
 *   TWILIO_AUTH_TOKEN  — Twilio Auth Token
 *   TWILIO_WHATSAPP_FROM — Twilio WhatsApp sandbox number (e.g. whatsapp:+14155238886)
 *   WHATSAPP_TO        — Your WhatsApp number (e.g. whatsapp:+1234567890)
 */
export async function sendViaWhatsApp(report, subject) {
  const { TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, WHATSAPP_TO } = process.env;
  if (!TWILIO_SID || !TWILIO_AUTH_TOKEN) {
    console.warn("[deliver] Twilio not configured — skipping. Set TWILIO_SID and TWILIO_AUTH_TOKEN.");
    return false;
  }

  // Truncate for WhatsApp (1600 char limit per message)
  const truncated = report.length > 1500
    ? report.slice(0, 1500) + "\n\n... [truncated — full report sent via email]"
    : report;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const body = new URLSearchParams({
    From: TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886",
    To: WHATSAPP_TO,
    Body: `*${subject || "Trend Scout Daily"}*\n\n${truncated}`,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[deliver] WhatsApp failed: ${err}`);
    return false;
  }

  console.log(`[deliver] WhatsApp sent to ${WHATSAPP_TO}`);
  return true;
}

/**
 * Deliver report through all configured channels.
 */
export async function deliver(report, subject, { html } = {}) {
  const results = await Promise.allSettled([
    sendViaGmail(report, subject, { html }),
    sendViaWhatsApp(report, subject),
  ]);

  const sent = results.filter((r) => r.status === "fulfilled" && r.value === true).length;
  if (sent === 0) {
    console.log("[deliver] No delivery channels configured. Printing report to stdout:\n");
    console.log(report);
  }
  return sent;
}
