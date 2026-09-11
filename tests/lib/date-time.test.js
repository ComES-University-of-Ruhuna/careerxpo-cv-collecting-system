import { formatDate, formatDateTime, formatDateInput, formatDateTimeInput, parseSriLankaDateTime } from '@/lib/date-time';

describe('Sri Lanka time', () => {
  test('renders UTC instants on the Colombo calendar day', () => {
    const instant = '2026-09-10T19:00:00.000Z';
    expect(formatDate(instant)).toBe('11 Sept 2026');
    expect(formatDateTime(instant)).toBe('11 Sept 2026, 12:30 am SLST');
    expect(formatDateInput(instant)).toBe('2026-09-11');
    expect(formatDateTimeInput(instant)).toBe('2026-09-11T00:30');
  });

  test('round-trips a deadline without shifting it on update', () => {
    const instant = '2026-09-11T12:30:00.000Z';
    expect(formatDateTimeInput(instant)).toBe('2026-09-11T18:00');
    expect(parseSriLankaDateTime(formatDateTimeInput(instant)).toISOString()).toBe(instant);
  });

  test('preserves explicit offsets from API clients', () => {
    expect(parseSriLankaDateTime('2026-09-11T18:00:00+05:30').toISOString()).toBe('2026-09-11T12:30:00.000Z');
    expect(parseSriLankaDateTime('2026-09-11T12:30:00Z').toISOString()).toBe('2026-09-11T12:30:00.000Z');
  });

  test('interprets date-only values and day boundaries in Colombo', () => {
    expect(parseSriLankaDateTime('2026-09-11').toISOString()).toBe('2026-09-10T18:30:00.000Z');
    expect(parseSriLankaDateTime('2026-09-11T23:59:59.999').toISOString()).toBe('2026-09-11T18:29:59.999Z');
    expect(formatDate('2026-09-11')).toBe('11 Sept 2026');
  });

  test.each(['invalid', '2026-02-30', '2026-09-11T25:00', '', null, 123])('rejects invalid input %s', (value) => {
    expect(Number.isNaN(parseSriLankaDateTime(value).getTime())).toBe(true);
  });
});