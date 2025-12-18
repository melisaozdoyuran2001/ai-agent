import { Request, Response } from 'express';
import { MetadataMode } from 'llamaindex';
import { getDataSource } from './engine';
import { extractText } from '@llamaindex/core/utils';
import {
  PromptTemplate,
  type ContextSystemPrompt,
} from '@llamaindex/core/prompts';
import { createMessageContent } from '@llamaindex/core/response-synthesizers';
import { OpenAI } from 'openai';  // Import OpenAI package
import { initSettings } from './engine/settings';
import dotenv from 'dotenv';
dotenv.config();

initSettings();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  
});

export const contextHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.query;
    const isChatMode = req.query.isChatMode === 'true';  // Check if chat mode is enabled

    if (typeof query !== 'string' || query.trim() === '') {
      console.log('[context] Invalid query parameter');
      res.status(400).json({
        message: "A valid 'query' string parameter is required in the URL",
      });
      return;
    }

    console.log(`[context] Processing query: "${query}"`);

    // Retrieve the context from RAG (retrieving relevant context based on the query)
    const index = await getDataSource();
    if (!index) {
      throw new Error(
        `StorageContext is empty - run 'npm run generate' to create the storage first`
      );
    }

    const retriever = index.asRetriever();
    const nodes = await retriever.retrieve({ query });
    console.log(`[context] Retrieved ${nodes.length} nodes`);

    // Generate prompt with retrieved context
    const prompt: ContextSystemPrompt = new PromptTemplate({
      templateVars: ['context'],
      template: `You are a customer service agent for  Acme Bank, giving friendly, conversational, to-the-point answers to users' questions about the product. Use the following context to improve your answer:
---------------------
{context}
---------------------`,
    });

    // Create message content based on retrieved context
    const content = await createMessageContent(
      prompt as any,
      nodes.map((r) => r.node),  // Use the retrieved context
      undefined,
      MetadataMode.LLM
    );

    const extractedText = extractText(content);

    // If in chat mode, send the query + context to OpenAI (GPT) and generate the final response
    let finalResponse = extractedText; // Default response from RAG
    let imageUrl = null;

    // Check for "sign up" or "sign in" in the query (transcribed text)
    if (/(?:\bsign up\b|\bsign in\b)/i.test(query)) {
      imageUrl = '/sign-in.png';  // Optional image to be sent in response
    }

    if (isChatMode) {
      // Send the extracted context and the original query to OpenAI to generate a final response
      const gptResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-0125', 
        messages: [
          {
            role: 'system',
            content: "You are a helpful assistant.",
          },
          {
            role: 'user',
            content: query, 
          },
          {
            role: 'system',
            content: `Context: ${extractedText}`,  // Send the RAG-extracted context
          },
        ],
      });

      const gptContent = gptResponse.choices[0].message.content;
      finalResponse = gptContent ?? extractedText;  // Fallback to extracted text if GPT response is null
    }

    // Respond with the generated message (from RAG or GPT) and optionally the image URL
    res.status(200).json({
      message: finalResponse,
      imageUrl: imageUrl,
    });
  } catch (error) {
    console.error('[context] Error:', error);
    res.status(500).json({
      message: (error as Error).message,
    });
  }
};
