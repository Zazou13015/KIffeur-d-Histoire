export type AdminPack = {
  id: string;
  title: string;
  active: boolean;
  total: number;
  retired: number;
  playable: number;
};

export type PackQuestion = {
  id: string;
  title: string;
  niveau: 1 | 2 | 3;
  date_text: string | null;
  start_year: number | null;
  start_month: number | null;
  start_day: number | null;
  end_year: number | null;
  end_month: number | null;
  end_day: number | null;
  removed: boolean;
  playable: boolean;
  last_change: {
    admin_id: string;
    occurred_at: string;
    operation: "retirer" | "remettre";
    reason: string | null;
  } | null;
};

export type PackChange = { changed: boolean; packs: AdminPack[]; questions: PackQuestion[] };
export type PackActionResult = { ok: true; data: PackChange } | { ok: false; message: string };
