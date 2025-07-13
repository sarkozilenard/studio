'use client';
import type { FormValues } from './definitions';
import { generatePdf } from '@/ai/flows/generate-pdf-flow';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

function base64ToBlob(base64: string, contentType = 'application/pdf'): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
}


/**
 * Generates a PDF on the server, uploads it to Firebase Storage from the client,
 * and then opens the returned public URL.
 * @param formData The form data from the user.
 * @param pdfType The type of PDF to generate.
 * @param action The action to perform (download or print).
 */
export async function generateAndHandlePdf(
    formData: FormValues, 
    pdfType: 'main' | 'kellekszavatossag' | 'meghatalmazas' | 'all',
    action: 'download' | 'print'
) {
    try {
        // Step 1: Call the server flow to generate the PDF data.
        const result = await generatePdf({ formData, pdfType });
        
        if (!result || !result.pdfBase64 || !result.filename) {
            throw new Error("PDF generation failed on the server.");
        }

        // Step 2: Convert Base64 to Blob on the client.
        const pdfBlob = base64ToBlob(result.pdfBase64);
        
        // Step 3: Upload the Blob to Firebase Storage.
        const storageRef = ref(storage, `generated-pdfs/${result.filename}`);
        const snapshot = await uploadBytes(storageRef, pdfBlob);

        // Step 4: Get the public download URL.
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Step 5: Open the URL in a new tab.
        // Modern browsers will show a PDF viewer with print/download options.
        window.open(downloadURL, '_blank');

    } catch (error: any) {
        console.error("Error in generateAndHandlePdf:", error);
        
        // Provide a more specific error message for common issues.
        if (error.code && error.code.includes('storage/unauthorized')) {
            throw new Error(
                "PDF Upload Failed: Permission denied. Please check your Firebase Storage security rules to allow writes from authenticated users."
            );
        }
        if (error.code && error.code.includes('storage/object-not-found')) {
             throw new Error(
                "PDF Upload Failed: The storage bucket was not found. Please ensure Firebase Storage is set up correctly."
            );
        }
        
        throw error;
    }
}
