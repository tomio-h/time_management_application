"use client";

import { useEffect, useMemo, useState } from "react";
import {
  attachTagIdsToRecords,
  getTagForRecord,
  initialActivityTags,
  parseStoredRecords,
  parseStoredTags,
  RECORDS_STORAGE_KEY,
  TAGS_STORAGE_KEY,
  type ActivityRecord,
  type ActivityTag,
} from "../lib/time-wallet-storage";

type DailySummary = {
  date: string;
  records: ActivityRecord[];
  totalMinutes: number;
  topTagName: string | null;
  topTagColor: string;
};

const DAY_MINUTES = 24 * 60;
const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

function padNumber(value: number) {
  return value.toString().padStart(2, "0");
}

function getDateValue(date: Date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(
    date.getDate(),
  )}`;
}

function getTodayValue() {
  return getDateValue(new Date());
}

function getRecordDate(record: ActivityRecord) {
  return record.date ?? getTodayValue();
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
  }).format(date);
}

function formatDateLabel(dateValue: string) {
  const [year, month, date] = dateValue.split("-");

  return `${year}年${Number(month)}月${Number(date)}日`;
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  if (hours === 0) {
    return `${restMinutes}m`;
  }

  if (restMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h${restMinutes}m`;
}

function createMonthCells(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDate = new Date(year, month, 1);
  const startOffset = firstDate.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const day = index - startOffset + 1;
    const date = new Date(year, month, day);

    return {
      date,
      dateValue: getDateValue(date),
      isCurrentMonth: date.getMonth() === month,
    };
  });
}

function buildDailySummaries(records: ActivityRecord[], tags: ActivityTag[]) {
  const summaries = new Map<string, DailySummary>();

  records.forEach((record) => {
    const date = getRecordDate(record);
    const currentSummary =
      summaries.get(date) ??
      ({
        date,
        records: [],
        totalMinutes: 0,
        topTagName: null,
        topTagColor: "#71717a",
      } satisfies DailySummary);

    currentSummary.records.push(record);
    currentSummary.totalMinutes += record.minutes;
    summaries.set(date, currentSummary);
  });

  summaries.forEach((summary) => {
    const tagTotals = new Map<
      string,
      { name: string; color: string; minutes: number }
    >();

    summary.records.forEach((record) => {
      const tag = getTagForRecord(record, tags);
      const id = tag?.id ?? `legacy-${record.tag}`;
      const currentTotal = tagTotals.get(id)?.minutes ?? 0;

      tagTotals.set(id, {
        name: tag?.name ?? record.tag,
        color: tag?.color ?? "#71717a",
        minutes: currentTotal + record.minutes,
      });
    });

    const topTag = Array.from(tagTotals.values()).sort(
      (firstTag, secondTag) => secondTag.minutes - firstTag.minutes,
    )[0];

    if (topTag) {
      summary.topTagName = topTag.name;
      summary.topTagColor = topTag.color;
    }
  });

  return summaries;
}

export default function CalendarPage() {
  const todayValue = getTodayValue();
  const [monthDate, setMonthDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(todayValue);
  const [tags, setTags] = useState<ActivityTag[]>(initialActivityTags);
  const [records, setRecords] = useState<ActivityRecord[]>([]);

  useEffect(() => {
    const storedTags = window.localStorage.getItem(TAGS_STORAGE_KEY);
    const storedRecords = window.localStorage.getItem(RECORDS_STORAGE_KEY);
    const parsedTags = storedTags ? parseStoredTags(storedTags) : null;
    const parsedRecords = storedRecords
      ? parseStoredRecords(storedRecords)
      : null;

    const timeoutId = window.setTimeout(() => {
      const loadedTags = parsedTags ?? initialActivityTags;

      setTags(loadedTags);

      if (parsedRecords) {
        setRecords(attachTagIdsToRecords(parsedRecords, loadedTags));
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const monthCells = useMemo(() => createMonthCells(monthDate), [monthDate]);
  const dailySummaries = useMemo(
    () => buildDailySummaries(records, tags),
    [records, tags],
  );
  const selectedSummary =
    dailySummaries.get(selectedDate) ??
    ({
      date: selectedDate,
      records: [],
      totalMinutes: 0,
      topTagName: null,
      topTagColor: "#71717a",
    } satisfies DailySummary);
  const selectedRecords = [...selectedSummary.records].sort((first, second) =>
    first.start.localeCompare(second.start),
  );

  const handleChangeMonth = (offset: number) => {
    setMonthDate((currentMonth) => {
      const nextMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + offset,
        1,
      );

      setSelectedDate(getDateValue(nextMonth));
      return nextMonth;
    });
  };

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-zinc-100 text-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-5 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">Time Wallet</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">
              カレンダー
            </h1>
          </div>
        </header>

        <section className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex sm:justify-between">
            <button
              type="button"
              onClick={() => handleChangeMonth(-1)}
              className="h-11 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 sm:px-4"
            >
              前月
            </button>
            <h2 className="text-center text-lg font-semibold text-zinc-950 sm:text-xl">
              {formatMonthLabel(monthDate)}
            </h2>
            <button
              type="button"
              onClick={() => handleChangeMonth(1)}
              className="h-11 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 sm:px-4"
            >
              翌月
            </button>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-zinc-500 sm:gap-2">
            {weekDays.map((weekDay) => (
              <div key={weekDay}>{weekDay}</div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
            {monthCells.map((cell) => {
              const summary = dailySummaries.get(cell.dateValue);
              const totalMinutes = summary?.totalMinutes ?? 0;
              const topTagName = summary?.topTagName ?? null;
              const topTagColor = summary?.topTagColor ?? "#71717a";
              const hasRecords = totalMinutes > 0;
              const isToday = cell.dateValue === todayValue;
              const isSelected = cell.dateValue === selectedDate;

              return (
                <button
                  key={cell.dateValue}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateValue)}
                  className={`min-h-[4.75rem] rounded-md border p-1.5 text-left transition-colors sm:min-h-24 sm:p-2 ${
                    isSelected
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : hasRecords
                        ? "border-zinc-200 bg-zinc-50 hover:bg-white"
                        : "border-zinc-200 bg-white hover:bg-zinc-50"
                  } ${cell.isCurrentMonth ? "" : "opacity-45"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold sm:h-7 sm:w-7 sm:text-sm ${
                        isToday && !isSelected
                          ? "bg-emerald-100 text-emerald-700"
                          : ""
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>
                    {hasRecords ? (
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: topTagColor }}
                      />
                    ) : null}
                  </div>
                  {hasRecords ? (
                    <div className="mt-1 space-y-1 sm:mt-2">
                      <p className="text-[0.68rem] font-semibold leading-tight sm:text-xs">
                        {formatMinutes(totalMinutes)}
                      </p>
                      <p className="hidden truncate text-xs opacity-80 sm:block">
                        {topTagName}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-[0.65rem] opacity-50 sm:mt-2 sm:text-xs">
                      未記録
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-zinc-200 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">日別詳細</p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                {formatDateLabel(selectedDate)}
              </h2>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 text-sm sm:w-auto">
              <div className="rounded-md bg-zinc-50 px-3 py-2">
                <p className="text-xs text-zinc-500">記録済み</p>
                <p className="mt-1 font-semibold text-zinc-950">
                  {formatMinutes(selectedSummary.totalMinutes)}
                </p>
              </div>
              <div className="rounded-md bg-zinc-50 px-3 py-2">
                <p className="text-xs text-zinc-500">未記録</p>
                <p className="mt-1 font-semibold text-zinc-950">
                  {formatMinutes(
                    Math.max(DAY_MINUTES - selectedSummary.totalMinutes, 0),
                  )}
                </p>
              </div>
            </div>
          </div>

          {selectedRecords.length === 0 ? (
            <p className="mt-4 rounded-md bg-zinc-50 px-3 py-3 text-sm text-zinc-500">
              この日の記録はありません
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {selectedRecords.map((record) => {
                const tag = getTagForRecord(record, tags);

                return (
                  <div
                    key={record.id}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag?.color ?? "#71717a" }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-950">
                        {record.start}-{record.end} {tag?.name ?? record.tag}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {record.memo ? record.memo : "時間記録"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-zinc-700">
                      {formatMinutes(record.durationMinutes ?? record.minutes)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
