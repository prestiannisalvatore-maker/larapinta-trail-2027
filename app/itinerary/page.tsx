import Link from "next/link";
import GradeBadge from "@/components/GradeBadge";
import { days } from "@/lib/data";

export default function ItineraryPage() {
  return (
    <main className="wrap">
      <p className="kicker">East to west · April–May 2027</p>
      <h1 className="section-title" style={{ marginTop: 8 }}>
        Day by day
      </h1>
      <p className="small">
        Alice buffers, 18 walking days, rest at Standley Chasm and Ormiston Gorge, sunrise on Mt
        Sonder, then the transfer home.
      </p>
      {days.map((day) => (
        <Link key={day.id} href={`/itinerary/${day.id}`} className="day-card">
          <div className="day-num">
            <small>{day.kind === "walk" || day.kind === "summit" ? "Walk" : day.kind}</small>
            <b>{day.dayLabel.replace("Day ", "")}</b>
          </div>
          <div>
            <strong>{day.title}</strong>
            <div className="meta">
              {day.from} → {day.to}
            </div>
            <div className="meta">{day.km > 0 ? `${day.km} km · ${day.hours}` : day.hours}</div>
          </div>
          <GradeBadge grade={day.grade} kind={day.kind} />
        </Link>
      ))}
    </main>
  );
}
