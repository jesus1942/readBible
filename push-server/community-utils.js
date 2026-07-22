export function normalizeChurchKey(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function distanceMeters(latA, lngA, latB, lngB) {
  if ([latA, lngA, latB, lngB].some((value) => value == null || value === "")) return null;
  const values = [latA, lngA, latB, lngB].map(Number);
  if (!values.every(Number.isFinite)) return null;
  const [aLat, aLng, bLat, bLng] = values;
  if (Math.abs(aLat) > 90 || Math.abs(bLat) > 90 || Math.abs(aLng) > 180 || Math.abs(bLng) > 180) return null;
  const toRad = (degrees) => degrees * Math.PI / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function determineEventStatus(event, now = new Date(), defaultDurationMinutes = 120) {
  if (!event || ["draft", "cancelled"].includes(event.status)) return event && event.status;
  const startsAt = new Date(event.starts_at || event.startsAt).getTime();
  const explicitEnd = event.ends_at || event.endsAt;
  const endsAt = explicitEnd
    ? new Date(explicitEnd).getTime()
    : startsAt + Math.max(15, Number(defaultDurationMinutes) || 120) * 60000;
  const current = new Date(now).getTime();
  if (![startsAt, endsAt, current].every(Number.isFinite)) return event.status || "scheduled";
  if (current < startsAt) return "scheduled";
  if (current < endsAt) return "live";
  return "finished";
}

export function canCheckInToEvent(event, now = new Date(), earlyMinutes = 30, defaultDurationMinutes = 120) {
  if (!event || !event.allow_check_in && !event.allowCheckIn) return false;
  const startsAt = new Date(event.starts_at || event.startsAt).getTime();
  const explicitEnd = event.ends_at || event.endsAt;
  const endsAt = explicitEnd
    ? new Date(explicitEnd).getTime()
    : startsAt + Math.max(15, Number(defaultDurationMinutes) || 120) * 60000;
  const current = new Date(now).getTime();
  return [startsAt, endsAt, current].every(Number.isFinite) &&
    current >= startsAt - Math.max(0, Number(earlyMinutes) || 0) * 60000 &&
    current < endsAt;
}

export function buildRecurringDates(start, recurrence, count = 12) {
  const first = new Date(start);
  if (Number.isNaN(first.getTime())) return [];
  const mode = ["weekly", "monthly"].includes(recurrence) ? recurrence : "none";
  const limit = mode === "none" ? 1 : Math.min(24, Math.max(1, Number(count) || 12));
  const dates = [];
  for (let index = 0; index < limit; index += 1) {
    const date = new Date(first);
    if (mode === "weekly") date.setUTCDate(first.getUTCDate() + index * 7);
    if (mode === "monthly") date.setUTCMonth(first.getUTCMonth() + index);
    dates.push(date);
  }
  return dates;
}
