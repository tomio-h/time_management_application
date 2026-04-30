export type ActivityTag = {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
};

export type ActivityRecord = {
  id: number;
  date?: string;
  tagId?: string;
  tag: string;
  start: string;
  end: string;
  minutes: number;
  durationMinutes?: number;
  memo?: string;
};

export const MAX_ACTIVITY_TAGS = 20;
export const TAGS_STORAGE_KEY = "time-wallet:activity-tags";
export const RECORDS_STORAGE_KEY = "time-wallet:dashboard-records";

export const initialActivityTags: ActivityTag[] = [
  { id: "class", name: "授業", color: "#2563eb", sortOrder: 1, isActive: true },
  {
    id: "assignment",
    name: "課題",
    color: "#0f766e",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "research",
    name: "研究",
    color: "#7c3aed",
    sortOrder: 3,
    isActive: true,
  },
  {
    id: "part-time",
    name: "バイト",
    color: "#c2410c",
    sortOrder: 4,
    isActive: true,
  },
  { id: "sleep", name: "睡眠", color: "#4f46e5", sortOrder: 5, isActive: true },
  {
    id: "smartphone",
    name: "スマホ",
    color: "#db2777",
    sortOrder: 6,
    isActive: true,
  },
  { id: "hobby", name: "趣味", color: "#16a34a", sortOrder: 7, isActive: true },
  { id: "break", name: "休憩", color: "#ca8a04", sortOrder: 8, isActive: true },
];

export const initialActivityRecords: ActivityRecord[] = [
  { id: 1, tagId: "class", start: "09:00", end: "10:30", tag: "授業", minutes: 90 },
  {
    id: 2,
    tagId: "assignment",
    start: "10:45",
    end: "12:00",
    tag: "課題",
    minutes: 75,
  },
  {
    id: 3,
    tagId: "research",
    start: "13:00",
    end: "15:00",
    tag: "研究",
    minutes: 120,
  },
  {
    id: 4,
    tagId: "part-time",
    start: "15:20",
    end: "17:20",
    tag: "バイト",
    minutes: 120,
  },
  {
    id: 5,
    tagId: "break",
    start: "18:00",
    end: "18:40",
    tag: "休憩",
    minutes: 40,
  },
  {
    id: 6,
    tagId: "hobby",
    start: "21:10",
    end: "22:05",
    tag: "趣味",
    minutes: 55,
  },
];

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function isStoredActivityTag(value: unknown): value is ActivityTag {
  return (
    isRecordObject(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    isHexColor(value.color) &&
    typeof value.sortOrder === "number" &&
    Number.isFinite(value.sortOrder) &&
    typeof value.isActive === "boolean"
  );
}

function isStoredActivityRecord(value: unknown): value is ActivityRecord {
  return (
    isRecordObject(value) &&
    typeof value.id === "number" &&
    Number.isFinite(value.id) &&
    (value.tagId === undefined || typeof value.tagId === "string") &&
    (value.date === undefined || typeof value.date === "string") &&
    typeof value.tag === "string" &&
    value.tag.trim().length > 0 &&
    typeof value.start === "string" &&
    typeof value.end === "string" &&
    typeof value.minutes === "number" &&
    Number.isFinite(value.minutes) &&
    value.minutes >= 0 &&
    (value.durationMinutes === undefined ||
      (typeof value.durationMinutes === "number" &&
        Number.isFinite(value.durationMinutes) &&
        value.durationMinutes >= 0)) &&
    (value.memo === undefined || typeof value.memo === "string")
  );
}

export function parseStoredTags(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);

    if (Array.isArray(parsed) && parsed.every(isStoredActivityTag)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function parseStoredRecords(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);

    if (Array.isArray(parsed) && parsed.every(isStoredActivityRecord)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function getSortedActiveTags(tags: ActivityTag[]) {
  return tags
    .filter((tag) => tag.isActive)
    .sort((firstTag, secondTag) => firstTag.sortOrder - secondTag.sortOrder);
}

export function getTagForRecord(record: ActivityRecord, tags: ActivityTag[]) {
  return (
    tags.find((tag) => record.tagId !== undefined && tag.id === record.tagId) ??
    tags.find((tag) => tag.name === record.tag)
  );
}

export function attachTagIdsToRecords(
  records: ActivityRecord[],
  tags: ActivityTag[],
) {
  return records.map((record) => {
    if (record.tagId !== undefined) {
      return record;
    }

    const tag =
      getTagForRecord(record, tags) ??
      initialActivityTags.find((initialTag) => initialTag.name === record.tag);

    return tag ? { ...record, tagId: tag.id } : record;
  });
}

export function createActivityTag(
  name: string,
  color: string,
  sortOrder: number,
): ActivityTag {
  return {
    id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    color,
    sortOrder,
    isActive: true,
  };
}
