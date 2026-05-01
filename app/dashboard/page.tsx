"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  Tooltip,
  type TooltipContentProps,
} from "recharts";
import {
  attachTagIdsToRecords,
  getSortedActiveTags,
  getTagForRecord,
  initialActivityRecords,
  initialActivityTags,
  loadActiveTimerFromStorage,
  loadActivityRecordsFromStorage,
  loadActivityTagsFromStorage,
  removeActiveTimerFromStorage,
  saveActiveTimerToStorage,
  saveActivityRecordsToStorage,
  saveActivityTagsToStorage,
  type ActivityRecord,
  type ActivityTag,
} from "../lib/time-wallet-storage";

type RunningRecord = {
  tagId: string;
  startedAt: Date;
  elapsedSeconds: number;
};

const DAY_MINUTES = 24 * 60;

const todayLabel = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "full",
}).format(new Date());
const todayValue = (() => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const date = today.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${date}`;
})();

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

function getElapsedSeconds(startedAt: Date) {
  return Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));
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
  const [selectedTagId, setSelectedTagId] = useState("research");
  const [tags, setTags] = useState<ActivityTag[]>(initialActivityTags);
  const [records, setRecords] = useState<ActivityRecord[]>(
    initialActivityRecords,
  );
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [runningRecord, setRunningRecord] = useState<RunningRecord | null>(
    null,
  );

  const runningStartedAt = runningRecord?.startedAt.getTime();

  useEffect(() => {
    const storedTags = loadActivityTagsFromStorage();
    const storedRecords = loadActivityRecordsFromStorage();
    const storedActiveTimer = loadActiveTimerFromStorage();

    const timeoutId = window.setTimeout(() => {
      const loadedTags = storedTags ?? initialActivityTags;

      if (storedTags) {
        setTags(storedTags);
        setSelectedTagId((currentTagId) => {
          const activeTags = getSortedActiveTags(loadedTags);

          if (activeTags.some((tag) => tag.id === currentTagId)) {
            return currentTagId;
          }

          return activeTags[0]?.id ?? currentTagId;
        });
      }

      if (storedRecords) {
        setRecords(attachTagIdsToRecords(storedRecords, loadedTags));
      }

      if (storedActiveTimer) {
        const startedAt = new Date(storedActiveTimer.startedAt);

        setRunningRecord({
          tagId: storedActiveTimer.tagId,
          startedAt,
          elapsedSeconds: getElapsedSeconds(startedAt),
        });
      }

      setIsStorageReady(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isStorageReady) {
      return;
    }

    saveActivityRecordsToStorage(records);
  }, [isStorageReady, records]);

  useEffect(() => {
    if (!isStorageReady) {
      return;
    }

    saveActivityTagsToStorage(tags);
  }, [isStorageReady, tags]);

  useEffect(() => {
    if (runningStartedAt === undefined) {
      return;
    }

    const updateElapsed = () => {
      setRunningRecord((currentRecord) =>
        currentRecord
          ? {
              ...currentRecord,
              elapsedSeconds: getElapsedSeconds(currentRecord.startedAt),
            }
          : null,
      );
    };

    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 1000);

    return () => window.clearInterval(intervalId);
  }, [runningStartedAt]);

  const todayRecords = useMemo(
    () =>
      records.filter(
        (record) => record.date === undefined || record.date === todayValue,
      ),
    [records],
  );
  const recordedMinutes = useMemo(
    () => todayRecords.reduce((total, record) => total + record.minutes, 0),
    [todayRecords],
  );
  const unrecordedMinutes = Math.max(DAY_MINUTES - recordedMinutes, 0);
  const recordedRatio = Math.min(recordedMinutes / DAY_MINUTES, 1);
  const activeTags = useMemo(() => getSortedActiveTags(tags), [tags]);
  const selectedTag =
    activeTags.find((tag) => tag.id === selectedTagId) ?? activeTags[0] ?? null;

  const chartData = useMemo(
    () => {
      const groupedRecords = new Map<
        string,
        { id: string; name: string; value: number; color: string }
      >();

      todayRecords.forEach((record) => {
        const tag = getTagForRecord(record, tags);
        const id = tag?.id ?? `legacy-${record.tag}`;
        const currentValue = groupedRecords.get(id)?.value ?? 0;

        groupedRecords.set(id, {
          id,
          name: tag?.name ?? record.tag,
          value: currentValue + record.minutes,
          color: tag?.color ?? "#71717a",
        });
      });

      return Array.from(groupedRecords.values()).filter(
        (entry) => entry.value > 0,
      );
    },
    [todayRecords, tags],
  );

  const handleStart = () => {
    if (!selectedTag) {
      return;
    }

    const startedAt = new Date();

    setRunningRecord({
      tagId: selectedTag.id,
      startedAt,
      elapsedSeconds: 0,
    });
    saveActiveTimerToStorage({
      tagId: selectedTag.id,
      startedAt: startedAt.toISOString(),
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
        date: todayValue,
        tagId: runningRecord.tagId,
        tag:
          tags.find((tag) => tag.id === runningRecord.tagId)?.name ??
          "削除済みタグ",
        start: formatRecordTime(runningRecord.startedAt),
        end: formatRecordTime(stoppedAt),
        minutes,
        durationMinutes: minutes,
      },
    ]);
    setRunningRecord(null);
    removeActiveTimerFromStorage();
  };

  const handleResetRecords = () => {
    setRecords(initialActivityRecords);
    setRunningRecord(null);
    removeActiveTimerFromStorage();

    if (isStorageReady) {
      saveActivityRecordsToStorage(initialActivityRecords);
    }
  };

  const runningTag = runningRecord
    ? tags.find((tag) => tag.id === runningRecord.tagId)
    : null;
  const currentTag = runningRecord
    ? runningTag?.name ?? "削除済みタグ"
    : selectedTag?.name ?? "タグなし";
  const currentTimer = formatTimer(runningRecord?.elapsedSeconds ?? 0);

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-zinc-100 text-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-5 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">時間家計簿</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">
              Time Wallet
            </h1>
          </div>
          <p className="rounded-md bg-white px-3 py-2 text-sm font-medium text-zinc-600 shadow-sm ring-1 ring-zinc-200">
            {todayLabel}
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-zinc-200 sm:p-5">
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

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
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

          <article className="rounded-lg bg-zinc-950 p-4 text-white shadow-sm sm:p-5">
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
                className="mt-6 h-14 w-full rounded-md bg-white px-4 text-base font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
              >
                停止する
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStart}
                disabled={!selectedTag}
                className="mt-6 h-14 w-full rounded-md bg-emerald-400 px-4 text-base font-semibold text-zinc-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                開始する
              </button>
            )}
          </article>
        </section>

        <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-zinc-200 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-zinc-500">
                タグを選んで開始
              </p>
              <h2 className="text-xl font-semibold text-zinc-950">活動タグ</h2>
            </div>
            <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-700">
              選択中: {selectedTag?.name ?? "タグなし"}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {activeTags.map((tag) => {
              const isSelected = selectedTag?.id === tag.id;

              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedTagId(tag.id)}
                  className={`flex h-14 min-w-0 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors ${
                    isSelected
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300 hover:bg-white"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="truncate">{tag.name}</span>
                </button>
              );
            })}
          </div>
          {activeTags.length === 0 ? (
            <p className="mt-4 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
              活動タグがありません。/tags でタグを追加してください。
            </p>
          ) : null}
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-zinc-200 sm:p-5">
            <div>
              <p className="text-sm font-medium text-zinc-500">
                今日の時間配分
              </p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                円グラフ
              </h2>
            </div>

            <div className="mt-4 flex h-[16rem] min-h-[16rem] w-full min-w-0 items-center justify-center overflow-hidden sm:h-[18rem] sm:min-h-[18rem]">
              <PieChart width={240} height={240}>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={64}
                  outerRadius={98}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={ActivityTooltip} />
              </PieChart>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {chartData.map((entry) => (
                <div
                  key={entry.id}
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

          <article className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-zinc-200 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-500">今日の履歴</p>
                <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                  今日の活動履歴リスト
                </h2>
              </div>
              <button
                type="button"
                onClick={handleResetRecords}
                className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 sm:w-auto"
              >
                データをリセット
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {todayRecords.map((record) => {
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
