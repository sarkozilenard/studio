'use client';
import type { FormValues } from './definitions';
import { generatePdf } from '@/ai/flows/generate-pdf-flow';


export const loadPdfTemplates = async () => {
    // This function now just checks if the templates exist on the server by trying to fetch them.
    // The actual files are loaded by the server-side Genkit flow.
    try {
        const [mainRes, kellekRes, meghatRes] = await Promise.all([
            fetch('/sablon.pdf'),
            fetch('/kellekszavatossagi_nyilatkozat.pdf'),
            fetch('/meghatalmazas_okmanyiroda.pdf'),
        ]);

        return {
            main: mainRes.ok ? true : null,
            kellekszavatossag: kellekRes.ok ? true : null,
            meghatalmazas: meghatRes.ok ? true : null,
        };
    } catch (error) {
        console.error("Error checking PDF templates:", error);
        return { main: null, kellekszavatossag: null, meghatalmazas: null };
    }
};

function handlePdfData(pdfData: string, action: 'download' | 'print', filename: string) {
    const byteCharacters = atob(pdfData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    if (action === 'download') {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else if (action === 'print') {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        
        iframe.onload = () => {
            try {
                setTimeout(() => {
                    if (iframe.contentWindow) {
                        iframe.contentWindow.print();
                    }
                }, 100);
            } finally {
                setTimeout(() => {
                    document.body.removeChild(iframe);
                    URL.revokeObjectURL(url);
                }, 200);
            }
        };
    }
}


export async function generateAndHandlePdf(
    formData: FormValues, 
    pdfType: 'main' | 'kellekszavatossag' | 'meghatalmazas' | 'all',
    action: 'download' | 'print'
) {
    const result = await generatePdf({ formData, pdfType });
    
    if (!result || !result.pdfs || result.pdfs.length === 0) {
        throw new Error("PDF generation failed on the server.");
    }
    
    result.pdfs.forEach(pdf => {
        handlePdfData(pdf.data, action, pdf.filename);
    });
}
