import { NextResponse } from "next/server";
import { searchBusinesses } from "@/lib/api";

type BusinessesRequest = {
  location?: unknown;
  businessType?: unknown;
};

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BusinessesRequest;
    const location = typeof body.location === "string" ? body.location.trim() : "";
    const businessType = typeof body.businessType === "string" ? body.businessType : "all";

    if (!location) {
      return NextResponse.json({ error: "Location is required." }, { status: 400 });
    }

    const businesses = await searchBusinesses(location, businessType);
    return NextResponse.json({ businesses });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch businesses.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
