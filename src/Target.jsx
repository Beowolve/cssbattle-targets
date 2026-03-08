import PropTypes from "prop-types";

const CSS_BATTLE_BASE_URL = "https://cssbattle.dev";

export default function Target({ id, name, image }) {
  const targetUrl = `${CSS_BATTLE_BASE_URL}/play/${id}`;
  const imageUrl = `${CSS_BATTLE_BASE_URL}${image}`;

  return (
    <article className="target">
      <header className="targetHeader">
        <span className="targetName" title={name}>
          {name}
        </span>
        <span className="targetNr">{id}</span>
      </header>

      <a
        className="targetLink"
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open target ${id}: ${name}`}
      >
        <img className="targetImg" src={imageUrl} alt={name} loading="lazy" decoding="async" />
      </a>
    </article>
  );
}

Target.propTypes = {
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  image: PropTypes.string.isRequired
};
