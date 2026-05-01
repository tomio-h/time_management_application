import type { ActivityRecord } from "../time-wallet-storage";
import { getSupabaseBrowserClient, type Database } from "./client";

type TimeRecordRow = Pick<
  Database["public"]["Tables"]["time_records"]["Row"],
  | "id"
  | "tag_id"
  | "tag_name_snapshot"
  | "started_at"
  | "ended_at"
  | "duration_minutes"
  | "memo"
>;

type SaveTimeRecordParams = {
  userId: string;
  tagId: string | null;
  tagNameSnapshot: string;
  startedAt: Date;
  endedAt: Date;
  durationMinutes: number;
  memo?: string;
};

type UpdateTimeRecordParams = SaveTimeRecordParams & {
  recordId: string;
};

const TIME_RECORD_COLUMNS =
  "id,tag_id,tag_name_snapshot,started_at,ended_at,duration_minutes,memo";

function getRequiredSupabaseClient() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabaseの環境変数が未設定です。");
  }

  return supabase;
}

function padNumber(value: number) {
  return value.toString().padStart(2, "0");
}

function getDateValue(date: Date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(
    date.getDate(),
  )}`;
}

function getTimeValue(date: Date) {
  return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}

function normalizeMemo(memo?: string) {
  const trimmedMemo = memo?.trim();

  return trimmedMemo ? trimmedMemo : null;
}

function mapTimeRecordRow(row: TimeRecordRow): ActivityRecord {
  const startedAt = new Date(row.started_at);
  const endedAt = new Date(row.ended_at);

  return {
    id: row.id,
    date: getDateValue(startedAt),
    tagId: row.tag_id ?? undefined,
    tag: row.tag_name_snapshot,
    start: getTimeValue(startedAt),
    end: getTimeValue(endedAt),
    minutes: row.duration_minutes,
    durationMinutes: row.duration_minutes,
    memo: row.memo ?? undefined,
  };
}

export function createDateTimeFromDateAndTime(
  dateValue: string,
  timeValue: string,
) {
  const [year, month, date] = dateValue.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);

  if (
    year === undefined ||
    month === undefined ||
    date === undefined ||
    hours === undefined ||
    minutes === undefined ||
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(date) ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return null;
  }

  return new Date(year, month - 1, date, hours, minutes);
}

export async function fetchSupabaseTimeRecords(userId: string) {
  const supabase = getRequiredSupabaseClient();
  const { data, error } = await supabase
    .from("time_records")
    .select(TIME_RECORD_COLUMNS)
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("時間記録を読み込めませんでした。");
  }

  return data.map(mapTimeRecordRow);
}

export async function addSupabaseTimeRecord({
  userId,
  tagId,
  tagNameSnapshot,
  startedAt,
  endedAt,
  durationMinutes,
  memo,
}: SaveTimeRecordParams) {
  const supabase = getRequiredSupabaseClient();
  const { data, error } = await supabase
    .from("time_records")
    .insert({
      user_id: userId,
      tag_id: tagId,
      tag_name_snapshot: tagNameSnapshot,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_minutes: durationMinutes,
      memo: normalizeMemo(memo),
    })
    .select(TIME_RECORD_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("時間記録を追加できませんでした。");
  }

  return mapTimeRecordRow(data);
}

export async function updateSupabaseTimeRecord({
  userId,
  recordId,
  tagId,
  tagNameSnapshot,
  startedAt,
  endedAt,
  durationMinutes,
  memo,
}: UpdateTimeRecordParams) {
  const supabase = getRequiredSupabaseClient();
  const { data, error } = await supabase
    .from("time_records")
    .update({
      tag_id: tagId,
      tag_name_snapshot: tagNameSnapshot,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_minutes: durationMinutes,
      memo: normalizeMemo(memo),
    })
    .eq("id", recordId)
    .eq("user_id", userId)
    .select(TIME_RECORD_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("時間記録を更新できませんでした。");
  }

  return mapTimeRecordRow(data);
}

export async function deleteSupabaseTimeRecord(
  userId: string,
  recordId: string,
) {
  const supabase = getRequiredSupabaseClient();
  const { error } = await supabase
    .from("time_records")
    .delete()
    .eq("id", recordId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
