import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const room = searchParams.get("room") || `jarvis-room-${Math.random().toString(36).substring(7)}`;
    const identity = searchParams.get("identity") || `user-${Math.random().toString(36).substring(7)}`;
    const name = searchParams.get("name") || "Sir";

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      return NextResponse.json(
        { error: "LIVEKIT_API_KEY, LIVEKIT_API_SECRET, or LIVEKIT_URL is not configured." },
        { status: 500 }
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name,
    });

    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      url: wsUrl,
      room,
      identity,
    });
  } catch (error) {
    console.error("Error creating token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
