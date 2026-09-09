import type { IVoiceProvider, VoiceCallbacks, LanguageOption } from './voice-types';
import { INDIAN_LANGUAGES_REGISTRY } from './voice-types';
import { AudioLevelAnalyzer } from './audio-analyzer';

/**
 * Standard Web Speech API Provider with Real-time Partial Streaming Transcripts
 */
export class BrowserSpeechProvider implements IVoiceProvider {
  public name = 'BrowserSpeechRecognition';
  private recognition: any = null;
  private isListening: boolean = false;
  private audioAnalyzer: AudioLevelAnalyzer = new AudioLevelAnalyzer();
  private callbacks: VoiceCallbacks = {};

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public getSupportedLanguages(): LanguageOption[] {
    return INDIAN_LANGUAGES_REGISTRY;
  }

  public async startListening(callbacks: VoiceCallbacks, languageCode: string = 'auto'): Promise<void> {
    if (this.isListening) {
      this.stopListening();
    }

    this.callbacks = callbacks;

    if (!this.isSupported()) {
      callbacks.onError?.('Speech recognition is not supported in this browser. Please use keyboard text input.');
      return;
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognitionClass();

    // Map language code to BCP-47
    const matched = INDIAN_LANGUAGES_REGISTRY.find((l) => l.code === languageCode);
    this.recognition.lang = matched ? matched.bcp47 : 'en-IN';
    this.recognition.continuous = false; // Single utterance for crisp command dispatch
    this.recognition.interimResults = true; // Streaming real-time partial transcripts!
    this.recognition.maxAlternatives = 3;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.callbacks.onStart?.();
      // Start microphone amplitude meter
      this.audioAnalyzer.start((level) => {
        this.callbacks.onAudioLevel?.(level);
      });
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        const text = item[0]?.transcript || '';
        if (item.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }

      if (interimTranscript) {
        this.callbacks.onPartialTranscript?.(interimTranscript);
      }

      if (finalTranscript) {
        this.callbacks.onFinalTranscript?.(finalTranscript);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.warn('Speech recognition event error:', event.error);
      const errMsg = event.error === 'not-allowed'
        ? 'Microphone access blocked. Please allow microphone permissions in browser.'
        : event.error === 'no-speech'
        ? 'No speech detected.'
        : `Voice error: ${event.error || 'Network error'}`;
      this.callbacks.onError?.(errMsg);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.audioAnalyzer.stop();
      this.callbacks.onEnd?.();
    };

    try {
      this.recognition.start();
    } catch (err: any) {
      console.warn('Failed to start speech recognition:', err);
      this.callbacks.onError?.(err?.message || 'Could not start microphone');
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.isListening = false;
    this.audioAnalyzer.stop();
  }

  public abortListening(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        // ignore
      }
    }
    this.isListening = false;
    this.audioAnalyzer.stop();
  }
}

/**
 * Singleton Voice Provider Manager
 */
export const voiceProviderManager = new BrowserSpeechProvider();
