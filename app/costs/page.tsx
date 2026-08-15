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
      <div className="pills" style={{ marginBottom: 8 }}>
        <span className={`grade ${line.payer === "james" ? "rest" : "grade-4"}`}>
          {line.payer === "james" ? "James pays" : "Salvatore pays"}
        </span>
      </div>
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
      <p className="kicker">Split · James flights only · AUD</p>
      <h1 className="section-title" style={{ marginTop: 8 }}>
        Who pays what
      </h1>
      <p className="small">{budget.asOf}</p>

      <div className="grid">
        <div className="stat">
          <b>{money(budget.split.james.mid)}</b>
          <span>James · likely flight cost</span>
        </div>
        <div className="stat">
          <b>{money(budget.split.james.low)}–{money(budget.split.james.high)}</b>
          <span>James · flight range</span>
        </div>
        <div className="stat">
          <b>{money(budget.split.salvatore.mid)}</b>
          <span>Salvatore · likely total</span>
        </div>
        <div className="stat">
          <b>{money(budget.midTotal)}</b>
          <span>Whole trip, mid case</span>
        </div>
      </div>

      <h2 className="section-title">James Saville</h2>
      <article className="card">
        <p className="small">
          James pays his <strong>Brisbane ⇄ Alice Springs return flight only</strong>. Nothing else
          on this trip is on him: not Parks fees, camps, food, drops, the Redbank transfer, or Alice
          beds.
        </p>
      </article>
      {jamesLines.map((line) => (
        <LineCard key={line.item} line={line} />
      ))}

      <h2 className="section-title">Salvatore Prestianni</h2>
      <article className="card">
        <p className="small">
          You cover your Perth flights and every shared cost for both walkers. Mid case about{" "}
          {money(budget.split.salvatore.mid)} ({money(budget.split.salvatore.low)}–
          {money(budget.split.salvatore.high)}).
        </p>
      </article>
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

      <h2 className="section-title">Not in either total</h2>
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
