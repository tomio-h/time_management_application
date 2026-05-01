import type { ActivityTag } from "../time-wallet-storage";
import { getSupabaseBrowserClient, type Database } from "./client";

type ActivityTagRow = Pick<
  Database["public"]["Tables"]["activity_tags"]["Row"],
  "id" | "name" | "color" | "sort_order" | "is_active"
>;

type AddActivityTagParams = {
  userId: string;
  name: string;
  color: string;
  sortOrder: number;
};

type UpdateActivityTagParams = {
  userId: string;
  tagId: string;
  name: string;
  color: string;
};

const ACTIVITY_TAG_COLUMNS = "id,name,color,sort_order,is_active";

function getRequiredSupabaseClient() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabaseの環境変数が未設定です。");
  }

  return supabase;
}

function mapActivityTagRow(row: ActivityTagRow): ActivityTag {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

export async function fetchSupabaseActivityTags(userId: string) {
  const supabase = getRequiredSupabaseClient();
  const { data, error } = await supabase
    .from("activity_tags")
    .select(ACTIVITY_TAG_COLUMNS)
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("活動タグを読み込めませんでした。");
  }

  return data.map(mapActivityTagRow);
}

export async function addSupabaseActivityTag({
  userId,
  name,
  color,
  sortOrder,
}: AddActivityTagParams) {
  const supabase = getRequiredSupabaseClient();
  const { data, error } = await supabase
    .from("activity_tags")
    .insert({
      user_id: userId,
      name,
      color,
      sort_order: sortOrder,
      is_active: true,
    })
    .select(ACTIVITY_TAG_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("活動タグを追加できませんでした。");
  }

  return mapActivityTagRow(data);
}

export async function updateSupabaseActivityTag({
  userId,
  tagId,
  name,
  color,
}: UpdateActivityTagParams) {
  const supabase = getRequiredSupabaseClient();
  const { data, error } = await supabase
    .from("activity_tags")
    .update({
      name,
      color,
    })
    .eq("id", tagId)
    .eq("user_id", userId)
    .select(ACTIVITY_TAG_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("活動タグを更新できませんでした。");
  }

  return mapActivityTagRow(data);
}

export async function deactivateSupabaseActivityTag(
  userId: string,
  tagId: string,
) {
  const supabase = getRequiredSupabaseClient();
  const { error } = await supabase
    .from("activity_tags")
    .update({ is_active: false })
    .eq("id", tagId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
