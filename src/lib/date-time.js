export const TIME_ZONE = 'Asia/Colombo';
export const TIME_ZONE_LABEL = 'Sri Lanka time (UTC+05:30)';

export function parseSriLankaDateTime(value) {
  if (typeof value !== 'string') return new Date(NaN);
  const match = value.match(/^(\d{4}-\d{2}-\d{2})(?:T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(\.\d{1,3})?)?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?)?$/);
  if (!match) return new Date(NaN);
  const calendarDate = new Date(`${match[1]}T00:00:00Z`);
  if (Number.isNaN(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== match[1]) {
    return new Date(NaN);
  }
  const time = match[2] ? value : `${value}T00:00:00`;
  return new Date(match[6] ? time : `${time}+05:30`);
}

function asDate(value) {
  return typeof value === 'string' ? parseSriLankaDateTime(value) : new Date(value);
}

export function formatDate(value) {
  return asDate(value).toLocaleDateString('en-GB', {
    timeZone: TIME_ZONE, day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(value) {
  return asDate(value).toLocaleString('en-GB', {
    timeZone: TIME_ZONE, day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }) + ' SLST';
}

export function formatDateTimeInput(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(asDate(value));
  const fields = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${fields.year}-${fields.month}-${fields.day}T${fields.hour}:${fields.minute}`;
}

export function formatDateInput(value = new Date()) {
  return formatDateTimeInput(value).slice(0, 10);
}