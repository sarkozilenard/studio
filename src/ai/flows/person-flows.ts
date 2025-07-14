'use server';
/**
 * @fileOverview Manages saving, retrieving, and deleting person data (sellers, witnesses) from Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { 
    SellerSchema,
    WitnessSchema,
    type Seller,
    type Witness
} from '@/lib/definitions';

// Schemas
const SaveSellerInputSchema = SellerSchema.omit({ id: true, timestamp: true });
const SaveWitnessInputSchema = WitnessSchema.omit({ id: true, timestamp: true });
const DeletePersonInputSchema = z.object({ id: z.string(), collectionName: z.enum(['sellers', 'witnesses']) });

const GetSellersOutputSchema = z.object({ sellers: z.array(SellerSchema.extend({ createdAt: z.string() })) });
const GetWitnessesOutputSchema = z.object({ witnesses: z.array(WitnessSchema.extend({ createdAt: z.string() })) });

const GenericSuccessOutputSchema = z.object({ success: z.boolean(), error: z.string().optional() });


// --- Sellers Flow ---
const saveSellerFlow = ai.defineFlow(
  {
    name: 'saveSellerFlow',
    inputSchema: SaveSellerInputSchema,
    outputSchema: GenericSuccessOutputSchema,
  },
  async (sellerData) => {
    try {
      await addDoc(collection(db, "sellers"), { ...sellerData, timestamp: serverTimestamp() });
      return { success: true };
    } catch (error: any) {
      console.error("Error in saveSellerFlow:", error);
      return { success: false, error: error.message };
    }
  }
);

const getSellersFlow = ai.defineFlow(
  {
    name: 'getSellersFlow',
    outputSchema: GetSellersOutputSchema,
  },
  async () => {
    const sellersQuery = query(collection(db, "sellers"), orderBy("timestamp", "desc"));
    const sellersSnapshot = await getDocs(sellersQuery);
    const sellers = sellersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            kepviseloName: data.kepviseloName || '',
            documentNumber: data.documentNumber || '',
            address: data.address,
            // Convert Firestore Timestamp to a serializable format (ISO string)
            createdAt: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        };
    });
    return { sellers };
  }
);


// --- Witnesses Flow ---
const saveWitnessFlow = ai.defineFlow(
  {
    name: 'saveWitnessFlow',
    inputSchema: SaveWitnessInputSchema,
    outputSchema: GenericSuccessOutputSchema,
  },
  async (witnessData) => {
    try {
      await addDoc(collection(db, "witnesses"), { ...witnessData, timestamp: serverTimestamp() });
      return { success: true };
    } catch (error: any) {
      console.error("Error in saveWitnessFlow:", error);
      return { success: false, error: error.message };
    }
  }
);

const getWitnessesFlow = ai.defineFlow(
  {
    name: 'getWitnessesFlow',
    outputSchema: GetWitnessesOutputSchema,
  },
  async () => {
    const witnessesQuery = query(collection(db, "witnesses"), orderBy("timestamp", "desc"));
    const witnessesSnapshot = await getDocs(witnessesQuery);
    const witnesses = witnessesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            address: data.address,
            idNumber: data.idNumber,
             // Convert Firestore Timestamp to a serializable format (ISO string)
            createdAt: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        };
    });
    return { witnesses };
  }
);

// --- Delete Flow ---
const deletePersonFlow = ai.defineFlow(
  {
    name: 'deletePersonFlow',
    inputSchema: DeletePersonInputSchema,
    outputSchema: GenericSuccessOutputSchema,
  },
  async ({ id, collectionName }) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
      return { success: true };
    } catch (error: any) {
      console.error(`Error deleting from ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  }
);


// Exported functions
export async function saveSeller(input: z.infer<typeof SaveSellerInputSchema>) {
    return saveSellerFlow(input);
}
export async function getSellers() {
    return getSellersFlow();
}

export async function saveWitness(input: z.infer<typeof SaveWitnessInputSchema>) {
    return saveWitnessFlow(input);
}
export async function getWitnesses() {
    return getWitnessesFlow();
}

export async function deletePerson(input: { id: string; collectionName: 'sellers' | 'witnesses' }) {
    return deletePersonFlow(input);
}
