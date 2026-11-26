const DAYS_IN_WEEK = 7;
const CLASSES_PER_WEEK = 2;

const eventDate = (value) => {
  if (value?.dateTime) return new Date(value.dateTime);
  if (value?.date) {
    const [year, month, day] = value.date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(NaN);
};

function mondayOf(date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

function localDayNumber(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

export function countMissingClasses(events, now = new Date(), startDate = '2026-09-28') {
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 28);
  let firstWeek = mondayOf(start);
  if (firstWeek < start) firstWeek.setDate(firstWeek.getDate() + DAYS_IN_WEEK);
  let lastWeek = mondayOf(end);
  const lastSunday = new Date(lastWeek);
  lastSunday.setDate(lastSunday.getDate() + DAYS_IN_WEEK - 1);
  if (lastSunday > end) lastWeek.setDate(lastWeek.getDate() - DAYS_IN_WEEK);
  const lastCompleteDay = new Date(lastWeek);
  lastCompleteDay.setDate(lastCompleteDay.getDate() + DAYS_IN_WEEK - 1);

  const completeWeeks = Math.max(0, Math.floor((localDayNumber(lastWeek) - localDayNumber(firstWeek)) / DAYS_IN_WEEK) + 1);
  const weeklyCounts = new Map();
  for (const event of events) {
    const date = eventDate(event.start);
    date.setHours(0, 0, 0, 0);
    if (date < firstWeek || date > lastCompleteDay || Number.isNaN(date.getTime())) continue;
    const week = mondayOf(date);
    const key = localDayNumber(week);
    weeklyCounts.set(key, (weeklyCounts.get(key) || 0) + 1);
  }

  const credited = [...weeklyCounts.values()].reduce((total, count) => total + Math.min(count, CLASSES_PER_WEEK), 0);
  const expected = completeWeeks * CLASSES_PER_WEEK;
  return Math.max(0, expected - credited);
}

export function findNextClass(events, now = new Date()) {
  return events
    .filter((event) => eventDate(event.end) > now)
    .sort((a, b) => eventDate(a.start) - eventDate(b.start))[0] ?? null;
}

export function formatNextClass(event, now = new Date()) {
  if (!event) return { day: 'Chưa có lịch sắp tới', time: '' };

  const start = eventDate(event.start);
  const end = eventDate(event.end);
  const daysUntil = localDayNumber(start) - localDayNumber(now);
  const date = `${new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(start).replace(/^./, (letter) => letter.toLocaleUpperCase('vi-VN'))}, ngày ${start.getDate()}/${start.getMonth() + 1}`;
  const day = daysUntil === 0 ? `Hôm nay · ${date}` : `${daysUntil} ngày nữa · ${date}`;
  const time = event.start.dateTime
    ? `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}–${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : 'Cả ngày';

  return { day, time };
}
