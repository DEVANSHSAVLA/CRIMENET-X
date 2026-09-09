export type VoiceState = 
  | 'READY'
  | 'LISTENING'
  | 'PROCESSING'
  | 'UNDERSTANDING'
  | 'EXECUTING'
  | 'RESPONDING'
  | 'ERROR';

export type LanguageSupportStatus = 'SUPPORTED' | 'LIMITED' | 'UNAVAILABLE';

export interface LanguageOption {
  code: string;
  label: string;
  bcp47: string;
  badge: string;
  status: LanguageSupportStatus;
  nativeName: string;
}

export interface DisambiguationOption {
  id: string;
  label: string;
  type: 'PERSON' | 'LOCATION' | 'CAMERA' | 'SIGNAL' | 'EVENT' | 'EVIDENCE';
  details?: string;
  role?: string;
}

export interface VoiceCommandResult {
  intent: string;
  confidence: number;
  language: string;
  transcript: string;
  entities: string[];
  parameters: Record<string, any>;
  requires_confirmation: boolean;
  confirmation_message?: string;
  spoken_response: string;
  action: string;
  target?: string;
  data: any;
  is_disambiguation?: boolean;
  disambiguation_options?: DisambiguationOption[];
  feedback_notice?: string;
}

export interface VoiceCallbacks {
  onStart?: () => void;
  onPartialTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  onAudioLevel?: (level: number) => void;
}

export interface IVoiceProvider {
  name: string;
  isSupported(): boolean;
  getSupportedLanguages(): LanguageOption[];
  startListening(callbacks: VoiceCallbacks, languageCode?: string): Promise<void>;
  stopListening(): void;
  abortListening(): void;
}

export const INDIAN_LANGUAGES_REGISTRY: LanguageOption[] = [
  { code: 'auto', label: 'Auto Detect (Indian Speech)', bcp47: 'en-IN', badge: 'AUTO', status: 'SUPPORTED', nativeName: 'Auto' },
  { code: 'en-IN', label: 'English (India)', bcp47: 'en-IN', badge: 'EN-IN', status: 'SUPPORTED', nativeName: 'English' },
  { code: 'hi-IN', label: 'हिंदी / Hinglish', bcp47: 'hi-IN', badge: 'HI-IN', status: 'SUPPORTED', nativeName: 'हिंदी' },
  { code: 'mr-IN', label: 'मराठी (Marathi)', bcp47: 'mr-IN', badge: 'MR-IN', status: 'SUPPORTED', nativeName: 'मराठी' },
  { code: 'gu-IN', label: 'ગુજરાતી (Gujarati)', bcp47: 'gu-IN', badge: 'GU-IN', status: 'SUPPORTED', nativeName: 'ગુજરાતી' },
  { code: 'bn-IN', label: 'বাংলা (Bengali)', bcp47: 'bn-IN', badge: 'BN-IN', status: 'SUPPORTED', nativeName: 'বাংলা' },
  { code: 'ta-IN', label: 'தமிழ் (Tamil)', bcp47: 'ta-IN', badge: 'TA-IN', status: 'SUPPORTED', nativeName: 'தமிழ்' },
  { code: 'te-IN', label: 'తెలుగు (Telugu)', bcp47: 'te-IN', badge: 'TE-IN', status: 'SUPPORTED', nativeName: 'తెలుగు' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)', bcp47: 'kn-IN', badge: 'KN-IN', status: 'SUPPORTED', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml-IN', label: 'മലയാളം (Malayalam)', bcp47: 'ml-IN', badge: 'ML-IN', status: 'SUPPORTED', nativeName: 'മലയാളം' },
  { code: 'pa-IN', label: 'ਪੰਜਾਬੀ (Punjabi)', bcp47: 'pa-IN', badge: 'PA-IN', status: 'SUPPORTED', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'od-IN', label: 'ଓଡ଼ିଆ (Odia)', bcp47: 'or-IN', badge: 'OD-IN', status: 'LIMITED', nativeName: 'ଓଡ଼ିଆ' },
];
