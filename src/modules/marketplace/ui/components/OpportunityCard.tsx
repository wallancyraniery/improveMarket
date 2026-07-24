import type { Opportunity } from "../../domain/types";

type OpportunityCardProps = {
  opportunity: Opportunity;
  onOpen: (opportunity: Opportunity) => void;
};

export function OpportunityCard({
  opportunity,
  onOpen,
}: OpportunityCardProps) {
  const [day, month] = opportunity.date.split(" ");

  return (
    <article className="market-card">
      <div className="market-card-top">
        <span className="date-badge">
          <strong>{day}</strong>
          {month}
        </span>
        <span className="availability">Disponível</span>
      </div>
      <p className="location">{opportunity.city}, MG</p>
      <h3>{opportunity.venue}</h3>
      <p className="schedule">
        {opportunity.weekday} · {opportunity.time}
      </p>
      <div className="tags">
        {opportunity.genres.map((genre) => (
          <span key={genre}>{genre}</span>
        ))}
      </div>
      <div className="card-details">
        <p>{opportunity.format}</p>
        <p>{opportunity.equipment}</p>
      </div>
      <div className="card-footer">
        <strong>{opportunity.budget}</strong>
        <button type="button" onClick={() => onOpen(opportunity)}>
          Ver oportunidade
        </button>
      </div>
    </article>
  );
}
