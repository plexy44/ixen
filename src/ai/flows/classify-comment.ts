'use server';

/**
 * @fileOverview Classifies TikTok live stream comments into categories.
 *
 * - classifyComment - A function that classifies a comment.
 * - ClassifyCommentInput - The input type for the classifyComment function.
 * - ClassifyCommentOutput - The return type for the classifyComment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClassifyCommentInputSchema = z.object({
  comment: z.string().describe('The comment to classify.'),
});
export type ClassifyCommentInput = z.infer<typeof ClassifyCommentInputSchema>;

const ClassifyCommentOutputSchema = z.object({
  category: z
    .enum(['Purchase Intent', 'Question', 'General'])
    .describe('The category of the comment.'),
});
export type ClassifyCommentOutput = z.infer<typeof ClassifyCommentOutputSchema>;

export async function classifyComment(input: ClassifyCommentInput): Promise<ClassifyCommentOutput> {
  return classifyCommentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'classifyCommentPrompt',
  input: {schema: ClassifyCommentInputSchema},
  output: {schema: ClassifyCommentOutputSchema},
  prompt: `You are an AI assistant that classifies TikTok live stream comments into one of the following categories: "Purchase Intent", "Question", or "General".

  Comment: {{{comment}}}

  Category:`,
});

const classifyCommentFlow = ai.defineFlow(
  {
    name: 'classifyCommentFlow',
    inputSchema: ClassifyCommentInputSchema,
    outputSchema: ClassifyCommentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
