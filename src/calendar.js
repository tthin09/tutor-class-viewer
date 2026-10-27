const eventDate = (value) => {
  if (value?.dateTime) return new Date(value.dateTime);
  if (value?.date) {
    const [year, month, day] = value.date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(NaN);
};

function localDayNumber(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
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
