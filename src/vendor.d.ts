declare module 'html2canvas' {
  type Options = { scale?: number; useCORS?: boolean; backgroundColor?: string | null };
  export default function html2canvas(element: HTMLElement, options?: Options): Promise<HTMLCanvasElement>;
}
declare module 'jspdf' {
  export class jsPDF {
    constructor(orientation?: string, unit?: string, format?: string);
    addImage(imageData: string, format: string, x: number, y: number, width: number, height: number): void;
    addPage(format?: string, orientation?: string): void;
    output(type: 'blob'): Blob;
  }
}
declare module 'mammoth' {
  const mammoth: {
    convertToHtml(input: { arrayBuffer: ArrayBuffer }, options?: unknown): Promise<{ value: string; messages: Array<{ type: string; message: string }> }>;
    images: { imgElement(fn: (image: { contentType: string; read(type: 'base64'): Promise<string> }) => Promise<{ src: string }>): unknown };
  };
  export default mammoth;
}
declare module 'pdfjs-dist' {
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(options: { data: Uint8Array }): { promise: Promise<{ numPages: number; getPage(pageNumber: number): Promise<{ getViewport(options:{scale:number}):{width:number;height:number}; getTextContent(): Promise<{ items: unknown[] }> }> }> };
}
declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' { const url:string; export default url; }
declare module '*.png?inline' { const dataUrl:string; export default dataUrl; }
declare module '@netlify/blobs' {
  type BlobEntry={key:string};
  type Store={setJSON(key:string,value:unknown):Promise<void>;get(key:string,options:{type:'json'}):Promise<any>;list():Promise<{blobs:BlobEntry[]}>;delete(key:string):Promise<void>};
  export function getStore(name:string):Store;
}
declare const process:{env:Record<string,string|undefined>};
