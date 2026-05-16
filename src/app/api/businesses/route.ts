import { NextResponse } from "next/server";
import { searchBusinesses } from "@/lib/api";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const location = typeof body.location === "string" ? body.location.trim() : "";
    const businessType = typeof body.businessType === "string" ? body.businessType : "all";

    if (!location) {
      return NextResponse.json({ error: "Location is required." }, { status: 400 });
    }

    // Now that searchBusinesses is highly optimized (2-5s), Edge runtime handles it easily.
    const businesses = await searchBusinesses(location, businessType);

    return NextResponse.json({ businesses });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : "Failed to fetch businesses.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
