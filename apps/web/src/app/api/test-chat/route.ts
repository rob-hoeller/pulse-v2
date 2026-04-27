import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    // For now, just return a placeholder response
    // In production, this would connect to the actual Schellie API
    return NextResponse.json({
      message: "[Test Mode] Schellie would respond here. Connect to Schellie API to enable live testing.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Test chat API error:", error);
    return NextResponse.json(
      { 
        error: "Failed to process test chat message",
        message: "[Test Mode] Schellie would respond here. Connect to Schellie API to enable live testing.",
      },
      { status: 500 }
    );
  }
}