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

function handlePdfAction(base64Data: string, filename: string, action: 'download' | 'print') {
    const byteCharacters = atob(base64Data);
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
        URL.revokeObjectURL(url); // Clean up
    } else if (action === 'print') {
        const printWindow = window.open(url, '_blank', 'noopener,noreferrer');
        if (printWindow) {
             printWindow.onload = () => {
                setTimeout(() => {
                    try {
                        printWindow.print();
                    } catch (e) {
                        console.error("Print failed:", e);
                    }
                }, 500);
            };
        } else {
            throw new Error("Kérjük, engedélyezze a felugró ablakokat a nyomtatáshoz.");
        }
    }
}


export async function generateAndHandlePdf(
    formData: FormValues, 
    pdfType: 'main' | 'kellekszavatossag' | 'meghatalmazas' | 'all',
    action: 'download' | 'print'
) {
    try {
        const result: GeneratePdfOutput = await generatePdf({ formData, pdfType });
        
        if (!result || !result.base64Data) {
            throw new Error("PDF generation failed on the server.");
        }
        
        handlePdfAction(result.base64Data, result.filename, action);

    } catch (error: any) {
        console.error("Error in generateAndHandlePdf:", error);
        throw error; // Re-throw other errors
    }
}
