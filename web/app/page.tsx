"use client";

import dynamic from "next/dynamic";

const Experience = dynamic(() => import("./story/Experience"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#0c0e12] flex items-center justify-center">
      <p className="text-white/50 text-sm">Loading…</p>
    </div>
  ),
});

export default function Home() {
  return <Experience />;
}
