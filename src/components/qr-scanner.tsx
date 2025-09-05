"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef } from "react";

type QrScannerProps = {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (errorMessage: string) => void;
};

const QrScanner = ({ onScanSuccess, onScanFailure }: QrScannerProps) => {
  const html5QrCode = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cleanup function to stop scanning and clear resources
    const cleanupScanner = () => {
      if (html5QrCode.current) {
        try {
          // Check if camera is scanning
          if (html5QrCode.current.isScanning) {
            html5QrCode.current.stop().catch(console.error);
          }
          html5QrCode.current = null;
        } catch (err) {
          console.error("Failed to clean up scanner:", err);
        }
      }
    };

    // Initialize and start scanner
    const startScanner = () => {
      if (!containerRef.current) return;

      // Clean up any existing instance first
      cleanupScanner();

      try {
        // Create a new scanner instance
        const qrCodeId = `qr-reader-${Date.now()}`;
        const qrContainer = document.createElement("div");
        qrContainer.id = qrCodeId;

        // Clear any existing content and append the new container
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          containerRef.current.appendChild(qrContainer);
        }

        // Create scanner instance
        html5QrCode.current = new Html5Qrcode(qrCodeId);

        // Start camera with default device
        html5QrCode.current
          .start(
            { facingMode: "environment" }, // Use back camera when available
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            onScanSuccess,
            onScanFailure || (() => {})
          )
          .catch((err) => {
            console.error("Error starting scanner:", err);
          });
      } catch (err) {
        console.error("Error starting scanner:", err);
      }
    };

    // Start the scanner after component mounts
    startScanner();

    // Clean up when component unmounts
    return cleanupScanner;
  }, [onScanSuccess, onScanFailure]);

  return (
    <div
      ref={containerRef}
      className="qr-scanner-container"
      style={{ width: "100%", minHeight: "300px" }}
    />
  );
};

export default QrScanner;
