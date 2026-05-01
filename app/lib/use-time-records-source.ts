"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "./supabase/client";
import { fetchSupabaseTimeRecords } from "./supabase/time-records";
import {
  attachTagIdsToRecords,
  initialActivityRecords,
  loadActivityRecordsFromStorage,
  saveActivityRecordsToStorage,
  type ActivityRecord,
  type ActivityTag,
} from "./time-wallet-storage";

export type TimeRecordsSource = "local" | "supabase";

type UseTimeRecordsSourceOptions = {
  fallbackRecords?: ActivityRecord[];
  autoSaveLocal?: boolean;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "時間記録を読み込めませんでした。";
}

export function useTimeRecordsSource(
  tags: ActivityTag[],
  isTagsReady: boolean,
  {
    fallbackRecords = initialActivityRecords,
    autoSaveLocal = true,
  }: UseTimeRecordsSourceOptions = {},
) {
  const [records, setRecords] = useState<ActivityRecord[]>(fallbackRecords);
  const [source, setSource] = useState<TimeRecordsSource>("local");
  const [userId, setUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isTagsReady) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let isMounted = true;
    let timeoutId: number | null = null;
    let requestId = 0;

    const loadRecords = async (nextUserId: string | null) => {
      const currentRequestId = ++requestId;
      await Promise.resolve();

      if (!nextUserId) {
        const storedRecords = loadActivityRecordsFromStorage();
        const nextRecords = storedRecords
          ? attachTagIdsToRecords(storedRecords, tags)
          : fallbackRecords;

        if (!isMounted || currentRequestId !== requestId) {
          return;
        }

        setSource("local");
        setUserId(null);
        setRecords(nextRecords);
        setErrorMessage("");
        setIsReady(true);
        return;
      }

      try {
        const supabaseRecords = await fetchSupabaseTimeRecords(nextUserId);

        if (!isMounted || currentRequestId !== requestId) {
          return;
        }

        setSource("supabase");
        setUserId(nextUserId);
        setRecords(supabaseRecords);
        setErrorMessage("");
      } catch (error) {
        if (!isMounted || currentRequestId !== requestId) {
          return;
        }

        setSource("supabase");
        setUserId(nextUserId);
        setRecords([]);
        setErrorMessage(getErrorMessage(error));
      } finally {
        if (isMounted && currentRequestId === requestId) {
          setIsReady(true);
        }
      }
    };

    const scheduleLoad = (nextUserId: string | null) => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        setIsReady(false);
        setErrorMessage("");
        void loadRecords(nextUserId);
      }, 0);
    };

    if (!supabase) {
      scheduleLoad(null);

      return () => {
        isMounted = false;

        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
      };
    }

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        scheduleLoad(data.session?.user.id ?? null);
      })
      .catch(() => {
        scheduleLoad(null);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      scheduleLoad(session?.user.id ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [fallbackRecords, isTagsReady, tags]);

  useEffect(() => {
    if (!autoSaveLocal || !isReady || source !== "local") {
      return;
    }

    saveActivityRecordsToStorage(records);
  }, [autoSaveLocal, isReady, records, source]);

  return {
    records,
    setRecords,
    source,
    userId,
    isReady,
    errorMessage,
  };
}
