"use client";

import { useMemo, useState } from "react";
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
  getTagForRecord,
  initialActivityRecords,
  type ActivityRecord,
  type ActivityTag,
} from "../lib/time-wallet-storage";
import { EmptyState } from "../components/empty-state";
import { useActivityTagsSource } from "../lib/use-activity-tags-source";
import { useTimeRecordsSource } from "../lib/use-time-records-source";

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
  topTagName: string | null;
  topTagColor: string;
};

const DAY_MINUTES = 24 * 60;
const periodLabels: Record<Period, string> = {
  today: "今日",
  week: "週間",
  month: "月間",
};
const unrecordedDescriptions: Record<Period, string> = {
  today: "今日1日の24時間から、記録済み時間を差し引いた目安です。",
  week: "今週7日分の時間から計算しています。睡眠や未入力の時間も含まれます。",
  month:
    "今月の日数分の時間から計算しています。月間では大きな数字になりやすいです。",
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

function formatDateLabel(dateValue: string) {
  const date = parseDateValue(dateValue);

  return `${date.getMonth() + 1}/${date.getDate()}`;
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

function formatDiffMinutes(minutes: number) {
  if (minutes > 0) {
    return `+${formatMinutes(minutes)}`;
  }

  if (minutes < 0) {
    return `-${formatMinutes(Math.abs(minutes))}`;
  }

  return "±0m";
}

function getDiffClassName(minutes: number) {
  if (minutes > 0) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (minutes < 0) {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-zinc-100 text-zinc-500";
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
  const {
    tags,
    isReady: isTagsReady,
    errorMessage: tagLoadErrorMessage,
  } = useActivityTagsSource();
  const {
    records,
    isReady: isRecordsReady,
    errorMessage: recordLoadErrorMessage,
  } = useTimeRecordsSource(tags, isTagsReady, {
    fallbackRecords: initialActivityRecords,
    autoSaveLocal: false,
  });
  const statusMessage = tagLoadErrorMessage || recordLoadErrorMessage;

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

    return days.map<DaySummary>((day) => {
      const dayRecords = periodRecords.filter(
        (record) => getRecordDate(record) === day.dateValue,
      );
      const topTag = buildTagSummaries(dayRecords, tags)[0];

      return {
        date: day.dateValue,
        label: period === "month" ? day.date.getDate().toString() : day.label,
        minutes: dayRecords.reduce((total, record) => total + record.minutes, 0),
        topTagName: topTag?.name ?? null,
        topTagColor: topTag?.color ?? "#71717a",
      };
    });
  }, [period, periodRange.start, periodRange.totalDays, periodRecords, tags]);

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
  const tagBreakdown = tagSummaries.map((tag) => ({
    ...tag,
    ratio:
      recordedMinutes > 0
        ? Math.round((tag.minutes / recordedMinutes) * 100)
        : 0,
  }));
  const topTagSummaries = tagBreakdown.slice(0, 3);
  const unrecordedDescription = unrecordedDescriptions[period];
  const barChartWidth =
    period === "month" ? Math.max(640, daySummaries.length * 24) : 340;

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 py-3 sm:gap-5 sm:px-6 sm:py-5 lg:px-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Time Wallet
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">
              分析
            </h1>
          </div>
        </header>

        <section className="rounded-lg bg-white p-2.5 shadow-sm ring-1 ring-zinc-200 sm:p-5">
          {!isTagsReady || !isRecordsReady ? (
            <p className="mb-4 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
              時間記録を読み込み中です。
            </p>
          ) : null}

          {statusMessage ? (
            <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {statusMessage}
            </p>
          ) : null}

          <div className="grid grid-cols-3 gap-1 rounded-md bg-zinc-100 p-1 sm:gap-2">
            {(Object.keys(periodLabels) as Period[]).map((periodKey) => (
              <button
                key={periodKey}
                type="button"
                onClick={() => setPeriod(periodKey)}
                className={`h-10 rounded-md text-sm font-semibold transition-colors sm:h-12 sm:text-base ${
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

        <section className="grid gap-2 md:grid-cols-3 md:gap-4">
          <article className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-5">
            <p className="text-xs font-semibold text-zinc-500 sm:text-sm">
              合計記録時間
            </p>
            <p className="mt-1 text-xl font-semibold text-zinc-950 sm:mt-2 sm:text-3xl">
              {formatMinutes(recordedMinutes)}
            </p>
          </article>
          <article className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-5">
            <p className="text-xs font-semibold text-zinc-500 sm:text-sm">
              未記録時間
            </p>
            <p className="mt-1 text-xl font-semibold text-zinc-950 sm:mt-2 sm:text-3xl">
              {formatMinutes(unrecordedMinutes)}
            </p>
            <p className="mt-1 text-xs font-medium text-zinc-400">
              対象時間: {formatMinutes(availableMinutes)}
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-500 sm:mt-2 sm:text-sm sm:leading-6">
              {unrecordedDescription}
            </p>
          </article>
          <article className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-5">
            <p className="text-xs font-semibold text-zinc-500 sm:text-sm">
              記録済み割合
            </p>
            <p className="mt-1 text-xl font-semibold text-zinc-950 sm:mt-2 sm:text-3xl">
              {recordedRatio}%
            </p>
          </article>
        </section>

        <section className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr] lg:gap-4">
          <article className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-5">
            <div>
              <p className="text-xs font-semibold text-zinc-500 sm:text-sm">
                タグ別内訳
              </p>
              <h2 className="mt-0.5 text-lg font-semibold text-zinc-950 sm:text-xl">
                タグ別時間配分
              </h2>
            </div>
            <div className="mt-3 flex h-[13.5rem] min-h-[13.5rem] w-full min-w-0 items-center justify-center overflow-hidden sm:mt-4 sm:h-[18rem] sm:min-h-[18rem]">
              {tagBreakdown.length === 0 ? (
                <EmptyState
                  title="この期間の記録はありません"
                  description="記録を追加すると、タグ別の時間配分がここに表示されます。"
                  actionHref="/records/new"
                  actionLabel="記録を追加する"
                />
              ) : (
                <PieChart width={220} height={220}>
                  <Pie
                    data={tagBreakdown}
                    dataKey="minutes"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {tagBreakdown.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={ChartTooltip} />
                </PieChart>
              )}
            </div>
            {tagBreakdown.length > 0 ? (
              <div className="mt-4 divide-y divide-zinc-100">
                {tagBreakdown.map((tag) => (
                  <div
                    key={tag.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <p className="truncate text-sm font-semibold text-zinc-950">
                          {tag.name}
                        </p>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${tag.ratio}%`,
                            backgroundColor: tag.color,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-950">
                        {formatMinutes(tag.minutes)}
                      </p>
                      <p className="text-xs font-medium text-zinc-500">
                        {tag.ratio}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </article>

          <article className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-5">
            <div>
              <p className="text-xs font-semibold text-zinc-500 sm:text-sm">
                {periodLabels[period]}の推移
              </p>
              <h2 className="mt-0.5 text-lg font-semibold text-zinc-950 sm:text-xl">
                日別記録時間
              </h2>
            </div>
            <div className="mt-3 w-full overflow-x-auto sm:mt-4">
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
            <div className="mt-3 border-t border-zinc-100 pt-3 sm:mt-5 sm:pt-4">
              <div>
                <p className="text-xs font-semibold text-zinc-500 sm:text-sm">
                  日別記録一覧
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-600 sm:text-sm sm:leading-6">
                  各日の合計記録時間と、最も多く記録された活動タグを確認できます。
                </p>
              </div>
              <div className="mt-2 flex max-h-[22rem] flex-col gap-2 overflow-y-auto pr-1 sm:mt-3 sm:max-h-[28rem]">
                {daySummaries.map((day, index) => {
                  const diffMinutes =
                    index === 0
                      ? null
                      : day.minutes - daySummaries[index - 1].minutes;
                  const hasRecords = day.minutes > 0;

                  return (
                    <div
                      key={day.date}
                      className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 sm:gap-3 sm:py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-950">
                          {formatDateLabel(day.date)}
                        </p>
                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          {hasRecords && day.topTagName ? (
                            <>
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: day.topTagColor }}
                              />
                              <span className="truncate text-sm font-medium text-zinc-600">
                                {day.topTagName}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-medium text-zinc-400">
                              未記録
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-zinc-950">
                          {formatMinutes(day.minutes)}
                        </p>
                        {diffMinutes === null ? (
                          <p className="mt-1 text-xs font-medium text-zinc-400">
                            比較なし
                          </p>
                        ) : (
                          <p
                            className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getDiffClassName(
                              diffMinutes,
                            )}`}
                          >
                            前日比 {formatDiffMinutes(diffMinutes)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-3 lg:grid-cols-[1fr_1fr] lg:gap-4">
          <article className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-5">
            <div>
              <p className="text-xs font-semibold text-zinc-500 sm:text-sm">
                タグ別ランキング
              </p>
              <h2 className="mt-0.5 text-lg font-semibold text-zinc-950 sm:text-xl">
                上位タグ
              </h2>
            </div>
            {topTagSummaries.length === 0 ? (
              <div className="mt-3 sm:mt-4">
                <EmptyState
                  title="ランキングはまだありません"
                  description="記録が増えると、よく使っているタグがランキングで見えるようになります。"
                />
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:gap-3">
                {topTagSummaries.map((tag, index) => (
                  <div
                    key={tag.id}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-2.5 sm:gap-3 sm:p-3"
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
                <p className="text-sm leading-6 text-zinc-500">
                  詳しい割合と色別の内訳は、上の「タグ別時間配分」で確認できます。
                </p>
              </div>
            )}
          </article>

          <article className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-5">
            <div>
              <p className="text-xs font-semibold text-zinc-500 sm:text-sm">
                振り返り
              </p>
              <h2 className="mt-0.5 text-lg font-semibold text-zinc-950 sm:text-xl">
                コメント
              </h2>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:gap-3">
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
