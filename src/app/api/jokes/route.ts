import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import {
  chatModelProviders,
  getAvailableChatModelProviders,
} from '@/lib/providers';
import {
  getCustomOpenaiApiKey,
  getCustomOpenaiApiUrl,
  getCustomOpenaiModelName,
} from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  content: string;
  context?: string;
};

const createJokePrompt = (content: string, context?: string) => {
  const basePrompt = `You are Clippy, the helpful and humorous Microsoft Office assistant. Generate a funny, family-friendly joke related to the following content. The joke should be witty, clever, and appropriate for all audiences. Keep it short (1-2 sentences) and make it relevant to the content provided.

Content to base the joke on: "${content}"`;

  if (context) {
    return basePrompt + `\n\nAdditional context: "${context}"`;
  }

  return basePrompt + `\n\nGenerate a joke that's relevant to this content. Be creative and make it genuinely funny!`;
};

export async function POST(req: NextRequest) {
  try {
    const body: Body = await req.json();
    const { content, context } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required to generate a joke' },
        { status: 400 }
      );
    }

    // Get available chat model providers
    const availableProviders = await getAvailableChatModelProviders();
    
    if (Object.keys(availableProviders).length === 0) {
      return NextResponse.json(
        { error: 'No chat model providers available' },
        { status: 500 }
      );
    }

    // Use the first available provider
    const providerName = Object.keys(availableProviders)[0];
    const providerModels = availableProviders[providerName];
    const modelName = Object.keys(providerModels)[0];
    const provider = { provider: providerName, model: modelName };
    let chatModel;

    try {
      // Try to get custom OpenAI configuration first
      const customApiKey = getCustomOpenaiApiKey();
      const customApiUrl = getCustomOpenaiApiUrl();
      const customModelName = getCustomOpenaiModelName();

      if (customApiKey && customModelName) {
        chatModel = new ChatOpenAI({
          openAIApiKey: customApiKey,
          modelName: customModelName,
          configuration: customApiUrl ? { baseURL: customApiUrl } : undefined,
          temperature: 0.8, // Higher temperature for more creative jokes
        });
      } else {
        // Fall back to configured providers
        const chatModelProvider = availableProviders[provider.provider];
        if (!chatModelProvider) {
          throw new Error(`Provider ${provider.provider} not found`);
        }

        const modelConfig = chatModelProvider[provider.model];
        if (!modelConfig) {
          throw new Error(`Model ${provider.model} not found in provider ${provider.provider}`);
        }

        chatModel = modelConfig.model;
      }
    } catch (error) {
      console.error('Error creating chat model:', error);
      return NextResponse.json(
        { error: 'Failed to initialize AI model' },
        { status: 500 }
      );
    }

    // Generate the joke
    const prompt = createJokePrompt(content, context);
    const message = new HumanMessage(prompt);

    try {
      const response = await chatModel.invoke([message]);
      const joke = response.content.toString().trim();

      // Clean up the joke (remove quotes, extra formatting)
      const cleanJoke = joke
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .replace(/^\*\*|\*\*$/g, '') // Remove bold formatting
        .trim();

      return NextResponse.json({ joke: cleanJoke });
    } catch (error) {
      console.error('Error generating joke:', error);
      return NextResponse.json(
        { error: 'Failed to generate joke' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in jokes API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
