import { getSupabaseBrowserClient, type Database } from "./client";

type ActiveTimerRow = Pick<
  Database["public"]["Tables"]["active_timers"]["Row"],
  "tag_id" | "tag_name_snapshot" | "started_at"
>;

export type SupabaseActiveTimer = {
  tagId: string | null;
  tagNameSnapshot: string;
  startedAt: Date;
};

type UpsertActiveTimerParams = {
  userId: string;
  tagId: string | null;
  tagNameSnapshot: string;
  startedAt: Date;
};

const ACTIVE_TIMER_COLUMNS = "tag_id,tag_name_snapshot,started_at";

function getRequiredSupabaseClient() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabaseの環境変数が未設定です。");
  }

  return supabase;
}

function mapActiveTimerRow(row: ActiveTimerRow): SupabaseActiveTimer {
  return {
    tagId: row.tag_id,
    tagNameSnapshot: row.tag_name_snapshot ?? "削除済みタグ",
    startedAt: new Date(row.started_at),
  };
}

export async function fetchSupabaseActiveTimer(userId: string) {
  const supabase = getRequiredSupabaseClient();
  const { data, error } = await supabase
    .from("active_timers")
    .select(ACTIVE_TIMER_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapActiveTimerRow(data) : null;
}

export async function upsertSupabaseActiveTimer({
  userId,
  tagId,
  tagNameSnapshot,
  startedAt,
}: UpsertActiveTimerParams) {
  const supabase = getRequiredSupabaseClient();
  const { data, error } = await supabase
    .from("active_timers")
    .upsert(
      {
        user_id: userId,
        tag_id: tagId,
        tag_name_snapshot: tagNameSnapshot,
        started_at: startedAt.toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select(ACTIVE_TIMER_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("記録中タイマーを保存できませんでした。");
  }

  return mapActiveTimerRow(data);
}

export async function deleteSupabaseActiveTimer(userId: string) {
  const supabase = getRequiredSupabaseClient();
  const { error } = await supabase
    .from("active_timers")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
