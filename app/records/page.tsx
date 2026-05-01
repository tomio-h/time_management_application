"use client";

import { useMemo, useState } from "react";
import {
  createDateTimeFromDateAndTime,
  deleteSupabaseTimeRecord,
  updateSupabaseTimeRecord,
} from "../lib/supabase/time-records";
import {
  getSortedActiveTags,
  getTagForRecord,
  type ActivityRecord,
  type ActivityTag,
} from "../lib/time-wallet-storage";
import { useActivityTagsSource } from "../lib/use-activity-tags-source";
import { useTimeRecordsSource } from "../lib/use-time-records-source";

type EditDraft = {
  date: string;
  tagId: string;
  start: string;
  end: string;
  memo: string;
  errorMessage: string;
};

const emptyActivityRecords: ActivityRecord[] = [];

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

function getRecordDate(record: ActivityRecord) {
  return record.date ?? getTodayValue();
}

function getSortValue(record: ActivityRecord) {
  return `${getRecordDate(record)}T${record.end || record.start}`;
}

function getRecordIdSortValue(record: ActivityRecord) {
  return typeof record.id === "number" ? record.id : getSortValue(record);
}

function getDurationMinutes(start: string, end: string) {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  if (startMinutes === null || endMinutes === null) {
    return null;
  }

  const durationMinutes = endMinutes - startMinutes;

  return durationMinutes > 0 ? durationMinutes : null;
}

function getSelectableTags(tags: ActivityTag[], record: ActivityRecord) {
  const activeTags = getSortedActiveTags(tags);
  const recordTag = getTagForRecord(record, tags);

  if (recordTag && !activeTags.some((tag) => tag.id === recordTag.id)) {
    return [recordTag, ...activeTags];
  }

  return activeTags;
}

function createEditDraft(record: ActivityRecord, tags: ActivityTag[]): EditDraft {
  const selectableTags = getSelectableTags(tags, record);
  const recordTag = getTagForRecord(record, tags);

  return {
    date: getRecordDate(record),
    tagId: recordTag?.id ?? selectableTags[0]?.id ?? "",
    start: record.start,
    end: record.end,
    memo: record.memo ?? "",
    errorMessage: "",
  };
}

export default function RecordsPage() {
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
    fallbackRecords: emptyActivityRecords,
  });
  const [editingRecordId, setEditingRecordId] = useState<
    ActivityRecord["id"] | null
  >(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const isUsingSupabase = recordsSource === "supabase" && userId !== null;
  const statusMessage =
    message || tagLoadErrorMessage || recordLoadErrorMessage;

  const sortedRecords = useMemo(
    () =>
      [...records].sort((firstRecord, secondRecord) => {
        const dateCompare = getSortValue(secondRecord).localeCompare(
          getSortValue(firstRecord),
        );

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return String(getRecordIdSortValue(secondRecord)).localeCompare(
          String(getRecordIdSortValue(firstRecord)),
        );
      }),
    [records],
  );

  const handleDeleteRecord = async (recordToDelete: ActivityRecord) => {
    if (
      !window.confirm(
        `${getRecordDate(recordToDelete)} ${recordToDelete.start}-${recordToDelete.end} の記録を削除しますか？`,
      )
    ) {
      return;
    }

    if (isUsingSupabase) {
      setIsSaving(true);

      try {
        await deleteSupabaseTimeRecord(userId, String(recordToDelete.id));
        setRecords((currentRecords) =>
          currentRecords.filter((record) => record.id !== recordToDelete.id),
        );
        setMessage("時間記録を削除しました。");
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "時間記録を削除できませんでした。",
        );
      } finally {
        setIsSaving(false);
      }

      if (editingRecordId === recordToDelete.id) {
        setEditingRecordId(null);
        setEditDraft(null);
      }

      return;
    }

    setRecords((currentRecords) => {
      const nextRecords = currentRecords.filter(
        (record) => record.id !== recordToDelete.id,
      );

      return nextRecords;
    });

    if (editingRecordId === recordToDelete.id) {
      setEditingRecordId(null);
      setEditDraft(null);
    }
  };

  const handleStartEdit = (record: ActivityRecord) => {
    setEditingRecordId(record.id);
    setEditDraft(createEditDraft(record, tags));
    setMessage("");
  };

  const handleCancelEdit = () => {
    setEditingRecordId(null);
    setEditDraft(null);
  };

  const updateEditDraft = (
    field: keyof Omit<EditDraft, "errorMessage">,
    value: string,
  ) => {
    setEditDraft((currentDraft) =>
      currentDraft
        ? { ...currentDraft, [field]: value, errorMessage: "" }
        : currentDraft,
    );
  };

  const handleSaveEdit = async (recordToUpdate: ActivityRecord) => {
    if (!editDraft) {
      return;
    }

    const durationMinutes = getDurationMinutes(editDraft.start, editDraft.end);

    if (durationMinutes === null) {
      setEditDraft((currentDraft) =>
        currentDraft
          ? {
              ...currentDraft,
              errorMessage: "終了時刻は開始時刻より後にしてください。",
            }
          : currentDraft,
      );
      return;
    }

    const selectableTags = getSelectableTags(tags, recordToUpdate);
    const selectedTag =
      selectableTags.find((tag) => tag.id === editDraft.tagId) ??
      selectableTags[0];

    if (!selectedTag) {
      setEditDraft((currentDraft) =>
        currentDraft
          ? { ...currentDraft, errorMessage: "活動タグを選択してください。" }
          : currentDraft,
      );
      return;
    }

    const startedAt = createDateTimeFromDateAndTime(
      editDraft.date,
      editDraft.start,
    );
    const endedAt = createDateTimeFromDateAndTime(editDraft.date, editDraft.end);

    if (!startedAt || !endedAt) {
      setEditDraft((currentDraft) =>
        currentDraft
          ? {
              ...currentDraft,
              errorMessage: "日付と時刻を正しく入力してください。",
            }
          : currentDraft,
      );
      return;
    }

    if (isUsingSupabase) {
      setIsSaving(true);

      try {
        const updatedRecord = await updateSupabaseTimeRecord({
          userId,
          recordId: String(recordToUpdate.id),
          tagId: selectedTag.id,
          tagNameSnapshot: selectedTag.name,
          startedAt,
          endedAt,
          durationMinutes,
          memo: editDraft.memo,
        });

        setRecords((currentRecords) =>
          currentRecords.map((record) =>
            record.id === recordToUpdate.id ? updatedRecord : record,
          ),
        );
        setEditingRecordId(null);
        setEditDraft(null);
        setMessage("時間記録を更新しました。");
      } catch (error) {
        setEditDraft((currentDraft) =>
          currentDraft
            ? {
                ...currentDraft,
                errorMessage:
                  error instanceof Error
                    ? error.message
                    : "時間記録を更新できませんでした。",
              }
            : currentDraft,
        );
      } finally {
        setIsSaving(false);
      }

      return;
    }

    setRecords((currentRecords) => {
      const nextRecords = currentRecords.map((record) =>
        record.id === recordToUpdate.id
          ? {
              ...record,
              date: editDraft.date,
              tagId: selectedTag.id,
              tag: selectedTag.name,
              start: editDraft.start,
              end: editDraft.end,
              minutes: durationMinutes,
              durationMinutes,
              memo: editDraft.memo.trim() || undefined,
            }
          : record,
      );

      return nextRecords;
    });

    setEditingRecordId(null);
    setEditDraft(null);
  };

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-zinc-100 text-zinc-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-5 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">Time Wallet</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">
              記録一覧
            </h1>
          </div>
        </header>

        <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-zinc-200 sm:p-5">
          <div>
            <p className="text-sm font-medium text-zinc-500">
              {sortedRecords.length}件
            </p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-950">
              保存済みの時間記録
            </h2>
          </div>

          {!isTagsReady || !isRecordsReady ? (
            <p className="mt-4 rounded-md bg-zinc-50 px-3 py-3 text-sm text-zinc-500">
              時間記録を読み込み中です。
            </p>
          ) : null}

          {statusMessage ? (
            <p className="mt-4 rounded-md bg-zinc-50 px-3 py-3 text-sm text-zinc-600">
              {statusMessage}
            </p>
          ) : null}

          {isRecordsReady && sortedRecords.length === 0 ? (
            <p className="mt-4 rounded-md bg-zinc-50 px-3 py-3 text-sm text-zinc-500">
              まだ記録がありません
            </p>
          ) : null}

          {isRecordsReady && sortedRecords.length > 0 ? (
            <div className="mt-4 flex flex-col gap-3">
              {sortedRecords.map((record) => {
                const tag = getTagForRecord(record, tags);
                const tagName = tag?.name ?? record.tag;
                const tagColor = tag?.color ?? "#71717a";
                const isEditing =
                  editingRecordId === record.id && editDraft !== null;
                const selectableTags = getSelectableTags(tags, record);
                const draftDuration =
                  isEditing && editDraft
                    ? getDurationMinutes(editDraft.start, editDraft.end)
                    : null;

                return (
                  <article
                    key={record.id}
                    className="rounded-md border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                      <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center">
                        <p className="flex h-11 items-center justify-center rounded-md bg-white px-3 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200">
                          {formatMinutes(
                            record.durationMinutes ?? record.minutes,
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(record)}
                          disabled={isSaving}
                          className="h-11 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteRecord(record)}
                          disabled={isSaving}
                          className="h-11 rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
                        >
                          削除
                        </button>
                      </div>
                    </div>

                    {isEditing && editDraft ? (
                      <div className="mt-4 rounded-md border border-zinc-200 bg-white p-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-zinc-700">
                              日付
                            </span>
                            <input
                              type="date"
                              value={editDraft.date}
                              onChange={(event) =>
                                updateEditDraft("date", event.target.value)
                              }
                              className="h-12 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-base font-medium text-zinc-950 outline-none transition-colors focus:border-zinc-400 focus:bg-white"
                            />
                          </label>

                          <label className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-zinc-700">
                              活動タグ
                            </span>
                            <select
                              value={editDraft.tagId}
                              onChange={(event) =>
                                updateEditDraft("tagId", event.target.value)
                              }
                              className="h-12 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-base font-medium text-zinc-950 outline-none transition-colors focus:border-zinc-400 focus:bg-white"
                            >
                              {selectableTags.map((selectableTag) => (
                                <option
                                  key={selectableTag.id}
                                  value={selectableTag.id}
                                >
                                  {selectableTag.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-zinc-700">
                              開始時刻
                            </span>
                            <input
                              type="time"
                              value={editDraft.start}
                              onChange={(event) =>
                                updateEditDraft("start", event.target.value)
                              }
                              className="h-12 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-base font-medium text-zinc-950 outline-none transition-colors focus:border-zinc-400 focus:bg-white"
                            />
                          </label>

                          <label className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-zinc-700">
                              終了時刻
                            </span>
                            <input
                              type="time"
                              value={editDraft.end}
                              onChange={(event) =>
                                updateEditDraft("end", event.target.value)
                              }
                              className="h-12 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-base font-medium text-zinc-950 outline-none transition-colors focus:border-zinc-400 focus:bg-white"
                            />
                          </label>
                        </div>

                        <div className="mt-3 rounded-md bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700">
                          記録時間:{" "}
                          {draftDuration === null
                            ? "-"
                            : formatMinutes(draftDuration)}
                        </div>

                        <label className="mt-3 flex flex-col gap-2">
                          <span className="text-sm font-semibold text-zinc-700">
                            メモ
                          </span>
                          <textarea
                            value={editDraft.memo}
                            onChange={(event) =>
                              updateEditDraft("memo", event.target.value)
                            }
                            rows={3}
                            className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 text-base font-medium text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white"
                            placeholder="必要に応じてメモを残す"
                          />
                        </label>

                        {editDraft.errorMessage ? (
                          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                            {editDraft.errorMessage}
                          </p>
                        ) : null}

                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => void handleSaveEdit(record)}
                            disabled={isSaving}
                            className="h-12 rounded-md bg-zinc-950 px-4 text-base font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                          >
                            {isSaving ? "保存中" : "保存する"}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            className="h-12 rounded-md border border-zinc-200 bg-white px-4 text-base font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
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
                    )}
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
