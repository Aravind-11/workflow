"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { BarcodeLabel } from "./barcode-label";

type LabelFormat = "barcode" | "qr" | "both";

interface PrintLabelButtonProps {
  barcode: string;
  skuCode?: string;
  description?: string;
  customerName?: string;
  handledBy?: string;
  locationCode?: string;
  timestamp?: string;
  containerType?: string;
  format?: LabelFormat;
  size?: "sm" | "default";
}

export function PrintLabelButton({ size = "sm", format = "both", ...labelProps }: PrintLabelButtonProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const win = window.open("", "_blank", "width=400,height=500");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html><head><title>Label — ${labelProps.barcode}</title>
      <style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:system-ui,sans-serif;}
      @media print{body{min-height:auto;}}</style>
      </head><body>${printRef.current.innerHTML}</body></html>
    `);
    win.document.close();
    win.onload = () => { win.print(); win.close(); };
  };

  return (
    <>
      <Button variant="outline" size={size} onClick={handlePrint}>
        <Printer className="h-3.5 w-3.5 mr-1" />
        Print Label
      </Button>
      <div className="hidden">
        <div ref={printRef}>
          <BarcodeLabel {...labelProps} format={format} />
        </div>
      </div>
    </>
  );
}
