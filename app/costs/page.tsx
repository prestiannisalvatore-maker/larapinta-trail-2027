import Link from "next/link";
import { budget, type CostLine } from "@/lib/data";

function money(n: number) {
  return `$${n.toLocaleString("en-AU")}`;
}

function groupSum(lines: CostLine[]) {
  return {
    low: lines.reduce((s, l) => s + l.pairLow, 0),
    mid: lines.reduce((s, l) => s + l.pairMid, 0),
    high: lines.reduce((s, l) => s + l.pairHigh, 0),
  };
}

function LineCard({ line }: { line: CostLine }) {
  return (
    <article className="card">
      <strong>{line.item}</strong>
      <div className="meta">{line.each}</div>
      <p style={{ margin: "10px 0 0" }}>
        {money(line.pairLow)}–{money(line.pairHigh)}
        <span className="meta"> · mid {money(line.pairMid)}</span>
      </p>
      <p className="small">{line.note}</p>
    </article>
  );
}

export default function CostsPage() {
  const jamesLines = budget.groups.flatMap((group) => group.lines.filter((line) => line.payer === "james"));
  const salvatoreGroups = budget.groups
    .map((group) => ({
      ...group,
      lines: group.lines.filter((line) => line.payer === "salvatore"),
    }))
    .filter((group) => group.lines.length > 0);

  return (
    <main className="wrap">
      <p className="kicker">April–May 2027 · AUD</p>
      <h1 className="section-title" style={{ marginTop: 8 }}>
        Costs
      </h1>
      <p className="small">{budget.asOf}</p>

      <article className="card">
        <h2 style={{ margin: "0 0 6px" }}>James Saville</h2>
        <p style={{ margin: 0 }}>
          <strong>{money(budget.split.james.mid)}</strong>
          <span className="meta">
            {" "}
            likely · {money(budget.split.james.low)}–{money(budget.split.james.high)}
          </span>
        </p>
        <p className="small">
          James just needs to get to Alice Springs. His Brisbane ⇄ Alice return flight is the only
          amount against his name.
        </p>
      </article>

      <article className="card">
        <h2 style={{ margin: "0 0 6px" }}>Salvatore Prestianni</h2>
        <p style={{ margin: 0 }}>
          <strong>{money(budget.split.salvatore.mid)}</strong>
          <span className="meta">
            {" "}
            likely · {money(budget.split.salvatore.low)}–{money(budget.split.salvatore.high)}
          </span>
        </p>
        <p className="small">
          Perth flights, Alice beds, Parks fees, camps, food drops, the Redbank transfer, and food
          for both walkers.
        </p>
      </article>

      <h2 className="section-title">James Saville</h2>
      {jamesLines.map((line) => (
        <LineCard key={line.item} line={line} />
      ))}

      <h2 className="section-title">Salvatore Prestianni</h2>
      {salvatoreGroups.map((group) => {
        const totals = groupSum(group.lines);
        return (
          <section key={group.name}>
            <h3 className="section-title" style={{ fontSize: 22 }}>
              {group.name}
            </h3>
            {group.lines.map((line) => (
              <LineCard key={line.item} line={line} />
            ))}
            <p className="small">
              {group.name} mid subtotal {money(totals.mid)} (
              {money(totals.low)}–{money(totals.high)}).
            </p>
          </section>
        );
      })}

      <h2 className="section-title">Not in these totals</h2>
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
