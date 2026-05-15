import { NextResponse } from "next/server";
import { scrapeGoogleMapsBusinesses } from "@/lib/google-maps";

type ScrapeRequest = {
  location?: unknown;
  businessType?: unknown;
};

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ScrapeRequest;
    const location = typeof body.location === "string" ? body.location.trim() : "";
    const businessType = typeof body.businessType === "string" ? body.businessType : "all";

    if (!location) {
      return NextResponse.json({ error: "Location is required." }, { status: 400 });
    }

    const businesses = await Promise.race([
      scrapeGoogleMapsBusinesses(location, businessType),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Google Maps scraping timed out. Try a more specific business type or location.")), 50000);
      }),
    ]);

    return NextResponse.json({ businesses });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Google Maps scraping failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
