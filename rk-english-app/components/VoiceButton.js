'use client';
import { useEffect, useRef, useState } from 'react';

// Chrome's built-in speech recognition (also what Android's Gboard mic uses under the hood).
// lang="en-IN" specifically requests the Indian-English acoustic/language model, which handles
// Indian names, place names and accent far better than the default "en-US".
export default function VoiceButton({ onResult, lang = 'en-IN' }) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { setSupported(false); return; }
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      }
      if (finalText.trim()) onResult(finalText.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    return () => { try { rec.stop(); } catch {} };
  }, [lang]); // eslint-disable-line

  function toggle() {
    if (!supported || !recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch {
        // start() throws if already running — ignore
      }
    }
  }

  if (!supported) return null;

  return (
    <button type="button" className={`mic-btn ${listening ? 'active' : ''}`} onClick={toggle} title={listening ? 'Stop listening' : 'Speak to type'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 10a7 7 0 0014 0M12 19v3" />
      </svg>
      {listening && <span className="mic-dot" />}
    </button>
  );
}
