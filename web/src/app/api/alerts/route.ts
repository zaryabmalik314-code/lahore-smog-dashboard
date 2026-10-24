import { NextResponse, connection } from "next/server";
import { db, historyEnabled } from "@/lib/history";
import { recentAlerts } from "@/lib/alerts";

/**
 * Alerts raised by the scheduled evaluation.
 *
 * Open like the export endpoints: a department running its own system can poll
 * this rather than waiting for a webhook to be wired up to it.
 */
export async function GET(request: Request) {
  await connection();

  if (!historyEnabled()) {
    return NextResponse.json({ alerts: [], enabled: false });
  }

  const url = new URL(request.url);
  const hours = Math.min(Math.max(Number(url.searchParams.get("hours")) || 48, 1), 720);

  try {
    const conn = await db();
    if (!conn) return NextResponse.json({ alerts: [], enabled: false });

    const alerts = await recentAlerts(conn, hours, 100);
    return NextResponse.json(
      { window_hours: hours, count: alerts.length, alerts },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e) {
    console.error("[alerts] query failed:", e);
    return NextResponse.json({ alerts: [], error: true }, { status: 503 });
  }
}
