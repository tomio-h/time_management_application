"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  addSupabaseActivityTag,
  deactivateSupabaseActivityTag,
  fetchSupabaseActivityTags,
  updateSupabaseActivityTag,
} from "../lib/supabase/activity-tags";
import { EmptyState } from "../components/empty-state";
import {
  importLocalTimeWalletData,
  type LocalDataImportResult,
} from "../lib/supabase/local-data-import";
import {
  createActivityTag,
  getSortedActiveTags,
  loadActiveTimerFromStorage,
  loadActivityRecordsFromStorage,
  loadActivityTagsFromStorage,
  MAX_ACTIVITY_TAGS,
  type ActivityTag,
} from "../lib/time-wallet-storage";
import { useActivityTagsSource } from "../lib/use-activity-tags-source";

const DEFAULT_TAG_COLOR = "#2563eb";
const TAG_COLOR_OPTIONS = [
  { value: "#2563EB", label: "授業系の青" },
  { value: "#0F766E", label: "課題系の青緑" },
  { value: "#7C3AED", label: "研究系の紫" },
  { value: "#C2410C", label: "バイト系のオレンジ" },
  { value: "#4F46E5", label: "睡眠系の藍色" },
  { value: "#DB2777", label: "スマホ系のピンク" },
  { value: "#16A34A", label: "趣味系の緑" },
  { value: "#D97706", label: "休憩系の黄土色" },
  { value: "#22C55E", label: "明るい緑" },
  { value: "#EF4444", label: "赤" },
  { value: "#64748B", label: "グレー" },
  { value: "#F59E0B", label: "黄色" },
];

type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  label: string;
};

function normalizeColor(color: string) {
  return color.toUpperCase();
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "活動タグを保存できませんでした。";
}

function getImportErrorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : "原因を確認できませんでした。";

  return `インポートに失敗しました。${message}`;
}

function formatImportResult(result: LocalDataImportResult) {
  const importedActiveTimerText =
    result.importedActiveTimer > 0
      ? `、記録中タイマー${result.importedActiveTimer}件`
      : "";
  const tagStatusText =
    result.skippedTags > 0 || result.tagErrors > 0
      ? `、タグスキップ${result.skippedTags}件、タグエラー${result.tagErrors}件`
      : "";
  const activeTimerStatusText =
    result.skippedActiveTimer > 0 || result.activeTimerErrors > 0
      ? `、記録中タイマースキップ${result.skippedActiveTimer}件、記録中タイマーエラー${result.activeTimerErrors}件`
      : "";

  return `インポート完了: タグ新規追加${result.importedTags}件、既存タグに紐づけ${result.matchedTags}件、記録新規追加${result.importedRecords}件、記録スキップ${result.skippedRecords}件、記録エラー${result.recordErrors}件${importedActiveTimerText}${tagStatusText}${activeTimerStatusText}。`;
}

function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const selectedColor = normalizeColor(value);

  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2.5 sm:p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-zinc-700 sm:text-sm">
          {label}
        </p>
        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
          詳細
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-9 w-10 cursor-pointer rounded border-0 bg-transparent p-0 sm:h-11 sm:w-12"
          />
        </label>
      </div>

      <div className="mt-2 flex flex-wrap gap-2 sm:mt-3">
        {TAG_COLOR_OPTIONS.map((color) => {
          const isSelected = selectedColor === color.value;

          return (
            <button
              key={color.value}
              type="button"
              aria-label={color.label}
              aria-pressed={isSelected}
              onClick={() => onChange(color.value)}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors sm:h-11 sm:w-11 ${
                isSelected
                  ? "border-zinc-950 ring-2 ring-zinc-950 ring-offset-2"
                  : "border-white ring-1 ring-zinc-200"
              }`}
              style={{ backgroundColor: color.value }}
            >
              {isSelected ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-zinc-950">
                  ✓
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TagsPage() {
  const {
    tags,
    setTags,
    source: tagsSource,
    userId,
    isReady: isTagsReady,
    errorMessage: tagLoadErrorMessage,
  } = useActivityTagsSource();
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLOR);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [editingTagColor, setEditingTagColor] = useState(DEFAULT_TAG_COLOR);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const activeTags = useMemo(() => getSortedActiveTags(tags), [tags]);
  const visibleActiveTags = isTagsReady ? activeTags : [];
  const isUsingSupabase = tagsSource === "supabase" && userId !== null;
  const isBusy = isSaving || isImporting;
  const canAddTag =
    isTagsReady && visibleActiveTags.length < MAX_ACTIVITY_TAGS;
  const statusMessage = message || tagLoadErrorMessage;

  const handleAddTag = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = newTagName.trim();

    if (!isTagsReady) {
      setMessage("活動タグを読み込み中です。");
      return;
    }

    if (!trimmedName) {
      setMessage("タグ名を入力してください。");
      return;
    }

    if (!canAddTag) {
      setMessage(`活動タグは${MAX_ACTIVITY_TAGS}個までです。`);
      return;
    }

    if (
      visibleActiveTags.some(
        (tag) => tag.name.toLowerCase() === trimmedName.toLowerCase(),
      )
    ) {
      setMessage("同じ名前の活動タグがあります。");
      return;
    }

    const nextSortOrder =
      tags.reduce((maxOrder, tag) => Math.max(maxOrder, tag.sortOrder), 0) + 1;

    if (isUsingSupabase) {
      setIsSaving(true);

      try {
        const addedTag = await addSupabaseActivityTag({
          userId,
          name: trimmedName,
          color: newTagColor,
          sortOrder: nextSortOrder,
        });

        setTags((currentTags) => [...currentTags, addedTag]);
        setNewTagName("");
        setNewTagColor(DEFAULT_TAG_COLOR);
        setEditingTagId(null);
        setMessage("活動タグを追加しました。");
      } catch (error) {
        setMessage(getErrorMessage(error));
      } finally {
        setIsSaving(false);
      }

      return;
    }

    setTags((currentTags) => [
      ...currentTags,
      createActivityTag(trimmedName, newTagColor, nextSortOrder),
    ]);
    setNewTagName("");
    setNewTagColor(DEFAULT_TAG_COLOR);
    setEditingTagId(null);
    setMessage("活動タグを追加しました。");
  };

  const handleStartEdit = (tag: ActivityTag) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
    setEditingTagColor(tag.color);
    setMessage("");
  };

  const handleCancelEdit = () => {
    setEditingTagId(null);
    setEditingTagName("");
    setEditingTagColor(DEFAULT_TAG_COLOR);
  };

  const handleSaveEdit = async (tagId: string) => {
    const trimmedName = editingTagName.trim();

    if (!isTagsReady) {
      setMessage("活動タグを読み込み中です。");
      return;
    }

    if (!trimmedName) {
      setMessage("タグ名を入力してください。");
      return;
    }

    if (
      visibleActiveTags.some(
        (tag) =>
          tag.id !== tagId &&
          tag.name.toLowerCase() === trimmedName.toLowerCase(),
      )
    ) {
      setMessage("同じ名前の活動タグがあります。");
      return;
    }

    if (isUsingSupabase) {
      setIsSaving(true);

      try {
        const updatedTag = await updateSupabaseActivityTag({
          userId,
          tagId,
          name: trimmedName,
          color: editingTagColor,
        });

        setTags((currentTags) =>
          currentTags.map((tag) => (tag.id === tagId ? updatedTag : tag)),
        );
        setEditingTagId(null);
        setEditingTagName("");
        setEditingTagColor(DEFAULT_TAG_COLOR);
        setMessage("活動タグを更新しました。");
      } catch (error) {
        setMessage(getErrorMessage(error));
      } finally {
        setIsSaving(false);
      }

      return;
    }

    setTags((currentTags) =>
      currentTags.map((tag) =>
        tag.id === tagId
          ? { ...tag, color: editingTagColor, name: trimmedName }
          : tag,
      ),
    );
    setEditingTagId(null);
    setEditingTagName("");
    setEditingTagColor(DEFAULT_TAG_COLOR);
    setMessage("活動タグを更新しました。");
  };

  const handleDeleteTag = async (tagToDelete: ActivityTag) => {
    if (!isTagsReady) {
      setMessage("活動タグを読み込み中です。");
      return;
    }

    if (!window.confirm(`「${tagToDelete.name}」を削除しますか？`)) {
      return;
    }

    if (isUsingSupabase) {
      setIsSaving(true);

      try {
        await deactivateSupabaseActivityTag(userId, tagToDelete.id);
        setTags((currentTags) =>
          currentTags.map((tag) =>
            tag.id === tagToDelete.id ? { ...tag, isActive: false } : tag,
          ),
        );

        if (editingTagId === tagToDelete.id) {
          handleCancelEdit();
        }

        setMessage("活動タグを削除しました。");
      } catch (error) {
        setMessage(getErrorMessage(error));
      } finally {
        setIsSaving(false);
      }

      return;
    }

    setTags((currentTags) =>
      currentTags.map((tag) =>
        tag.id === tagToDelete.id ? { ...tag, isActive: false } : tag,
      ),
    );
    if (editingTagId === tagToDelete.id) {
      handleCancelEdit();
    }
    setMessage("活動タグを削除しました。");
  };

  const handleImportLocalData = async () => {
    if (!isUsingSupabase) {
      return;
    }

    const localTags = loadActivityTagsFromStorage() ?? [];
    const localRecords = loadActivityRecordsFromStorage() ?? [];
    const localActiveTimer = loadActiveTimerFromStorage();

    if (
      localTags.length === 0 &&
      localRecords.length === 0 &&
      !localActiveTimer
    ) {
      setMessage("この端末に取り込めるlocalStorageデータがありません。");
      return;
    }

    setIsImporting(true);
    setMessage("");

    try {
      const result = await importLocalTimeWalletData({
        userId,
        localTags,
        localRecords,
        localActiveTimer,
      });
      const nextTags = await fetchSupabaseActivityTags(userId);

      setTags(nextTags);
      setEditingTagId(null);
      setEditingTagName("");
      setEditingTagColor(DEFAULT_TAG_COLOR);
      setMessage(formatImportResult(result));
    } catch (error) {
      setMessage(getImportErrorMessage(error));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-3 py-3 sm:gap-5 sm:px-6 sm:py-5 lg:px-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Time Wallet
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">
              活動タグ管理
            </h1>
          </div>
        </header>

        {isUsingSupabase ? (
          <section className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-500 sm:text-sm">
                  localStorage
                </p>
                <h2 className="mt-0.5 text-lg font-semibold text-zinc-950 sm:text-xl">
                  この端末のデータを取り込む
                </h2>
                <p className="mt-1.5 max-w-2xl text-xs leading-5 text-zinc-600 sm:text-sm sm:leading-6">
                  未ログイン中にこの端末へ保存したタグ・記録を、現在のアカウントへ取り込みます。localStorageのデータは削除しません。
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleImportLocalData()}
                disabled={isBusy}
                className="h-10 w-full rounded-md bg-emerald-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 sm:h-12 sm:w-auto sm:text-base"
              >
                {isImporting ? "取り込み中" : "取り込む"}
              </button>
            </div>
          </section>
        ) : null}

        <section className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-5">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-zinc-500 sm:text-sm">
              {visibleActiveTags.length}/{MAX_ACTIVITY_TAGS}
            </p>
            <h2 className="text-lg font-semibold text-zinc-950 sm:text-xl">
              活動タグを追加
            </h2>
          </div>

          <form
            onSubmit={handleAddTag}
            className="mt-3 grid gap-2 sm:gap-3 lg:grid-cols-[1fr_1.4fr_auto]"
          >
            <input
              type="text"
              value={newTagName}
              onChange={(event) => setNewTagName(event.target.value)}
              placeholder="タグ名"
              className="h-11 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-base font-medium text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white sm:h-12"
            />
            <ColorPicker
              value={newTagColor}
              onChange={setNewTagColor}
              label="タグ色"
            />
            <button
              type="submit"
              disabled={!canAddTag || isBusy}
              className="h-11 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 sm:h-12 sm:text-base lg:self-start"
            >
              {isBusy ? "保存中" : "追加する"}
            </button>
          </form>

          {statusMessage ? (
            <p className="mt-3 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
              {statusMessage}
            </p>
          ) : null}
        </section>

        <section className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-5">
          <div>
            <p className="text-xs font-semibold text-zinc-500 sm:text-sm">
              現在の活動タグ
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-zinc-950 sm:text-xl">
              活動タグ一覧
            </h2>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:gap-3">
            {visibleActiveTags.map((tag) => {
              const isEditing = editingTagId === tag.id;

              return (
                <article
                  key={tag.id}
                  className="rounded-md border border-zinc-200 bg-zinc-50 p-2.5 sm:p-3"
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-2.5 sm:gap-3">
                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-semibold text-zinc-700 sm:text-sm">
                          タグ名
                        </span>
                        <input
                          type="text"
                          value={editingTagName}
                          onChange={(event) =>
                            setEditingTagName(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              void handleSaveEdit(tag.id);
                            }
                          }}
                          className="h-11 rounded-md border border-zinc-200 bg-white px-3 text-base font-semibold text-zinc-950 outline-none transition-colors focus:border-zinc-400 sm:h-12"
                        />
                      </label>

                      <ColorPicker
                        value={editingTagColor}
                        onChange={setEditingTagColor}
                        label="タグ色"
                      />

                      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                        <button
                          type="button"
                          onClick={() => void handleSaveEdit(tag.id)}
                          disabled={isBusy}
                          className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 sm:h-12 sm:min-w-28 sm:text-base"
                        >
                          {isBusy ? "保存中" : "保存"}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isBusy}
                          className="h-10 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 sm:h-12 sm:min-w-28 sm:text-base"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 sm:gap-3">
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full sm:h-4 sm:w-4"
                        style={{ backgroundColor: tag.color }}
                      />
                      <p className="min-w-0 truncate text-sm font-semibold text-zinc-950 sm:text-base">
                        {tag.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(tag)}
                        disabled={isBusy}
                        className="h-9 shrink-0 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 sm:h-11 sm:px-3 sm:text-sm"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteTag(tag)}
                        disabled={isBusy}
                        className="h-9 shrink-0 rounded-md border border-red-200 bg-white px-2.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400 sm:h-11 sm:px-3 sm:text-sm"
                      >
                        削除
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {!isTagsReady ? (
            <p className="mt-4 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
              活動タグを読み込み中です。
            </p>
          ) : null}

          {isTagsReady && visibleActiveTags.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="まだ活動タグがありません"
                description="勉強、仕事、睡眠、趣味など、まずはよく使う活動を3つほど登録してみましょう。"
              />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
