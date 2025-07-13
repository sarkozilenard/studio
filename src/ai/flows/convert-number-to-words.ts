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
  prompt: `You are a helpful assistant that converts numbers into Hungarian words for legal documents.
Your task is to convert the number {{{number}}} into its Hungarian text equivalent.

Follow these rules strictly:
1.  The entire output must be a single, continuous word. Do not use spaces.
2.  The entire output must be capitalized.
3.  The output must be in Hungarian.

Here are some examples:
- Input: 123, Output: EGYszázhuszonhárom
- Input: 2500, Output: KETTŐEZER-ÖTSZÁZ
- Input: 15550, Output: TIZENÖTEZER-ÖTSZÁZÖTVEN
- Input: 458321, Output: NÉGYSZÁZÖTVENNYOLCEZER-HÁROMSZÁZHUSZONEGY

Convert the number {{{number}}}.`,
});

const convertNumberToWordsFlow = ai.defineFlow(
  {
    name: 'convertNumberToWordsFlow',
    inputSchema: ConvertNumberToWordsInputSchema,
    outputSchema: ConvertNumberToWordsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input, {
        model: googleAI.model('gemini-1.5-flash-latest'),
      });
    return output!;
  }
);
