import { Brand } from "@/src/components/brand/Brand";
import type { ExplorerView } from "../../domain/types";

type SiteHeaderProps = {
  menuOpen: boolean;
  onMenuToggle: () => void;
  onNavigateToExplorer: (view: ExplorerView) => void;
  onCloseMenu: () => void;
};

export function SiteHeader({
  menuOpen,
  onMenuToggle,
  onNavigateToExplorer,
  onCloseMenu,
}: SiteHeaderProps) {
  return (
    <header className="site-header">
      <Brand />
      <button
        className="mobile-menu"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="main-navigation"
        onClick={onMenuToggle}
      >
        <span />
        <span />
        <span />
        <span className="sr-only">Abrir menu</span>
      </button>
      <nav
        id="main-navigation"
        className={menuOpen ? "nav-open" : ""}
        aria-label="Navegação principal"
      >
        <a href="#como-funciona" onClick={onCloseMenu}>
          Como funciona
        </a>
        <a
          href="#explorar"
          onClick={() => onNavigateToExplorer("opportunities")}
        >
          Oportunidades
        </a>
        <a href="#explorar" onClick={() => onNavigateToExplorer("artists")}>
          Artistas
        </a>
      </nav>
      <button
        className="button button-ghost header-login"
        type="button"
        onClick={() =>
          alert("Login será conectado na próxima fase do MVP.")
        }
      >
        Entrar
      </button>
    </header>
  );
}
