"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import {
  addSupabaseTimeRecord,
  createDateTimeFromDateAndTime,
} from "../../lib/supabase/time-records";
import { EmptyState } from "../../components/empty-state";
import {
  getSortedActiveTags,
  initialActivityRecords,
  saveActivityRecordsToStorage,
  type ActivityRecord,
} from "../../lib/time-wallet-storage";
import { useActivityTagsSource } from "../../lib/use-activity-tags-source";
import { useTimeRecordsSource } from "../../lib/use-time-records-source";

function getTodayValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const date = today.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${date}`;
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  if (
    hours === undefined ||
    minutes === undefined ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return null;
  }

  return hours * 60 + minutes;
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

export default function NewRecordPage() {
  const router = useRouter();
  const {
    tags,
    isReady: isTagsReady,
    errorMessage: tagLoadErrorMessage,
  } = useActivityTagsSource();
  const {
    records,
    setRecords,
    source: recordsSource,
    userId,
    isReady: isRecordsReady,
    errorMessage: recordLoadErrorMessage,
  } = useTimeRecordsSource(tags, isTagsReady, {
    fallbackRecords: initialActivityRecords,
    autoSaveLocal: false,
  });
  const [date, setDate] = useState(getTodayValue);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [memo, setMemo] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const activeTags = useMemo(() => getSortedActiveTags(tags), [tags]);
  const visibleActiveTags = isTagsReady ? activeTags : [];
  const selectedTag =
    visibleActiveTags.find((tag) => tag.id === selectedTagId) ??
    visibleActiveTags[0] ??
    null;
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const durationMinutes =
    startMinutes !== null && endMinutes !== null ? endMinutes - startMinutes : 0;
  const isInvalidTime =
    startMinutes === null || endMinutes === null || durationMinutes <= 0;
  const isUsingSupabase = recordsSource === "supabase" && userId !== null;
  const statusMessage =
    errorMessage || tagLoadErrorMessage || recordLoadErrorMessage;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!isTagsReady || !isRecordsReady) {
      setErrorMessage("データを読み込み中です。");
      return;
    }

    if (!selectedTag) {
      setErrorMessage("活動タグを選択してください。");
      return;
    }

    if (isInvalidTime) {
      setErrorMessage("終了時刻は開始時刻より後にしてください。");
      return;
    }

    const startedAt = createDateTimeFromDateAndTime(date, startTime);
    const endedAt = createDateTimeFromDateAndTime(date, endTime);

    if (!startedAt || !endedAt) {
      setErrorMessage("日付と時刻を正しく入力してください。");
      return;
    }

    if (isUsingSupabase) {
      setIsSaving(true);

      try {
        await addSupabaseTimeRecord({
          userId,
          tagId: selectedTag.id,
          tagNameSnapshot: selectedTag.name,
          startedAt,
          endedAt,
          durationMinutes,
          memo,
        });
        router.push("/dashboard");
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "時間記録を保存できませんでした。",
        );
      } finally {
        setIsSaving(false);
      }

      return;
    }

    const nextRecord: ActivityRecord = {
      id: Date.now(),
      date,
      tagId: selectedTag.id,
      tag: selectedTag.name,
      start: startTime,
      end: endTime,
      minutes: durationMinutes,
      durationMinutes,
      memo: memo.trim() || undefined,
    };
    const nextRecords = [...records, nextRecord];

    saveActivityRecordsToStorage(nextRecords);
    setRecords(nextRecords);
    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 py-3 sm:gap-5 sm:px-6 sm:py-5 lg:px-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Time Wallet
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">
              手動記録追加
            </h1>
          </div>
        </header>

        <section className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-5">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-zinc-700">日付</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-11 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-base font-medium text-zinc-950 outline-none transition-colors focus:border-zinc-400 focus:bg-white sm:h-12"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-zinc-700">
                活動タグ
              </span>
              <select
                value={selectedTag?.id ?? ""}
                onChange={(event) => setSelectedTagId(event.target.value)}
                className="h-11 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-base font-medium text-zinc-950 outline-none transition-colors focus:border-zinc-400 focus:bg-white sm:h-12"
              >
                {visibleActiveTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-zinc-700">
                  開始時刻
                </span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="h-11 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-base font-medium text-zinc-950 outline-none transition-colors focus:border-zinc-400 focus:bg-white sm:h-12"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-zinc-700">
                  終了時刻
                </span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="h-11 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-base font-medium text-zinc-950 outline-none transition-colors focus:border-zinc-400 focus:bg-white sm:h-12"
                />
              </label>
            </div>

            <div className="rounded-md bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700">
              記録時間: {isInvalidTime ? "-" : formatMinutes(durationMinutes)}
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-zinc-700">メモ</span>
              <textarea
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                rows={2}
                className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-base font-medium text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white sm:py-3"
                placeholder="必要に応じてメモを残す"
              />
            </label>

            {statusMessage ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {statusMessage}
              </p>
            ) : null}

            {!isTagsReady || !isRecordsReady ? (
              <p className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
                データを読み込み中です。
              </p>
            ) : null}

            {isTagsReady && visibleActiveTags.length === 0 ? (
              <EmptyState
                title="先に活動タグを追加しましょう"
                description="記録はタグに紐づけて保存します。勉強、仕事、睡眠など、最初のタグを作ってから記録できます。"
                actionHref="/tags"
                actionLabel="タグを追加する"
              />
            ) : null}

            <button
              type="submit"
              disabled={
                !isTagsReady ||
                !isRecordsReady ||
                visibleActiveTags.length === 0 ||
                isSaving
              }
              className="h-11 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 sm:h-12 sm:text-base"
            >
              {isSaving ? "保存中" : "保存する"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
