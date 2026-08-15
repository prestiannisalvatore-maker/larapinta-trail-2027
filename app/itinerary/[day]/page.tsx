import Link from "next/link";
import { notFound } from "next/navigation";
import GradeBadge from "@/components/GradeBadge";
import { days, getDay, getWaypoint } from "@/lib/data";

export function generateStaticParams() {
  return days.map((day) => ({ day: day.id }));
}

export default async function DayPage({ params }: { params: Promise<{ day: string }> }) {
  const { day: id } = await params;
  const day = getDay(id);
  if (!day) notFound();

  const point = getWaypoint(day.waypointId);
  const index = days.findIndex((d) => d.id === day.id);
  const prev = days[index - 1];
  const next = days[index + 1];

  return (
    <main className="wrap">
      <Link href="/itinerary" className="back">
        ← All days
      </Link>
      <p className="kicker">
        {day.dayLabel}
        {day.section !== "—" ? ` · Section ${day.section}` : ""}
      </p>
      <h1 className="section-title" style={{ marginTop: 6 }}>
        {day.title}
      </h1>
      <div className="pills" style={{ marginBottom: 16 }}>
        <GradeBadge grade={day.grade} kind={day.kind} />
        {day.km > 0 ? <span className="pill">{day.km} km</span> : null}
        <span className="pill">{day.hours}</span>
        <span className="pill">{day.camp}</span>
      </div>

      <article className="card">
        <p className="meta">
          {day.from} → {day.to}
        </p>
        <p>
          <strong>Water carry:</strong> {day.waterCarryL}
        </p>
        <p className="small">{day.waterNote}</p>
        <p>
          <strong>Food:</strong> {day.food}
        </p>
        {point ? (
          <p className="small">
            Camp / focus GPS: {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
          </p>
        ) : null}
      </article>

      <h2 className="section-title">Highlights</h2>
      <article className="card">
        <ul className="hl">
          {day.highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>

      <h2 className="section-title">Notes</h2>
      <article className="card">
        <ul className="notes">
          {day.notes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>

      <div className="row">
        {prev ? (
          <Link className="btn ghost" href={`/itinerary/${prev.id}`}>
            ← {prev.dayLabel}
          </Link>
        ) : null}
        {next ? (
          <Link className="btn" href={`/itinerary/${next.id}`}>
            {next.dayLabel} →
          </Link>
        ) : null}
      </div>
    </main>
  );
}
