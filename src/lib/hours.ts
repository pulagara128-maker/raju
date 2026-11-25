export interface OpeningHourRow {
  id: number;
  dayOfWeek: number;
  dayName: string;
  openTime: string;
  closeTime: string | null;
  isClosed: boolean;
  specialNote: string | null;
}

export interface LiveHoursStatus {
  isOpen: boolean;
  isClosingConfirmed: boolean;
  statusLabel: string;
  todayDayName: string;
  openTimeFormatted: string;
  closeTimeFormatted: string;
  istTimeFormatted: string;
  istDateISO: string;
  specialNote: string | null;
}

export function formatTime12h(time24: string | null | undefined): string {
  if (!time24 || !/^\d{2}:\d{2}$/.test(time24)) return 'To be confirmed';
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function toMinutes(time24: string): number {
  const [h, m] = time24.split(':').map(Number);
  return h * 60 + m;
}

export function getIstNowParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hourRaw = Number(get('hour'));
  const hour = hourRaw === 24 ? 0 : hourRaw;
  const minute = Number(get('minute'));
  const weekdayStr = get('weekday');
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = dayMap[weekdayStr] ?? 0;

  const displayTime = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  return {
    istDateISO: `${year}-${month}-${day}`,
    dayOfWeek,
    minutesFromMidnight: hour * 60 + minute,
    istTimeFormatted: displayTime,
  };
}

export function computeLiveHoursStatus(hoursList: OpeningHourRow[]): LiveHoursStatus {
  const ist = getIstNowParts();
  const todayRow = hoursList.find((h) => h.dayOfWeek === ist.dayOfWeek);

  if (!todayRow) {
    return {
      isOpen: false,
      isClosingConfirmed: false,
      statusLabel: 'Hours Updating',
      todayDayName: 'Today',
      openTimeFormatted: '12:00 PM',
      closeTimeFormatted: 'To be confirmed',
      istTimeFormatted: ist.istTimeFormatted,
      istDateISO: ist.istDateISO,
      specialNote: null,
    };
  }

  const openFmt = formatTime12h(todayRow.openTime);
  const closeFmt = todayRow.closeTime
    ? formatTime12h(todayRow.closeTime)
    : 'To be confirmed by owner';

  if (todayRow.isClosed) {
    return {
      isOpen: false,
      isClosingConfirmed: Boolean(todayRow.closeTime),
      statusLabel: 'Closed Today',
      todayDayName: todayRow.dayName,
      openTimeFormatted: openFmt,
      closeTimeFormatted: closeFmt,
      istTimeFormatted: ist.istTimeFormatted,
      istDateISO: ist.istDateISO,
      specialNote: todayRow.specialNote,
    };
  }

  const openMin = toMinutes(todayRow.openTime || '12:00');
  if (!todayRow.closeTime) {
    const isPastOpen = ist.minutesFromMidnight >= openMin;
    return {
      isOpen: isPastOpen,
      isClosingConfirmed: false,
      statusLabel: isPastOpen
        ? 'Open Now'
        : `Closed Now · Opens at ${openFmt}`,
      todayDayName: todayRow.dayName,
      openTimeFormatted: openFmt,
      closeTimeFormatted: closeFmt,
      istTimeFormatted: ist.istTimeFormatted,
      istDateISO: ist.istDateISO,
      specialNote: todayRow.specialNote,
    };
  }

  const closeMin = toMinutes(todayRow.closeTime);
  const isOpen =
    closeMin > openMin
      ? ist.minutesFromMidnight >= openMin && ist.minutesFromMidnight < closeMin
      : ist.minutesFromMidnight >= openMin || ist.minutesFromMidnight < closeMin;

  return {
    isOpen,
    isClosingConfirmed: true,
    statusLabel: isOpen ? 'Open Now' : 'Closed Now',
    todayDayName: todayRow.dayName,
    openTimeFormatted: openFmt,
    closeTimeFormatted: closeFmt,
    istTimeFormatted: ist.istTimeFormatted,
    istDateISO: ist.istDateISO,
    specialNote: todayRow.specialNote,
  };
}
