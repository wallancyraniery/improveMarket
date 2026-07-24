import type { ExplorerView } from "../../domain/types";

type HeroSectionProps = {
  onExplore: (view: ExplorerView) => void;
};

export function HeroSection({ onExplore }: HeroSectionProps) {
  return (
    <section id="inicio" className="hero">
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-copy">
        <p className="eyebrow">Música ao vivo, mais perto</p>
        <h1>Datas livres podem virar novos shows.</h1>
        <p className="hero-description">
          Conectamos artistas e estabelecimentos por agenda, localização e
          compatibilidade.
        </p>
        <div className="hero-actions">
          <button
            className="button button-primary"
            type="button"
            onClick={() => onExplore("opportunities")}
          >
            Explorar oportunidades <span aria-hidden="true">→</span>
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => onExplore("artists")}
          >
            Encontrar artistas <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="hero-trust" aria-label="Informações do protótipo">
          <span>
            <i className="dot dot-cyan" /> Região piloto
          </span>
          <span>
            <i className="dot dot-green" /> Dados demonstrativos
          </span>
        </div>
      </div>

      <div
        className="regional-radar"
        aria-label="Oportunidades simuladas na região piloto"
      >
        <div className="radar-grid" aria-hidden="true" />
        <div className="route-line" aria-hidden="true" />
        <article className="floating-card card-one">
          <div className="opportunity-icon">31</div>
          <div>
            <p className="card-city">
              Itajubá, MG <span className="live-dot" />
            </p>
            <p className="card-meta">Sexta-feira · 21h</p>
            <span className="tag">Voz e violão</span>
            <strong>R$ 700 – R$ 1.000</strong>
          </div>
        </article>
        <article className="floating-card card-two">
          <div className="opportunity-icon">01</div>
          <div>
            <p className="card-city">
              Paraisópolis, MG <span className="live-dot" />
            </p>
            <p className="card-meta">Sábado · 20h30</p>
            <span className="tag">Pop rock</span>
            <strong>R$ 1.200 – R$ 1.600</strong>
          </div>
        </article>
        <span className="map-point point-one">Itajubá</span>
        <span className="map-point point-two">Paraisópolis</span>
        <span className="map-point point-three">Brazópolis</span>
      </div>
    </section>
  );
}
