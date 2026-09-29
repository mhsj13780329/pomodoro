// Local calendar date of an instant in a given IANA time zone (PRD section 21).
// Never groups by UTC. Gregorian, Latin digits, so the result is a stable storage key.
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      calendar: 'gregory',
      numberingSystem: 'latn',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

export function localDateOf(timestamp: number, timeZone: string): string {
  const parts = formatterFor(timeZone).formatToParts(new Date(timestamp));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year').padStart(4, '0')}-${get('month')}-${get('day')}`;
}
