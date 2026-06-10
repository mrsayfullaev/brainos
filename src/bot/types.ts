export interface SessionData {
  onboardingStep: 'language' | 'name' | 'tone' | 'length' | 'emoji' | 'structure' | 'style' | 'detail' | 'custom' | 'bonus_module' | null;
  onboardingData: {
    name?: string;
    language?: string;
    tone?: string;
    length?: string;
    emoji?: string;
    structure?: string;
    style?: string;
    detail?: string;
    customPrompt?: string;
  };
}
