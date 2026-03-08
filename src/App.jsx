import { useEffect, useMemo, useState } from "react";
import Target from "./Target.jsx";
import { THEME_OPTIONS, useTheme } from "./hooks/useTheme.js";
import { useTargets } from "./hooks/useTargets.js";
import "./Target.css";
import "./styles.css";

const TARGET_MODE_OPTIONS = {
  battle: "battle",
  daily: "daily"
};

const SORT_OPTIONS = {
  newest: "newest",
  oldest: "oldest"
};

const GROUP_OPTIONS = {
  none: "none",
  battle: "battle",
  year: "year"
};

const STORAGE_KEYS = {
  mode: "cssbattle-targets.view.mode",
  prefs: "cssbattle-targets.view.prefs.v1"
};

const DEFAULT_VIEW_PREFERENCES = {
  [TARGET_MODE_OPTIONS.battle]: {
    sort: SORT_OPTIONS.newest,
    group: GROUP_OPTIONS.none
  },
  [TARGET_MODE_OPTIONS.daily]: {
    sort: SORT_OPTIONS.newest,
    group: GROUP_OPTIONS.none
  }
};

function isValidMode(value) {
  return value === TARGET_MODE_OPTIONS.battle || value === TARGET_MODE_OPTIONS.daily;
}

function isValidSort(value) {
  return value === SORT_OPTIONS.newest || value === SORT_OPTIONS.oldest;
}

function isValidGroupForMode(mode, value) {
  if (value === GROUP_OPTIONS.none) {
    return true;
  }

  if (mode === TARGET_MODE_OPTIONS.battle) {
    return value === GROUP_OPTIONS.battle;
  }

  if (mode === TARGET_MODE_OPTIONS.daily) {
    return value === GROUP_OPTIONS.year;
  }

  return false;
}

function readStoredMode() {
  if (typeof window === "undefined") {
    return TARGET_MODE_OPTIONS.battle;
  }

  const storedMode = window.localStorage.getItem(STORAGE_KEYS.mode);
  return isValidMode(storedMode) ? storedMode : TARGET_MODE_OPTIONS.battle;
}

function normalizeModePreferences(mode, maybePreferences) {
  const defaults = DEFAULT_VIEW_PREFERENCES[mode];

  if (!maybePreferences || typeof maybePreferences !== "object") {
    return defaults;
  }

  const sort = isValidSort(maybePreferences.sort) ? maybePreferences.sort : defaults.sort;
  const group = isValidGroupForMode(mode, maybePreferences.group) ? maybePreferences.group : defaults.group;

  return { sort, group };
}

function readStoredPreferences() {
  if (typeof window === "undefined") {
    return DEFAULT_VIEW_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.prefs);
    if (!raw) {
      return DEFAULT_VIEW_PREFERENCES;
    }

    const parsed = JSON.parse(raw);
    return {
      [TARGET_MODE_OPTIONS.battle]: normalizeModePreferences(TARGET_MODE_OPTIONS.battle, parsed[TARGET_MODE_OPTIONS.battle]),
      [TARGET_MODE_OPTIONS.daily]: normalizeModePreferences(TARGET_MODE_OPTIONS.daily, parsed[TARGET_MODE_OPTIONS.daily])
    };
  } catch {
    return DEFAULT_VIEW_PREFERENCES;
  }
}

function formatLastSync(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function compareTargets(leftTarget, rightTarget, sortOrder) {
  const sortDelta = leftTarget.sortValue - rightTarget.sortValue;

  if (sortDelta !== 0) {
    return sortOrder === SORT_OPTIONS.newest ? -sortDelta : sortDelta;
  }

  return sortOrder === SORT_OPTIONS.newest
    ? rightTarget.challengeId.localeCompare(leftTarget.challengeId)
    : leftTarget.challengeId.localeCompare(rightTarget.challengeId);
}

function buildTargetGroups(targets, mode, groupMode, sortOrder) {
  const sortedTargets = [...targets].sort((leftTarget, rightTarget) => compareTargets(leftTarget, rightTarget, sortOrder));

  if (groupMode === GROUP_OPTIONS.none) {
    return [{ key: "all", title: null, items: sortedTargets }];
  }

  const grouped = new Map();

  for (const target of sortedTargets) {
    let groupKey = "all";
    let groupTitle = null;

    if (mode === TARGET_MODE_OPTIONS.daily && groupMode === GROUP_OPTIONS.year) {
      const year = Number.isFinite(target.groupYear) ? String(target.groupYear) : "Unknown";
      groupKey = `year-${year}`;
      groupTitle = year === "Unknown" ? "Year Unknown" : `Year ${year}`;
    } else if (mode === TARGET_MODE_OPTIONS.battle && groupMode === GROUP_OPTIONS.battle) {
      const battleLabel = Number.isFinite(target.battleNumber) ? String(target.battleNumber) : "Unknown";
      groupKey = `battle-${battleLabel}`;
      groupTitle = battleLabel === "Unknown" ? "Battle Unknown" : `Battle ${battleLabel}`;
    }

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, { key: groupKey, title: groupTitle, items: [] });
    }

    grouped.get(groupKey).items.push(target);
  }

  return Array.from(grouped.values());
}

export default function App() {
  const [themeMode, setThemeMode] = useTheme();
  const [targetMode, setTargetMode] = useState(readStoredMode);
  const [viewPreferences, setViewPreferences] = useState(readStoredPreferences);
  const { targets, isLoading, isRefreshing, error, source, lastSyncAt, hasConfig } = useTargets(targetMode);

  const activePreferences = viewPreferences[targetMode] ?? DEFAULT_VIEW_PREFERENCES[targetMode];
  const sortOrder = activePreferences.sort;
  const groupMode = activePreferences.group;

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.mode, targetMode);
  }, [targetMode]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify(viewPreferences));
  }, [viewPreferences]);

  const groupedTargets = useMemo(
    () => buildTargetGroups(targets, targetMode, groupMode, sortOrder),
    [targets, targetMode, groupMode, sortOrder]
  );

  const sourceLabel = targetMode === TARGET_MODE_OPTIONS.battle ? "Battle Targets" : "Daily Targets";

  const updateActivePreferences = (patch) => {
    setViewPreferences((previousPreferences) => {
      const currentModePreferences = previousPreferences[targetMode] ?? DEFAULT_VIEW_PREFERENCES[targetMode];

      return {
        ...previousPreferences,
        [targetMode]: {
          ...currentModePreferences,
          ...patch
        }
      };
    });
  };

  return (
    <div className="appRoot">
      <div className="topBand" />

      <header className="appHeader">
        <div className="brand">
          <img className="brandLogo" src="/logo-square.png" alt="" aria-hidden="true" />
          <span className="brandText">CSSBattle Targets</span>
        </div>

        <label className="themeSwitch" htmlFor="themeMode">
          Theme
          <select id="themeMode" value={themeMode} onChange={(event) => setThemeMode(event.target.value)}>
            <option value={THEME_OPTIONS.system}>System</option>
            <option value={THEME_OPTIONS.light}>Light</option>
            <option value={THEME_OPTIONS.dark}>Dark</option>
          </select>
        </label>
      </header>

      <main className="content">
        <section className="toolbar" aria-label="Target view controls">
          <div className="toolbarRow">
            <div className="modeSwitch" role="tablist" aria-label="Target type">
              <button
                type="button"
                role="tab"
                aria-selected={targetMode === TARGET_MODE_OPTIONS.battle}
                className={targetMode === TARGET_MODE_OPTIONS.battle ? "modeButton active" : "modeButton"}
                onClick={() => setTargetMode(TARGET_MODE_OPTIONS.battle)}
              >
                Battle
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={targetMode === TARGET_MODE_OPTIONS.daily}
                className={targetMode === TARGET_MODE_OPTIONS.daily ? "modeButton active" : "modeButton"}
                onClick={() => setTargetMode(TARGET_MODE_OPTIONS.daily)}
              >
                Daily
              </button>
            </div>

            <div className="viewControls">
              <label className="controlField" htmlFor="sortOrder">
                Sort
                <select id="sortOrder" value={sortOrder} onChange={(event) => updateActivePreferences({ sort: event.target.value })}>
                  <option value={SORT_OPTIONS.newest}>Newest first</option>
                  <option value={SORT_OPTIONS.oldest}>Oldest first</option>
                </select>
              </label>

              <label className="controlField" htmlFor="groupMode">
                Group
                <select id="groupMode" value={groupMode} onChange={(event) => updateActivePreferences({ group: event.target.value })}>
                  <option value={GROUP_OPTIONS.none}>None</option>
                  {targetMode === TARGET_MODE_OPTIONS.battle ? (
                    <option value={GROUP_OPTIONS.battle}>By battle</option>
                  ) : (
                    <option value={GROUP_OPTIONS.year}>By year</option>
                  )}
                </select>
              </label>
            </div>
          </div>

          <p className="targetsMeta">
            {isLoading && targets.length === 0 ? "Loading targets..." : `${targets.length} ${sourceLabel}`}
            {source === "cache" && !isRefreshing ? " • Cached" : ""}
            {lastSyncAt ? ` • Last sync ${formatLastSync(lastSyncAt)}` : ""}
            {isRefreshing ? " • Refreshing..." : ""}
          </p>
        </section>

        {!hasConfig ? (
          <div className="statusCard errorCard">
            Missing Supabase config. Create <code>.env</code> from <code>.env.example</code> and set
            <code> VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.
          </div>
        ) : null}

        {error ? <div className="statusCard errorCard">{error}</div> : null}

        {!hasConfig || (isLoading && targets.length === 0) ? (
          <div className="statusCard">Loading target data...</div>
        ) : (
          <div className="groupList">
            {groupedTargets.map((group) => (
              <section className="groupSection" key={group.key}>
                {group.title ? <h2 className="groupTitle">{group.title}</h2> : null}

                <div className="targetsGrid" aria-label={group.title ? `${group.title} ${sourceLabel}` : `${sourceLabel} list`}>
                  {group.items.map((target) => (
                    <Target
                      key={`${targetMode}-${target.challengeId}`}
                      challengeId={target.challengeId}
                      name={target.name}
                      imageUrl={target.imageUrl}
                      label={target.label}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}