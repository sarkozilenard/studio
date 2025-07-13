'use client';
import type { FormValues } from './definitions';
import { generatePdf } from '@/ai/flows/generate-pdf-flow';

/**
 * Generates a PDF on the server and opens it in a new browser tab using a Data URL.
 * This method is fast and avoids both direct downloads and blob URLs.
 * @param formData The form data from the user.
 * @param pdfType The type of PDF to generate.
 */
export async function generateAndHandlePdf(
    formData: FormValues, 
    pdfType: 'main' | 'kellekszavatossag' | 'meghatalmazas' | 'all'
) {
    try {
        // Step 1: Call the server flow to generate the PDF data.
        const result = await generatePdf({ formData, pdfType });
        
        if (!result || !result.pdfBase64) {
            throw new Error("A PDF generálása a szerveren sikertelen volt, vagy nem adott vissza adatot.");
        }

        // Step 2: Create a Data URL from the Base64 string.
        const dataUrl = `data:application/pdf;base64,${result.pdfBase64}`;
        
        // Step 3: Open the Data URL in a new tab.
        // The browser will render the PDF directly from this URL.
        const newWindow = window.open(dataUrl, '_blank');
        if (!newWindow) {
            throw new Error("A böngésző letiltotta a felugró ablakot. Kérjük, engedélyezze a felugró ablakokat ezen az oldalon.");
        }

    } catch (error: any) {
        console.error("Hiba a generateAndHandlePdf függvényben:", error);
        // Re-throw the error to be caught by the form's error handler.
        throw error; 
    }
}
