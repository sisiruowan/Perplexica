import prompts from '@/lib/prompts';
import MetaSearchAgent from '@/lib/search/metaSearchAgent';
import crypto from 'crypto';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { EventEmitter } from 'stream';
import {
  chatModelProviders,
  embeddingModelProviders,
  getAvailableChatModelProviders,
  getAvailableEmbeddingModelProviders,
} from '@/lib/providers';
import db from '@/lib/db';
import { chats, messages as messagesSchema } from '@/lib/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { getFileDetails } from '@/lib/utils/files';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import {
  getCustomOpenaiApiKey,
  getCustomOpenaiApiUrl,
  getCustomOpenaiModelName,
} from '@/lib/config';
import { searchHandlers } from '@/lib/search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Message = {
  messageId: string;
  chatId: string;
  content: string;
};

type ChatModel = {
  provider: string;
  name: string;
};

type EmbeddingModel = {
  provider: string;
  name: string;
};

type Body = {
  message: Message;
  optimizationMode: 'speed' | 'balanced' | 'quality';
  focusMode: string;
  history: Array<[string, string]>;
  files: Array<string>;
  chatModel: ChatModel;
  embeddingModel: EmbeddingModel;
  systemInstructions: string;
  youtubeContext?: string;
};

const handleEmitterEvents = async (
  stream: EventEmitter,
  writer: WritableStreamDefaultWriter,
  encoder: TextEncoder,
  aiMessageId: string,
  chatId: string,
) => {
  let recievedMessage = '';
  let sources: any[] = [];

  console.log('[Chat API] Setting up emitter event handlers...');

  stream.on('data', (data) => {
    console.log('[Chat API] Received emitter data:', data);
    const parsedData = JSON.parse(data);
    console.log('[Chat API] Parsed emitter data:', { type: parsedData.type, hasData: !!parsedData.data });
    
    if (parsedData.type === 'response') {
      console.log('[Chat API] Sending response chunk to client:', parsedData.data);
      writer.write(
        encoder.encode(
          JSON.stringify({
            type: 'message',
            data: parsedData.data,
            messageId: aiMessageId,
          }) + '\n',
        ),
      );

      recievedMessage += parsedData.data;
    } else if (parsedData.type === 'sources') {
      console.log('[Chat API] Sending sources to client:', { count: parsedData.data?.length, data: parsedData.data });
      const sourcesPayload = JSON.stringify({
        type: 'sources',
        data: parsedData.data,
        messageId: aiMessageId,
      }) + '\n';
      console.log('[Chat API] Sources payload:', sourcesPayload);
      
      writer.write(encoder.encode(sourcesPayload));

      sources = parsedData.data;
    }
  });
  stream.on('end', () => {
    console.log('[Chat API] Stream ended, sending messageEnd and closing writer');
    writer.write(
      encoder.encode(
        JSON.stringify({
          type: 'messageEnd',
          messageId: aiMessageId,
        }) + '\n',
      ),
    );
    writer.close();

    db.insert(messagesSchema)
      .values({
        content: recievedMessage,
        chatId: chatId,
        messageId: aiMessageId,
        role: 'assistant',
        metadata: JSON.stringify({
          createdAt: new Date(),
          ...(sources && sources.length > 0 && { sources }),
        }),
      })
      .execute();
  });
  stream.on('error', (data) => {
    const parsedData = JSON.parse(data);
    writer.write(
      encoder.encode(
        JSON.stringify({
          type: 'error',
          data: parsedData.data,
        }),
      ),
    );
    writer.close();
  });
  
  stream.on('error', (error) => {
    console.error('[Chat API] Stream error:', error);
    writer.close();
  });
};

const handleHistorySave = async (
  message: Message,
  humanMessageId: string,
  focusMode: string,
  files: string[],
) => {
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, message.chatId),
  });

  if (!chat) {
    await db
      .insert(chats)
      .values({
        id: message.chatId,
        title: message.content,
        createdAt: new Date().toString(),
        focusMode: focusMode,
        files: files.map(getFileDetails),
      })
      .execute();
  }

  const messageExists = await db.query.messages.findFirst({
    where: eq(messagesSchema.messageId, humanMessageId),
  });

  if (!messageExists) {
    await db
      .insert(messagesSchema)
      .values({
        content: message.content,
        chatId: message.chatId,
        messageId: humanMessageId,
        role: 'user',
        metadata: JSON.stringify({
          createdAt: new Date(),
        }),
      })
      .execute();
  } else {
    await db
      .delete(messagesSchema)
      .where(
        and(
          gt(messagesSchema.id, messageExists.id),
          eq(messagesSchema.chatId, message.chatId),
        ),
      )
      .execute();
  }
};

export const POST = async (req: Request) => {
  console.log('[Chat API] ==================== POST REQUEST START ====================');
  console.log('[Chat API] POST request received at:', new Date().toISOString());
  console.log('[Chat API] Request URL:', req.url);
  console.log('[Chat API] Request method:', req.method);
  console.log('[Chat API] Request headers:', Object.fromEntries(req.headers.entries()));
  
  try {
    console.log('[Chat API] About to parse request body...');
    const body = (await req.json()) as Body;
    console.log('[Chat API] ==================== BODY PARSED ====================');
    console.log('[Chat API] Request body parsed successfully:', {
      messageId: body.message?.messageId,
      focusMode: body.focusMode,
      hasContent: !!body.message?.content
    });
    const { message } = body;

    if (message.content === '') {
      return Response.json(
        {
          message: 'Please provide a message to process',
        },
        { status: 400 },
      );
    }

    const [chatModelProviders, embeddingModelProviders] = await Promise.all([
      getAvailableChatModelProviders(),
      getAvailableEmbeddingModelProviders(),
    ]);

    const chatModelProvider =
      chatModelProviders[
        body.chatModel?.provider || Object.keys(chatModelProviders)[0]
      ];
    const chatModel =
      chatModelProvider[
        body.chatModel?.name || Object.keys(chatModelProvider)[0]
      ];

    const embeddingProvider =
      embeddingModelProviders[
        body.embeddingModel?.provider || Object.keys(embeddingModelProviders)[0]
      ];
    const embeddingModel =
      embeddingProvider[
        body.embeddingModel?.name || Object.keys(embeddingProvider)[0]
      ];

    let llm: BaseChatModel | undefined;
    let embedding = embeddingModel.model;

    if (body.chatModel?.provider === 'custom_openai') {
      llm = new ChatOpenAI({
        apiKey: getCustomOpenaiApiKey(),
        modelName: getCustomOpenaiModelName(),
        temperature: 0.7,
        configuration: {
          baseURL: getCustomOpenaiApiUrl(),
        },
      }) as unknown as BaseChatModel;
    } else if (chatModelProvider && chatModel) {
      llm = chatModel.model;
    }

    if (!llm) {
      return Response.json({ error: 'Invalid chat model' }, { status: 400 });
    }

    if (!embedding) {
      return Response.json(
        { error: 'Invalid embedding model' },
        { status: 400 },
      );
    }

    const humanMessageId =
      message.messageId ?? crypto.randomBytes(7).toString('hex');
    const aiMessageId = crypto.randomBytes(7).toString('hex');

    const history: BaseMessage[] = body.history.map((msg) => {
      if (msg[0] === 'human') {
        return new HumanMessage({
          content: msg[1],
        });
      } else {
        return new AIMessage({
          content: msg[1],
        });
      }
    });

    console.log('[Chat API] Request body focusMode:', body.focusMode);
    console.log('[Chat API] Request body message:', body.message?.content);
    console.log('[Chat API] Available handlers:', Object.keys(searchHandlers));
    
    const handler = searchHandlers[body.focusMode];
    console.log('[Chat API] Handler found:', !!handler);
    console.log('[Chat API] Handler type:', handler ? Object.getPrototypeOf(handler).constructor.name : 'undefined');

    if (!handler) {
      return Response.json(
        {
          message: 'Invalid focus mode',
        },
        { status: 400 },
      );
    }

    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    // Send an immediate response to establish the stream connection
    console.log('[Chat API] Sending initial stream response...');
    writer.write(
      encoder.encode(
        JSON.stringify({
          type: 'status',
          data: 'Connected',
          messageId: aiMessageId,
        }) + '\n',
      ),
    );

    // Start the search process and get the event emitter immediately
    console.log('[Chat API] Starting search and getting emitter...');
    const stream = await handler.searchAndAnswer(
      message.content,
      history,
      llm,
      embedding,
      body.optimizationMode,
      body.files,
      body.systemInstructions,
      body.youtubeContext,
    );

    // Set up event handlers immediately after getting the emitter
    console.log('[Chat API] Setting up emitter event handlers...');
    handleEmitterEvents(stream, writer, encoder, aiMessageId, message.chatId);
    
    // Start history save process
    handleHistorySave(message, humanMessageId, body.focusMode, body.files);

    const response = new Response(responseStream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
    
    console.log('[Chat API] ==================== RESPONSE CREATED ====================');
    console.log('[Chat API] Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('[Chat API] Response body type:', typeof response.body);
    console.log('[Chat API] Returning response...');
    
    return response;
  } catch (err) {
    console.error('[Chat API] Error occurred:', err);
    console.error('[Chat API] Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    
    const errorResponse = Response.json(
      { message: 'An error occurred while processing chat request' },
      { status: 500 },
    );
    
    console.log('[Chat API] Returning error response:', errorResponse);
    return errorResponse;
  }
};
