import type { Artist, ExplorerView, Opportunity } from "../../domain/types";
import { OpportunityCard } from "../components/OpportunityCard";

type ExplorerSectionProps = {
  activeView: ExplorerView;
  city: string;
  opportunities: Opportunity[];
  artists: Artist[];
  onCityChange: (city: string) => void;
  onViewChange: (view: ExplorerView) => void;
  onOpenOpportunity: (opportunity: Opportunity) => void;
};

export function ExplorerSection({
  activeView,
  city,
  opportunities,
  artists,
  onCityChange,
  onViewChange,
  onOpenOpportunity,
}: ExplorerSectionProps) {
  return (
    <section id="explorar" className="explore-section">
      <div className="explore-top">
        <div>
          <p className="eyebrow">Região piloto</p>
          <h2>
            {activeView === "opportunities"
              ? "Oportunidades próximas"
              : "Artistas disponíveis"}
          </h2>
        </div>
        <div
          className="view-switcher"
          role="group"
          aria-label="Escolher conteúdo"
        >
          <button
            className={activeView === "opportunities" ? "active" : ""}
            type="button"
            onClick={() => onViewChange("opportunities")}
          >
            Oportunidades
          </button>
          <button
            className={activeView === "artists" ? "active" : ""}
            type="button"
            onClick={() => onViewChange("artists")}
          >
            Artistas
          </button>
        </div>
      </div>

      {activeView === "opportunities" ? (
        <>
          <div className="filters">
            <label>
              Cidade
              <select
                value={city}
                onChange={(event) => onCityChange(event.target.value)}
              >
                <option>Todas</option>
                <option>Itajubá</option>
                <option>Paraisópolis</option>
                <option>Brazópolis</option>
              </select>
            </label>
            <label>
              Data
              <select defaultValue="Próximas">
                <option>Próximas</option>
                <option>Sexta-feira</option>
                <option>Sábado</option>
              </select>
            </label>
            <label>
              Formação
              <select defaultValue="Todas">
                <option>Todas</option>
                <option>Solo</option>
                <option>Dupla</option>
                <option>Banda</option>
              </select>
            </label>
            <button
              className="button button-primary filter-button"
              type="button"
            >
              Buscar
            </button>
          </div>
          <div className="card-grid">
            {opportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                onOpen={onOpenOpportunity}
              />
            ))}
          </div>
          {opportunities.length === 0 && (
            <p className="empty-state">
              Nenhuma oportunidade demonstrativa encontrada neste filtro.
            </p>
          )}
        </>
      ) : (
        <div className="card-grid artists-grid">
          {artists.map((artist) => (
            <article className="market-card artist-card" key={artist.name}>
              <div className="artist-avatar">{artist.initials}</div>
              <div className="artist-rating">★ {artist.rating}</div>
              <p className="location">
                {artist.kind} · {artist.city}, MG
              </p>
              <h3>{artist.name}</h3>
              <p className="schedule">{artist.genres}</p>
              <div className="tags">
                <span>Disponível</span>
                <span>Portfólio completo</span>
              </div>
              <div className="card-footer">
                <strong>A partir de R$ 600</strong>
                <button
                  type="button"
                  onClick={() =>
                    alert(
                      "Perfil público demonstrativo. O cadastro real entra na próxima etapa.",
                    )
                  }
                >
                  Ver perfil
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="demo-note">
        Nomes, valores e oportunidades desta demonstração são fictícios.
      </p>
    </section>
  );
}
