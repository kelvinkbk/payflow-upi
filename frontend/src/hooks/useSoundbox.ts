import { useCallback, useRef } from 'react';

export function useSoundbox() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play crisp notification chime using Web Audio API
  const playChime = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // First tone: 523.25 Hz (C5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Second tone: 659.25 Hz (E5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.12);
      gain2.gain.setValueAtTime(0.4, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);

      // Third tone: 783.99 Hz (G5)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(783.99, now + 0.24);
      gain3.gain.setValueAtTime(0.45, now + 0.24);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.24);
      osc3.stop(now + 0.8);
    } catch (err) {
      console.warn('AudioContext chime error:', err);
    }
  }, []);

  // Voice announcement: "Payment of ₹500 received on UPI"
  const announcePayment = useCallback((amount: number, appSource: string = 'UPI', lang: string = 'en-IN') => {
    playChime();

    if (!('speechSynthesis' in window)) return;

    // Small delay so chime finishes before speech starts
    setTimeout(() => {
      window.speechSynthesis.cancel(); // Stop any pending speech

      let phrase = `Payment of ${amount} Rupees received on ${appSource}`;
      if (lang === 'hi-IN') {
        phrase = `${appSource} par ${amount} rupaye prapt hue`;
      }

      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      // Try selecting appropriate voice if available
      const voices = window.speechSynthesis.getVoices();
      const indianVoice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('hi-IN') || v.name.includes('India'));
      if (indianVoice) {
        utterance.voice = indianVoice;
      }

      window.speechSynthesis.speak(utterance);
    }, 450);
  }, [playChime]);

  return { playChime, announcePayment };
}
