const steps = [
  {
    title: "Crie seu perfil",
    description:
      "Apresente portfólio, formação, estilo, estrutura e raio de deslocamento.",
  },
  {
    title: "Encontre a combinação",
    description:
      "Artistas descobrem oportunidades; estabelecimentos encontram quem está disponível.",
  },
  {
    title: "Envie uma proposta",
    description:
      "Registre cachê, duração, equipamento, transporte e condições de pagamento.",
  },
  {
    title: "Confirme e avalie",
    description:
      "As condições ficam claras e a reputação cresce depois de cada apresentação.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="how-section">
      <div className="section-heading">
        <p className="eyebrow">Um caminho mais profissional</p>
        <h2>Do horário livre ao show confirmado.</h2>
        <p>
          O protótipo organiza o que hoje fica dividido entre Instagram,
          indicação e mensagens.
        </p>
      </div>
      <div className="steps">
        {steps.map((step, index) => (
          <article key={step.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
