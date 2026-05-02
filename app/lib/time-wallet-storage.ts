export type ActivityTag = {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
};

export type ActivityRecord = {
  id: number | string;
  date?: string;
  tagId?: string;
  tag: string;
  start: string;
  end: string;
  minutes: number;
  durationMinutes?: number;
  memo?: string;
};

export type ActiveTimer = {
  tagId: string;
  startedAt: string;
};

export const MAX_ACTIVITY_TAGS = 20;
export const TAGS_STORAGE_KEY = "time-wallet:activity-tags";
export const RECORDS_STORAGE_KEY = "time-wallet:dashboard-records";
export const ACTIVE_TIMER_STORAGE_KEY = "time-wallet:active-timer";

export const initialActivityTags: ActivityTag[] = [];

export const initialActivityRecords: ActivityRecord[] = [];

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

function isStoredActiveTimer(value: unknown): value is ActiveTimer {
  return (
    isRecordObject(value) &&
    typeof value.tagId === "string" &&
    value.tagId.length > 0 &&
    typeof value.startedAt === "string" &&
    Number.isFinite(Date.parse(value.startedAt))
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

export function parseStoredActiveTimer(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);

    if (isStoredActiveTimer(parsed)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function loadActivityTagsFromStorage() {
  const storage = getBrowserStorage();
  const storedTags = storage?.getItem(TAGS_STORAGE_KEY);

  return storedTags ? parseStoredTags(storedTags) : null;
}

export function saveActivityTagsToStorage(tags: ActivityTag[]) {
  const storage = getBrowserStorage();

  storage?.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
}

export function removeActivityTagsFromStorage() {
  const storage = getBrowserStorage();

  storage?.removeItem(TAGS_STORAGE_KEY);
}

export function loadActivityRecordsFromStorage() {
  const storage = getBrowserStorage();
  const storedRecords = storage?.getItem(RECORDS_STORAGE_KEY);

  return storedRecords ? parseStoredRecords(storedRecords) : null;
}

export function saveActivityRecordsToStorage(records: ActivityRecord[]) {
  const storage = getBrowserStorage();

  storage?.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
}

export function removeActivityRecordsFromStorage() {
  const storage = getBrowserStorage();

  storage?.removeItem(RECORDS_STORAGE_KEY);
}

export function loadActiveTimerFromStorage() {
  const storage = getBrowserStorage();
  const storedActiveTimer = storage?.getItem(ACTIVE_TIMER_STORAGE_KEY);

  return storedActiveTimer ? parseStoredActiveTimer(storedActiveTimer) : null;
}

export function saveActiveTimerToStorage(activeTimer: ActiveTimer) {
  const storage = getBrowserStorage();

  storage?.setItem(ACTIVE_TIMER_STORAGE_KEY, JSON.stringify(activeTimer));
}

export function removeActiveTimerFromStorage() {
  const storage = getBrowserStorage();

  storage?.removeItem(ACTIVE_TIMER_STORAGE_KEY);
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
