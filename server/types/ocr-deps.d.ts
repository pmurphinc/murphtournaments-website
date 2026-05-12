declare module "sharp" {
  export type SharpImage = {
    metadata(): Promise<{ width?: number; height?: number }>;
    extract(rect: {
      left: number;
      top: number;
      width: number;
      height: number;
    }): SharpImage;
    grayscale(): SharpImage;
    resize(options: { width: number; height: number; fit: "fill" }): SharpImage;
    png(): SharpImage;
    toBuffer(): Promise<Buffer>;
  };
  const sharp: (input?: string | Buffer) => SharpImage;
  export default sharp;
}

declare module "tesseract.js" {
  export type RecognizeResult = {
    data: {
      text?: string;
      confidence?: number;
    };
  };
  export type Worker = {
    recognize(input: Buffer): Promise<RecognizeResult>;
    terminate(): Promise<void>;
  };
  export function createWorker(language?: string): Promise<Worker>;
}
