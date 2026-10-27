import './style.css';
import { findNextClass, formatNextClass } from './calendar.js';

const app = document.querySelector('#app');
const params = new URLSearchParams(location.search);
const studentID = params.get('studentID');
const weekdays = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
const hourHeight = 52;
let studentName = '';
let events = [];
let mode = 'month';
let visibleDate = new Date();
let selectedEvent = null;

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

function asDate(value) {
  if (value?.dateTime) return new Date(value.dateTime);
  if (value?.date) {
    const [year, month, day] = value.date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(NaN);
}

function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function eventsOn(date) {
  const key = dayKey(date);
  return events.filter((event) => dayKey(asDate(event.start)) === key)
    .sort((a, b) => asDate(a.start) - asDate(b.start));
}

function formatTime(value) {
  if (value?.date) return 'Cả ngày';
  return asDate(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatRange(event) {
  if (event.start?.date) return 'Cả ngày';
  return `${formatTime(event.start)}–${formatTime(event.end)}`;
}

function mondayOf(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function renderNextClass() {
  const next = formatNextClass(findNextClass(events));
  return `<aside class="next-class" aria-live="polite"><span class="next-title">Buổi học tiếp theo</span><span class="next-day">${escapeHtml(next.day)}</span>${next.time ? `<span class="next-time">${escapeHtml(next.time)}</span>` : ''}</aside>`;
}

function renderMonth() {
  const first = new Date(visibleDate.getFullYear(), visibleDate.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(visibleDate.getFullYear(), visibleDate.getMonth() + 1, 0).getDate();
  const rowCount = Math.ceil((offset + daysInMonth) / 7);
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  const dayCells = [];

  for (let index = 0; index < rowCount * 7; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const outside = date.getMonth() !== visibleDate.getMonth();
    const isToday = dayKey(date) === dayKey(new Date());
    const dayEvents = eventsOn(date).map((event) => {
      const eventIndex = events.indexOf(event);
      return `<button class="month-event" data-event="${eventIndex}" aria-label="${escapeHtml(`${event.summary || 'Sự kiện'} · ${formatRange(event)}`)}">${escapeHtml(formatRange(event))} ${escapeHtml(event.summary || 'Buổi học')}</button>`;
    }).join('');
    dayCells.push(`<div class="month-day${outside ? ' outside' : ''}"><span class="date-number${isToday ? ' today' : ''}"${isToday ? ' aria-current="date"' : ''}>${date.getDate()}</span>${dayEvents}</div>`);
  }

  return `<section class="calendar" aria-label="Lịch tháng"><div class="weekday-row">${weekdays.map((day) => `<div class="weekday">${day}</div>`).join('')}</div><div class="month-days">${dayCells.join('')}</div></section>`;
}

function renderWeek() {
  const start = mondayOf(visibleDate);
  const header = weekdays.map((day, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return `<div class="weekday">${day}<br>${date.getDate()}</div>`;
  }).join('');
  const hours = Array.from({ length: 24 }, (_, hour) => `<div class="hour-label">${String(hour).padStart(2, '0')}:00</div>`).join('');
  const now = new Date();
  const columns = weekdays.map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const isToday = dayKey(date) === dayKey(now);
    const dayEvents = eventsOn(date).map((event) => {
      const eventIndex = events.indexOf(event);
      const eventStart = asDate(event.start);
      const eventEnd = asDate(event.end);
      const startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
      const top = Math.max(0, startMinutes * hourHeight / 60);
      const height = Math.max(22, (eventEnd - eventStart) / 60_000 * hourHeight / 60);
      return `<button class="week-event" style="top:${top}px;height:${height}px" data-event="${eventIndex}" aria-label="${escapeHtml(`${event.summary || 'Sự kiện'} · ${formatRange(event)}`)}"><span class="week-event-time">${escapeHtml(formatRange(event))}</span><br><span class="week-event-title">${escapeHtml(event.summary || 'Buổi học')}</span></button>`;
    }).join('');
    const currentTimeLine = isToday
      ? `<div class="current-time-line" style="top:${(now.getHours() * 60 + now.getMinutes()) * hourHeight / 60}px" aria-hidden="true"></div>`
      : '';
    return `<div class="week-day-column${isToday ? ' today-column' : ''}" style="grid-column:${index + 2};grid-row:1">${currentTimeLine}${dayEvents}</div>`;
  }).join('');
  return `<section class="calendar week-calendar" aria-label="Lịch tuần"><div class="weekday-row"><div class="weekday"></div>${header}</div><div class="week-grid"><div class="hour-rail">${hours}</div>${columns}</div></section>`;
}

function modalMarkup(event) {
  const title = event.summary || 'Buổi học';
  const start = asDate(event.start);
  const date = start.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const description = event.description?.trim();
  return `<div class="modal-backdrop" data-backdrop><section class="event-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="dialog-top"><div><h2 id="dialog-title">${escapeHtml(title)}</h2><div class="dialog-time">${escapeHtml(date)} · ${escapeHtml(formatRange(event))}</div></div><button class="dialog-close" data-close aria-label="Đóng">×</button></div>${description ? `<p class="dialog-description">${escapeHtml(description)}</p>` : '<p class="dialog-empty">Không có mô tả cho buổi học này.</p>'}${event.location ? `<p class="dialog-location">${escapeHtml(event.location)}</p>` : ''}</section></div>`;
}

function render() {
  document.title = studentName ? `Lịch học của ${studentName}` : 'Lịch học';
  if (!studentID) {
    app.innerHTML = '<div class="no-student"><section class="app-shell"><div class="empty-state"><div class="brand"><span class="brand-mark"></span>Lịch học Notebook</div><strong>Lịch đang trống</strong>Đường dẫn này chưa gắn với lịch của học sinh.</div></section></div>';
    return;
  }

  const monthLabel = `Tháng ${visibleDate.getMonth() + 1}/${visibleDate.getFullYear()}`;
  app.innerHTML = `<div class="app-shell"><header class="topline"><div class="brand"><span class="brand-mark"></span>Lịch học Notebook</div><div class="subtle">Múi giờ theo thiết bị</div></header><section class="headline"><div><h1>Lịch học của ${escapeHtml(studentName)}</h1><p>Theo dõi lịch học của bạn</p></div>${renderNextClass()}</section><nav class="toolbar" aria-label="Điều khiển lịch"><div class="month-controls"><button class="button" data-action="previous" aria-label="${mode === 'month' ? 'Tháng trước' : 'Tuần trước'}">‹</button><span class="month-label">${monthLabel}</span><button class="button" data-action="next" aria-label="${mode === 'month' ? 'Tháng sau' : 'Tuần sau'}">›</button><button class="button" data-action="today">Hôm nay</button></div><div class="view-toggle" role="group" aria-label="Chế độ xem"><button class="button${mode === 'month' ? ' active' : ''}" data-view="month" aria-pressed="${mode === 'month'}">Tháng</button><button class="button${mode === 'week' ? ' active' : ''}" data-view="week" aria-pressed="${mode === 'week'}">Tuần</button></div></nav>${mode === 'month' ? renderMonth() : renderWeek()}${selectedEvent === null ? '' : modalMarkup(events[selectedEvent])}</div>`;

  app.querySelector('[data-action="previous"]').addEventListener('click', () => move(-1));
  app.querySelector('[data-action="next"]').addEventListener('click', () => move(1));
  app.querySelector('[data-action="today"]').addEventListener('click', () => { visibleDate = new Date(); render(); });
  app.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
    mode = button.dataset.view;
    render();
  }));
  app.querySelectorAll('[data-event]').forEach((button) => button.addEventListener('click', () => {
    selectedEvent = Number(button.dataset.event);
    render();
    app.querySelector('[data-close]')?.focus();
  }));
  app.querySelector('[data-close]')?.addEventListener('click', closeModal);
  app.querySelector('[data-backdrop]')?.addEventListener('click', (event) => {
    if (event.target.matches('[data-backdrop]')) closeModal();
  });
}

function closeModal() {
  selectedEvent = null;
  render();
}

function move(direction) {
  if (mode === 'month') visibleDate = new Date(visibleDate.getFullYear(), visibleDate.getMonth() + direction, 1);
  else {
    visibleDate = mondayOf(visibleDate);
    visibleDate.setDate(visibleDate.getDate() + direction * 7);
  }
  render();
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && selectedEvent !== null) closeModal();
});

async function start() {
  if (!studentID) return render();
  app.innerHTML = '<div class="app-shell"><div class="topline"><div class="brand"><span class="brand-mark"></span>Lịch học Notebook</div></div><div class="loading-state">Đang tải lịch học…</div></div>';
  try {
    const response = await fetch(`/api/events?studentID=${encodeURIComponent(studentID)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Không tải được lịch học.');
    studentName = result.studentName;
    events = result.events || [];
    render();
  } catch (error) {
    app.innerHTML = `<div class="app-shell"><div class="topline"><div class="brand"><span class="brand-mark"></span>Lịch học Notebook</div></div><section class="error-state"><strong>Chưa tải được lịch</strong>${escapeHtml(error.message || 'Vui lòng thử lại sau.')}<br><button class="button" data-retry>Thử lại</button></section></div>`;
    app.querySelector('[data-retry]').addEventListener('click', start);
  }
}

start();
