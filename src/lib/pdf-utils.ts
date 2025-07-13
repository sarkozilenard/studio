'use client';
import type { FormValues } from './definitions';
import { generatePdf } from '@/ai/flows/generate-pdf-flow';
import type { GeneratePdfOutput } from './definitions';


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

function handlePdfUrl(url: string, action: 'download' | 'print') {
    if (action === 'download') {
        // For downloads, we can just open the URL. The browser will handle it.
        // For a more direct download experience, a link with a download attribute is better.
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank'; // Open in a new tab to avoid navigating away
        // The 'download' attribute is less reliable with cross-origin URLs, 
        // but opening in a new tab is a solid fallback.
        // link.download = filename; 
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } else if (action === 'print') {
        const printWindow = window.open(url, '_blank', 'noopener,noreferrer');
        if (printWindow) {
             printWindow.onload = () => {
                // A timeout is often necessary to ensure the PDF viewer has fully loaded the document
                setTimeout(() => {
                    printWindow.print();
                }, 500); 
            };
        } else {
            alert("Kérjük, engedélyezze a felugró ablakokat a nyomtatáshoz.");
        }
    }
}


export async function generateAndHandlePdf(
    formData: FormValues, 
    pdfType: 'main' | 'kellekszavatossag' | 'meghatalmazas' | 'all',
    action: 'download' | 'print'
) {
    const result: GeneratePdfOutput = await generatePdf({ formData, pdfType });
    
    if (!result || !result.pdfs || result.pdfs.length === 0) {
        throw new Error("PDF generation failed on the server.");
    }
    
    result.pdfs.forEach(pdf => {
        handlePdfUrl(pdf.url, action);
    });
}
