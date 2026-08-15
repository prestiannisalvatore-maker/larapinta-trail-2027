"use client";

import { useEffect, useState } from "react";
import { gear } from "@/lib/data";

const storageKey = "larapinta-gear-2027";

export default function GearPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) setChecked(JSON.parse(raw));
  }, []);

  function toggle(id: string) {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  const cats = [...new Set(gear.map((item) => item.cat))];
  const done = gear.filter((item) => checked[item.id]).length;

  return (
    <main className="wrap">
      <p className="kicker">Two walkers · pack your own kit</p>
      <h1 className="section-title" style={{ marginTop: 8 }}>
        Gear checklist
      </h1>
      <p className="small">
        {done} / {gear.length} packed. NT Parks: long loose clothing, brimmed hat, fuel stove only,
        and a PLB or satellite phone. Sleeping bag advice for the cool season is rated below −5 °C;
        April is milder, May can still frost in gorges.
      </p>
      {cats.map((cat) => (
        <section key={cat}>
          <h2 className="section-title">{cat}</h2>
          <article className="card">
            {gear
              .filter((item) => item.cat === cat)
              .map((item) => (
                <label key={item.id} className={`check ${checked[item.id] ? "done" : ""}`}>
                  <input
                    type="checkbox"
                    checked={Boolean(checked[item.id])}
                    onChange={() => toggle(item.id)}
                  />
                  <span>
                    {item.item}
                    {item.essential ? "" : " · optional"}
                  </span>
                </label>
              ))}
          </article>
        </section>
      ))}
    </main>
  );
}
