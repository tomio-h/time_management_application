"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "./supabase/client";
import { fetchSupabaseActivityTags } from "./supabase/activity-tags";
import {
  initialActivityTags,
  loadActivityTagsFromStorage,
  saveActivityTagsToStorage,
  type ActivityTag,
} from "./time-wallet-storage";

export type ActivityTagsSource = "local" | "supabase";

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "活動タグを読み込めませんでした。";
}

export function useActivityTagsSource() {
  const [tags, setTags] = useState<ActivityTag[]>(initialActivityTags);
  const [source, setSource] = useState<ActivityTagsSource>("local");
  const [userId, setUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let isMounted = true;
    let timeoutId: number | null = null;
    let requestId = 0;

    const loadTags = async (nextUserId: string | null) => {
      const currentRequestId = ++requestId;
      await Promise.resolve();

      if (!nextUserId) {
        const storedTags = loadActivityTagsFromStorage();

        if (!isMounted || currentRequestId !== requestId) {
          return;
        }

        setSource("local");
        setUserId(null);
        setTags(storedTags ?? initialActivityTags);
        setErrorMessage("");
        setIsReady(true);
        return;
      }

      try {
        const supabaseTags = await fetchSupabaseActivityTags(nextUserId);

        if (!isMounted || currentRequestId !== requestId) {
          return;
        }

        setSource("supabase");
        setUserId(nextUserId);
        setTags(supabaseTags);
        setErrorMessage("");
      } catch (error) {
        if (!isMounted || currentRequestId !== requestId) {
          return;
        }

        setSource("supabase");
        setUserId(nextUserId);
        setTags([]);
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
        void loadTags(nextUserId);
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
  }, []);

  useEffect(() => {
    if (!isReady || source !== "local") {
      return;
    }

    saveActivityTagsToStorage(tags);
  }, [isReady, source, tags]);

  return {
    tags,
    setTags,
    source,
    userId,
    isReady,
    errorMessage,
  };
}
