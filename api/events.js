import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { JWT } from 'google-auth-library';

const calendarScope = 'https://www.googleapis.com/auth/calendar.readonly';

async function loadStudents() {
  if (process.env.STUDENTS_JSON) return JSON.parse(process.env.STUDENTS_JSON);
  return JSON.parse(await readFile(join(process.cwd(), 'data/students.json'), 'utf8'));
}

async function loadCredentials() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }
  return JSON.parse(await readFile(join(process.cwd(), 'credentials.json'), 'utf8'));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const studentID = new URL(req.url, 'http://localhost').searchParams.get('studentID');
  if (!studentID || !/^[a-f0-9]{16}$/.test(studentID)) {
    return res.status(400).json({ error: 'Invalid studentID' });
  }

  try {
    const students = await loadStudents();
    const student = students.find((item) => item.studentID === studentID);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const credentials = await loadCredentials();
    const auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [calendarScope],
      transporterOptions: { timeout: 4000 },
    });
    const { token } = await auth.getAccessToken();
    if (!token) throw new Error('Google authentication did not return an access token');

    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    const end = new Date();
    end.setMonth(end.getMonth() + 18);
    const params = new URLSearchParams({
      maxResults: '2500',
      orderBy: 'startTime',
      singleEvents: 'true',
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
    });
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(student.calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(4000) },
    );
    if (!response.ok) {
      console.error('Google Calendar API returned', response.status);
      return res.status(502).json({ error: 'Could not load this calendar' });
    }
    const page = await response.json();
    if (page.nextPageToken) return res.status(502).json({ error: 'Calendar has too many events to display' });
    const events = page.items ?? [];

    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.status(200).json({
      studentName: student.name,
      calendarName: student.calendarName,
      timeZone: 'Asia/Ho_Chi_Minh',
      events: events.map(({ id, summary, description, location, start, end }) => ({
        id, summary, description, location, start, end,
      })),
    });
  } catch (error) {
    console.error('Calendar request failed:', error instanceof Error ? error.message : 'unknown error');
    return res.status(500).json({ error: 'Calendar is temporarily unavailable' });
  }
}
