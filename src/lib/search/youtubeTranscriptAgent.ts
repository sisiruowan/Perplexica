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
    youtubeContext?: string,
  ): Promise<eventEmitter> {
    const emitter = new eventEmitter();

    // Defer the actual processing to the next tick so event listeners can be set up
    setImmediate(async () => {
      await this.processYouTubeSearch(emitter, message, history, llm, embeddings, optimizationMode, fileIds, systemInstructions, youtubeContext);
    });

    return emitter;
  }

  private async processYouTubeSearch(
    emitter: eventEmitter,
    message: string,
    history: BaseMessage[],
    llm: BaseChatModel,
    embeddings: Embeddings,
    optimizationMode: 'speed' | 'balanced' | 'quality',
    fileIds: string[],
    systemInstructions: string,
    youtubeContext?: string,
  ) {
    
    try {
      // Detect YouTube URLs in the message
      const youtubeUrls = detectYouTubeUrls(message);
      console.log('[YouTubeTranscriptAgent] Detected YouTube URLs:', youtubeUrls);
      
      if (youtubeUrls.length > 0) {
        // Process YouTube URLs
        const transcriptResults: YouTubeTranscriptResult[] = [];
        const documents: Document[] = [];
        
        for (const url of youtubeUrls) {
          try {
            console.log(`[YouTubeTranscriptAgent] Processing URL: ${url}`);
            const result = await extractYouTubeTranscript(url);
            console.log(`[YouTubeTranscriptAgent] Transcript result:`, {
              hasError: !!result.error,
              videoTitle: result.videoInfo?.title,
              transcriptLength: result.transcript?.length,
            });
            transcriptResults.push(result);
            
            if (!result.error) {
              // Convert transcript to document
              const doc = youTubeTranscriptToDocument(result);
              documents.push(doc);
            }
          } catch (error: any) {
            console.error(`[YouTubeTranscriptAgent] Error processing ${url}:`, error);
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
          console.log('[YouTubeTranscriptAgent] Creating sources from results:', transcriptResults.length);
          console.log('[YouTubeTranscriptAgent] Transcript results details:', transcriptResults.map(r => ({
            hasError: !!r.error,
            videoTitle: r.videoInfo?.title,
            transcriptLength: r.transcript?.length,
            fullTextLength: r.fullText?.length,
            videoId: r.videoInfo?.videoId
          })));
          
          const sources = transcriptResults
            .filter(r => !r.error)
            .map((result) => {
              // Use transcript content if available, otherwise use video description and metadata
              const pageContent = result.fullText || `Title: ${result.videoInfo.title}
Author: ${result.videoInfo.author}
Duration: ${Math.floor(result.videoInfo.duration / 60)}:${String(result.videoInfo.duration % 60).padStart(2, '0')}
Views: ${result.videoInfo.viewCount?.toLocaleString() || 'Unknown'}
Published: ${new Date(result.videoInfo.publishedAt).toLocaleDateString()}

Description:
${result.videoInfo.description || 'No description available'}

Tags: ${result.videoInfo.tags?.join(', ') || 'None'}`;

              return {
                pageContent,
                metadata: {
                title: result.videoInfo.title,
                url: result.videoInfo.url,
                thumbnail: result.videoInfo.thumbnail,
                author: result.videoInfo.author,
                channelId: result.videoInfo.channelId,
                duration: result.videoInfo.duration,
                publishedAt: result.videoInfo.publishedAt,
                viewCount: result.videoInfo.viewCount,
                likeCount: result.videoInfo.likeCount,
                commentCount: result.videoInfo.commentCount,
                description: result.videoInfo.description,
                tags: result.videoInfo.tags,
                categoryId: result.videoInfo.categoryId,
                defaultLanguage: result.videoInfo.defaultLanguage,
                defaultAudioLanguage: result.videoInfo.defaultAudioLanguage,
                liveBroadcastContent: result.videoInfo.liveBroadcastContent,
                dimension: result.videoInfo.dimension,
                definition: result.videoInfo.definition,
                caption: result.videoInfo.caption,
                licensedContent: result.videoInfo.licensedContent,
                projection: result.videoInfo.projection,
                type: 'youtube',
                videoId: result.videoInfo.videoId,
                transcriptLength: result.transcript.length,
                transcript: result.transcript, // Include full transcript data
                transcriptData: result.transcript // Alternative property name
                }
              };
            });
          
          console.log('[YouTubeTranscriptAgent] Emitting sources count:', sources.length);
          console.log('[YouTubeTranscriptAgent] Sources summary:', sources.map(s => ({
            hasPageContent: !!s.pageContent,
            pageContentLength: s.pageContent?.length,
            title: s.metadata?.title,
            videoId: s.metadata?.videoId,
            type: s.metadata?.type
          })));
          
          const sourcesPayload = { 
            type: 'sources', 
            data: sources 
          };
          console.log('[YouTubeTranscriptAgent] Emitting sources payload:', JSON.stringify(sourcesPayload, null, 2));
          emitter.emit('data', JSON.stringify(sourcesPayload));

          // Stream the response
          console.log('[YouTubeTranscriptAgent] Starting to stream response...');
          let responseChunkCount = 0;
          for await (const event of stream) {
            console.log('[YouTubeTranscriptAgent] Received stream event:', {
              event: event.event,
              name: event.name,
              hasData: !!event.data,
              chunkType: typeof event.data?.chunk
            });
            
            if (
              event.event === 'on_chain_stream' &&
              event.name === 'YouTubeTranscriptResponseChain'
            ) {
              responseChunkCount++;
              console.log('[YouTubeTranscriptAgent] Emitting response chunk #', responseChunkCount, ':', event.data?.chunk);
              emitter.emit(
                'data',
                JSON.stringify({ type: 'response', data: event.data?.chunk }),
              );
            }

            if (
              event.event === 'on_chain_end' &&
              event.name === 'YouTubeTranscriptResponseChain'
            ) {
              console.log('[YouTubeTranscriptAgent] Chain ended, total response chunks:', responseChunkCount);
              emitter.emit('end');
            }
          }
          console.log('[YouTubeTranscriptAgent] Finished processing, emitting end signal...');
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
  }
}
