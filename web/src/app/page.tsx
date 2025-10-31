import { Metadata } from "next";
import LandingPageClient from "./landing-client";

export const metadata: Metadata = {
  title: "Veyra — Verifiable Prediction Oracle",
  description: "Verifiable Prediction Oracle for transparent, reproducible market outcomes.",
};

export default function Home() {
  return <LandingPageClient />;
}
