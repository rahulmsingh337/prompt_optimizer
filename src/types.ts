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

export interface HistoryItem {
  id: string;
  userId: string;
  roughRequest: string;
  optimizedPrompt: string;
  proTip?: string | null;
  domain?: string | null;
  targetAI?: string | null;
  timestamp: string;
  modeUsed?: "BASIC" | "DETAIL" | null;
  improvements?: string[] | null;
  techniquesApplied?: string[] | null;
}

export interface UserPreferences {
  targetAI: string;
  modePreference: "Auto" | "BASIC" | "DETAIL";
  domain: string;
  updatedAt: string;
  enableHighlighting?: boolean;
}

