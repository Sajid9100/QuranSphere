// Zoom Server-to-Server OAuth client.
//
// Setup: create a Server-to-Server OAuth app in the Zoom developer portal
// (https://marketplace.zoom.us/), add scopes `meeting:write:meeting:admin`,
// then drop these into .env.local:
//
//   ZOOM_ACCOUNT_ID=...
//   ZOOM_CLIENT_ID=...
//   ZOOM_CLIENT_SECRET=...
//   ZOOM_HOST_EMAIL=teacher-host@example.com   # or "me" for the account owner

const accountId = process.env.ZOOM_ACCOUNT_ID;
const clientId = process.env.ZOOM_CLIENT_ID;
const clientSecret = process.env.ZOOM_CLIENT_SECRET;
const hostEmail = process.env.ZOOM_HOST_EMAIL || "me";

const isPlaceholder = (v: string | undefined) =>
  !v || v.includes("your_zoom") || v.includes("xxxx");

export const isZoomConfigured =
  !isPlaceholder(accountId) &&
  !isPlaceholder(clientId) &&
  !isPlaceholder(clientSecret);

// Tokens are valid for 1 hour. Cache and refresh ~60s before expiry so we
// don't hammer Zoom's OAuth endpoint on every booking.
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const url = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(
    accountId!
  )}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom OAuth failed: ${res.status} ${body}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

export type ScheduledMeeting = {
  meetingId: string;
  joinUrl: string;
  startUrl: string;
  password: string;
};

// `selected_slot` is sometimes a human-readable string ("Tue 2pm UTC") rather
// than an ISO timestamp. Zoom's API wants ISO 8601 — parse what we can, and
// fall back to the current time (a meeting's join URL works regardless of its
// scheduled start) so a booking confirmation never fails on an odd slot value.
function normalizeStartTime(value: string): string {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  console.warn(
    `[zoom] unparseable start time ${JSON.stringify(value)} — falling back to now`
  );
  return new Date().toISOString();
}

export async function createScheduledMeeting(args: {
  topic: string;
  startTime: string; // ISO 8601 in UTC
  durationMinutes: number;
}): Promise<ScheduledMeeting> {
  const startTime = normalizeStartTime(args.startTime);
  if (!isZoomConfigured) {
    throw new Error("Zoom is not configured on the server.");
  }
  const token = await getAccessToken();
  const userPath = encodeURIComponent(hostEmail);

  const res = await fetch(`https://api.zoom.us/v2/users/${userPath}/meetings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: args.topic,
      type: 2, // scheduled
      start_time: startTime,
      duration: Math.max(15, args.durationMinutes),
      timezone: "UTC",
      settings: {
        join_before_host: true,
        waiting_room: false,
        host_video: true,
        participant_video: true,
        mute_upon_entry: false,
        approval_type: 2, // no registration required
        auto_recording: "none",
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom create meeting failed: ${res.status} ${body}`);
  }
  const json = (await res.json()) as {
    id: number;
    join_url: string;
    start_url: string;
    password?: string;
  };
  return {
    meetingId: String(json.id),
    joinUrl: json.join_url,
    startUrl: json.start_url,
    password: json.password ?? "",
  };
}

export async function updateScheduledMeeting(args: {
  meetingId: string;
  startTime: string;
  durationMinutes: number;
}): Promise<void> {
  if (!isZoomConfigured) {
    throw new Error("Zoom is not configured on the server.");
  }
  const token = await getAccessToken();
  const res = await fetch(
    `https://api.zoom.us/v2/meetings/${encodeURIComponent(args.meetingId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        start_time: normalizeStartTime(args.startTime),
        duration: Math.max(15, args.durationMinutes),
        timezone: "UTC",
      }),
    }
  );
  if (!res.ok && res.status !== 204) {
    const body = await res.text();
    throw new Error(`Zoom update meeting failed: ${res.status} ${body}`);
  }
}

export async function deleteScheduledMeeting(meetingId: string): Promise<void> {
  if (!isZoomConfigured) {
    throw new Error("Zoom is not configured on the server.");
  }
  const token = await getAccessToken();
  const res = await fetch(
    `https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  // 204 = deleted, 404 = already gone (treat as success).
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    const body = await res.text();
    throw new Error(`Zoom delete meeting failed: ${res.status} ${body}`);
  }
}

// Zoom join URLs look like https://zoom.us/j/12345678901?pwd=...
// or https://us02web.zoom.us/j/12345678901. Pull the numeric id after "/j/".
export function extractMeetingIdFromJoinUrl(url: string): string | null {
  if (!url) return null;
  const m = url.match(/\/j\/(\d+)/);
  return m ? m[1] : null;
}
