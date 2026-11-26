import test from 'node:test';
import assert from 'node:assert/strict';
import { countMissingClasses, findNextClass, formatNextClass } from './calendar.js';

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

test('countMissingClasses includes only complete weeks and their boundary dates', () => {
  const now = new Date(2026, 10, 26, 12);
  const events = [
    { start: { date: '2026-09-27' } },
    { start: { date: '2026-09-28' } },
    { start: { date: '2026-12-20' } },
    { start: { date: '2026-12-21' } },
    { start: { date: '2026-12-24' } },
    { start: { date: '2026-12-25' } },
  ];
  assert.equal(countMissingClasses(events, now), 22);
});

test('countMissingClasses expects two classes per complete Monday-to-Sunday week', () => {
  const now = new Date(2026, 10, 26, 12);
  assert.equal(countMissingClasses([], now), 24);
});

test('countMissingClasses accepts a student-specific start date', () => {
  const now = new Date(2026, 10, 26, 12);
  const events = [
    { start: { date: '2026-10-18' } },
    { start: { date: '2026-10-19' } },
    { start: { date: '2026-12-20' } },
    { start: { date: '2026-12-21' } },
  ];
  assert.equal(countMissingClasses(events, now, '2026-10-19'), 16);
});

test('countMissingClasses caps weekly credit at two without transferring surplus', () => {
  const now = new Date(2026, 10, 26, 12);
  const oneThenThree = [
    { start: { date: '2026-10-25' } },
    { start: { date: '2026-10-30' } },
    { start: { date: '2026-10-31' } },
    { start: { date: '2026-11-01' } },
  ];
  const zeroThenThree = oneThenThree.slice(1);
  assert.equal(countMissingClasses(oneThenThree, now), 21);
  assert.equal(countMissingClasses(zeroThenThree, now), 22);
});

test('countMissingClasses never reports a negative shortfall', () => {
  const now = new Date(2026, 10, 26, 12);
  const events = [];
  for (let week = 0; week < 12; week += 1) {
    const monday = new Date(2026, 8, 28 + week * 7);
    events.push({ start: { date: `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}` } });
    const wednesday = new Date(monday);
    wednesday.setDate(wednesday.getDate() + 2);
    events.push({ start: { date: `${wednesday.getFullYear()}-${String(wednesday.getMonth() + 1).padStart(2, '0')}-${String(wednesday.getDate()).padStart(2, '0')}` } });
  }
  events.push({ start: { date: '2026-10-01' } });
  assert.equal(countMissingClasses(events, now), 0);
});
