export function ValidationSection() {
  return (
    <section className="validation-section">
      <div>
        <p className="eyebrow">Construção orientada por pessoas reais</p>
        <h2>
          Ajude a IMPROVE a entender como os shows são fechados na região.
        </h2>
      </div>
      <div>
        <p>
          Estamos preparando a pesquisa com músicos e estabelecimentos. As
          respostas definirão quais recursos entrarão primeiro no produto.
        </p>
        <button
          className="button button-primary"
          type="button"
          onClick={() =>
            alert(
              "O formulário de validação será conectado assim que as perguntas finais forem aprovadas.",
            )
          }
        >
          Quero participar da pesquisa
        </button>
      </div>
    </section>
  );
}
