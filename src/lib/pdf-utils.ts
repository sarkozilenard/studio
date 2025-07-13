'use client';
import type { FormValues } from './definitions';
import { generatePdf } from '@/ai/flows/generate-pdf-flow';

/**
 * Calls the server to generate a PDF, upload it to Firebase Storage,
 * and then opens the returned public URL in a new browser tab.
 * @param formData The form data from the user.
 * @param pdfType The type of PDF to generate.
 * @param action The desired action ('download' or 'print').
 */
export async function generateAndHandlePdf(
    formData: FormValues, 
    pdfType: 'main' | 'kellekszavatossag' | 'meghatalmazas' | 'all'
) {
    try {
        // Step 1: Call the server flow. It will generate, upload, and return the public URL.
        const result = await generatePdf({ formData, pdfType });
        
        if (!result || !result.pdfUrl) {
            throw new Error("A PDF generálása vagy feltöltése a szerveren sikertelen volt.");
        }

        // Step 2: Open the public URL from Firebase Storage in a new tab.
        // The browser will display the PDF from this URL, allowing for printing or saving.
        const newWindow = window.open(result.pdfUrl, '_blank');
        if (!newWindow) {
            throw new Error("A böngésző letiltotta a felugró ablakot. Kérjük, engedélyezze a felugró ablakokat ezen az oldalon.");
        }

    } catch (error: any) {
        console.error("Hiba a generateAndHandlePdf függvényben:", error);
        // Re-throw the error to be caught by the form's error handler.
        throw error; 
    }
}
