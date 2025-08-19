import { 
  detectYouTubeUrls, 
  extractYouTubeTranscript, 
  youTubeTranscriptToDocument,
  YouTubeTranscriptResult
} from '../youtube/transcriptExtractor';
import { Document } from 'langchain/document';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';
import { BaseMessage } from '@langchain/core/messages';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import {
  RunnableSequence,
  RunnableMap,
  RunnableLambda,
} from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import formatChatHistoryAsString from '../utils/formatHistory';
import eventEmitter from 'events';
import prompts from '../prompts';
import type { MetaSearchAgentType } from './metaSearchAgent';

interface Config {
  activeEngines: string[];
  queryGeneratorPrompt: string;
  responsePrompt: string;
  rerank: boolean;
  rerankThreshold: number;
  searchWeb: boolean;
  summarizer: boolean;
}

type BasicChainInput = {
  chat_history: BaseMessage[];
  query: string;
};

export class YouTubeTranscriptAgent implements MetaSearchAgentType {
  private config: Config;
  private strParser = new StringOutputParser();

  constructor(config: Config) {
    this.config = config;
  }

  async searchAndAnswer(
    message: string,
    history: BaseMessage[],
    llm: BaseChatModel,
    embeddings: Embeddings,
    optimizationMode: 'speed' | 'balanced' | 'quality',
    fileIds: string[],
    systemInstructions: string,
  ): Promise<eventEmitter> {
    const emitter = new eventEmitter();
    
    try {
      // Detect YouTube URLs in the message
      const youtubeUrls = detectYouTubeUrls(message);
      
      if (youtubeUrls.length > 0) {
        // Process YouTube URLs
        const transcriptResults: YouTubeTranscriptResult[] = [];
        const documents: Document[] = [];
        
        for (const url of youtubeUrls) {
          try {
            const result = await extractYouTubeTranscript(url);
            transcriptResults.push(result);
            
            if (!result.error) {
              // Convert transcript to document
              const doc = youTubeTranscriptToDocument(result);
              documents.push(doc);
            }
          } catch (error: any) {
            console.error(`Error processing ${url}:`, error);
          }
        }
        
        if (documents.length > 0) {
          // Create a response chain
          const basicYouTubeChain = RunnableSequence.from([
            RunnableMap.from({
              context: () => documents.map(doc => doc.pageContent).join('\n\n'),
              chat_history: (input: BasicChainInput) => input.chat_history,
              query: (input: BasicChainInput) => input.query,
              systemInstructions: () => systemInstructions,
              date: () => new Date().toISOString(),
            }),
            ChatPromptTemplate.fromTemplate(prompts.youtubeTranscriptResponsePrompt),
            llm,
            this.strParser,
          ]).withConfig({
            runName: 'YouTubeTranscriptResponseChain',
          });

          // Process the query
          const processedMessage = message.replace(/https?:\/\/[^\s]+/g, '').trim() || 
            'Please summarize the key points from this YouTube video and answer any questions about it.';

          const stream = await basicYouTubeChain.streamEvents(
            {
              chat_history: history,
              query: processedMessage,
            },
            {
              version: 'v2',
            },
          );

          // Emit sources first
          const sources = transcriptResults
            .filter(r => !r.error)
            .map((result) => ({
              pageContent: result.fullText,
              metadata: {
                title: result.videoInfo.title,
                url: result.videoInfo.url,
                thumbnail: result.videoInfo.thumbnail,
                author: result.videoInfo.author,
                type: 'youtube',
                videoId: result.videoInfo.videoId,
                transcriptLength: result.transcript.length,
                transcript: result.transcript, // Include full transcript data
                transcriptData: result.transcript // Alternative property name
              }
            }));
          
          emitter.emit('data', JSON.stringify({ 
            type: 'sources', 
            data: sources 
          }));

          // Stream the response
          for await (const event of stream) {
            if (
              event.event === 'on_chain_stream' &&
              event.name === 'YouTubeTranscriptResponseChain'
            ) {
              emitter.emit(
                'data',
                JSON.stringify({ type: 'response', data: event.data?.chunk }),
              );
            }

            if (
              event.event === 'on_chain_end' &&
              event.name === 'YouTubeTranscriptResponseChain'
            ) {
              emitter.emit('end');
            }
          }
        } else {
          // No valid transcripts found
          emitter.emit('data', JSON.stringify({ 
            type: 'response', 
            data: 'I couldn\'t extract transcripts from the YouTube videos. The videos might not have captions available, or there might be an issue with the URLs provided.' 
          }));
          emitter.emit('end');
        }
      } else {
        // No YouTube URLs detected, return message
        emitter.emit('data', JSON.stringify({ 
          type: 'response', 
          data: 'Please provide a YouTube URL to analyze. I can extract transcripts from YouTube videos and answer questions about their content.' 
        }));
        emitter.emit('end');
      }
      
    } catch (error: any) {
      emitter.emit('error', JSON.stringify({ 
        type: 'error', 
        data: error.message 
      }));
    }
    
    return emitter;
  }
}
