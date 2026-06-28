export type WeatherKind = "clear" | "clouds" | "rain" | "storm" | "snow" | "fog" | "night";

export type Mood = "Calm" | "Energetic" | "Melancholic" | "Peaceful" | "Wild" | "Hopeful";

export type WeatherSnapshot = {
  city: string;
  country?: string;
  lat: number;
  lon: number;
  tempC: number;
  feelsLikeC: number;
  humidity: number;
  windKph: number;
  uvIndex: number;
  cloudCover: number;
  precipitation: number;
  isDay: boolean;
  code: number;
  kind: WeatherKind;
  description: string;
  mood: Mood;
  poetry: {
    overall: string;
    air: string;
    wind: string;
    sun: string;
    sky: string;
  };
  hours: HourSlice[]; // [morning, afternoon, evening, night]
};

export type HourSlice = {
  label: "Morning" | "Afternoon" | "Evening" | "Night";
  tempC: number;
  feelsLikeC: number;
  code: number;
  isDay: boolean;
  kind: WeatherKind;
  description: string;
};

// WMO weather interpretation codes -> kind
export function codeToKind(code: number, isDay: boolean): WeatherKind {
  if (!isDay) return "night";
  if ([95, 96, 99].includes(code)) return "storm";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([45, 48].includes(code)) return "fog";
  if ([1, 2, 3].includes(code)) return "clouds";
  if (code === 0) return "clear";
  return "clouds";
}

export function codeToText(code: number): string {
  const map: Record<number, string> = {
    0: "clear skies", 1: "mostly clear", 2: "partly cloudy", 3: "overcast",
    45: "foggy", 48: "rime fog",
    51: "light drizzle", 53: "drizzle", 55: "dense drizzle",
    56: "freezing drizzle", 57: "freezing drizzle",
    61: "light rain", 63: "rain", 65: "heavy rain",
    66: "freezing rain", 67: "freezing rain",
    71: "light snow", 73: "snow", 75: "heavy snow", 77: "snow grains",
    80: "rain showers", 81: "rain showers", 82: "violent showers",
    85: "snow showers", 86: "heavy snow showers",
    95: "thunderstorm", 96: "thunderstorm with hail", 99: "severe thunderstorm",
  };
  return map[code] ?? "shifting weather";
}

export function moodFor(kind: WeatherKind, tempC: number, wind: number): Mood {
  if (kind === "storm") return "Wild";
  if (kind === "rain") return tempC < 10 ? "Melancholic" : "Peaceful";
  if (kind === "snow") return "Peaceful";
  if (kind === "fog") return "Melancholic";
  if (kind === "clear") return tempC > 22 ? "Energetic" : "Hopeful";
  if (kind === "night") return "Calm";
  if (wind > 25) return "Wild";
  return "Calm";
}

export function poeticAir(humidity: number) {
  if (humidity < 30) return "The air is dry and weightless, like paper.";
  if (humidity < 55) return "The air feels easy on the skin.";
  if (humidity < 75) return "The air feels rich with moisture.";
  return "The air is heavy, almost drinkable.";
}

export function poeticWind(kph: number) {
  if (kph < 5) return "The winds are sleeping.";
  if (kph < 15) return "The winds are wandering gently.";
  if (kph < 30) return "The winds are speaking softly through the trees.";
  if (kph < 50) return "The winds are restless today.";
  return "The winds are roaring across the land.";
}

export function poeticSun(uv: number, isDay: boolean) {
  if (!isDay) return "The sun is resting beneath the horizon.";
  if (uv < 2) return "The sun is shy behind a veil.";
  if (uv < 5) return "The sun is kind today.";
  if (uv < 8) return "The sun is bright and watchful.";
  return "The sun burns with full intention.";
}

export function poeticSky(kind: WeatherKind) {
  switch (kind) {
    case "clear": return "The sky is wide open, holding nothing back.";
    case "clouds": return "The sky is dressed in soft grey wool.";
    case "rain": return "The sky is letting go of what it carried.";
    case "storm": return "The sky is full of thunder and old stories.";
    case "snow": return "The sky is shedding quiet little stars.";
    case "fog": return "The sky has come down to walk beside you.";
    case "night": return "The sky is full of distant fires.";
  }
}

export function poeticOverall(snap: Omit<WeatherSnapshot, "poetry" | "mood">): string {
  const k = snap.kind;
  const place = snap.city;
  switch (k) {
    case "clear": return `${place} is bathed in open light.`;
    case "clouds": return `${place} drifts beneath a soft grey hush.`;
    case "rain": return `${place} listens to a slow, steady falling.`;
    case "storm": return `${place} is wrapped in wind and thunder.`;
    case "snow": return `${place} is sleeping under a quiet white.`;
    case "fog": return `${place} is half-remembered through the mist.`;
    case "night": return `${place} is breathing under a sky of stars.`;
  }
}

export async function geocodeCity(query: string) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not find that place.");
  const j = await res.json();
  const r = j.results?.[0];
  if (!r) throw new Error("That place is hiding from us.");
  return { name: r.name as string, country: r.country as string | undefined, lat: r.latitude as number, lon: r.longitude as number };
}

export async function fetchWeather(city: string): Promise<WeatherSnapshot> {
  const geo = await geocodeCity(city);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,uv_index&hourly=temperature_2m,apparent_temperature,weather_code,is_day&forecast_days=2&wind_speed_unit=kmh&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("The sky did not answer.");
  const j = await res.json();
  const c = j.current;
  const isDay = c.is_day === 1;
  const kind = codeToKind(c.weather_code, isDay);

  // Pick hours nearest 8 / 14 / 19 / 23 from current local time forward
  const targets: { label: HourSlice["label"]; hour: number }[] = [
    { label: "Morning", hour: 8 },
    { label: "Afternoon", hour: 14 },
    { label: "Evening", hour: 19 },
    { label: "Night", hour: 23 },
  ];
  const times: string[] = j.hourly?.time ?? [];
  const hTemp: number[] = j.hourly?.temperature_2m ?? [];
  const hFeel: number[] = j.hourly?.apparent_temperature ?? [];
  const hCode: number[] = j.hourly?.weather_code ?? [];
  const hDay: number[] = j.hourly?.is_day ?? [];
  const nowIdx = Math.max(0, times.findIndex((t) => t === c.time));
  const hours: HourSlice[] = targets.map(({ label, hour }) => {
    let bestIdx = nowIdx;
    let bestDiff = 99;
    for (let i = nowIdx; i < Math.min(times.length, nowIdx + 24); i++) {
      const h = new Date(times[i]).getHours();
      const d = Math.abs(h - hour);
      if (d < bestDiff) { bestDiff = d; bestIdx = i; }
    }
    const day = (hDay[bestIdx] ?? 1) === 1;
    const code = hCode[bestIdx] ?? c.weather_code;
    return {
      label,
      tempC: hTemp[bestIdx] ?? c.temperature_2m,
      feelsLikeC: hFeel[bestIdx] ?? c.apparent_temperature,
      code,
      isDay: day,
      kind: codeToKind(code, day),
      description: codeToText(code),
    };
  });

  const base = {
    city: geo.name,
    country: geo.country,
    lat: geo.lat,
    lon: geo.lon,
    tempC: c.temperature_2m,
    feelsLikeC: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    windKph: c.wind_speed_10m,
    uvIndex: c.uv_index ?? 0,
    cloudCover: c.cloud_cover,
    precipitation: c.precipitation,
    isDay,
    code: c.weather_code,
    kind,
    description: codeToText(c.weather_code),
  };
  const snap: WeatherSnapshot = {
    ...base,
    mood: moodFor(kind, base.tempC, base.windKph),
    poetry: {
      overall: poeticOverall(base),
      air: poeticAir(base.humidity),
      wind: poeticWind(base.windKph),
      sun: poeticSun(base.uvIndex, isDay),
      sky: poeticSky(kind),
    },
    hours,
  };
  return snap;
}