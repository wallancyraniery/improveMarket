import type { Artist, Opportunity } from "../domain/types";

export const demoOpportunities: Opportunity[] = [
  {
    id: 1,
    venue: "Café Mantiqueira",
    city: "Itajubá",
    date: "31 jul",
    weekday: "Sexta-feira",
    time: "21h",
    genres: ["MPB", "Pop rock"],
    budget: "R$ 700 – R$ 1.000",
    format: "Voz e violão ou dupla",
    equipment: "Som do local",
  },
  {
    id: 2,
    venue: "Estação 22",
    city: "Paraisópolis",
    date: "01 ago",
    weekday: "Sábado",
    time: "20h30",
    genres: ["Rock nacional", "Pop"],
    budget: "R$ 1.200 – R$ 1.600",
    format: "Banda",
    equipment: "Artista leva equipamentos",
  },
  {
    id: 3,
    venue: "Varanda da Serra",
    city: "Brazópolis",
    date: "07 ago",
    weekday: "Sexta-feira",
    time: "19h30",
    genres: ["Sertanejo", "MPB"],
    budget: "R$ 600 – R$ 900",
    format: "Solo, dupla ou trio",
    equipment: "A combinar",
  },
];

export const demoArtists: Artist[] = [
  {
    name: "Aurora",
    kind: "Banda",
    city: "Itajubá",
    genres: "Pop rock · MPB",
    rating: "4,9",
    initials: "AU",
  },
  {
    name: "Luma & Trio",
    kind: "Trio",
    city: "Paraisópolis",
    genres: "MPB · Jazz",
    rating: "4,8",
    initials: "LT",
  },
  {
    name: "Serra Acústica",
    kind: "Dupla",
    city: "Brazópolis",
    genres: "Rock nacional",
    rating: "4,9",
    initials: "SA",
  },
];
