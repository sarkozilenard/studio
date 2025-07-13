'use server';
/**
 * @fileOverview Converts a numerical value to its word equivalent.
 *
 * - convertNumberToWords - A function that converts a number to words.
 * - ConvertNumberToWordsInput - The input type for the convertNumberToWords function.
 * - ConvertNumberToWordsOutput - The return type for the convertNumberToWords function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const ConvertNumberToWordsInputSchema = z.object({
  number: z.number().describe('The numerical value to convert to words.'),
});
export type ConvertNumberToWordsInput = z.infer<typeof ConvertNumberToWordsInputSchema>;

const ConvertNumberToWordsOutputSchema = z.object({
  words: z.string().describe('The word equivalent of the number.'),
});
export type ConvertNumberToWordsOutput = z.infer<typeof ConvertNumberToWordsOutputSchema>;

export async function convertNumberToWords(input: ConvertNumberToWordsInput): Promise<ConvertNumberToWordsOutput> {
  return convertNumberToWordsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'convertNumberToWordsPrompt',
  input: {schema: ConvertNumberToWordsInputSchema},
  output: {schema: ConvertNumberToWordsOutputSchema},
  prompt: `You are an expert assistant that converts numbers into their Hungarian word equivalents, specifically for legal documents. Your output must be precise and follow Hungarian orthography rules for numbers.

Your task is to convert the number {{{number}}} into its Hungarian text equivalent.

Follow these rules strictly:
1.  The entire output must be capitalized.
2.  Numbers up to and including 2000 are written as a single word.
3.  For numbers above 2000, group them in threes from the right, separating the groups with a hyphen (-).
4.  Exception: If a number is a round multiple of a thousand (e.g., 200000, 3000000), it should be written as a single word without a hyphen.
5.  Do not use spaces in the output.

Here are some examples demonstrating the rules:
- Input: 123, Output: EGYSZÁZHUSZONHÁROM
- Input: 2000, Output: KETTŐEZER
- Input: 2005, Output: KÉTEZER-ÖT
- Input: 4360, Output: NÉGYEZER-HÁROMSZÁZHATVAN
- Input: 15550, Output: TIZENÖTEZER-ÖTSZÁZÖTVEN
- Input: 63017, Output: HATVANHÁROMEZER-TIZENHÉT
- Input: 200000, Output: KÉTSZÁZEZER
- Input: 458321, Output: NÉGYSZÁZÖTVENNYOLCEZER-HÁROMSZÁZHUSZONEGY

Now, convert the number {{{number}}}.`,
});

const convertNumberToWordsFlow = ai.defineFlow(
  {
    name: 'convertNumberToWordsFlow',
    inputSchema: ConvertNumberToWordsInputSchema,
    outputSchema: ConvertNumberToWordsOutputSchema,
  },
  async input => {
    try {
        const {output} = await prompt(input, {
            model: googleAI.model('gemini-1.5-flash-latest'),
        });
        if (!output) {
          throw new Error('AI model returned empty output.');
        }
        return output;
    } catch (error) {
        console.error('Error in convertNumberToWordsFlow:', error);
        // Return a safe fallback or re-throw a more specific error
        return { words: 'HIBA AZ ÁTÍRÁS SORÁN' };
    }
  }
);
