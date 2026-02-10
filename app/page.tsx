import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-semibold text-stone-800 mb-4">
        Mental Health Check-in
      </h1>
      <p className="text-stone-600 mb-8 text-center max-w-md">
        Track your daily mood and review insights over time.
      </p>
      <Link
        href="/dashboard"
        className="px-5 py-2.5 rounded-lg bg-stone-800 text-white font-medium hover:bg-stone-700 transition"
      >
        Open dashboard
      </Link>
    </main>
  );
}
