export interface QuestionNode {
  id: string;
  domain: string;
  text: string;
  question_type: string;
  options?: string[];
  score_drop_trigger: boolean;
}

export type RadarScores = Record<string, number>;

export type SessionState = 'idle' | 'active' | 'completed';
