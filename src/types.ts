export interface User {
  id: string | number;
  login: string;
  name: string;
  avatar_url?: string;
  provider: "google";
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  defaultAnswer: string;
}

export interface OptimizedResponse {
  modeUsed: "BASIC" | "DETAIL";
  optimizedPrompt: string | null;
  improvements: string[] | null;
  techniquesApplied?: string[] | null;
  proTip?: string | null;
  clarifyingQuestions?: ClarifyingQuestion[] | null;
}

export interface QueryState {
  targetAI: string;
  modePreference: "Auto" | "BASIC" | "DETAIL";
  domain: string;
  roughRequest: string;
}
