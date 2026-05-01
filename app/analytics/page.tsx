"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import {
  attachTagIdsToRecords,
  getTagForRecord,
  initialActivityRecords,
  initialActivityTags,
  parseStoredRecords,
  parseStoredTags,
  RECORDS_STORAGE_KEY,
  TAGS_STORAGE_KEY,
  type ActivityRecord,
  type ActivityTag,
} from "../lib/time-wallet-storage";

type Period = "today" | "week" | "month";

type TagSummary = {
  id: string;
  name: string;
  color: string;
  minutes: number;
};

type DaySummary = {
  date: string;
  label: string;
  minutes: number;
};

const DAY_MINUTES = 24 * 60;
const periodLabels: Record<Period, string> = {
  today: "今日",
  week: "週間",
  month: "月間",
};

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

function parseDateValue(dateValue: string) {
  const [year, month, date] = dateValue.split("-").map(Number);

  return new Date(year, month - 1, date);
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
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

function getPeriodRange(period: Period) {
  const today = new Date();
  const currentDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  if (period === "today") {
    return {
      start: currentDate,
      end: currentDate,
      totalDays: 1,
    };
  }

  if (period === "week") {
    const mondayOffset = (currentDate.getDay() + 6) % 7;
    const start = addDays(currentDate, -mondayOffset);
    const end = addDays(start, 6);

    return {
      start,
      end,
      totalDays: 7,
    };
  }

  const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  return {
    start,
    end,
    totalDays: end.getDate(),
  };
}

function getDaysInRange(start: Date, totalDays: number) {
  return Array.from({ length: totalDays }, (_, index) => {
    const date = addDays(start, index);

    return {
      date,
      dateValue: getDateValue(date),
      label: `${date.getMonth() + 1}/${date.getDate()}`,
    };
  });
}

function isDateInRange(dateValue: string, start: Date, end: Date) {
  const date = parseDateValue(dateValue);

  return date >= start && date <= end;
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0];

  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-semibold text-zinc-950">{item.name}</p>
      <p className="text-zinc-600">{formatMinutes(Number(item.value))}</p>
    </div>
  );
}

function buildTagSummaries(records: ActivityRecord[], tags: ActivityTag[]) {
  const summaries = new Map<string, TagSummary>();

  records.forEach((record) => {
    const tag = getTagForRecord(record, tags);
    const id = tag?.id ?? `legacy-${record.tag}`;
    const currentMinutes = summaries.get(id)?.minutes ?? 0;

    summaries.set(id, {
      id,
      name: tag?.name ?? record.tag,
      color: tag?.color ?? "#71717a",
      minutes: currentMinutes + record.minutes,
    });
  });

  return Array.from(summaries.values()).sort(
    (firstTag, secondTag) => secondTag.minutes - firstTag.minutes,
  );
}

function buildComments(
  tagSummaries: TagSummary[],
  recordedMinutes: number,
  availableMinutes: number,
) {
  const comments: string[] = [];
  const topTag = tagSummaries[0];
  const recordedRatio =
    availableMinutes > 0
      ? Math.round((recordedMinutes / availableMinutes) * 100)
      : 0;

  if (topTag) {
    comments.push(
      `最も多い活動タグは「${topTag.name}」で、${formatMinutes(topTag.minutes)}でした。`,
    );
  }

  comments.push(`この期間の記録済み時間は全体の${recordedRatio}%です。`);

  if (recordedRatio < 35) {
    comments.push(
      "未記録時間が多めです。まずは大きな活動だけでも記録すると振り返りやすくなります。",
    );
  } else if (recordedRatio >= 70) {
    comments.push(
      "かなり細かく記録できています。時間の使い方を比較しやすい状態です。",
    );
  }

  return comments.slice(0, 3);
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("today");
  const [tags, setTags] = useState<ActivityTag[]>(initialActivityTags);
  const [records, setRecords] = useState<ActivityRecord[]>(
    initialActivityRecords,
  );

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

  const periodRange = useMemo(() => getPeriodRange(period), [period]);
  const periodRecords = useMemo(
    () =>
      records.filter((record) =>
        isDateInRange(
          getRecordDate(record),
          periodRange.start,
          periodRange.end,
        ),
      ),
    [periodRange.end, periodRange.start, records],
  );
  const tagSummaries = useMemo(
    () => buildTagSummaries(periodRecords, tags),
    [periodRecords, tags],
  );
  const daySummaries = useMemo(() => {
    const days = getDaysInRange(periodRange.start, periodRange.totalDays);

    return days.map<DaySummary>((day) => ({
      date: day.dateValue,
      label: period === "month" ? day.date.getDate().toString() : day.label,
      minutes: periodRecords
        .filter((record) => getRecordDate(record) === day.dateValue)
        .reduce((total, record) => total + record.minutes, 0),
    }));
  }, [period, periodRange.start, periodRange.totalDays, periodRecords]);

  const recordedMinutes = periodRecords.reduce(
    (total, record) => total + record.minutes,
    0,
  );
  const availableMinutes = periodRange.totalDays * DAY_MINUTES;
  const unrecordedMinutes = Math.max(availableMinutes - recordedMinutes, 0);
  const recordedRatio =
    availableMinutes > 0
      ? Math.round((recordedMinutes / availableMinutes) * 100)
      : 0;
  const comments = buildComments(
    tagSummaries,
    recordedMinutes,
    availableMinutes,
  );
  const barChartWidth =
    period === "month" ? Math.max(720, daySummaries.length * 28) : 420;

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">Time Wallet</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">
              分析
            </h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/dashboard"
              className="rounded-md bg-zinc-950 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800"
            >
              ダッシュボードへ
            </Link>
            <Link
              href="/calendar"
              className="rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-zinc-700 shadow-sm ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50"
            >
              カレンダーへ
            </Link>
          </div>
        </header>

        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="grid grid-cols-3 gap-2 rounded-md bg-zinc-100 p-1">
            {(Object.keys(periodLabels) as Period[]).map((periodKey) => (
              <button
                key={periodKey}
                type="button"
                onClick={() => setPeriod(periodKey)}
                className={`h-10 rounded-md text-sm font-semibold transition-colors ${
                  period === periodKey
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-600 hover:bg-white"
                }`}
              >
                {periodLabels[periodKey]}
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <p className="text-sm font-medium text-zinc-500">合計記録時間</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-950">
              {formatMinutes(recordedMinutes)}
            </p>
          </article>
          <article className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <p className="text-sm font-medium text-zinc-500">未記録時間</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-950">
              {formatMinutes(unrecordedMinutes)}
            </p>
          </article>
          <article className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <p className="text-sm font-medium text-zinc-500">記録済み割合</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-950">
              {recordedRatio}%
            </p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <div>
              <p className="text-sm font-medium text-zinc-500">タグ別合計時間</p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                円グラフ
              </h2>
            </div>
            <div className="mt-4 flex h-[18rem] min-h-[18rem] w-full min-w-0 items-center justify-center overflow-hidden">
              <PieChart width={260} height={260}>
                <Pie
                  data={tagSummaries}
                  dataKey="minutes"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={106}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {tagSummaries.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={ChartTooltip} />
              </PieChart>
            </div>
          </article>

          <article className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <div>
              <p className="text-sm font-medium text-zinc-500">日別合計時間</p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                棒グラフ
              </h2>
            </div>
            <div className="mt-4 overflow-x-auto">
              <BarChart
                width={barChartWidth}
                height={260}
                data={daySummaries}
                margin={{ top: 12, right: 16, bottom: 8, left: 0 }}
              >
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={42}
                  tickFormatter={(value) => `${Math.round(Number(value) / 60)}h`}
                />
                <Tooltip content={ChartTooltip} />
                <Bar
                  dataKey="minutes"
                  name="記録時間"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <article className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <div>
              <p className="text-sm font-medium text-zinc-500">タグ別ランキング</p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                使った時間が多い順
              </h2>
            </div>
            {tagSummaries.length === 0 ? (
              <p className="mt-4 rounded-md bg-zinc-50 px-3 py-3 text-sm text-zinc-500">
                この期間の記録はありません
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {tagSummaries.map((tag, index) => (
                  <div
                    key={tag.id}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3"
                  >
                    <span className="text-sm font-semibold text-zinc-500">
                      {index + 1}
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="truncate text-sm font-semibold text-zinc-950">
                        {tag.name}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-zinc-700">
                      {formatMinutes(tag.minutes)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <div>
              <p className="text-sm font-medium text-zinc-500">振り返り</p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                コメント
              </h2>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {comments.map((comment) => (
                <p
                  key={comment}
                  className="rounded-md bg-zinc-50 px-3 py-3 text-sm font-medium leading-6 text-zinc-700"
                >
                  {comment}
                </p>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
