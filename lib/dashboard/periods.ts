export type DashboardPeriod = "Hoje" | "Semana" | "Mês";

type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export type PeriodRange = {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  localStart: Pick<LocalParts, "year" | "month" | "day">;
};

function localParts(date: Date, timeZone: string): LocalParts {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (name: string) => Number(values.find((part) => part.type === name)?.value ?? 0);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function shiftDate(date: Pick<LocalParts, "year" | "month" | "day">, days: number) {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

function localMidnightToUtc(date: Pick<LocalParts, "year" | "month" | "day">, timeZone: string) {
  const target = Date.UTC(date.year, date.month - 1, date.day);
  let instant = target;

  // Resolve the zone offset iteratively so period boundaries follow the business timezone.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const observed = localParts(new Date(instant), timeZone);
    const observedAsUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second,
    );
    instant += target - observedAsUtc;
  }

  return new Date(instant);
}

export function getPeriodRange(period: DashboardPeriod, timeZone: string, now = new Date()): PeriodRange {
  const today = localParts(now, timeZone);
  const todayDate = { year: today.year, month: today.month, day: today.day };
  let localStart = todayDate;
  let localEnd: Pick<LocalParts, "year" | "month" | "day">;
  let localPreviousStart: Pick<LocalParts, "year" | "month" | "day">;

  if (period === "Hoje") {
    localEnd = shiftDate(todayDate, 1);
    localPreviousStart = shiftDate(todayDate, -1);
  } else if (period === "Semana") {
    const weekday = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay();
    localStart = shiftDate(todayDate, -((weekday + 6) % 7));
    localEnd = shiftDate(localStart, 7);
    localPreviousStart = shiftDate(localStart, -7);
  } else {
    localStart = { year: today.year, month: today.month, day: 1 };
    const nextMonth = new Date(Date.UTC(today.year, today.month, 1));
    localEnd = { year: nextMonth.getUTCFullYear(), month: nextMonth.getUTCMonth() + 1, day: 1 };
    const previousMonth = new Date(Date.UTC(today.year, today.month - 2, 1));
    localPreviousStart = {
      year: previousMonth.getUTCFullYear(),
      month: previousMonth.getUTCMonth() + 1,
      day: 1,
    };
  }

  return {
    start: localMidnightToUtc(localStart, timeZone),
    end: localMidnightToUtc(localEnd, timeZone),
    previousStart: localMidnightToUtc(localPreviousStart, timeZone),
    previousEnd: localMidnightToUtc(localStart, timeZone),
    localStart,
  };
}

export function getLocalDateTime(date: Date, timeZone: string) {
  return localParts(date, timeZone);
}
