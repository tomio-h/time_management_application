import {
  type ActiveTimer,
  type ActivityRecord,
  type ActivityTag,
} from "../time-wallet-storage";
import {
  fetchSupabaseActiveTimer,
  upsertSupabaseActiveTimer,
} from "./active-timers";
import { getSupabaseBrowserClient, type Database } from "./client";
import { createDateTimeFromDateAndTime } from "./time-records";

type ExistingActivityTagRow = Pick<
  Database["public"]["Tables"]["activity_tags"]["Row"],
  "id" | "name" | "legacy_local_id" | "is_active"
>;

type LegacyTimeRecordRow = Pick<
  Database["public"]["Tables"]["time_records"]["Row"],
  "legacy_local_id"
>;

type ActivityTagInsert =
  Database["public"]["Tables"]["activity_tags"]["Insert"];
type TimeRecordInsert =
  Database["public"]["Tables"]["time_records"]["Insert"];

type TimeRecordConversionResult =
  | {
      ok: true;
      insert: TimeRecordInsert;
    }
  | {
      ok: false;
      reason: string;
    };

type ImportLocalTimeWalletDataParams = {
  userId: string;
  localTags: ActivityTag[];
  localRecords: ActivityRecord[];
  localActiveTimer: ActiveTimer | null;
};

export type LocalDataImportResult = {
  importedTags: number;
  matchedTags: number;
  skippedTags: number;
  tagErrors: number;
  importedRecords: number;
  skippedRecords: number;
  recordErrors: number;
  importedActiveTimer: number;
  skippedActiveTimer: number;
  activeTimerErrors: number;
};

const EXISTING_TAG_COLUMNS = "id,name,legacy_local_id,is_active";
const LEGACY_RECORD_COLUMNS = "legacy_local_id";

function getRequiredSupabaseClient() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabaseの環境変数が未設定です。");
  }

  return supabase;
}

function getTodayValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const date = today.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${date}`;
}

function normalizeMemo(memo?: string) {
  const trimmedMemo = memo?.trim();

  return trimmedMemo ? trimmedMemo : null;
}

function normalizeTagName(name: string) {
  return name.trim().toLowerCase();
}

function createImportError(action: string, message: string) {
  if (
    message.includes("activity_tags_user_active_name_unique_idx") ||
    message.includes("duplicate key")
  ) {
    return new Error(
      `${action}に失敗しました。同じ名前のタグがすでにSupabase側にあります。既存タグへの紐づけを確認してから再度お試しください。`,
    );
  }

  return new Error(`${action}に失敗しました。${message}`);
}

function getUniqueLocalTags(tags: ActivityTag[]) {
  const seenIds = new Set<string>();
  const uniqueTags: ActivityTag[] = [];

  tags.forEach((tag) => {
    if (seenIds.has(tag.id)) {
      return;
    }

    seenIds.add(tag.id);
    uniqueTags.push(tag);
  });

  return uniqueTags;
}

function getUniqueLocalRecords(records: ActivityRecord[]) {
  const seenIds = new Set<string>();
  const uniqueRecords: ActivityRecord[] = [];

  records.forEach((record) => {
    const legacyLocalId = String(record.id);

    if (seenIds.has(legacyLocalId)) {
      return;
    }

    seenIds.add(legacyLocalId);
    uniqueRecords.push(record);
  });

  return uniqueRecords;
}

function addExistingTagsToMaps(
  rows: ExistingActivityTagRow[],
  tagIdByLegacyLocalId: Map<string, string>,
  tagIdByName: Map<string, string>,
) {
  rows.forEach((row) => {
    if (row.legacy_local_id) {
      tagIdByLegacyLocalId.set(row.legacy_local_id, row.id);
    }

    if (row.is_active) {
      tagIdByName.set(normalizeTagName(row.name), row.id);
    }
  });
}

function createTimeRecordInsert(
  userId: string,
  record: ActivityRecord,
  tagIdByLegacyLocalId: Map<string, string>,
  tagIdByName: Map<string, string>,
): TimeRecordConversionResult {
  const dateValue = record.date ?? getTodayValue();
  const startedAt = createDateTimeFromDateAndTime(dateValue, record.start);
  const endedAt = createDateTimeFromDateAndTime(dateValue, record.end);
  const durationMinutes = record.durationMinutes ?? record.minutes;
  const legacyLocalId = String(record.id);
  const tagIdFromLocalId = record.tagId
    ? tagIdByLegacyLocalId.get(record.tagId)
    : undefined;
  const tagIdFromName = tagIdByName.get(normalizeTagName(record.tag));
  const tagId = tagIdFromLocalId ?? tagIdFromName ?? null;
  const memo = normalizeMemo(record.memo);

  if (!startedAt || !endedAt) {
    return {
      ok: false,
      reason: "日付または時刻をDateに変換できませんでした。",
    };
  }

  if (endedAt.getTime() <= startedAt.getTime()) {
    return {
      ok: false,
      reason: "終了時刻が開始時刻以前です。",
    };
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return {
      ok: false,
      reason: "記録時間が0分以下、または数値ではありません。",
    };
  }

  return {
    ok: true,
    insert: {
      user_id: userId,
      tag_id: tagId,
      tag_name_snapshot: record.tag,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_minutes: Math.round(durationMinutes),
      memo,
      legacy_local_id: legacyLocalId,
    },
  };
}

async function importLocalTags(
  userId: string,
  localTags: ActivityTag[],
  tagIdByLegacyLocalId: Map<string, string>,
  tagIdByName: Map<string, string>,
) {
  const supabase = getRequiredSupabaseClient();
  const uniqueTags = getUniqueLocalTags(localTags);
  const { data: existingTags, error: existingTagsError } = await supabase
    .from("activity_tags")
    .select(EXISTING_TAG_COLUMNS)
    .eq("user_id", userId);

  if (existingTagsError) {
    throw createImportError("タグの読み込み", existingTagsError.message);
  }

  addExistingTagsToMaps(
    existingTags ?? [],
    tagIdByLegacyLocalId,
    tagIdByName,
  );

  let importedTags = 0;
  let matchedTags = 0;
  let tagErrors = 0;
  const skippedTags = localTags.length - uniqueTags.length;

  for (const tag of uniqueTags) {
    const existingLegacyTagId = tagIdByLegacyLocalId.get(tag.id);

    if (existingLegacyTagId) {
      matchedTags += 1;
      continue;
    }

    const normalizedName = normalizeTagName(tag.name);
    const existingNameTagId = tagIdByName.get(normalizedName);

    if (existingNameTagId) {
      tagIdByLegacyLocalId.set(tag.id, existingNameTagId);
      matchedTags += 1;
      continue;
    }

    const tagInsert: ActivityTagInsert = {
      user_id: userId,
      name: tag.name,
      color: tag.color,
      sort_order: tag.sortOrder,
      is_active: tag.isActive,
      legacy_local_id: tag.id,
    };
    const { data: insertedTag, error: insertTagError } = await supabase
      .from("activity_tags")
      .insert(tagInsert)
      .select(EXISTING_TAG_COLUMNS)
      .single();

    if (insertTagError) {
      tagErrors += 1;
      console.error("Time Wallet import: tag insert failed", {
        tag,
        reason: createImportError("タグのインポート", insertTagError.message)
          .message,
      });
      continue;
    }

    if (!insertedTag) {
      tagErrors += 1;
      console.error("Time Wallet import: tag insert returned no data", {
        tag,
        reason: "Supabaseから追加済みタグの情報が返りませんでした。",
      });
      continue;
    }

    importedTags += 1;
    tagIdByLegacyLocalId.set(tag.id, insertedTag.id);

    if (insertedTag.is_active) {
      tagIdByName.set(normalizedName, insertedTag.id);
    }
  }

  return {
    importedTags,
    matchedTags,
    skippedTags,
    tagErrors,
  };
}

async function importLocalRecords(
  userId: string,
  localRecords: ActivityRecord[],
  tagIdByLegacyLocalId: Map<string, string>,
  tagIdByName: Map<string, string>,
) {
  const supabase = getRequiredSupabaseClient();
  const uniqueRecords = getUniqueLocalRecords(localRecords);
  const { data: existingRecords, error: existingRecordsError } = await supabase
    .from("time_records")
    .select(LEGACY_RECORD_COLUMNS)
    .eq("user_id", userId)
    .not("legacy_local_id", "is", null);

  if (existingRecordsError) {
    throw createImportError(
      "時間記録の読み込み",
      existingRecordsError.message,
    );
  }

  const existingRecordLegacyIds = new Set(
    (existingRecords ?? [])
      .map((record: LegacyTimeRecordRow) => record.legacy_local_id)
      .filter((legacyLocalId): legacyLocalId is string => legacyLocalId !== null),
  );
  const missingRecords = uniqueRecords.filter(
    (record) => !existingRecordLegacyIds.has(String(record.id)),
  );
  let importedRecords = 0;
  let recordErrors = 0;
  const skippedRecords = localRecords.length - missingRecords.length;

  for (const record of missingRecords) {
    const conversionResult = createTimeRecordInsert(
      userId,
      record,
      tagIdByLegacyLocalId,
      tagIdByName,
    );

    if (!conversionResult.ok) {
      recordErrors += 1;
      console.error("Time Wallet import: record conversion failed", {
        record,
        reason: conversionResult.reason,
      });
      continue;
    }

    const { error: insertRecordError } = await supabase
      .from("time_records")
      .insert(conversionResult.insert);

    if (insertRecordError) {
      recordErrors += 1;
      console.error("Time Wallet import: record insert failed", {
        record,
        reason: insertRecordError.message,
      });
      continue;
    }

    importedRecords += 1;
  }

  return {
    importedRecords,
    skippedRecords,
    recordErrors,
  };
}

async function importLocalActiveTimer(
  userId: string,
  localActiveTimer: ActiveTimer | null,
  localTags: ActivityTag[],
  tagIdByLegacyLocalId: Map<string, string>,
) {
  if (!localActiveTimer) {
    return {
      importedActiveTimer: 0,
      skippedActiveTimer: 0,
      activeTimerErrors: 0,
    };
  }

  const existingActiveTimer = await fetchSupabaseActiveTimer(userId);

  if (existingActiveTimer) {
    return {
      importedActiveTimer: 0,
      skippedActiveTimer: 1,
      activeTimerErrors: 0,
    };
  }

  const startedAt = new Date(localActiveTimer.startedAt);

  if (!Number.isFinite(startedAt.getTime())) {
    return {
      importedActiveTimer: 0,
      skippedActiveTimer: 1,
      activeTimerErrors: 0,
    };
  }

  const localTag = localTags.find((tag) => tag.id === localActiveTimer.tagId);

  await upsertSupabaseActiveTimer({
    userId,
    tagId: tagIdByLegacyLocalId.get(localActiveTimer.tagId) ?? null,
    tagNameSnapshot: localTag?.name ?? "削除済みタグ",
    startedAt,
  });

  return {
    importedActiveTimer: 1,
    skippedActiveTimer: 0,
    activeTimerErrors: 0,
  };
}

export async function importLocalTimeWalletData({
  userId,
  localTags,
  localRecords,
  localActiveTimer,
}: ImportLocalTimeWalletDataParams): Promise<LocalDataImportResult> {
  const tagIdByLegacyLocalId = new Map<string, string>();
  const tagIdByName = new Map<string, string>();
  const tagResult = await importLocalTags(
    userId,
    localTags,
    tagIdByLegacyLocalId,
    tagIdByName,
  );
  const recordResult = await importLocalRecords(
    userId,
    localRecords,
    tagIdByLegacyLocalId,
    tagIdByName,
  );
  const activeTimerResult = await importLocalActiveTimer(
    userId,
    localActiveTimer,
    localTags,
    tagIdByLegacyLocalId,
  );

  return {
    ...tagResult,
    ...recordResult,
    ...activeTimerResult,
  };
}
