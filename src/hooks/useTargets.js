import { useEffect, useState } from "react";
import { hasSupabaseConfig, supabase } from "../lib/supabase.js";

const CACHE_KEY_PREFIX = "cssbattle-targets.cache.v1";
const UPDATE_HOURS_UTC = [1, 18];

function getCacheKey(mode) {
  return `${CACHE_KEY_PREFIX}.${mode}`;
}

function getNextRefreshAt(fromTimestamp) {
  const fromDate = new Date(fromTimestamp);
  const dayStartUtc = Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate());

  for (let dayOffset = 0; dayOffset < 3; dayOffset += 1) {
    for (const updateHour of UPDATE_HOURS_UTC) {
      const slot = dayStartUtc + dayOffset * 24 * 60 * 60 * 1000 + updateHour * 60 * 60 * 1000;
      if (slot > fromTimestamp) {
        return slot;
      }
    }
  }

  return fromTimestamp + 24 * 60 * 60 * 1000;
}

function readCache(mode) {
  try {
    const rawValue = window.localStorage.getItem(getCacheKey(mode));
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed.targets) || typeof parsed.fetchedAt !== "number" || typeof parsed.nextRefreshAt !== "number") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeCache(mode, targets, fetchedAt) {
  try {
    const payload = {
      targets,
      fetchedAt,
      nextRefreshAt: getNextRefreshAt(fetchedAt)
    };

    window.localStorage.setItem(getCacheKey(mode), JSON.stringify(payload));
  } catch {
    // Ignore quota and availability errors, network data still works.
  }
}

function normalizeImageUrl(imageUrl) {
  if (typeof imageUrl !== "string" || imageUrl.trim() === "") {
    return "";
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  if (imageUrl.startsWith("/")) {
    return `https://cssbattle.dev${imageUrl}`;
  }

  return `https://cssbattle.dev/${imageUrl}`;
}

function formatDailyLabel(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

async function fetchTargets(mode) {
  if (!supabase) {
    return [];
  }

  if (mode === "daily") {
    const { data, error } = await supabase
      .from("daily_targets")
      .select("key, name, image_url, date")
      .order("date", { ascending: false })
      .order("key", { ascending: true });

    if (error) {
      throw new Error(`Could not load daily targets: ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      challengeId: String(row.key),
      name: row.name,
      imageUrl: normalizeImageUrl(row.image_url),
      label: formatDailyLabel(row.date)
    }));
  }

  const { data, error } = await supabase.from("battle_targets").select("id, name, image_url").order("id", { ascending: true });

  if (error) {
    throw new Error(`Could not load battle targets: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    challengeId: String(row.id),
    name: row.name,
    imageUrl: normalizeImageUrl(row.image_url),
    label: `#${row.id}`
  }));
}

export function useTargets(mode) {
  const [state, setState] = useState({
    targets: [],
    isLoading: true,
    isRefreshing: false,
    error: null,
    source: "network",
    lastSyncAt: null,
    hasConfig: hasSupabaseConfig
  });

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setState((previousState) => ({
        ...previousState,
        isLoading: false,
        isRefreshing: false,
        hasConfig: false,
        error: null
      }));
      return undefined;
    }

    let isCancelled = false;
    const cached = readCache(mode);

    if (cached) {
      setState({
        targets: cached.targets,
        isLoading: false,
        isRefreshing: false,
        error: null,
        source: "cache",
        lastSyncAt: cached.fetchedAt,
        hasConfig: true
      });
    }

    const cacheIsFresh = cached && Date.now() < cached.nextRefreshAt;
    if (cacheIsFresh) {
      return undefined;
    }

    setState((previousState) => ({
      ...previousState,
      isLoading: previousState.targets.length === 0,
      isRefreshing: previousState.targets.length > 0,
      error: null,
      hasConfig: true
    }));

    fetchTargets(mode)
      .then((targets) => {
        if (isCancelled) {
          return;
        }

        const fetchedAt = Date.now();
        writeCache(mode, targets, fetchedAt);

        setState({
          targets,
          isLoading: false,
          isRefreshing: false,
          error: null,
          source: "network",
          lastSyncAt: fetchedAt,
          hasConfig: true
        });
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        setState((previousState) => ({
          ...previousState,
          isLoading: false,
          isRefreshing: false,
          error: error instanceof Error ? error.message : `Could not load ${mode} targets.`,
          hasConfig: true
        }));
      });

    return () => {
      isCancelled = true;
    };
  }, [mode]);

  return state;
}