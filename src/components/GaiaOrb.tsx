import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { askGaia } from "@/lib/gaia.functions";
import type { WeatherSnapshot } from "@/lib/weather";

type Msg = { role: "user" | "assistant"; content: string };

export function GaiaOrb({ snap }: { snap: WeatherSnapshot | null }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "I am Gaia. Ask me what the air would say." },
  ]);
  const ask = useServerFn(askGaia);

  const context = snap
    ? `Place: ${snap.city}${snap.country ? ", " + snap.country : ""}. Sky: ${snap.description}. Temp: ${Math.round(snap.tempC)}°C, feels ${Math.round(snap.feelsLikeC)}°C. Humidity ${snap.humidity}%. Wind ${Math.round(snap.windKph)} km/h. UV ${snap.uvIndex}. ${snap.isDay ? "Daytime." : "Nighttime."} Mood: ${snap.mood}.`
    : undefined;

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user", content: text } as Msg];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { reply } = await ask({ data: { messages: next, context } });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: e?.message ?? "The sky is quiet." }]);
    } finally {
      setBusy(false);
    }
  };

  const quick = [
    "Should I go outside?",
    "Best clothes today?",
    "Will my plants be okay?",
    "Good time for a walk?",
  ];

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-8 right-8 z-40 grid h-20 w-20 place-items-center rounded-full"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.96 }}
        aria-label="Talk to Gaia"
      >
        <span className="absolute inset-0 rounded-full bg-primary/30 blur-2xl breathe" />
        <span className="absolute inset-2 rounded-full bg-gradient-to-br from-primary via-accent to-aurora opacity-90 breathe" />
        <span className="relative h-3 w-3 rounded-full bg-white shadow-[0_0_20px_white]" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="glass fixed bottom-32 right-8 z-40 flex h-[28rem] w-[22rem] flex-col overflow-hidden rounded-3xl"
          >
            <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
              <span className="relative grid h-8 w-8 place-items-center">
                <span className="absolute inset-0 rounded-full bg-primary/40 blur-lg" />
                <span className="relative h-3 w-3 rounded-full bg-primary" />
              </span>
              <div>
                <p className="font-display text-base leading-none">Gaia</p>
                <p className="text-xs text-muted-foreground">the voice of nature</p>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                  <span
                    className={
                      m.role === "user"
                        ? "inline-block max-w-[85%] rounded-2xl rounded-br-md bg-primary/90 px-3.5 py-2 text-primary-foreground"
                        : "inline-block max-w-[90%] rounded-2xl rounded-bl-md text-foreground/90"
                    }
                  >
                    {m.content}
                  </span>
                </div>
              ))}
              {busy && <div className="text-muted-foreground italic">Gaia is listening to the wind…</div>}
            </div>
            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {quick.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex items-center gap-2 border-t border-border/60 p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the sky…"
                className="flex-1 rounded-full bg-input/80 px-4 py-2 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}