declare module 'html2canvas' {
  type Options = { scale?: number; useCORS?: boolean; backgroundColor?: string | null };
  export default function html2canvas(element: HTMLElement, options?: Options): Promise<HTMLCanvasElement>;
}

declare module 'jspdf' {
  export class jsPDF {
    constructor(orientation?: string, unit?: string, format?: string);
    addImage(imageData: string, format: string, x: number, y: number, width: number, height: number): void;
    addPage(): void;
    output(type: 'blob'): Blob;
  }
}

declare module '@netlify/blobs' {
  type Store = {
    setJSON(key: string, value: unknown): Promise<void>;
    get(key: string, options: { type: 'json' }): Promise<unknown>;
  };
  export function getStore(name: string): Store;
}
