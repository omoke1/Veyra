"use client";

import DemoOne from "@/components/ui/demo";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-black text-white">
      <DemoOne />
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="pointer-events-none max-w-3xl text-center">
          <h1 className="pointer-events-auto text-4xl md:text-6xl font-semibold tracking-tight">
            Verifiable Prediction Oracle
          </h1>
          <p className="pointer-events-auto mt-4 text-white/70">
            Trust-minimized market resolution with attestations and on-chain verification.
          </p>
          <div className="pointer-events-auto mt-8 flex items-center justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-md bg-white/10 px-5 py-2 text-sm hover:bg-white/20 transition"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}


