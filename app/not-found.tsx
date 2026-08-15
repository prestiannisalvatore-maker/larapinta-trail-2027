import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap">
      <h1 className="section-title">That day is not on the plan</h1>
      <Link className="btn" href="/itinerary">
        Back to the itinerary
      </Link>
    </main>
  );
}
