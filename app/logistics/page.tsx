import { fees, flights, foodDrops, sources, transfers, waterPoints } from "@/lib/data";

export default function LogisticsPage() {
  return (
    <main className="wrap">
      <p className="kicker">Bookings · flights · water · drops</p>
      <h1 className="section-title" style={{ marginTop: 8 }}>
        Logistics
      </h1>
      <article className="card">
        <p className="kicker">Money</p>
        <h3 style={{ margin: "0 0 8px" }}>About $5,500 for both of you</h3>
        <p className="small">
          Mid-case April–May budget in 2026 prices: flights, Alice beds, Parks fees, food drops,
          Redbank transfer and trail food. Lean is about $4,500. Comfortable is about $6,800. Open
          the Cost tab for the line-by-line split.
        </p>
      </article>

      <h2 className="section-title">Flights</h2>
      <article className="card">
        <h3>{flights.salvatore.name} · {flights.salvatore.from}</h3>
        <ul className="hl">
          {flights.salvatore.options.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
      <article className="card">
        <h3>{flights.james.name} · {flights.james.from}</h3>
        <ul className="hl">
          {flights.james.options.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
      <p className="small">
        Meet in Alice two nights before Day 1. Do not fly home on the summit day. 2027 schedules
        usually appear from late 2026.
      </p>

      <h2 className="section-title">Transfers</h2>
      {transfers.map((item) => (
        <article className="card" key={item.name}>
          <h3 style={{ marginTop: 0 }}>{item.name}</h3>
          <p className="small">{item.detail}</p>
        </article>
      ))}

      <h2 className="section-title">Food drops</h2>
      {foodDrops.map((drop) => (
        <article className="card" key={drop.stop}>
          <p className="kicker">{drop.day}</p>
          <h3 style={{ margin: "0 0 8px" }}>{drop.stop}</h3>
          <p className="small">
            Covers {drop.covers}. {drop.access}
          </p>
        </article>
      ))}

      <h2 className="section-title">Water, east to west</h2>
      <article className="card" style={{ overflowX: "auto" }}>
        <p className="small">
          Official NT Parks tank table. Treat tank water. Surface water is unreliable. Carry 4–6 L on
          ordinary April–May days and 6 L+ onto Section 9.
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>Location</th>
              <th>Type</th>
              <th>Km</th>
            </tr>
          </thead>
          <tbody>
            {waterPoints.map((row) => (
              <tr key={row.location}>
                <td>
                  {row.location}
                  <div className="meta">Section {row.section}</div>
                </td>
                <td>{row.type}</td>
                <td>{row.kmFromLast}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <h2 className="section-title">Fees to confirm for 2027</h2>
      {fees.map((fee) => (
        <article className="card" key={fee.item}>
          <strong>{fee.item}</strong>
          <div className="meta">{fee.each}</div>
          <p className="small">{fee.note}</p>
        </article>
      ))}

      <h2 className="section-title">Camping rules</h2>
      <article className="card">
        <ul className="hl">
          <li>Camp only in designated booked sites. There are 26 Parks camps plus private Standley Chasm.</li>
          <li>No fires. Fuel stove or the free barbecues at some trailheads only.</li>
          <li>Book every night before you start at parkbookings.nt.gov.au.</li>
          <li>Jay Creek is walk-in only. Standley Chasm charges its own entry and camping fees.</li>
        </ul>
      </article>

      <h2 className="section-title">Verified sources</h2>
      <article className="card">
        <ul className="hl">
          {sources.map((source) => (
            <li key={source.href}>
              <a href={source.href} target="_blank" rel="noreferrer">
                {source.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="small">
          Distances and grades follow NT Parks. GPS alignment is OpenStreetMap relation 3066363,
          licensed ODbL. Fees and commercial package prices are 2026 figures and must be rechecked
          before you pay.
        </p>
      </article>
    </main>
  );
}
