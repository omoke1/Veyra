"use client";

import DemoOne from "@/components/ui/demo";
import Link from "next/link";

export default function LandingPageClient() {
  return (
    <main className="relative min-h-screen bg-black text-white">
      <DemoOne />
      <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-6">
        <div className="pointer-events-none max-w-3xl text-center">
          <h1 className="pointer-events-auto text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight">
            Veyra
          </h1>
          <p className="pointer-events-auto mt-3 sm:mt-4 text-sm sm:text-base text-white/70 px-2">
            Verifiable Prediction Oracle for transparent, reproducible market outcomes.
          </p>
          <div className="pointer-events-auto mt-6 sm:mt-8 flex items-center justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-md bg-white/10 px-4 sm:px-5 py-2 text-xs sm:text-sm hover:bg-white/20 transition focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Launch App
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}


