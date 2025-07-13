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
  prompt: `Convert the number {{{number}}} to Hungarian words. The output should be capitalized. For example, if the input is 123, the output should be "Egyszázhuszonhárom".`,
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
