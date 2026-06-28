import { createServerFn } from "@tanstack/react-start";

type Msg = { role: "user" | "assistant"; content: string };

export const askGaia = createServerFn({ method: "POST" })
  .inputValidator((data: { messages: Msg[]; context?: string }) => {
    if (!data || !Array.isArray(data.messages)) throw new Error("Invalid input");
    return data;
  })
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Gaia is silent — missing API key.");

    const system = `You are Gaia, the soft, poetic voice of nature itself.
You speak briefly — usually 2 to 4 short sentences. You are warm, calm, slightly mystical, never corporate.
You translate weather and atmosphere into feeling and gentle guidance.
You answer questions like: should I go outside, what to wear, will my plants survive, is it good for photography, cycling, walking.
Always ground your reply in the current weather context the user provides. If no context is given, speak generally but evocatively.
Never use lists with dashes or markdown headers. Speak as nature would whisper.${data.context ? `\n\nCurrent atmosphere:\n${data.context}` : ""}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          ...data.messages.slice(-12),
        ],
      }),
    });

    if (res.status === 429) throw new Error("The wind is too busy right now. Try again in a moment.");
    if (res.status === 402) throw new Error("Gaia needs more credits to keep listening.");
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error("Gaia could not reach the sky. " + t.slice(0, 200));
    }
    const j = await res.json();
    const reply = j.choices?.[0]?.message?.content ?? "…";
    return { reply: String(reply) };
  });