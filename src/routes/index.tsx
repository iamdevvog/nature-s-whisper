import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CustomCursor } from "@/components/CustomCursor";
import { WeatherCanvas } from "@/components/WeatherCanvas";
import { GaiaOrb } from "@/components/GaiaOrb";
import { fetchWeather, type WeatherKind, type WeatherSnapshot } from "@/lib/weather";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gaia — Listen to the sky" },
      { name: "description", content: "A cinematic, AI-guided weather experience where nature is alive." },
      { property: "og:title", content: "Gaia — Listen to the sky" },
      { property: "og:description", content: "Nature is speaking. Listen to the sky." },
    ],
  }),
  component: Index,
});

const SUGGESTIONS = ["Kyoto", "Reykjavík", "London", "Lisbon", "Marrakech", "Banff"];

function Index() {
  const [query, setQuery] = useState("");
  const [snap, setSnap] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"hero" | "scene">("hero");
  const [bootDone, setBootDone] = useState(false);
  // time-of-day slider: 0 morning, 1 afternoon, 2 evening, 3 night
  const [tod, setTod] = useState<number>(1);

  useEffect(() => {
    const t = setTimeout(() => setBootDone(true), 1800);
    return () => clearTimeout(t);
  }, []);

  const isNight = useMemo(() => {
    if (tod === 3) return true;
    if (snap && !snap.isDay && tod === 1) return true;
    return false;
  }, [tod, snap]);

  const activeKind: WeatherKind = useMemo(() => {
    if (isNight) return "night";
    if (!snap) return "clear";
    return snap.kind;
  }, [snap, isNight]);

  const search = async (q: string) => {
    const city = q.trim();
    if (!city) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWeather(city);
      setSnap(data);
      setPhase("scene");
      setTod(data.isDay ? 1 : 3);
    } catch (e: any) {
      setError(e?.message ?? "The sky did not answer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden text-foreground">
      <CustomCursor />
      <WeatherCanvas kind={activeKind} isNight={isNight} />

      {/* Soft vignette overlay */}
      <div className="pointer-events-none fixed inset-0 -z-[5] bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.55)_100%)]" />

      {/* Nav */}
      <header className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="relative grid h-9 w-9 place-items-center">
            <span className="absolute inset-0 rounded-full bg-primary/40 blur-md" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-primary" />
          </div>
          <span className="font-display text-xl tracking-tight">Gaia</span>
        </div>
        <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
          <a href="#scene" className="hover:text-foreground">Sky</a>
          <a href="#journal" className="hover:text-foreground">Journal</a>
          <a href="#memory" className="hover:text-foreground">Memory</a>
          <a href="#about" className="hover:text-foreground">About</a>
        </nav>
        {snap && (
          <button
            onClick={() => { setPhase("hero"); }}
            className="glass rounded-full px-4 py-2 text-xs"
          >
            ← listen elsewhere
          </button>
        )}
      </header>

      {/* Loading veil */}
      <AnimatePresence>
        {!bootDone && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
            className="fixed inset-0 z-[100] grid place-items-center bg-background"
          >
            <div className="text-center">
              <TreeBoot />
              <p className="mt-8 font-display text-lg text-muted-foreground">Nature is waking up…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {phase === "hero" ? (
          <motion.section
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: 0.9 }}
            className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center"
          >
            <motion.span
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground"
            >
              A living weather experience
            </motion.span>
            <motion.h1
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.9 }}
              className="font-display mt-8 text-6xl font-light leading-[0.95] tracking-tight md:text-[8.5rem]"
            >
              Nature is <em className="font-medium italic text-primary">speaking.</em>
            </motion.h1>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl"
            >
              Listen to the sky. Gaia turns the weather of any place on Earth into a living, breathing world.
            </motion.p>

            <motion.form
              onSubmit={(e) => { e.preventDefault(); search(query); }}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="glass mt-12 flex w-full max-w-xl items-center gap-2 rounded-full p-2 pl-6"
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Where shall we listen today?"
                className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "listening…" : "Listen"}
              </button>
            </motion.form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>Try</span>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); search(s); }}
                  className="rounded-full border border-border/70 px-3 py-1 hover:border-primary/70 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>

            {error && (
              <p className="mt-6 text-sm text-destructive/90">{error}</p>
            )}

            <div className="mt-24 grid grid-cols-3 gap-12 text-left text-sm text-muted-foreground md:max-w-3xl">
              <Feature title="Earth pulse" body="A breathing planet that responds to the rhythm of the sky." />
              <Feature title="Nature soundscape" body="Adaptive ambient layers — rain, forest, wind, distant tide." />
              <Feature title="Gaia, your guide" body="A soft AI voice that translates weather into feeling." />
            </div>
          </motion.section>
        ) : (
          <Scene
            key="scene"
            snap={snap!}
            tod={tod}
            setTod={setTod}
          />
        )}
      </AnimatePresence>

      <GaiaOrb snap={snap} />
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="font-display text-foreground">{title}</p>
      <p className="mt-2 leading-relaxed">{body}</p>
    </div>
  );
}

function Scene({
  snap, tod, setTod,
}: {
  snap: WeatherSnapshot;
  tod: number;
  setTod: (n: number) => void;
}) {
  const todLabel = ["Morning", "Afternoon", "Evening", "Night"][tod] ?? "Now";

  return (
    <motion.section
      id="scene"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9 }}
      className="relative z-10 mx-auto max-w-6xl px-6 pt-32 pb-40"
    >
      <div className="grid items-start gap-16 md:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
            {todLabel} in
          </p>
          <h2 className="font-display mt-2 text-6xl font-light leading-[0.95] md:text-8xl">
            {snap.city}
          </h2>
          {snap.country && (
            <p className="mt-2 text-muted-foreground">{snap.country}</p>
          )}

          <p className="font-display mt-10 max-w-xl text-2xl italic leading-snug text-foreground/90 md:text-3xl">
            “{snap.poetry.overall}”
          </p>

          <div className="mt-10 flex items-baseline gap-6">
            <span className="font-display text-7xl font-light">
              {Math.round(snap.tempC)}°
            </span>
            <div className="text-sm text-muted-foreground">
              <p>feels like {Math.round(snap.feelsLikeC)}°</p>
              <p className="capitalize">{snap.description}</p>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Whisper label="The air" body={snap.poetry.air} />
            <Whisper label="The wind" body={snap.poetry.wind} />
            <Whisper label="The sun" body={snap.poetry.sun} />
            <Whisper label="The sky" body={snap.poetry.sky} />
          </div>
        </div>

        <aside className="space-y-6">
          <div className="glass rounded-3xl p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Mood</p>
            <p className="font-display mt-3 text-4xl">{snap.mood}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Today {snap.city} feels {snap.mood.toLowerCase()}. Move with it.
            </p>
          </div>

          <div className="glass rounded-3xl p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Time travel</p>
            <input
              type="range"
              min={0}
              max={3}
              step={1}
              value={tod}
              onChange={(e) => setTod(Number(e.target.value))}
              className="mt-5 w-full accent-primary"
            />
            <div className="mt-2 flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>Morning</span><span>Afternoon</span><span>Evening</span><span>Night</span>
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Earth pulse</p>
            <div className="relative mt-4 grid h-40 place-items-center">
              <div className="absolute h-32 w-32 rounded-full bg-gradient-to-br from-ocean via-forest to-moss shadow-[0_0_60px_oklch(0.85_0.13_130/0.4)] breathe" />
              <div className="absolute h-40 w-40 rounded-full border border-primary/30" />
              <div className="absolute h-52 w-52 rounded-full border border-primary/10" />
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {snap.lat.toFixed(2)}°, {snap.lon.toFixed(2)}°
            </p>
          </div>
        </aside>
      </div>

      <div id="journal" className="mt-32 grid gap-8 md:grid-cols-2">
        <div className="glass rounded-3xl p-8">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Nature journal</p>
          <p className="font-display mt-4 text-2xl italic leading-relaxed">
            {journalEntry(snap)}
          </p>
          <p className="mt-6 text-xs text-muted-foreground">— written by the wind, {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <div id="memory" className="glass rounded-3xl p-8">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Save this moment</p>
          <p className="mt-4 text-foreground/90">
            “The {kindLabel(snap.kind)} {snap.isDay ? "afternoon" : "evening"} in {snap.city}.”
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Keep this weather like a postcard you can return to.
          </p>
          <button
            onClick={() => {
              const key = "gaia.memories";
              const prev = JSON.parse(localStorage.getItem(key) ?? "[]");
              prev.push({ city: snap.city, kind: snap.kind, at: Date.now() });
              localStorage.setItem(key, JSON.stringify(prev));
            }}
            className="mt-6 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
          >
            Keep this moment
          </button>
        </div>
      </div>

      <div id="about" className="mt-40 text-center">
        <p className="font-display text-3xl italic text-muted-foreground md:text-4xl">
          “The earth has music for those who listen.”
        </p>
      </div>
    </motion.section>
  );
}

function Whisper({ label, body }: { label: string; body: string }) {
  return (
    <div className="glass rounded-2xl p-5 float-slow">
      <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-relaxed text-foreground/90">{body}</p>
    </div>
  );
}

function kindLabel(k: WeatherKind) {
  switch (k) {
    case "clear": return "open-skied";
    case "clouds": return "soft grey";
    case "rain": return "rainy";
    case "storm": return "storm-lit";
    case "snow": return "snow-quiet";
    case "fog": return "misted";
    case "night": return "starry";
  }
}

function journalEntry(snap: WeatherSnapshot) {
  const fragments: Record<WeatherKind, string> = {
    clear: "The sky whispered softly today while the winds carried stories through the trees.",
    clouds: "A grey hush settled on the rooftops, and even footsteps felt slower.",
    rain: "The earth opened its hands to catch the falling sky.",
    storm: "The horizon argued with itself, and somewhere far away, light remembered it had a voice.",
    snow: "The world was wrapped in white silence; even thought arrived more slowly.",
    fog: "Distances disappeared. Only the next step existed.",
    night: "The dark was kind. Stars made small promises across the roof of the world.",
  };
  return `${snap.city}, ${snap.poetry.overall.toLowerCase()} ${fragments[snap.kind]}`;
}

function TreeBoot() {
  return (
    <svg viewBox="0 0 120 160" className="mx-auto h-40 w-40">
      <defs>
        <linearGradient id="g" x1="0" x2="0" y1="1" y2="0">
          <stop offset="0" stopColor="oklch(0.45 0.07 50)" />
          <stop offset="1" stopColor="oklch(0.85 0.13 130)" />
        </linearGradient>
      </defs>
      <motion.path
        d="M60 150 V90 M60 120 L40 100 M60 110 L80 90 M60 95 L45 80 M60 95 L78 78"
        stroke="url(#g)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
      />
      {[ [40, 100], [80, 90], [45, 80], [78, 78], [60, 90] ].map(([cx, cy], i) => (
        <motion.circle
          key={i}
          cx={cx}
          cy={cy}
          r={6}
          fill="oklch(0.62 0.1 130)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.9 }}
          transition={{ delay: 0.9 + i * 0.12, type: "spring", stiffness: 200, damping: 14 }}
        />
      ))}
    </svg>
  );
}
