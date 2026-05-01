declare module "jsbarcode" {
  interface JsBarcodeOptions {
    format?: string;
    width?: number;
    height?: number;
    displayValue?: boolean;
    text?: string;
    fontSize?: number;
    margin?: number;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    textMargin?: number;
    font?: string;
    textAlign?: string;
    textPosition?: string;
    background?: string;
    lineColor?: string;
    flat?: boolean;
    valid?: (valid: boolean) => void;
  }

  function JsBarcode(
    element: SVGSVGElement | HTMLCanvasElement | HTMLImageElement | string,
    value: string,
    options?: JsBarcodeOptions,
  ): void;

  export default JsBarcode;
}
