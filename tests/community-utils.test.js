import { describe, expect, it } from "vitest";
import {
  buildRecurringDates,
  canCheckInToEvent,
  determineEventStatus,
  distanceMeters,
  normalizeChurchKey
} from "../push-server/community-utils.js";

describe("aislamiento por iglesia", () => {
  it("normaliza mayusculas, espacios y acentos", () => {
    expect(normalizeChurchKey("  Iglesia Jesús   Vive ")).toBe("iglesia jesús vive");
  });
});

describe("ciclo de eventos", () => {
  const event = {
    status: "scheduled",
    starts_at: "2026-07-22T20:00:00.000Z",
    ends_at: "2026-07-22T21:30:00.000Z",
    allow_check_in: true
  };

  it("pasa de programado a en vivo y finalizado", () => {
    expect(determineEventStatus(event, "2026-07-22T19:59:00.000Z")).toBe("scheduled");
    expect(determineEventStatus(event, "2026-07-22T20:30:00.000Z")).toBe("live");
    expect(determineEventStatus(event, "2026-07-22T21:30:00.000Z")).toBe("finished");
  });

  it("crea series semanales y mensuales limitadas", () => {
    expect(buildRecurringDates(event.starts_at, "weekly", 3).map((date) => date.toISOString())).toEqual([
      "2026-07-22T20:00:00.000Z",
      "2026-07-29T20:00:00.000Z",
      "2026-08-05T20:00:00.000Z"
    ]);
    expect(buildRecurringDates(event.starts_at, "monthly", 2)).toHaveLength(2);
  });

  it("permite check-in solo dentro de la ventana", () => {
    expect(canCheckInToEvent(event, "2026-07-22T19:31:00.000Z", 30)).toBe(true);
    expect(canCheckInToEvent(event, "2026-07-22T19:29:00.000Z", 30)).toBe(false);
    expect(canCheckInToEvent(event, "2026-07-22T21:31:00.000Z", 30)).toBe(false);
  });
});

describe("asistencia geografica", () => {
  it("calcula una distancia realista en metros", () => {
    const distance = distanceMeters(-42.7692, -65.0385, -42.7701, -65.0385);
    expect(distance).toBeGreaterThan(95);
    expect(distance).toBeLessThan(105);
  });

  it("rechaza coordenadas invalidas", () => {
    expect(distanceMeters(null, 0, 1, 1)).toBeNull();
    expect(distanceMeters(120, 0, 1, 1)).toBeNull();
  });
});
