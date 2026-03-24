import { useCallback, useEffect, useRef, useState } from "react";
import { hasSupabaseConfig, supabase } from "../lib/supabase.js";

const CACHE_KEY_PREFIX = "cssbattle-targets.cache.v4";
const UPDATE_HOURS_UTC = [1, 18];
const PAGE_SIZE = 120;

function getCacheKey(mode) {
  return `${CACHE_KEY_PREFIX}.${mode}`;
}

function hasMoreTargets(loadedCount, totalCount, lastPageSize) {
  if (typeof totalCount === "number") {
    return loadedCount < totalCount;
  }

  return lastPageSize === PAGE_SIZE;
}

export function clearTargetsCache() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (typeof key === "string" && key.startsWith(`${CACHE_KEY_PREFIX}.`)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore availability and quota errors.
  }
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

function isValidTargetEntry(target) {
  return (
    target &&
    typeof target.challengeId === "string" &&
    typeof target.name === "string" &&
    typeof target.imageUrl === "string" &&
    typeof target.label === "string" &&
    typeof target.sortValue === "number"
  );
}

function isTargetEntryMatchingMode(mode, target) {
  if (!target || typeof target.label !== "string") {
    return false;
  }

  if (mode === "battle") {
    return target.label.startsWith("#");
  }

  if (mode === "daily") {
    return !target.label.startsWith("#");
  }

  return true;
}

function readCache(mode) {
  try {
    const rawValue = window.localStorage.getItem(getCacheKey(mode));
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);
    const isValidTotalCount = parsed.totalCount === null || typeof parsed.totalCount === "number";

    if (
      !Array.isArray(parsed.targets) ||
      parsed.targets.some((target) => !isValidTargetEntry(target)) ||
      parsed.targets.some((target) => !isTargetEntryMatchingMode(mode, target)) ||
      typeof parsed.fetchedAt !== "number" ||
      typeof parsed.nextRefreshAt !== "number" ||
      !isValidTotalCount
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeCache(mode, targets, totalCount, fetchedAt) {
  try {
    const payload = {
      targets,
      totalCount: typeof totalCount === "number" ? totalCount : null,
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

function parseUtcDate(dateString) {
  const timestamp = Date.parse(`${dateString}T00:00:00Z`);

  if (!Number.isFinite(timestamp)) {
    return { timestamp: 0, year: null };
  }

  return {
    timestamp,
    year: new Date(timestamp).getUTCFullYear()
  };
}

function buildTargetQuery(mode, includeCount) {
  const selectOptions = includeCount ? { count: "exact" } : undefined;

  if (mode === "daily") {
    return supabase
      .from("daily_targets")
      .select("key, name, image_url, date", selectOptions)
      .order("date", { ascending: false })
      .order("key", { ascending: true });
  }

  return supabase
    .from("battle_targets")
    .select("id, name, image_url, battle_number", selectOptions)
    .order("id", { ascending: false });
}

function mapTargetRows(mode, rows) {
  if (mode === "daily") {
    return rows.map((row) => {
      const parsedDate = parseUtcDate(row.date);

      return {
        challengeId: String(row.key),
        name: row.name,
        imageUrl: normalizeImageUrl(row.image_url),
        label: formatDailyLabel(row.date),
        sortValue: parsedDate.timestamp,
        groupYear: parsedDate.year,
        battleNumber: null
      };
    });
  }

  return rows.map((row) => ({
    challengeId: String(row.id),
    name: row.name,
    imageUrl: normalizeImageUrl(row.image_url),
    label: `#${row.id}`,
    sortValue: Number(row.id) || 0,
    groupYear: null,
    battleNumber: Number.isFinite(row.battle_number) ? row.battle_number : null
  }));
}

async function fetchTargetPage(mode, fromIndex, pageSize, includeCount) {
  if (!supabase) {
    return { targets: [], totalCount: null };
  }

  const from = Math.max(0, fromIndex);
  const to = from + pageSize - 1;
  const { data, error, count } = await buildTargetQuery(mode, includeCount).range(from, to);

  if (error) {
    throw new Error(`Could not load ${mode} targets: ${error.message}`);
  }

  return {
    targets: mapTargetRows(mode, data ?? []),
    totalCount: typeof count === "number" ? count : null
  };
}

function deduplicateTargets(targets) {
  const seen = new Set();
  const deduplicated = [];

  for (const target of targets) {
    if (seen.has(target.challengeId)) {
      continue;
    }

    seen.add(target.challengeId);
    deduplicated.push(target);
  }

  return deduplicated;
}

function getNewTargetIds(existingTargets, incomingTargets) {
  const existingIds = new Set(existingTargets.map((target) => target.challengeId));
  return incomingTargets.filter((target) => !existingIds.has(target.challengeId)).map((target) => target.challengeId);
}

function mergeRefreshedTargets(existingTargets, incomingTargets, totalCount) {
  const mergedTargets = deduplicateTargets([...incomingTargets, ...existingTargets]);
  if (typeof totalCount !== "number" || mergedTargets.length <= totalCount) {
    return mergedTargets;
  }

  return mergedTargets.slice(0, totalCount);
}

export function useTargets(mode) {
  const [state, setState] = useState({
    mode,
    targets: [],
    totalCount: null,
    hasMore: false,
    newlyAddedIds: [],
    isLoading: true,
    isRefreshing: false,
    isLoadingMore: false,
    error: null,
    source: "network",
    lastSyncAt: null,
    hasConfig: hasSupabaseConfig
  });
  const [manualRefreshToken, setManualRefreshToken] = useState(0);
  const lastHandledManualRefreshToken = useRef(0);
  const activeRequestToken = useRef(0);
  const isLoadMoreInFlight = useRef(false);
  const latestStateRef = useRef(state);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!Array.isArray(state.newlyAddedIds) || state.newlyAddedIds.length === 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setState((previousState) => {
        if (!Array.isArray(previousState.newlyAddedIds) || previousState.newlyAddedIds.length === 0) {
          return previousState;
        }

        return {
          ...previousState,
          newlyAddedIds: []
        };
      });
    }, 1500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [state.newlyAddedIds]);

  const refresh = useCallback(() => {
    setManualRefreshToken((previousToken) => previousToken + 1);
  }, []);

  const loadMore = useCallback(() => {
    if (!hasSupabaseConfig || isLoadMoreInFlight.current) {
      return;
    }

    const snapshot = latestStateRef.current;
    if (!snapshot || snapshot.mode !== mode || !snapshot.hasMore || snapshot.isLoading || snapshot.isRefreshing || snapshot.isLoadingMore) {
      return;
    }

    const requestToken = activeRequestToken.current;
    const fromIndex = snapshot.targets.length;
    isLoadMoreInFlight.current = true;

    setState((previousState) => ({
      ...previousState,
      isLoadingMore: true,
      error: null
    }));

    fetchTargetPage(mode, fromIndex, PAGE_SIZE, false)
      .then((page) => {
        if (activeRequestToken.current !== requestToken) {
          return;
        }

        setState((previousState) => {
          const previousTargets = previousState.mode === mode ? previousState.targets : [];
          const mergedTargets = deduplicateTargets([...previousTargets, ...page.targets]);
          const resolvedTotalCount =
            typeof previousState.totalCount === "number"
              ? previousState.totalCount
              : typeof page.totalCount === "number"
                ? page.totalCount
                : null;
          const hasMore = hasMoreTargets(mergedTargets.length, resolvedTotalCount, page.targets.length);
          const updatedState = {
            ...previousState,
            mode,
            targets: mergedTargets,
            totalCount: resolvedTotalCount,
            hasMore,
            isLoadingMore: false,
            error: null,
            source: "network"
          };
          const cacheTimestamp = previousState.lastSyncAt ?? Date.now();
          writeCache(mode, updatedState.targets, updatedState.totalCount, cacheTimestamp);
          return updatedState;
        });
      })
      .catch((error) => {
        if (activeRequestToken.current !== requestToken) {
          return;
        }

        setState((previousState) => ({
          ...previousState,
          isLoadingMore: false,
          error: error instanceof Error ? error.message : `Could not load ${mode} targets.`
        }));
      })
      .finally(() => {
        if (activeRequestToken.current === requestToken) {
          isLoadMoreInFlight.current = false;
        }
      });
  }, [mode]);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setState((previousState) => ({
        ...previousState,
        mode,
        targets: [],
        totalCount: null,
        hasMore: false,
        newlyAddedIds: [],
        isLoading: false,
        isRefreshing: false,
        isLoadingMore: false,
        hasConfig: false,
        error: null
      }));
      return undefined;
    }

    let isCancelled = false;
    activeRequestToken.current += 1;
    isLoadMoreInFlight.current = false;
    const requestToken = activeRequestToken.current;
    const cached = readCache(mode);
    const shouldForceRefresh = manualRefreshToken !== lastHandledManualRefreshToken.current;
    lastHandledManualRefreshToken.current = manualRefreshToken;

    if (cached) {
      const cachedTotalCount = typeof cached.totalCount === "number" ? cached.totalCount : null;
      setState({
        mode,
        targets: cached.targets,
        totalCount: cachedTotalCount,
        hasMore: hasMoreTargets(cached.targets.length, cachedTotalCount, cached.targets.length),
        newlyAddedIds: [],
        isLoading: false,
        isRefreshing: false,
        isLoadingMore: false,
        error: null,
        source: "cache",
        lastSyncAt: cached.fetchedAt,
        hasConfig: true
      });
    }

    const cacheIsFresh = cached && Date.now() < cached.nextRefreshAt;
    if (cacheIsFresh && !shouldForceRefresh) {
      return undefined;
    }

    setState((previousState) => ({
      ...previousState,
      mode,
      targets: previousState.mode === mode ? previousState.targets : [],
      totalCount: previousState.mode === mode ? previousState.totalCount : null,
      hasMore: previousState.mode === mode ? previousState.hasMore : false,
      newlyAddedIds: [],
      isLoading: previousState.mode === mode ? previousState.targets.length === 0 : true,
      isRefreshing: previousState.mode === mode ? previousState.targets.length > 0 : false,
      isLoadingMore: false,
      error: null,
      hasConfig: true
    }));

    fetchTargetPage(mode, 0, PAGE_SIZE, true)
      .then((page) => {
        if (isCancelled || activeRequestToken.current !== requestToken) {
          return;
        }

        const fetchedAt = Date.now();
        const resolvedTotalCount = typeof page.totalCount === "number" ? page.totalCount : page.targets.length;
        setState((previousState) => {
          const previousTargets = previousState.mode === mode && Array.isArray(previousState.targets) ? previousState.targets : [];
          const mergedTargets =
            previousTargets.length > 0 ? mergeRefreshedTargets(previousTargets, page.targets, resolvedTotalCount) : page.targets;
          const hasMore = hasMoreTargets(mergedTargets.length, resolvedTotalCount, page.targets.length);
          const newlyAddedIds = previousTargets.length > 0 ? getNewTargetIds(previousTargets, page.targets) : [];
          writeCache(mode, mergedTargets, resolvedTotalCount, fetchedAt);

          return {
            ...previousState,
            mode,
            targets: mergedTargets,
            totalCount: resolvedTotalCount,
            hasMore,
            newlyAddedIds,
            isLoading: false,
            isRefreshing: false,
            isLoadingMore: false,
            error: null,
            source: "network",
            lastSyncAt: fetchedAt,
            hasConfig: true
          };
        });
      })
      .catch((error) => {
        if (isCancelled || activeRequestToken.current !== requestToken) {
          return;
        }

        setState((previousState) => ({
          ...previousState,
          isLoading: false,
          isRefreshing: false,
          isLoadingMore: false,
          error: error instanceof Error ? error.message : `Could not load ${mode} targets.`,
          hasConfig: true
        }));
      });

    return () => {
      isCancelled = true;
    };
  }, [manualRefreshToken, mode]);

  return {
    ...state,
    refresh,
    loadMore
  };
}
