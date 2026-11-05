import {interpolateKnots} from './track-layout.js';

const MAX_GAP = 70;
const MAX_OFFSET = 12;
const JOIN_TOLERANCE = .2;
const HEIGHT_TOLERANCE = .3;
const BUCKET_SIZE = 100;

function position(track, s) {
  return [interpolateKnots(track.knots, s), interpolateKnots(track.knots, s, 2)];
}

function slope(track, s) {
  const from = Math.max(track.knots[0][0], s - 5);
  const to = Math.min(track.knots.at(-1)[0], s + 5);
  const a = position(track, from);
  const b = position(track, to);
  return [(b[0] - a[0]) / (to - from), (b[1] - a[1]) / (to - from)];
}

function trackIndex(tracks) {
  const buckets = new Map();
  for (const track of tracks) {
    const from = Math.floor(track.knots[0][0] / BUCKET_SIZE);
    const to = Math.floor(track.knots.at(-1)[0] / BUCKET_SIZE);
    for (let bucket = from; bucket <= to; bucket++) {
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket).push(track);
    }
  }
  return s => buckets.get(Math.floor(s / BUCKET_SIZE)) ?? [];
}

function platformsFrom(stations) {
  return stations.flatMap(station => (station.platforms ?? []).flatMap(platform => {
    if (!platform.edges?.length) return [];
    const absolute = Number.isFinite(platform.start) && Number.isFinite(platform.end);
    const offset = absolute ? 0 : station.s ?? 0;
    return [{
      edges: platform.edges.map(([s, left, right]) => [s + offset, left, right]),
      height: platform.height ?? 0,
    }];
  }));
}

// Intersect intervals satisfying a linearly changing non-negative value.
function constrain(interval, a, b) {
  if (a < 0 && b < 0) return false;
  if (a < 0) interval[0] = Math.max(interval[0], -a / (b - a));
  if (b < 0) interval[1] = Math.min(interval[1], a / (a - b));
  return interval[0] <= interval[1];
}

function crossesPlatform(knots, platforms) {
  for (const platform of platforms) {
    const from = Math.max(knots[0][0], platform.edges[0][0]);
    const to = Math.min(knots.at(-1)[0], platform.edges.at(-1)[0]);
    if (from >= to) continue;
    const distances = [...new Set([
      from, to,
      ...knots.map(row => row[0]).filter(s => s > from && s < to),
      ...platform.edges.map(row => row[0]).filter(s => s > from && s < to),
    ])].sort((a, b) => a - b);
    for (let i = 1; i < distances.length; i++) {
      const ends = distances.slice(i - 1, i + 1).map(s => ({
        x: interpolateKnots(knots, s),
        y: interpolateKnots(knots, s, 2),
        left: interpolateKnots(platform.edges, s),
        right: interpolateKnots(platform.edges, s, 2),
      }));
      const [a, b] = ends;
      const interval = [0, 1];
      if (constrain(interval, a.x - a.left + .75, b.x - b.left + .75) &&
          constrain(interval, a.right - a.x + .75, b.right - b.x + .75) &&
          constrain(interval, .6 - a.y + platform.height, .6 - b.y + platform.height) &&
          constrain(interval, .6 + a.y - platform.height, .6 + b.y - platform.height)) return true;
    }
  }
  return false;
}

function connectorKnots(a, b, tangentA, tangentB) {
  const length = b[0] - a[0];
  const count = Math.max(2, Math.ceil(length / 3));
  return Array.from({length: count + 1}, (_, index) => {
    const t = index / count;
    const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
    const h10 = t ** 3 - 2 * t ** 2 + t;
    const h01 = -2 * t ** 3 + 3 * t ** 2;
    const h11 = t ** 3 - t ** 2;
    return [a[0] + t * length, ...[0, 1].map(axis =>
      h00 * a[axis + 1] + h10 * length * tangentA[axis] +
      h01 * b[axis + 1] + h11 * length * tangentB[axis])];
  });
}

function freeEndpoints(tracks, nearby, length) {
  return tracks.flatMap(track => [1, -1].flatMap(direction => {
    if (track.terminating || track.endBuffer || track.startBuffer) return [];
    const row = direction === 1 ? track.knots[0] : track.knots.at(-1);
    const [s, x, y] = row;
    if (s <= .5 || s >= length - .5) return [];
    const connected = nearby(s).some(other => {
      if (other === track || s < other.knots[0][0] || s > other.knots.at(-1)[0]) return false;
      const [otherX, otherY] = position(other, s);
      return Math.abs(x - otherX) <= JOIN_TOLERANCE && Math.abs(y - otherY) <= JOIN_TOLERANCE;
    });
    return connected ? [] : [{track, direction, row, tangent: slope(track, s)}];
  }));
}

function gapCandidates(endpoints) {
  const starts = endpoints.filter(endpoint => endpoint.direction === 1)
    .sort((a, b) => a.row[0] - b.row[0]);
  const candidates = [];
  for (const end of endpoints.filter(endpoint => endpoint.direction === -1)) {
    for (const start of starts) {
      const distance = start.row[0] - end.row[0];
      if (distance > MAX_GAP) break;
      if (distance < 1 || start.track === end.track) continue;
      const dx = start.row[1] - end.row[1];
      const dy = start.row[2] - end.row[2];
      if (Math.abs(dx) > MAX_OFFSET || Math.abs(dy) > HEIGHT_TOLERANCE ||
          Math.abs(dx / distance) > .3) continue;
      const error = Math.abs(dx - end.tangent[0] * distance) +
        Math.abs(dx - start.tangent[0] * distance);
      if (error > Math.max(1.2, Math.abs(dx) * .6)) continue;
      candidates.push({
        a: end.row, b: start.row, tangentA: end.tangent, tangentB: start.tangent,
        endpoints: [end, start], sourceIds: [end.track.id, start.track.id],
        score: distance + error * 10,
      });
    }
  }
  return candidates;
}

function convergingCandidates(endpoints, nearby, length) {
  const candidates = [];
  for (const endpoint of endpoints) {
    const [s, x, y] = endpoint.row;
    const extensionDirection = -endpoint.direction;
    for (const other of nearby(s)) {
      if (other === endpoint.track || s < other.knots[0][0] || s > other.knots.at(-1)[0]) continue;
      const [otherX, otherY] = position(other, s);
      const tangent = slope(other, s);
      const gap = x - otherX;
      const convergence = endpoint.tangent[0] - tangent[0];
      if (Math.abs(gap) > MAX_OFFSET || Math.abs(gap) < JOIN_TOLERANCE ||
          Math.abs(y - otherY) > HEIGHT_TOLERANCE ||
          gap * convergence * extensionDirection >= -.005) continue;
      const distance = -gap / convergence;
      const targetS = s + distance;
      if (distance * extensionDirection < 8 || Math.abs(distance) > MAX_GAP ||
          targetS <= .5 || targetS >= length - .5 ||
          targetS < other.knots[0][0] || targetS > other.knots.at(-1)[0]) continue;
      const target = position(other, targetS);
      if (Math.abs(x + distance * endpoint.tangent[0] - target[0]) > .8 ||
          Math.abs(y - target[1]) > HEIGHT_TOLERANCE) continue;
      const otherRow = [targetS, ...target];
      const forwards = targetS > s;
      candidates.push({
        a: forwards ? endpoint.row : otherRow,
        b: forwards ? otherRow : endpoint.row,
        tangentA: forwards ? endpoint.tangent : slope(other, targetS),
        tangentB: forwards ? slope(other, targetS) : endpoint.tangent,
        endpoints: [endpoint], sourceIds: [endpoint.track.id, other.id],
        score: Math.abs(distance) + 10,
      });
    }
  }
  return candidates;
}

function player(track) {
  return track.player || track.isPlayer || track.id === 'player';
}

function branchPreference(track, other, s) {
  if (player(track)) return false;
  if (player(other)) return true;
  const otherInterior = other.knots[0][0] < s - 2 && other.knots.at(-1)[0] > s + 2;
  if (otherInterior) return true;
  const span = rail => rail.knots.at(-1)[0] - rail.knots[0][0];
  return span(track) < span(other) || span(track) === span(other) && String(track.id) > String(other.id);
}

function detectTurnouts(tracks) {
  const nearby = trackIndex(tracks);
  const result = [];
  for (const track of tracks) {
    if (player(track)) continue;
    // Endpoints are considered first so an inferred tip keeps its exact join,
    // instead of being replaced by a nearly coincident interior sample.
    const indices = [0, track.knots.length - 1,
      ...Array.from({length: Math.max(0, track.knots.length - 2)}, (_, i) => i + 1)];
    for (const index of indices) for (const direction of [1, -1]) {
      const [s, x, y] = track.knots[index];
      const next = track.knots[index + direction];
      if (!next) continue;
      for (const other of nearby(s)) {
        if (other === track || s < other.knots[0][0] || s > other.knots.at(-1)[0] ||
            !branchPreference(track, other, s)) continue;
        const [otherX, otherY] = position(other, s);
        if (Math.abs(x - otherX) > JOIN_TOLERANCE || Math.abs(y - otherY) > JOIN_TOLERANCE) continue;
        const nextS = Math.max(other.knots[0][0], Math.min(other.knots.at(-1)[0], next[0]));
        if (nextS === s || Math.abs(position(track, nextS)[0] - position(other, nextS)[0]) <= JOIN_TOLERANCE) continue;
        const available = direction === 1
          ? Math.min(track.knots.at(-1)[0], other.knots.at(-1)[0]) - s
          : s - Math.max(track.knots[0][0], other.knots[0][0]);
        let separation = 0;
        let switchLength = 35;
        for (let d = 1; d <= Math.min(40, available); d++) {
          const at = s + direction * d;
          const branch = position(track, at);
          const main = position(other, at);
          if (Math.abs(branch[1] - main[1]) > HEIGHT_TOLERANCE) break;
          separation = branch[0] - main[0];
          if (Math.abs(separation) >= 2.6) {
            switchLength = Math.max(15, Math.min(35, d));
            break;
          }
        }
        if (Math.abs(separation) < .45) continue;
        const duplicate = result.some(turnout =>
          turnout.direction === direction && Math.abs(turnout.s - s) < 12 &&
          (turnout.trackId === track.id ||
           turnout.trackId === other.id && turnout.otherId === track.id));
        if (!duplicate) result.push({
          s, trackId: track.id, otherId: other.id, direction,
          x: otherX, y: otherY, side: Math.sign(separation), length: switchLength,
        });
      }
    }
  }
  return result.sort((a, b) => a.s - b.s || String(a.trackId).localeCompare(String(b.trackId)));
}

/**
 * Track knots use absolute route s and lateral/vertical offsets [s,x,y].
 * Platform edges without start/end are relative to station.s. With start/end,
 * edges use absolute s, matching TrackLayout's station platform representation.
 */
export function prepareTurnoutLayout(inputTracks, {length = Infinity, stations = []} = {}) {
  const usedIds = new Set();
  const tracks = inputTracks.filter(track => track.knots?.length >= 2).map((track, index) => {
    let id = track.id ?? `track-${index}`;
    while (usedIds.has(id)) id = `${id}:segment`;
    usedIds.add(id);
    return {...track, id, knots: track.knots.map(([s, x, y = 0]) => [s, x, y])};
  });
  const nearby = trackIndex(tracks);
  const endpoints = freeEndpoints(tracks, nearby, length);
  const platforms = platformsFrom(stations);
  const candidates = [...gapCandidates(endpoints), ...convergingCandidates(endpoints, nearby, length)]
    .sort((a, b) => a.score - b.score);
  const joined = new Set();
  for (const candidate of candidates) {
    if (candidate.endpoints.some(endpoint => joined.has(endpoint))) continue;
    const knots = connectorKnots(candidate.a, candidate.b, candidate.tangentA, candidate.tangentB);
    if (crossesPlatform(knots, platforms)) continue;
    let id = `turnout-connector-${tracks.length}`;
    while (usedIds.has(id)) id += ':segment';
    usedIds.add(id);
    tracks.push({
      id, knots, connector: true, inferred: true, sourceIds: candidate.sourceIds,
    });
    for (const endpoint of candidate.endpoints) joined.add(endpoint);
  }
  return {tracks, turnouts: detectTurnouts(tracks)};
}
