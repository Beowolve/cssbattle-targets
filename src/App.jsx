import Target from "./Target.jsx";
import levels from "./levels.js";
import { THEME_OPTIONS, useTheme } from "./hooks/useTheme.js";
import "./Target.css";
import "./styles.css";

export default function App() {
  const [themeMode, setThemeMode] = useTheme();

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
        <p className="targetsMeta">{levels.length} targets available</p>

        <section className="targetsGrid" aria-label="CSS Battle target list">
          {levels.map((target) => (
            <Target key={target.id} id={target.id} name={target.name} image={target.image} />
          ))}
        </section>
      </main>
    </div>
  );
}