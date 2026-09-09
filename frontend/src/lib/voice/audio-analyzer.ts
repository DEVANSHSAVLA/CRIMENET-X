/**
 * Real Microphone Audio Amplitude Meter using Web Audio API
 * Computes live RMS amplitude normalized 0.0 - 1.0 for genuine reactive waveforms.
 */
export class AudioLevelAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private onLevelCallback: ((level: number) => void) | null = null;
  private isActive: boolean = false;

  public async start(onLevel: (level: number) => void): Promise<boolean> {
    if (this.isActive) return true;
    this.onLevelCallback = onLevel;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return false;

      this.audioContext = new AudioContextClass();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.5;
      source.connect(this.analyser);

      this.isActive = true;
      this.loop();
      return true;
    } catch (err) {
      console.warn('Microphone audio analyser unavailable:', err);
      this.stop();
      return false;
    }
  }

  private loop = () => {
    if (!this.isActive || !this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    // Compute average magnitude
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    // Scale to normalized level 0.0 - 1.0
    const normalized = Math.min(1.0, avg / 128);

    if (this.onLevelCallback) {
      this.onLevelCallback(normalized);
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  public stop(): void {
    this.isActive = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {
        // ignore
      }
      this.audioContext = null;
    }
    this.analyser = null;
    if (this.onLevelCallback) {
      this.onLevelCallback(0);
      this.onLevelCallback = null;
    }
  }
}
