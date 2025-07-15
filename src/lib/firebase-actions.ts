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
} from 'firebase/firestore';
import type {
  FormValues,
  SavedJob,
  Seller,
  Witness,
} from '@/lib/definitions';
import { z } from 'zod';
import { SellerSchema, WitnessSchema } from './definitions';

// --- Job Actions ---

export async function saveJob({ formData }: { formData: FormValues }): Promise<{
  success: boolean;
  jobId?: string;
  error?: string;
}> {
  try {
    const docRef = await addDoc(collection(db, 'savedJobs'), {
      formData,
      createdAt: Timestamp.now(),
      rendszam: formData.rendszam || formData.alvazszam,
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

  // Clean up expired jobs first
  const expiredQuery = query(
    collection(db, 'savedJobs'),
    where('createdAt', '<', expiryTimestamp)
  );
  try {
    const expiredSnapshot = await getDocs(expiredQuery);
    const deletePromises = expiredSnapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.warn("Couldn't clean up expired jobs:", error);
  }

  // Fetch valid jobs
  const jobsQuery = query(
    collection(db, 'savedJobs'),
    where('createdAt', '>=', expiryTimestamp),
    orderBy('createdAt', 'desc')
  );
  const jobsSnapshot = await getDocs(jobsQuery);

  return jobsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      formData: data.formData,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      rendszam: data.rendszam,
    } as SavedJob;
  });
}

export async function deleteJob(
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'savedJobs', jobId));
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
      timestamp: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error in saveSeller:', error);
    return { success: false, error: error.message };
  }
}

export async function getSellers(): Promise<Seller[]> {
  const sellersQuery = query(
    collection(db, 'sellers'),
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
      createdAt:
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
      createdAt:
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
