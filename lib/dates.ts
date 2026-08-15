import { days, getWaypoint, type DayPlan } from "@/lib/data";

/** First walking day: Monday 12 April 2027. Alice buffers are the Saturday and Sunday before. */
export const walkStartISO = "2027-04-12";

function atNoon(iso: string) {
  return new Date(`${iso}T12:00:00`);
}

export function addDays(base: Date, amount: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + amount);
  return next;
}

export function dateForDay(day: DayPlan) {
  const start = atNoon(walkStartISO);
  if (day.id === "a1") return addDays(start, -2);
  if (day.id === "a2") return addDays(start, -1);
  if (day.id === "p1") return addDays(start, 20);
  const n = Number(day.id);
  return addDays(start, n - 1);
}

export function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function sleepWaypoint(day: DayPlan) {
  if (day.kind === "summit" || day.kind === "alice" || day.kind === "depart") {
    return getWaypoint("alice");
  }
  return getWaypoint(day.waypointId);
}

export type OvernightPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  nights: DayPlan[];
  pinLabel: string;
  kind: DayPlan["kind"];
};

export function overnightPins(): OvernightPin[] {
  const grouped = new Map<string, OvernightPin>();

  for (const day of days) {
    if (day.id === "p1") continue;
    const point = sleepWaypoint(day);
    if (!point) continue;
    const existing = grouped.get(point.id);
    if (existing) {
      existing.nights.push(day);
    } else {
      grouped.set(point.id, {
        id: point.id,
        name: day.kind === "alice" || day.kind === "summit" ? "Alice Springs hotel" : point.name,
        lat: point.lat,
        lng: point.lng,
        nights: [day],
        pinLabel: "",
        kind: day.kind,
      });
    }
  }

  return [...grouped.values()].map((pin) => {
    const hotel = pin.nights.some((night) => night.kind === "alice" || night.kind === "summit");
    const walkNums = pin.nights
      .filter((night) => night.kind === "walk" || night.kind === "rest")
      .map((night) => night.dayLabel.replace("Day ", ""));
    const pinLabel = walkNums.length ? walkNums.join("·") : hotel ? "H" : "•";
    return { ...pin, pinLabel };
  });
}
