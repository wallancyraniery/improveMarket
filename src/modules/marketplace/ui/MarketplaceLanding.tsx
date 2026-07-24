"use client";

import { useMemo, useState } from "react";
import { demoArtists, demoOpportunities } from "../data/demo-data";
import type { ExplorerView, Opportunity } from "../domain/types";
import { OpportunityModal } from "./components/OpportunityModal";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { ExplorerSection } from "./sections/ExplorerSection";
import { HeroSection } from "./sections/HeroSection";
import { HowItWorksSection } from "./sections/HowItWorksSection";
import { ValidationSection } from "./sections/ValidationSection";

export function MarketplaceLanding() {
  const [city, setCity] = useState("Todas");
  const [activeView, setActiveView] =
    useState<ExplorerView>("opportunities");
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<Opportunity | null>(null);
  const [proposalSent, setProposalSent] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const filteredOpportunities = useMemo(
    () =>
      demoOpportunities.filter(
        (opportunity) =>
          city === "Todas" || opportunity.city === city,
      ),
    [city],
  );

  function navigateToExplorer(view: ExplorerView) {
    setActiveView(view);
    setMenuOpen(false);
    document
      .getElementById("explorar")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  function openOpportunity(opportunity: Opportunity) {
    setProposalSent(false);
    setSelectedOpportunity(opportunity);
  }

  function closeOpportunity() {
    setSelectedOpportunity(null);
    setProposalSent(false);
  }

  return (
    <main>
      <SiteHeader
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((current) => !current)}
        onNavigateToExplorer={navigateToExplorer}
        onCloseMenu={() => setMenuOpen(false)}
      />
      <HeroSection onExplore={navigateToExplorer} />
      <HowItWorksSection />
      <ExplorerSection
        activeView={activeView}
        city={city}
        opportunities={filteredOpportunities}
        artists={demoArtists}
        onCityChange={setCity}
        onViewChange={setActiveView}
        onOpenOpportunity={openOpportunity}
      />
      <ValidationSection />
      <SiteFooter />

      {selectedOpportunity && (
        <OpportunityModal
          opportunity={selectedOpportunity}
          proposalSent={proposalSent}
          onClose={closeOpportunity}
          onSendProposal={() => setProposalSent(true)}
        />
      )}
    </main>
  );
}
