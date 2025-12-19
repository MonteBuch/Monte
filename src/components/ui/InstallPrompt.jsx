// src/components/ui/InstallPrompt.jsx
// PWA Install-Banner für "Add to Home Screen"

import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Prüfen ob bereits dismissed
    const wasDismissed = localStorage.getItem("pwa-install-dismissed");
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // iOS-Erkennung (Safari zeigt beforeinstallprompt nicht)
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;

    if (isIOSDevice && !isInStandaloneMode) {
      setIsIOS(true);
      setShowPrompt(true);
      return;
    }

    // Android/Desktop: beforeinstallprompt Event abfangen
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Prüfen ob bereits installiert
    if (isInStandaloneMode) {
      setShowPrompt(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    // Für 7 Tage nicht mehr anzeigen
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  if (!showPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-4">
        <div className="flex items-start gap-3">
          <div className="bg-amber-100 p-2 rounded-xl">
            <Download className="text-amber-600" size={24} />
          </div>

          <div className="flex-1">
            <h3 className="font-bold text-stone-800 text-sm">
              App installieren
            </h3>
            {isIOS ? (
              <p className="text-xs text-stone-600 mt-1">
                Tippe auf{" "}
                <span className="inline-block px-1 bg-stone-100 rounded">
                  Teilen
                </span>{" "}
                und dann{" "}
                <span className="inline-block px-1 bg-stone-100 rounded">
                  Zum Home-Bildschirm
                </span>
              </p>
            ) : (
              <p className="text-xs text-stone-600 mt-1">
                Installiere Monte auf deinem Gerät für schnelleren Zugriff
              </p>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 text-stone-400 hover:text-stone-600"
          >
            <X size={18} />
          </button>
        </div>

        {!isIOS && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2 text-sm text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200"
            >
              Später
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 py-2 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600"
            >
              Installieren
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
