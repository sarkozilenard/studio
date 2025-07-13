'use client';
import type { FormValues } from './definitions';
import { generatePdf } from '@/ai/flows/generate-pdf-flow';

/**
 * Generates a PDF on the server, uploads it to Firebase Storage,
 * and then opens the returned public URL.
 * @param formData The form data from the user.
 * @param pdfType The type of PDF to generate.
 * @param action The action is no longer used but kept for compatibility.
 */
export async function generateAndHandlePdf(
    formData: FormValues, 
    pdfType: 'main' | 'kellekszavatossag' | 'meghatalmazas' | 'all',
    action: 'download' | 'print' // Note: action parameter is no longer differentiating logic
) {
    try {
        // Step 1: Call the server flow to generate, upload, and get the URL.
        const result = await generatePdf({ formData, pdfType });
        
        if (!result || !result.pdfUrl) {
            throw new Error("PDF generation or upload failed on the server.");
        }

        // Step 2: Open the public Firebase Storage URL in a new tab.
        // Modern browsers will show a PDF viewer with print/download options.
        window.open(result.pdfUrl, '_blank');

    } catch (error: any) {
        console.error("Error in generateAndHandlePdf:", error);
        
        // Provide a more specific error message for permission issues.
        if (error.message && (error.message.includes('storage/unauthorized') || error.message.includes('403'))) {
            throw new Error(
                "PDF Upload Failed (403): This is a permissions issue. " +
                "Please check your Firebase Storage security rules to allow writes to the 'generated-pdfs/' path. " +
                "Original error: " + error.message
            );
        }

        throw error;
    }
}
