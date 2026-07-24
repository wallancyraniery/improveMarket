import type { Opportunity } from "../../domain/types";

type OpportunityModalProps = {
  opportunity: Opportunity;
  proposalSent: boolean;
  onClose: () => void;
  onSendProposal: () => void;
};

export function OpportunityModal({
  opportunity,
  proposalSent,
  onClose,
  onSendProposal,
}: OpportunityModalProps) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>
        {!proposalSent ? (
          <>
            <p className="eyebrow">Oportunidade demonstrativa</p>
            <h2 id="modal-title">{opportunity.venue}</h2>
            <p className="modal-subtitle">
              {opportunity.city}, MG · {opportunity.weekday}, {opportunity.time}
            </p>
            <dl>
              <div>
                <dt>Faixa de cachê</dt>
                <dd>{opportunity.budget}</dd>
              </div>
              <div>
                <dt>Formação</dt>
                <dd>{opportunity.format}</dd>
              </div>
              <div>
                <dt>Estilos</dt>
                <dd>{opportunity.genres.join(", ")}</dd>
              </div>
              <div>
                <dt>Estrutura</dt>
                <dd>{opportunity.equipment}</dd>
              </div>
              <div>
                <dt>Pagamento</dt>
                <dd>Na data do evento</dd>
              </div>
              <div>
                <dt>Entrada</dt>
                <dd>Informação obrigatória pendente</dd>
              </div>
            </dl>
            <button
              className="button button-primary modal-action"
              type="button"
              onClick={onSendProposal}
            >
              Simular envio de proposta
            </button>
          </>
        ) : (
          <div className="success-state">
            <div className="success-icon">✓</div>
            <p className="eyebrow">Fluxo demonstrado</p>
            <h2 id="modal-title">Proposta preparada.</h2>
            <p>
              No produto real, o artista informará valor, duração, formação,
              equipamentos, transporte e condições antes de enviar.
            </p>
            <button
              className="button button-secondary"
              type="button"
              onClick={onClose}
            >
              Continuar explorando
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
