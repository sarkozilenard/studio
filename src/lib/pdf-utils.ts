'use client';
import type { FormValues } from './definitions';
import { generatePdf } from '@/ai/flows/generate-pdf-flow';

// This declares the printJS function globally for TypeScript
declare const printJS: (params: {
    printable: string;
    type: 'pdf';
    base64?: boolean;
    showModal?: boolean;
    modalMessage?: string;
}) => void;


/**
 * Calls the server to generate a PDF, then uses Print.js to open the print dialog.
 * @param formData The form data from the user.
 * @param pdfType The type of PDF to generate.
 */
export async function generateAndHandlePdf(
    formData: FormValues,
    pdfType: 'main' | 'kellekszavatossag' | 'meghatalmazas' | 'all'
) {
    if (typeof printJS === 'undefined') {
        throw new Error('Print.js library is not loaded. Please check the script tags.');
    }

    try {
        // Step 1: Call the server flow to get the generated PDF data as a base64 string.
        const result = await generatePdf({ formData, pdfType });
        
        if (!result || !result.pdfBase64) {
            throw new Error("A PDF generálása a szerveren sikertelen volt, vagy üres adatot adott vissza.");
        }

        // Step 2: Call Print.js with the base64 data.
        // It handles the conversion and opens the print dialog.
        printJS({
            printable: result.pdfBase64,
            type: 'pdf',
            base64: true,
            showModal: true,
            modalMessage: 'Dokumentum előkészítése nyomtatásra...'
        });

    } catch (error: any) {
        console.error("Hiba a PDF feldolgozása közben:", error);
        // Re-throw the error to be caught by the form's error handler.
        throw error;
    }
}
