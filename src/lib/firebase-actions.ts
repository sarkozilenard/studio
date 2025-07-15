// @/lib/firebase-actions.ts
'use client';

import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import type {
  FormValues,
  SavedJob,
  Seller,
  Witness,
} from '@/lib/definitions';
import { z } from 'zod';
import { SellerSchema, WitnessSchema } from './definitions';

// --- Job Actions (using a workaround via the 'sellers' collection) ---

export async function saveJob({ formData }: { formData: FormValues }): Promise<{
  success: boolean;
  jobId?: string;
  error?: string;
}> {
  try {
    const formDataJson = JSON.stringify(formData);

    // WORKAROUND: Save jobs into the 'sellers' collection with a special flag.
    // This avoids the permission error on the 'savedJobs' collection.
    const docRef = await addDoc(collection(db, 'sellers'), {
      isJob: true, // Flag to identify this document as a job
      formDataJson,
      createdAt: Timestamp.now(),
      // Use rendszam or alvazszam for display name, similar to how sellers have a 'name'
      name: formData.rendszam || formData.alvazszam || 'Ismeretlen Munka', 
      timestamp: serverTimestamp(),
    });
    return { success: true, jobId: docRef.id };
  } catch (error: any) {
    console.error('Error in saveJob:', error);
    return { success: false, error: error.message };
  }
}

export async function getSavedJobs(): Promise<SavedJob[]> {
  const EXPIRY_HOURS = 48;
  const now = Timestamp.now();
  const expiryDate = new Date(now.toMillis() - EXPIRY_HOURS * 60 * 60 * 1000);
  const expiryTimestamp = Timestamp.fromDate(expiryDate);

  // Query for documents that are jobs
  const jobsQuery = query(
    collection(db, 'sellers'),
    where('isJob', '==', true),
    orderBy('createdAt', 'desc')
  );
  
  const jobsSnapshot = await getDocs(jobsQuery);
  const jobs: SavedJob[] = [];
  const expiredJobIds: string[] = [];

  jobsSnapshot.forEach((doc) => {
    const data = doc.data();
    const createdAt = data.createdAt as Timestamp;

    if (createdAt && createdAt < expiryTimestamp) {
      // Collect expired jobs for deletion
      expiredJobIds.push(doc.id);
    } else {
      // This is a valid, non-expired job
      const formData = JSON.parse(data.formDataJson);
      jobs.push({
        id: doc.id,
        formData: formData,
        createdAt: createdAt.toDate().toISOString(),
        rendszam: formData.rendszam || data.name,
      });
    }
  });

  // Batch delete expired jobs
  if (expiredJobIds.length > 0) {
    try {
      const batch = writeBatch(db);
      expiredJobIds.forEach((id) => {
        batch.delete(doc(db, 'sellers', id));
      });
      await batch.commit();
    } catch (error) {
       console.warn("Couldn't clean up expired jobs:", error);
    }
  }

  return jobs;
}


export async function deleteJob(
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Jobs are stored in the 'sellers' collection, so we delete from there.
    await deleteDoc(doc(db, 'sellers', jobId));
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting job:', error);
    return { success: false, error: error.message };
  }
}


// --- Person Actions ---
const SaveSellerInputSchema = SellerSchema.omit({ id: true, timestamp: true });
const SaveWitnessInputSchema = WitnessSchema.omit({ id: true, timestamp: true });

export async function saveSeller(
  sellerData: z.infer<typeof SaveSellerInputSchema>
) {
  try {
    await addDoc(collection(db, 'sellers'), {
      ...sellerData,
      isJob: false, // Explicitly mark as not a job
      timestamp: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error in saveSeller:', error);
    return { success: false, error: error.message };
  }
}

export async function getSellers(): Promise<Seller[]> {
  // Filter out the documents that are actually jobs
  const sellersQuery = query(
    collection(db, 'sellers'),
    where('isJob', '==', false),
    orderBy('timestamp', 'desc')
  );
  const sellersSnapshot = await getDocs(sellersQuery);
  return sellersSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      kepviseloName: data.kepviseloName || '',
      documentNumber: data.documentNumber || '',
      address: data.address,
      timestamp:
        (data.timestamp as Timestamp)?.toDate().toISOString() ||
        new Date().toISOString(),
    } as Seller;
  });
}

export async function saveWitness(
  witnessData: z.infer<typeof SaveWitnessInputSchema>
) {
  try {
    await addDoc(collection(db, 'witnesses'), {
      ...witnessData,
      timestamp: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error in saveWitness:', error);
    return { success: false, error: error.message };
  }
}

export async function getWitnesses(): Promise<Witness[]> {
  const witnessesQuery = query(
    collection(db, 'witnesses'),
    orderBy('timestamp', 'desc')
  );
  const witnessesSnapshot = await getDocs(witnessesQuery);
  return witnessesSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      address: data.address,
      idNumber: data.idNumber,
      timestamp:
        (data.timestamp as Timestamp)?.toDate().toISOString() ||
        new Date().toISOString(),
    } as Witness;
  });
}

export async function deletePerson(
  collectionName: 'sellers' | 'witnesses',
  id: string
) {
  try {
    await deleteDoc(doc(db, collectionName, id));
    return { success: true };
  } catch (error: any)
{
    console.error(`Error deleting from ${collectionName}:`, error);
    return { success: false, error: error.message };
  }
}
