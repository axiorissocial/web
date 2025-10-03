import type { TFunction } from 'i18next';

const resolveLocale = (locale?: string) => {
  if (locale) {
    return locale;
  }

  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }

  return 'en-US';
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const getAbsoluteDateTimeParts = (date: Date, locale?: string) => {
  const resolvedLocale = resolveLocale(locale);

  const dateFormatter = new Intl.DateTimeFormat(resolvedLocale, {
    dateStyle: 'long'
  });

  const timeFormatter = new Intl.DateTimeFormat(resolvedLocale, {
    timeStyle: 'short'
  });

  return {
    date: dateFormatter.format(date),
    time: timeFormatter.format(date)
  };
};

export const formatCalendarDateTime = (date: Date, locale: string, t: TFunction) => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const { date: datePart, time } = getAbsoluteDateTimeParts(date, locale);

  if (isSameDay(date, now)) {
    return t('time.calendar.todayWithTime', { time });
  }

  if (isSameDay(date, yesterday)) {
    return t('time.calendar.yesterdayWithTime', { time });
  }

  return t('time.formats.dateTime', { date: datePart, time });
};

export const formatRelativeTime = (date: Date, t: TFunction, now: Date = new Date()) => {
  const diffMs = now.getTime() - date.getTime();

  if (diffMs <= 0) {
    return t('time.relative.justNow');
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 45) {
    return t('time.relative.justNow');
  }

  if (diffSeconds < 90) {
    return t('time.relative.minute');
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return diffMinutes === 1
      ? t('time.relative.minute')
      : t('time.relative.minutes', { count: diffMinutes });
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return diffHours === 1
      ? t('time.relative.hour')
      : t('time.relative.hours', { count: diffHours });
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return diffDays === 1
      ? t('time.relative.day')
      : t('time.relative.days', { count: diffDays });
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) {
    return diffWeeks === 1
      ? t('time.relative.week')
      : t('time.relative.weeks', { count: diffWeeks });
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return diffMonths === 1
      ? t('time.relative.month')
      : t('time.relative.months', { count: diffMonths });
  }

  const diffYears = Math.floor(diffDays / 365);
  if (diffYears <= 1) {
    return t('time.relative.year');
  }

  return t('time.relative.years', { count: diffYears });
};

export const formatAbsoluteWithRelative = (date: Date, locale: string, t: TFunction) => {
  const absolute = formatCalendarDateTime(date, locale, t);
  const relative = formatRelativeTime(date, t);
  return t('time.display.absoluteWithRelative', { absolute, relative });
};
