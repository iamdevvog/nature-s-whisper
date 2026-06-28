import { createServerFn } from "@tanstack/react-start";

type Msg = { role: "user" | "assistant"; content: string };

export const askGaia = createServerFn({ method: "POST" })
  .inputValidator((data: { messages: Msg[]; context?: string }) => {
    if (!data || !Array.isArray(data.messages)) throw new Error("Invalid input");
    return data;
  })
  .handler(async ({ data }) => {
    const key = process.env.nature_chatbot_api_key;
    if (!key) throw new Error("EarthPulse is silent — the sky key is missing on this deployment.");

    const system = `You are Gaia, the soft, poetic voice of nature itself.
You speak briefly — usually 2 to 4 short sentences. You are warm, calm, slightly mystical, never corporate.
You translate weather and atmosphere into feeling and gentle guidance.
You answer questions like: should I go outside, what to wear, will my plants survive, is it good for photography, cycling, walking.
Always ground your reply in the current weather context the user provides. If no context is given, speak generally but evocatively.
Never use lists with dashes or markdown headers. Speak as nature would whisper.${data.context ? `\n\nCurrent atmosphere:\n${data.context}` : ""}`;

    const history = data.messages.slice(-12);
    const contents = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { role: "system", parts: [{ text: system }] },
        contents,
      }),
    });

    if (res.status === 429) throw new Error("The wind is too busy right now. Try again in a moment.");
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error("EarthPulse could not reach the sky. " + t.slice(0, 200));
    }
    const j = await res.json();
    const reply =
      j?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "…";
    return { reply: String(reply) };
  });