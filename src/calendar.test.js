import test from 'node:test';
import assert from 'node:assert/strict';
import { findNextClass, formatNextClass } from './calendar.js';

const event = (start, end) => ({
  start: { dateTime: start },
  end: { dateTime: end },
  summary: 'Math tutoring',
});

test('findNextClass prefers a lesson already in progress over a later lesson', () => {
  const now = new Date('2026-10-27T11:00:00+07:00');
  const current = event('2026-10-27T10:30:00+07:00', '2026-10-27T11:30:00+07:00');
  const later = event('2026-10-27T17:00:00+07:00', '2026-10-27T18:00:00+07:00');
  assert.equal(findNextClass([later, current], now), current);
});

test('findNextClass ignores ended lessons and returns the next upcoming one', () => {
  const now = new Date('2026-10-27T12:00:00+07:00');
  const ended = event('2026-10-27T10:30:00+07:00', '2026-10-27T11:30:00+07:00');
  const future = event('2026-10-29T16:00:00+07:00', '2026-10-29T17:00:00+07:00');
  assert.equal(findNextClass([ended, future], now), future);
});

test('formatNextClass calls a same-day lesson Hôm nay and formats its time in AM/PM', () => {
  const now = new Date('2026-10-27T11:00:00+07:00');
  const lesson = event('2026-10-27T17:00:00+07:00', '2026-10-27T18:00:00+07:00');
  const formatted = formatNextClass(lesson, now);
  assert.match(formatted.day, /^Hôm nay · Thứ Ba, ngày 27\/10$/);
  assert.match(formatted.time, /\b(?:AM|PM)–.*\b(?:AM|PM)$/);
});

test('all-day events use the local calendar date rather than UTC date parsing', () => {
  const now = new Date('2026-10-27T12:00:00+07:00');
  const lesson = { start: { date: '2026-10-27' }, end: { date: '2026-10-28' } };
  assert.equal(findNextClass([lesson], now), lesson);
  assert.match(formatNextClass(lesson, now).day, /^Hôm nay · Thứ Ba, ngày 27\/10$/);
  assert.equal(formatNextClass(lesson, now).time, 'Cả ngày');
});

test('formatNextClass reports the day distance and date for a future lesson', () => {
  const now = new Date('2026-10-27T12:00:00+07:00');
  const lesson = event('2026-10-30T17:00:00+07:00', '2026-10-30T18:00:00+07:00');
  const formatted = formatNextClass(lesson, now);
  assert.match(formatted.day, /^3 ngày nữa · Thứ Sáu, ngày 30\/10$/);
});
