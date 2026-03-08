import { useState } from "react";
import Target from "./Target.jsx";
import { THEME_OPTIONS, useTheme } from "./hooks/useTheme.js";
import { useTargets } from "./hooks/useTargets.js";
import "./Target.css";
import "./styles.css";

const TARGET_MODE_OPTIONS = {
  battle: "battle",
  daily: "daily"
};

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

export default function App() {
  const [themeMode, setThemeMode] = useTheme();
  const [targetMode, setTargetMode] = useState(TARGET_MODE_OPTIONS.battle);
  const { targets, isLoading, isRefreshing, error, source, lastSyncAt, hasConfig } = useTargets(targetMode);

  const sourceLabel = targetMode === TARGET_MODE_OPTIONS.battle ? "Battle Targets" : "Daily Targets";

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
        <section className="toolbar" aria-label="Target source switch">
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
          <section className="targetsGrid" aria-label={`${sourceLabel} list`}>
            {targets.map((target) => (
              <Target
                key={`${targetMode}-${target.challengeId}`}
                challengeId={target.challengeId}
                name={target.name}
                imageUrl={target.imageUrl}
                label={target.label}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}