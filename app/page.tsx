import Link from "next/link";
import { days, sections, trip } from "@/lib/data";

const walkKm = days.filter((d) => d.km > 0).reduce((sum, d) => sum + d.km, 0);

export default function HomePage() {
  return (
    <main className="wrap">
      <section className="hero">
        <p className="kicker">Tjoritja / West MacDonnell · Arrernte Country</p>
        <h1>Larapinta Trail 2027</h1>
        <p className="lede">
          East-to-west end-to-end for {trip.walkers[0]} and {trip.walkers[1]}. Arrive Alice Saturday
          10 April. Walk starts Monday 12 April 2027. Mt Sonder sunrise Saturday 1 May.
        </p>
        <div className="pills">
          <span className="pill">Mon 12 Apr 2027 start</span>
          <span className="pill">{trip.direction}</span>
          <span className="pill">Commercial food drops</span>
          <span className="pill">Perth + Brisbane → Alice</span>
        </div>
        <div className="grid">
          <div className="stat">
            <b>~{Math.round(walkKm)} km</b>
            <span>Walking distance in this plan</span>
          </div>
          <div className="stat">
            <b>20 days</b>
            <span>18 walking + 2 rest</span>
          </div>
          <div className="stat">
            <b>Grade 5</b>
            <span>Sections 4, 5 and 9 — split</span>
          </div>
          <div className="stat">
            <b>~$750</b>
            <span>James · get to Alice</span>
          </div>
        </div>
      </section>

      <div className="row" style={{ marginTop: 18 }}>
        <Link className="btn" href="/itinerary">
          Open day-by-day
        </Link>
        <Link className="btn ghost" href="/costs">
          See the cost
        </Link>
      </div>

      <h2 className="section-title">The walk</h2>
      <article className="card">
        <p className="small">
          NT Parks describes the Larapinta as a 230 km+ track in 12 sections along Tjoritja / West
          MacDonnell National Park. Official advice is to allow about 20 days for a remote
          end-to-end, including rest and resupply. This app follows that pace, east to west, for two
          experienced walkers in April–May 2027.
        </p>
        <p className="small">
          Salvatore flies Perth to Alice Springs. James flies Brisbane to Alice Springs. You meet in Alice,
          pack commercial food drops, walk from the Telegraph Station to Mt Sonder, and take a
          transfer from Redbank Gorge back to town. James just needs to get to Alice Springs — about
          $570–$970 for the Brisbane return. The rest of the trip, about $4,750 mid case, sits with
          Salvatore.
        </p>
      </article>

      <h2 className="section-title">Hardest ground</h2>
      {sections
        .filter((s) => s.grade === 5)
        .map((s) => (
          <article className="card" key={s.id}>
            <p className="kicker">Section {s.id} · Grade 5</p>
            <h3 style={{ margin: "0 0 8px" }}>{s.name}</h3>
            <p className="small">
              {s.km} km. {s.officialNote}
            </p>
          </article>
        ))}

      <h2 className="section-title">Before you book</h2>
      <article className="card">
        <ul className="hl">
          <li>Book camps and the walking fee at parkbookings.nt.gov.au when 2027 dates open.</li>
          <li>April–May is inside the official cool-season window, but April can still be hot. Start early.</li>
          <li>NT Parks says do not walk alone. Two people is the minimum — stay together on Grade 5 days.</li>
          <li>Carry a PLB or satellite messenger. Do not rely on mobile coverage.</li>
        </ul>
      </article>
    </main>
  );
}
