export interface SetRow {
  set: string | null;
  weight: string | null;
  rep: string | null;
  rir: string | null;
  remark: string | null;
}

export interface WarmupRow extends SetRow {
  exercise: string | null;
}

export interface Exercise {
  slot: string;
  name: string | null;
  detail: string | null;
  coach_remark: string | null;
  sets: SetRow[];
}

export interface Superset {
  group: string;
  exercises: Exercise[];
}

export interface Session {
  block: string;
  block_date_from: string | null;
  block_date_to: string | null;
  week: number | null;
  session: number | null;
  date_raw: string | null;
  date_iso: string | null;
  coach: string | null;
  warmups: WarmupRow[];
  supersets: Superset[];
}
