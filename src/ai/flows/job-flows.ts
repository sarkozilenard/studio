// @/ai/flows/job-flows.ts
'use server';
/**
 * @fileOverview Manages saving and retrieving job data from Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, Timestamp, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { 
    SaveJobInputSchema, 
    SaveJobOutputSchema, 
    GetSavedJobsOutputSchema, 
    DeleteJobInputSchema,
    type SaveJobInput,
    type SaveJobOutput,
    type DeleteJobInput
} from '@/lib/definitions';

// Flow to save a job
const saveJobFlow = ai.defineFlow(
  {
    name: 'saveJobFlow',
    inputSchema: SaveJobInputSchema,
    outputSchema: SaveJobOutputSchema,
  },
  async ({ formData }) => {
    try {
      const docRef = await addDoc(collection(db, "savedJobs"), {
        formData,
        createdAt: Timestamp.now(),
        rendszam: formData.rendszam || formData.alvazszam,
      });
      return { success: true, jobId: docRef.id };
    } catch (error: any) {
      console.error("Error in saveJobFlow:", error);
      return { success: false, error: error.message };
    }
  }
);

// Flow to get saved jobs
const getSavedJobsFlow = ai.defineFlow(
  {
    name: 'getSavedJobsFlow',
    outputSchema: GetSavedJobsOutputSchema,
  },
  async () => {
    const EXPIRY_HOURS = 48;
    const now = Timestamp.now();
    const expiryDate = new Date(now.toMillis() - EXPIRY_HOURS * 60 * 60 * 1000);
    const expiryTimestamp = Timestamp.fromDate(expiryDate);
    
    // Clean up expired jobs first
    const expiredQuery = query(collection(db, "savedJobs"), where("createdAt", "<", expiryTimestamp));
    const expiredSnapshot = await getDocs(expiredQuery);
    const deletePromises = expiredSnapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    // Fetch valid jobs
    const jobsQuery = query(collection(db, "savedJobs"), where("createdAt", ">=", expiryTimestamp), orderBy("createdAt", "desc"));
    const jobsSnapshot = await getDocs(jobsQuery);
    
    const jobs = jobsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            formData: data.formData,
            // Convert Firestore Timestamp to a serializable format (ISO string)
            createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
            rendszam: data.rendszam,
        };
    });

    return { jobs };
  }
);

// Flow to delete a job
const deleteJobFlow = ai.defineFlow(
  {
    name: 'deleteJobFlow',
    inputSchema: DeleteJobInputSchema,
    outputSchema: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  async ({ jobId }) => {
    try {
      await deleteDoc(doc(db, "savedJobs", jobId));
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting job:", error);
      return { success: false, error: error.message };
    }
  }
);

// Exported functions for client-side use
export async function saveJob(input: SaveJobInput): Promise<SaveJobOutput> {
  return saveJobFlow(input);
}

export async function getSavedJobs() {
  return getSavedJobsFlow();
}

export async function deleteJob(input: DeleteJobInput) {
  return deleteJobFlow(input);
}
