import Link from "next/link";
import GradeBadge from "@/components/GradeBadge";
import { days, trip } from "@/lib/data";
import { dateForDay, formatShortDate } from "@/lib/dates";

export default function ItineraryPage() {
  return (
    <main className="wrap">
      <p className="kicker">Walk starts {trip.walkStart}</p>
      <h1 className="section-title" style={{ marginTop: 8 }}>
        Day by day
      </h1>
      <p className="small">
        Arrive Alice {trip.arriveAlice}. First walking day is Monday 12 April 2027 from the
        Telegraph Station. Fly home {trip.departAlice}.
      </p>
      {days.map((day) => {
        const date = dateForDay(day);
        return (
          <Link key={day.id} href={`/itinerary/${day.id}`} className="day-card">
            <div className="day-num">
              <small>{formatShortDate(date)}</small>
              <b>{day.dayLabel.replace("Day ", "").replace("Alice ", "A")}</b>
            </div>
            <div>
              <strong>{day.title}</strong>
              <div className="meta">
                {day.from} → {day.to}
              </div>
              <div className="meta">
                Sleep: {day.camp}
                {day.km > 0 ? ` · ${day.km} km` : ` · ${day.hours}`}
              </div>
            </div>
            <GradeBadge grade={day.grade} kind={day.kind} />
          </Link>
        );
      })}
    </main>
  );
}
