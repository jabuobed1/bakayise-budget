import { useState, useEffect, useRef, useCallback } from 'react';

// Declare Web Speech API interface for TypeScript
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface UseVoiceRecorderReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  startListening: (baseText?: string) => void;
  stopListening: () => void;
  resetTranscript: () => void;
  setTranscript: (text: string) => void;
}

export function useVoiceRecorder(initialText: string = ''): UseVoiceRecorderReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState(initialText);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isStoppingRef = useRef(false);
  const isListeningRef = useRef(false);
  const baseTextRef = useRef(initialText);
  const currentTranscriptRef = useRef(initialText);

  // Keep current transcript ref in sync
  useEffect(() => {
    currentTranscriptRef.current = transcript;
  }, [transcript]);

  const win = typeof window !== 'undefined' ? (window as unknown as IWindow) : null;
  const isSupported = Boolean(win && (win.SpeechRecognition || win.webkitSpeechRecognition));

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = win?.SpeechRecognition || win?.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-ZA'; // South African English default with fallback

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let sessionFinal = '';
      let sessionInterim = '';

      for (let i = 0; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          const text = item[0]?.transcript || '';
          sessionFinal += (sessionFinal ? ' ' : '') + text.trim();
        } else {
          const text = item[0]?.transcript || '';
          sessionInterim += (sessionInterim ? ' ' : '') + text.trim();
        }
      }

      const base = (baseTextRef.current || '').trim();
      let combined = base;

      if (sessionFinal) {
        combined = base ? `${base} ${sessionFinal.trim()}` : sessionFinal.trim();
      }

      if (combined !== currentTranscriptRef.current) {
        setTranscript(combined);
        currentTranscriptRef.current = combined;
      }
      setInterimTranscript(sessionInterim);
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition event notice:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access was denied. Please allow microphone permissions in your browser.');
        setIsListening(false);
        isListeningRef.current = false;
      } else if (event.error === 'no-speech') {
        // Just silent audio, keep alive
      } else {
        setError(`Speech recognition notice: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setInterimTranscript('');
      if (!isStoppingRef.current && isListeningRef.current) {
        // If continuous recognition timed out due to silence, update baseTextRef to current full transcript
        baseTextRef.current = currentTranscriptRef.current;
        try {
          recognition.start();
        } catch {
          setIsListening(false);
          isListeningRef.current = false;
        }
      } else {
        setIsListening(false);
        isListeningRef.current = false;
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isStoppingRef.current = true;
      isListeningRef.current = false;
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    };
  }, [isSupported]);

  const startListening = useCallback(
    (baseText?: string) => {
      if (!isSupported) {
        setError(
          'Voice recognition is not supported on this browser. You can type or paste your entries directly into the text area.'
        );
        return;
      }
      setError(null);
      isStoppingRef.current = false;
      isListeningRef.current = true;

      const startingBase = typeof baseText === 'string' ? baseText : currentTranscriptRef.current;
      baseTextRef.current = startingBase;
      setTranscript(startingBase);
      currentTranscriptRef.current = startingBase;
      setInterimTranscript('');

      try {
        recognitionRef.current?.start();
      } catch (err: any) {
        console.warn('Recognition start caught:', err);
        try {
          recognitionRef.current?.stop();
          setTimeout(() => {
            if (isListeningRef.current) {
              recognitionRef.current?.start();
            }
          }, 150);
        } catch {
          // ignore
        }
      }
    },
    [isSupported]
  );

  const stopListening = useCallback(() => {
    isStoppingRef.current = true;
    isListeningRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setIsListening(false);
    setInterimTranscript('');
    baseTextRef.current = currentTranscriptRef.current;
  }, []);

  const resetTranscript = useCallback(() => {
    baseTextRef.current = '';
    currentTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
  };
}
