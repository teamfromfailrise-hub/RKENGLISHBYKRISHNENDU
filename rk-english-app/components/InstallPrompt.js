'use client';
import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [platform, setPlatform] = useState(null); // 'android' | 'ios' | null
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) return;
    if (sessionStorage.getItem('rk-install-dismissed')) return;

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
      setPlatform('android');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    const ua = window.navigator.userAgent || '';
    const isIos = /iPhone|iPad|iPod/.test(ua) && !window.MSStream;
    if (isIos) setPlatform('ios');

    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  function dismiss() {
    setDismissed(true);
    sessionStorage.setItem('rk-install-dismissed', '1');
  }

  if (dismissed || !platform) return null;

  return (
    <div className="install-banner">
      <div className="install-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M9 18h6" /></svg>
      </div>
      <div className="install-text">
        <strong>Install RK English</strong>
        <span>{platform === 'android' ? 'Add it to your home screen — opens like a real app, no browser bar.' : 'Tap Share, then "Add to Home Screen" — opens like a real app.'}</span>
      </div>
      {platform === 'android' && deferred && (
        <button
          className="install-btn"
          onClick={async () => {
            deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
            dismiss();
          }}
        >
          Install
        </button>
      )}
      <button className="install-close" onClick={dismiss} aria-label="Dismiss">×</button>
    </div>
  );
}
