import PropTypes from "prop-types";

const CSS_BATTLE_BASE_URL = "https://cssbattle.dev";

export default function Target({ challengeId, name, imageUrl, label }) {
  const targetUrl = `${CSS_BATTLE_BASE_URL}/play/${challengeId}`;

  return (
    <article className="target">
      <header className="targetHeader">
        <span className="targetName" title={name}>
          {name}
        </span>
        <span className="targetMeta">{label}</span>
      </header>

      <a
        className="targetLink"
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open target ${label}: ${name}`}
      >
        <img className="targetImg" src={imageUrl} alt={name} loading="lazy" decoding="async" />
      </a>
    </article>
  );
}

Target.propTypes = {
  challengeId: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  imageUrl: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired
};