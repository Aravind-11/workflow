"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Search } from "lucide-react";

interface QRScanInputProps {
  onScan: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoSubmitPattern?: RegExp;
  autoSubmitDelay?: number;
}

/**
 * Reusable barcode/QR scan input.
 * - Accepts keyboard/paste input from handheld scanners
 * - Optionally activates device camera via BarcodeDetector API
 * - Auto-submits when input matches a pattern after a debounce
 */
export function QRScanInput({
  onScan,
  placeholder = "Scan or enter barcode / QR code…",
  disabled = false,
  autoSubmitPattern,
  autoSubmitDelay = 500,
}: QRScanInputProps) {
  const [value, setValue] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastScanRef = useRef<{ code: string; time: number } | null>(null);

  const SCAN_COOLDOWN_MS = 2000;

  useEffect(() => {
    const supported =
      typeof window !== "undefined" && "BarcodeDetector" in window;
    setCameraSupported(supported);
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraError(null);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const emitScan = useCallback((code: string) => {
    const now = Date.now();
    const last = lastScanRef.current;
    if (last && last.code === code && now - last.time < SCAN_COOLDOWN_MS) return;
    lastScanRef.current = { code, time: now };
    onScan(code);
  }, [onScan]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      // @ts-expect-error -- BarcodeDetector is not in all TS libs yet
      const detector = new BarcodeDetector({ formats: ["qr_code", "code_128", "ean_13", "ean_8"] });

      const scan = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            if (raw) {
              const code = extractBarcodeFromUrl(raw);
              setValue(code);
              emitScan(code);
              stopCamera();
              return;
            }
          }
        } catch {
          // detection frame error, keep scanning
        }
        if (streamRef.current) {
          requestAnimationFrame(scan);
        }
      };
      requestAnimationFrame(scan);
    } catch (err) {
      setCameraError(
        err instanceof Error ? err.message : "Camera access denied",
      );
      setCameraActive(false);
    }
  }, [emitScan, stopCamera]);

  const handleChange = (val: string) => {
    setValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (autoSubmitPattern && autoSubmitPattern.test(val.trim())) {
      debounceRef.current = setTimeout(() => {
        emitScan(val.trim());
      }, autoSubmitDelay);
    }
  };

  const handleSubmit = () => {
    if (value.trim()) {
      emitScan(value.trim());
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          data-scan-target="barcode"
          className="flex-1 rounded-md border border-gray-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        />
        <Button onClick={handleSubmit} disabled={disabled || !value.trim()}>
          <Search className="h-4 w-4 mr-1" />
          Lookup
        </Button>
        {cameraSupported && (
          <Button
            variant="outline"
            onClick={cameraActive ? stopCamera : startCamera}
            disabled={disabled}
            title={cameraActive ? "Stop camera" : "Scan with camera"}
          >
            {cameraActive ? (
              <CameraOff className="h-4 w-4" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {cameraError && (
        <p className="text-xs text-red-600 dark:text-red-400">{cameraError}</p>
      )}

      {cameraActive && (
        <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <video
            ref={videoRef}
            className="w-full max-h-64 object-cover"
            playsInline
            muted
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-32 w-32 rounded-lg border-2 border-dashed border-blue-400/60" />
          </div>
        </div>
      )}
    </div>
  );
}

function extractBarcodeFromUrl(raw: string): string {
  try {
    const url = new URL(raw);
    const code = url.searchParams.get("code");
    if (code) return code;
  } catch {
    // not a URL
  }
  return raw;
}
