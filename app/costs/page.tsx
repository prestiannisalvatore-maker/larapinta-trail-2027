import Link from "next/link";
import { budget } from "@/lib/data";

function money(n: number) {
  return `$${n.toLocaleString("en-AU")}`;
}

function groupSum(lines: { pairLow: number; pairMid: number; pairHigh: number }[]) {
  return {
    low: lines.reduce((s, l) => s + l.pairLow, 0),
    mid: lines.reduce((s, l) => s + l.pairMid, 0),
    high: lines.reduce((s, l) => s + l.pairHigh, 0),
  };
}

export default function CostsPage() {
  const summed = budget.groups.reduce(
    (acc, group) => {
      const g = groupSum(group.lines);
      return { low: acc.low + g.low, mid: acc.mid + g.mid, high: acc.high + g.high };
    },
    { low: 0, mid: 0, high: 0 },
  );

  return (
    <main className="wrap">
      <p className="kicker">Two walkers · AUD · 2026 prices</p>
      <h1 className="section-title" style={{ marginTop: 8 }}>
        Trip cost
      </h1>
      <p className="small">{budget.asOf}</p>

      <div className="grid">
        <div className="stat">
          <b>{money(budget.lowTotal)}</b>
          <span>Lean pair total</span>
        </div>
        <div className="stat">
          <b>{money(budget.midTotal)}</b>
          <span>Likely pair total</span>
        </div>
        <div className="stat">
          <b>{money(budget.highTotal)}</b>
          <span>Comfortable pair total</span>
        </div>
        <div className="stat">
          <b>{money(Math.round(budget.midTotal / 2))}</b>
          <span>About this each, mid case</span>
        </div>
      </div>

      <article className="card" style={{ marginTop: 16 }}>
        <p className="small">
          The likely number is about {money(budget.midTotal)} for both of you, or{" "}
          {money(Math.round(budget.midTotal / 2))} each, if you share a room, share three food-drop
          boxes, and book Airnorth / Virgin rather than the dearest Qantas fares. Line items below
          add to {money(summed.mid)} in the mid column before you round for 2027 inflation.
        </p>
      </article>

      {budget.groups.map((group) => {
        const totals = groupSum(group.lines);
        return (
          <section key={group.name}>
            <h2 className="section-title">{group.name}</h2>
            {group.lines.map((line) => (
              <article className="card" key={line.item}>
                <strong>{line.item}</strong>
                <div className="meta">{line.each}</div>
                <p style={{ margin: "10px 0 0" }}>
                  Pair: {money(line.pairLow)}–{money(line.pairHigh)}
                  <span className="meta"> · mid {money(line.pairMid)}</span>
                </p>
                <p className="small">{line.note}</p>
              </article>
            ))}
            <p className="small">
              {group.name} mid subtotal {money(totals.mid)} for two (
              {money(totals.low)}–{money(totals.high)}).
            </p>
          </section>
        );
      })}

      <h2 className="section-title">Not in the total</h2>
      <article className="card">
        <ul className="hl">
          {budget.notIncluded.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>

      <div className="row">
        <Link className="btn" href="/logistics">
          Bookings and logistics
        </Link>
        <Link className="btn ghost" href="/gear">
          Gear list
        </Link>
      </div>
    </main>
  );
}
