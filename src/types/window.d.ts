import type { PDFDocument } from 'pdf-lib';

declare global {
  interface Window {
    PDFLib: {
      PDFDocument: typeof PDFDocument;
    };
    fontkit: any;
  }
}

// This is necessary to make this a module
export {};
