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
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } else if (action === 'print') {
        const printWindow = window.open(url, '_blank', 'noopener,noreferrer');
        if (printWindow) {
             printWindow.onload = () => {
                setTimeout(() => {
                    try {
                        printWindow.print();
                    } catch (e) {
                        console.error("Print failed:", e);
                        // Optional: Close the window if printing fails, or show a message.
                        // printWindow.close(); 
                    }
                }, 1000); // Increased timeout for slower connections
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
        
        if (!result || !result.pdfs || result.pdfs.length === 0) {
            throw new Error("PDF generation failed on the server.");
        }
        
        result.pdfs.forEach(pdf => {
            handlePdfUrl(pdf.url, action);
        });
    } catch (error: any) {
        // Improved error handling to give a specific, actionable message for the likely cause.
        if (error.message && (error.message.includes('storage/unknown') || error.message.includes('404'))) {
             throw new Error(
                "PDF Upload Failed (404): This is likely a permissions issue. " +
                "Please go to the Google Cloud IAM page for your project and ensure the service account for your App Hosting backend has the 'Storage Object Admin' role. " +
                "Original error: " + error.message
            );
        }
        throw error; // Re-throw other errors
    }
}
