import { booleanValid, polygon as turfPolygon } from "@turf/turf";

/**
 * Validates a GeoJSON Polygon for use as an area / service boundary.
 * Throws (with status 400) on any structural problem.
 *
 * Rules:
 *  - type === "Polygon"
 *  - has exactly one outer ring
 *  - 4 ≤ ring length ≤ 21 (3 unique vertices + closing duplicate; max 20 vertices)
 *  - ring is closed (first === last)
 *  - all coordinates are finite, valid lng/lat
 *  - polygon is geometrically valid (no self-intersection) per turf
 */
export function validatePolygon(input: unknown): GeoJSON.Polygon {
  if (!input || typeof input !== "object") {
    throw badRequest("polygon must be a GeoJSON object");
  }
  const p = input as GeoJSON.Polygon;
  if (p.type !== "Polygon") throw badRequest("polygon.type must be 'Polygon'");
  if (!Array.isArray(p.coordinates) || p.coordinates.length !== 1) {
    throw badRequest("polygon.coordinates must contain exactly one ring");
  }
  const ring = p.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4 || ring.length > 21) {
    throw badRequest("polygon ring must have between 3 and 20 unique vertices");
  }
  for (const c of ring) {
    if (
      !Array.isArray(c) ||
      c.length < 2 ||
      typeof c[0] !== "number" ||
      typeof c[1] !== "number" ||
      !isFinite(c[0]) ||
      !isFinite(c[1]) ||
      c[0] < -180 ||
      c[0] > 180 ||
      c[1] < -90 ||
      c[1] > 90
    ) {
      throw badRequest("polygon contains an invalid coordinate");
    }
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    throw badRequest("polygon ring must be closed (first === last vertex)");
  }
  try {
    const t = turfPolygon([ring]);
    if (!booleanValid(t)) throw badRequest("polygon is not geometrically valid");
  } catch (err: any) {
    if (err?.status === 400) throw err;
    throw badRequest("polygon is not geometrically valid");
  }
  // Strip extra props, return canonical
  return { type: "Polygon", coordinates: [ring.map((c) => [c[0], c[1]])] };
}

function badRequest(message: string): Error {
  const err = new Error(message);
  (err as any).status = 400;
  return err;
}
