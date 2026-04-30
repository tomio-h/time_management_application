"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  Tooltip,
  type TooltipContentProps,
} from "recharts";

type ActivityTag =
  | "授業"
  | "課題"
  | "研究"
  | "バイト"
  | "睡眠"
  | "スマホ"
  | "趣味"
  | "休憩";

type ActivityRecord = {
  id: number;
  tag: ActivityTag;
  start: string;
  end: string;
  minutes: number;
};

type TagOption = {
  name: ActivityTag;
  color: string;
};

type RunningRecord = {
  tag: ActivityTag;
  startedAt: Date;
  elapsedSeconds: number;
};

const DAY_MINUTES = 24 * 60;

const tagOptions: TagOption[] = [
  { name: "授業", color: "#2563eb" },
  { name: "課題", color: "#0f766e" },
  { name: "研究", color: "#7c3aed" },
  { name: "バイト", color: "#c2410c" },
  { name: "睡眠", color: "#4f46e5" },
  { name: "スマホ", color: "#db2777" },
  { name: "趣味", color: "#16a34a" },
  { name: "休憩", color: "#ca8a04" },
];

const initialActivityRecords: ActivityRecord[] = [
  { id: 1, start: "09:00", end: "10:30", tag: "授業", minutes: 90 },
  { id: 2, start: "10:45", end: "12:00", tag: "課題", minutes: 75 },
  { id: 3, start: "13:00", end: "15:00", tag: "研究", minutes: 120 },
  { id: 4, start: "15:20", end: "17:20", tag: "バイト", minutes: 120 },
  { id: 5, start: "18:00", end: "18:40", tag: "休憩", minutes: 40 },
  { id: 6, start: "21:10", end: "22:05", tag: "趣味", minutes: 55 },
];

const todayLabel = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "full",
}).format(new Date());

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

function formatTimer(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}

function formatRecordTime(date: Date) {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${hours}:${minutes}`;
}

function ActivityTooltip({
  active,
  payload,
}: TooltipContentProps) {
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

export default function DashboardPage() {
  const [selectedTag, setSelectedTag] = useState<ActivityTag>("研究");
  const [records, setRecords] = useState<ActivityRecord[]>(
    initialActivityRecords,
  );
  const [runningRecord, setRunningRecord] = useState<RunningRecord | null>(
    null,
  );

  const runningStartedAt = runningRecord?.startedAt.getTime();

  useEffect(() => {
    if (runningStartedAt === undefined) {
      return;
    }

    const updateElapsed = () => {
      setRunningRecord((currentRecord) =>
        currentRecord
          ? {
              ...currentRecord,
              elapsedSeconds: Math.floor(
                (Date.now() - currentRecord.startedAt.getTime()) / 1000,
              ),
            }
          : null,
      );
    };

    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 1000);

    return () => window.clearInterval(intervalId);
  }, [runningStartedAt]);

  const recordedMinutes = useMemo(
    () => records.reduce((total, record) => total + record.minutes, 0),
    [records],
  );
  const unrecordedMinutes = Math.max(DAY_MINUTES - recordedMinutes, 0);
  const recordedRatio = Math.min(recordedMinutes / DAY_MINUTES, 1);

  const chartData = useMemo(
    () =>
      tagOptions
        .map((tag) => ({
          name: tag.name,
          value: records
            .filter((record) => record.tag === tag.name)
            .reduce((total, record) => total + record.minutes, 0),
          color: tag.color,
        }))
        .filter((entry) => entry.value > 0),
    [records],
  );

  const handleStart = () => {
    setRunningRecord({
      tag: selectedTag,
      startedAt: new Date(),
      elapsedSeconds: 0,
    });
  };

  const handleStop = () => {
    if (!runningRecord) {
      return;
    }

    const stoppedAt = new Date();
    const elapsedSeconds = Math.max(
      1,
      Math.floor((stoppedAt.getTime() - runningRecord.startedAt.getTime()) / 1000),
    );
    const minutes = Math.max(1, Math.ceil(elapsedSeconds / 60));

    setRecords((currentRecords) => [
      ...currentRecords,
      {
        id: stoppedAt.getTime(),
        tag: runningRecord.tag,
        start: formatRecordTime(runningRecord.startedAt),
        end: formatRecordTime(stoppedAt),
        minutes,
      },
    ]);
    setRunningRecord(null);
  };

  const currentTag = runningRecord?.tag ?? selectedTag;
  const currentTimer = formatTimer(runningRecord?.elapsedSeconds ?? 0);

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">時間家計簿</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">
              Time Wallet
            </h1>
          </div>
          <p className="rounded-md bg-white px-3 py-2 text-sm font-medium text-zinc-600 shadow-sm ring-1 ring-zinc-200">
            {todayLabel}
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-500">今日の記録</p>
                <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                  記録済み時間
                </h2>
              </div>
              <span className="rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                {Math.round(recordedRatio * 100)}%
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">記録済み</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">
                  {formatMinutes(recordedMinutes)}
                </p>
              </div>
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">未記録</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">
                  {formatMinutes(unrecordedMinutes)}
                </p>
              </div>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{
                  width: `${recordedRatio * 100}%`,
                }}
              />
            </div>
          </article>

          <article className="rounded-lg bg-zinc-950 p-5 text-white shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-400">
                  {runningRecord ? "現在記録中" : "記録待機中"}
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {currentTag}
                </h2>
              </div>
              <span
                className={`h-3 w-3 rounded-full ${
                  runningRecord
                    ? "bg-emerald-400 shadow-[0_0_0_6px_rgba(52,211,153,0.18)]"
                    : "bg-zinc-500"
                }`}
              />
            </div>

            <p className="mt-6 font-mono text-4xl font-semibold tracking-normal">
              {currentTimer}
            </p>

            {runningRecord ? (
              <button
                type="button"
                onClick={handleStop}
                className="mt-6 h-11 w-full rounded-md bg-white px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
              >
                停止する
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStart}
                className="mt-6 h-11 w-full rounded-md bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-300"
              >
                開始する
              </button>
            )}
          </article>
        </section>

        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-zinc-500">
                タグを選んで開始
              </p>
              <h2 className="text-xl font-semibold text-zinc-950">活動タグ</h2>
            </div>
            <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-700">
              選択中: {selectedTag}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {tagOptions.map((tag) => {
              const isSelected = selectedTag === tag.name;

              return (
                <button
                  key={tag.name}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedTag(tag.name)}
                  className={`flex h-12 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors ${
                    isSelected
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300 hover:bg-white"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <div>
              <p className="text-sm font-medium text-zinc-500">
                今日の時間配分
              </p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                円グラフ
              </h2>
            </div>

            <div className="mt-4 flex h-[18rem] min-h-[18rem] w-full min-w-0 items-center justify-center overflow-hidden">
              <PieChart width={260} height={260}>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={106}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={ActivityTooltip} />
              </PieChart>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {chartData.map((entry) => (
                <div
                  key={entry.name}
                  className="flex items-center justify-between gap-2 rounded-md bg-zinc-50 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2 font-medium text-zinc-700">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    {entry.name}
                  </span>
                  <span className="text-zinc-500">
                    {formatMinutes(entry.value)}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <div>
              <p className="text-sm font-medium text-zinc-500">今日の履歴</p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                今日の活動履歴リスト
              </h2>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {records.map((record) => {
                const tag = tagOptions.find((item) => item.name === record.tag);

                return (
                  <div
                    key={record.id}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3"
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag?.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-950">
                        {record.start}-{record.end} {record.tag}
                      </p>
                      <p className="text-xs text-zinc-500">時間記録</p>
                    </div>
                    <p className="text-sm font-semibold text-zinc-700">
                      {formatMinutes(record.minutes)}
                    </p>
                  </div>
                );
              })}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
