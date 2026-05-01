"use client";

import Link from "next/link";
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

function getTodayValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const date = today.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${date}`;
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

function getRecordDate(record: ActivityRecord) {
  return record.date ?? getTodayValue();
}

function getSortValue(record: ActivityRecord) {
  return `${getRecordDate(record)}T${record.end || record.start}`;
}

export default function RecordsPage() {
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

  const sortedRecords = useMemo(
    () =>
      [...records].sort((firstRecord, secondRecord) => {
        const dateCompare = getSortValue(secondRecord).localeCompare(
          getSortValue(firstRecord),
        );

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return secondRecord.id - firstRecord.id;
      }),
    [records],
  );

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">Time Wallet</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">
              記録一覧
            </h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/records/new"
              className="rounded-md bg-zinc-950 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800"
            >
              手動で追加
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-zinc-700 shadow-sm ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50"
            >
              ダッシュボードへ
            </Link>
          </div>
        </header>

        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div>
            <p className="text-sm font-medium text-zinc-500">
              {sortedRecords.length}件
            </p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-950">
              保存済みの時間記録
            </h2>
          </div>

          {sortedRecords.length === 0 ? (
            <p className="mt-4 rounded-md bg-zinc-50 px-3 py-3 text-sm text-zinc-500">
              まだ記録がありません
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {sortedRecords.map((record) => {
                const tag = getTagForRecord(record, tags);
                const tagName = tag?.name ?? record.tag;
                const tagColor = tag?.color ?? "#71717a";

                return (
                  <article
                    key={record.id}
                    className="rounded-md border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-950">
                          {getRecordDate(record)}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: tagColor }}
                          />
                          <span className="truncate text-sm font-semibold text-zinc-800">
                            {tagName}
                          </span>
                        </div>
                      </div>
                      <p className="shrink-0 rounded-md bg-white px-3 py-1 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200">
                        {formatMinutes(record.durationMinutes ?? record.minutes)}
                      </p>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div className="rounded-md bg-white px-3 py-2 ring-1 ring-zinc-200">
                        <dt className="text-xs font-medium text-zinc-500">
                          開始時刻
                        </dt>
                        <dd className="mt-1 font-semibold text-zinc-950">
                          {record.start}
                        </dd>
                      </div>
                      <div className="rounded-md bg-white px-3 py-2 ring-1 ring-zinc-200">
                        <dt className="text-xs font-medium text-zinc-500">
                          終了時刻
                        </dt>
                        <dd className="mt-1 font-semibold text-zinc-950">
                          {record.end}
                        </dd>
                      </div>
                      <div className="rounded-md bg-white px-3 py-2 ring-1 ring-zinc-200 sm:col-span-2">
                        <dt className="text-xs font-medium text-zinc-500">
                          メモ
                        </dt>
                        <dd className="mt-1 min-h-5 break-words font-medium text-zinc-700">
                          {record.memo || "-"}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
