import type { DayKind, Grade } from "@/lib/data";

export default function GradeBadge({ grade, kind }: { grade?: Grade; kind?: DayKind }) {
  if (kind === "rest") return <span className="grade rest">Rest</span>;
  if (kind === "alice" || kind === "depart") return <span className="grade">Alice</span>;
  if (!grade) return null;
  return <span className={`grade grade-${grade}`}>G{grade}</span>;
}
