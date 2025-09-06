"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef } from "react";

type QrScannerProps = {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (errorMessage: string) => void;
  continuousScan?: boolean; // Add option for continuous scanning
  physicalScanner?: boolean; // Optimized for physical scanner
};

const QrScanner = ({
  onScanSuccess,
  onScanFailure,
  continuousScan = false,
  physicalScanner = false,
}: QrScannerProps) => {
  const html5QrCode = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // For continuous scanning mode, track the last scanned code to prevent duplicates
  const lastScannedRef = useRef<{ code: string; timestamp: number } | null>(
    null
  );

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

    // Wrapper for onScanSuccess to handle continuous scanning
    const handleScanSuccess = (decodedText: string) => {
      // In continuous scanning mode, prevent duplicate scans
      if (continuousScan) {
        const now = Date.now();

        // Debounce repeated scans of the same code (within 1.5 seconds)
        if (
          lastScannedRef.current &&
          lastScannedRef.current.code === decodedText &&
          now - lastScannedRef.current.timestamp < 1500
        ) {
          return; // Skip this scan as it's likely a duplicate
        }

        // Update the last scanned code
        lastScannedRef.current = {
          code: decodedText,
          timestamp: now,
        };
      }

      // Call the provided onScanSuccess handler
      onScanSuccess(decodedText);
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

        // Configure scanner based on mode
        const config = {
          fps: physicalScanner ? 20 : 10, // Higher FPS for physical scanners
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: physicalScanner, // Less processing for physical scanners
          formatsToSupport: physicalScanner ? [0, 1, 2, 3] : undefined, // Limited formats for physical scanners
        };

        // Start camera with default device
        html5QrCode.current
          .start(
            { facingMode: "environment" }, // Use back camera when available
            config,
            handleScanSuccess, // Use our wrapped handler
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
  }, [onScanSuccess, onScanFailure, continuousScan, physicalScanner]);

  return (
    <div
      ref={containerRef}
      className="qr-scanner-container"
      style={{ width: "100%", minHeight: "300px" }}
    />
  );
};

export default QrScanner;
