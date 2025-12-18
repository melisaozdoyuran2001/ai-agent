import { Request, Response } from 'express';
import { OpenAI } from 'openai';  

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  
});

export const contextHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.query;
    if (typeof query !== 'string' || query.trim() === '') {
      console.log('[context] Invalid query parameter');
      res.status(400).json({
        message: "A valid 'query' string parameter is required in the URL",
      });
      return;
    }

    console.log(`[context] Processing query: "${query}"`);

    // Call OpenAI's GPT-4 or GPT-3.5 model for text completion based on the query
    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-4',  // Use GPT-4 or GPT-3.5 depending on your requirement
      messages: [
        {
          role: 'system',
          content: "You are a helpful assistant.",
        },
        {
          role: 'user',
          content: query, // Send the user query here
        },
      ],
    });

    const responseText = gptResponse.choices[0].message.content;

    // Check for "sign up" or "sign in" phrases in the original query (if you still want to send an image)
    const imageUrl = /(?:\bsign up\b|\bsign in\b)/i.test(query) 
      ? '/sign-in.png' 
      : null;

    // Respond with the OpenAI model's content and optionally the image URL
    res.status(200).json({
      message: responseText,
      imageUrl: imageUrl,
    });
  } catch (error) {
    console.error('[context] Error:', error);
    res.status(500).json({
      message: (error as Error).message,
    });
  }
};
