import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

export const logError = (context) => (err) => console.error(`[${context}]`, err);

export const inr = (n) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n || 0);

export const inrShort = (n) => {
  if (!n) return "₹0";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return `₹${inr(n)}`;
};

export const kg = (n) => `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(n || 0)} kg`;

async function streamSSE(path, body, onDelta) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop();
    for (const p of parts) {
      if (!p.startsWith("data: ")) continue;
      const payload = p.slice(6).trim();
      if (payload === "[DONE]") return;
      try {
        onDelta(JSON.parse(payload).delta);
      } catch (e) { console.warn("[stream] skipped malformed chunk", e); }
    }
  }
}

export async function streamExplanation(customerId, productId, onDelta) {
  return streamSSE("/explain", { customer_id: customerId, product_id: productId }, onDelta);
}

export async function streamChat(customerId, message, onDelta) {
  return streamSSE("/companion/chat", { customer_id: customerId, message }, onDelta);
}
