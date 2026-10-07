export type CartePedagogique = {
  card_id: string;
  chapter_id: string;
  title: string;
  body: string;
  takeaway: string;
  key_concepts: string[];
  start_year: number | null;
  start_month: number | null;
  start_day: number | null;
  end_year: number | null;
  end_month: number | null;
  end_day: number | null;
  date_text: string;
  sort_order: number;
};

// Liste explicite, comme la RPC SQL : les champs internes ne sont jamais
// sérialisés dans les props du navigateur, même s'ils sont présents en entrée.
export function cartePublique(c: CartePedagogique): CartePedagogique {
  return {
    card_id: c.card_id, chapter_id: c.chapter_id, title: c.title, body: c.body,
    takeaway: c.takeaway, key_concepts: c.key_concepts,
    start_year: c.start_year, start_month: c.start_month, start_day: c.start_day,
    end_year: c.end_year, end_month: c.end_month, end_day: c.end_day,
    date_text: c.date_text, sort_order: c.sort_order,
  };
}

export type ChapitrePedagogique = {
  id: string;
  titre: string;
  niveau: string;
  cartes: CartePedagogique[];
  lacune?: string;
};
