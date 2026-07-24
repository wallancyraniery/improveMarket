export type ExplorerView = "opportunities" | "artists";

export type Opportunity = {
  id: number;
  venue: string;
  city: string;
  date: string;
  weekday: string;
  time: string;
  genres: string[];
  budget: string;
  format: string;
  equipment: string;
};

export type Artist = {
  name: string;
  kind: string;
  city: string;
  genres: string;
  rating: string;
  initials: string;
};
