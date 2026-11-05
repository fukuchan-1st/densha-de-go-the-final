import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareTurnoutLayout} from '../dist/turnout-layout.js';

const track = (id, knots, extra = {}) => ({id, knots, ...extra});
const player = () => track('player', [[0, 0, 0], [1000, 0, 0]], {player: true});

test('既存の分岐と合流を検出し、並行線や単なる線分の継ぎ目は分岐器にしない', () => {
  const layout = prepareTurnoutLayout([
    player(),
    track('siding', [[100, 0, 0], [145, 4, 0], [300, 4, 0], [350, 0, 0]]),
    track('parallel-a', [[0, -4, 0], [500, -4, 0]]),
    track('parallel-b', [[500, -4, 0], [1000, -4, 0]]),
  ], {length: 1000});
  assert.equal(layout.tracks.length, 4);
  assert.deepEqual(layout.turnouts.map(({s, direction, side, otherId}) =>
    ({s, direction, side, otherId})), [
    {s: 100, direction: 1, side: 1, otherId: 'player'},
    {s: 350, direction: -1, side: 1, otherId: 'player'},
  ]);
  assert.ok(layout.turnouts.every(turnout => turnout.length >= 15 && turnout.length <= 35));
});

test('短い同一方向の切れ目を滑らかにつなぎ、元データを変更しない', () => {
  const input = [
    player(),
    track('before', [[100, 4, 0], [200, 4, 0]]),
    track('after', [[235, 4.1, 0], [400, 4.1, 0]]),
  ];
  const original = structuredClone(input);
  const {tracks, turnouts} = prepareTurnoutLayout(input, {length: 1000});
  const connections = tracks.filter(item => item.connector);
  assert.equal(connections.length, 1);
  assert.deepEqual(connections[0].knots[0], [200, 4, 0]);
  assert.deepEqual(connections[0].knots.at(-1), [235, 4.1, 0]);
  assert.equal(turnouts.length, 0);
  assert.deepEqual(input, original);
});

test('本線に収束する途切れた枝線だけを延ばし、平行な行き止まりは合流させない', () => {
  const {tracks, turnouts} = prepareTurnoutLayout([
    player(),
    track('clipped-branch', [[160, 8.7, 0], [200, 2.7, 0]]),
    track('parallel-end', [[500, 4, 0], [600, 4, 0]]),
  ], {length: 1000});
  const connections = tracks.filter(item => item.connector);
  assert.equal(connections.length, 1);
  assert.ok(Math.abs(connections[0].knots.at(-1)[0] - 218) < .001);
  assert.ok(Math.abs(connections[0].knots.at(-1)[1]) < .001);
  assert.equal(turnouts.length, 1);
  assert.equal(turnouts[0].direction, -1);
  assert.equal(turnouts[0].otherId, 'player');
});

test('高さ、遠い切れ目、車止め、路線端を越えて補完しない', () => {
  for (const [a, b, length] of [
    [track('a', [[100, 4, 0], [200, 4, 0]]), track('b', [[230, 4, 3], [400, 4, 3]]), 1000],
    [track('a', [[100, 4, 0], [200, 4, 0]]), track('b', [[271, 4, 0], [400, 4, 0]]), 1000],
    [track('a', [[100, 4, 0], [200, 4, 0]], {endBuffer: true}), track('b', [[230, 4, 0], [400, 4, 0]]), 1000],
    [track('a', [[100, 4, 0], [200, 4, 0]], {terminating: true}), track('b', [[230, 4, 0], [400, 4, 0]]), 1000],
    [track('a', [[100, 4, 0], [200, 4, 0]]), track('b', [[230, 4, 0], [400, 4, 0]]), 200],
  ]) {
    const layout = prepareTurnoutLayout([a, b], {length});
    assert.equal(layout.tracks.filter(item => item.connector).length, 0);
  }
});

test('相対距離・絶対距離のホームを横切る補完線を拒否する', () => {
  const input = [
    track('a', [[100, 4, 0], [200, 4, 0]]),
    track('b', [[240, 4, 0], [400, 4, 0]]),
  ];
  for (const stations of [
    [{s: 220, platforms: [{edges: [[-10, 3, 5], [10, 3, 5]]}]}],
    [{s: 220, platforms: [{start: 210, end: 230, edges: [[210, 3, 5], [230, 3, 5]]}]}],
    [{s: 220, platforms: [{edges: [[-1, 3, 5], [1, 3, 5]]}]}],
  ]) {
    const layout = prepareTurnoutLayout(input, {length: 1000, stations});
    assert.equal(layout.tracks.filter(item => item.connector).length, 0);
  }
});

test('発散する枝線の前端も本線へ補完し、二度処理しても接続を重複させない', () => {
  const input = [
    player(),
    track('clipped-start', [[200, -2.7, 0], [240, -8.7, 0]]),
  ];
  const first = prepareTurnoutLayout(input, {length: 1000});
  const connection = first.tracks.find(item => item.connector);
  assert.ok(Math.abs(connection.knots[0][0] - 182) < .001);
  assert.ok(Math.abs(connection.knots[0][1]) < .001);
  assert.equal(first.turnouts[0].direction, 1);
  assert.equal(first.turnouts[0].side, -1);
  const second = prepareTurnoutLayout(first.tracks, {length: 1000});
  assert.equal(second.tracks.length, first.tracks.length);
  assert.deepEqual(second.turnouts, first.turnouts);
});

test('長いBVE線路の途中で重なってから分かれる地点も分岐器として検出する', () => {
  const {turnouts} = prepareTurnoutLayout([
    player(),
    track('bve-opposite', [[-400, 4, 0], [480, 4, 0], [513, 0, 0],
      [537, 0, 0], [570, 4, 0], [22400, 4, 0]]),
    track('coincident', [[50, 0, 0], [500, 0, 0], [900, 0, 0]]),
  ], {length: 1000});
  assert.deepEqual(turnouts.map(({s, direction, trackId}) => ({s, direction, trackId})), [
    {s: 513, direction: -1, trackId: 'bve-opposite'},
    {s: 537, direction: 1, trackId: 'bve-opposite'},
  ]);
});
