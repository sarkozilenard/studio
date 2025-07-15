// @/lib/firebase-actions.ts
'use client';

import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  Timestamp,
  orderBy,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
  where,
} from 'firebase/firestore';
import type {
  FormValues,
  SavedJob,
  Seller,
  Witness,
} from '@/lib/definitions';
import { z } from 'zod';
import { SellerSchema, WitnessSchema } from './definitions';

// --- Combined Actions for Sellers and Jobs ---

export async function saveJob({ formData }: { formData: FormValues }): Promise<{
  success: boolean;
  jobId?: string;
  error?: string;
}> {
  try {
    const formDataJson = JSON.stringify(formData);

    const docRef = await addDoc(collection(db, 'sellers'), {
      isJob: true,
      formDataJson,
      createdAt: Timestamp.now(),
      name: formData.rendszam || formData.alvazszam || 'Ismeretlen Munka', 
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
  
  const allDocsQuery = query(collection(db, 'sellers'));
  const allDocsSnapshot = await getDocs(allDocsQuery);
  const jobs: SavedJob[] = [];
  const expiredJobIds: string[] = [];

  allDocsSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.isJob === true) {
      const createdAt = data.createdAt as Timestamp;
      if (createdAt && createdAt.toMillis() < expiryTimestamp.toMillis()) {
        expiredJobIds.push(doc.id);
      } else {
        const formData = JSON.parse(data.formDataJson);
        jobs.push({
          id: doc.id,
          formData: formData,
          createdAt: createdAt ? createdAt.toDate().toISOString() : new Date().toISOString(),
          rendszam: formData.rendszam || data.name,
        });
      }
    }
  });

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

  // Sort client-side
  return jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function deleteJob(
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  try {
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
      isJob: false,
      timestamp: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error in saveSeller:', error);
    return { success: false, error: error.message };
  }
}

export async function getSellers(): Promise<Seller[]> {
  const allDocsQuery = query(collection(db, 'sellers'));
  const allDocsSnapshot = await getDocs(allDocsQuery);
  const sellers: Seller[] = [];

  allDocsSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.isJob !== true) {
       sellers.push({
          id: doc.id,
          name: data.name,
          kepviseloName: data.kepviseloName || '',
          documentNumber: data.documentNumber || '',
          address: data.address,
          timestamp: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
       });
    }
  });

  // Sort client-side
  return sellers.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
  const witnessesQuery = query(collection(db, 'witnesses'));
  const witnessesSnapshot = await getDocs(witnessesQuery);
  const witnesses = witnessesSnapshot.docs.map((doc) => {
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
  // Sort client-side
  return witnesses.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function deletePerson(
  collectionName: 'sellers' | 'witnesses',
  id: string
) {
  try {
    await deleteDoc(doc(db, collectionName, id));
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting from ${collectionName}:`, error);
    return { success: false, error: error.message };
  }
}
