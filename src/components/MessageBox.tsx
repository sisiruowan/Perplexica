'use client';

/* eslint-disable @next/next/no-img-element */
import React, { MutableRefObject, useEffect, useState } from 'react';
import { Message } from './ChatWindow';
import { cn } from '@/lib/utils';
import {
  BookCopy,
  Disc3,
  Volume2,
  StopCircle,
  Layers3,
  Plus,
} from 'lucide-react';
import Markdown, { MarkdownToJSX } from 'markdown-to-jsx';
import Copy from './MessageActions/Copy';
import Rewrite from './MessageActions/Rewrite';
import MessageSources from './MessageSources';
import SearchImages from './SearchImages';
import SearchVideos from './SearchVideos';
import { useSpeech } from 'react-text-to-speech';
import ThinkBox from './ThinkBox';
import CitationPopup from './CitationPopup';
import { useCitation } from '@/contexts/CitationContext';
import YouTubeTranscriptDisplay from './YouTubeTranscriptDisplay';
import { useYouTube } from '@/contexts/YouTubeContext';

const ThinkTagProcessor = ({
  children,
  thinkingEnded,
}: {
  children: React.ReactNode;
  thinkingEnded: boolean;
}) => {
  return (
    <ThinkBox content={children as string} thinkingEnded={thinkingEnded} />
  );
};

const MessageBox = ({
  message,
  messageIndex,
  history,
  loading,
  dividerRef,
  isLast,
  rewrite,
  sendMessage,
}: {
  message: Message;
  messageIndex: number;
  history: Message[];
  loading: boolean;
  dividerRef?: MutableRefObject<HTMLDivElement | null>;
  isLast: boolean;
  rewrite: (messageId: string) => void;
  sendMessage: (message: string) => void;
}) => {
  const [parsedMessage, setParsedMessage] = useState(message.content);
  const { setCurrentVideo, setIsVideoPageOpen } = useYouTube();
  const [speechMessage, setSpeechMessage] = useState(message.content);
  const [thinkingEnded, setThinkingEnded] = useState(false);
  const { openCitation } = useCitation();
  
  // Find YouTube source
  const youtubeSource = message.sources?.find(
    source => source.metadata?.type === 'youtube' || source.metadata?.videoId
  );

  // Set YouTube video context when source is found
  useEffect(() => {
    if (youtubeSource?.metadata?.videoId) {
      const videoData = {
        videoInfo: {
          videoId: youtubeSource.metadata.videoId || '',
          title: youtubeSource.metadata.title || 'YouTube Video',
          author: youtubeSource.metadata.author || 'Unknown',
          channelId: youtubeSource.metadata.channelId || '',
          duration: youtubeSource.metadata.duration || 0,
          thumbnail: youtubeSource.metadata.thumbnail || '',
          url: youtubeSource.metadata.url || '',
          publishedAt: youtubeSource.metadata.publishedAt || new Date().toISOString(),
          viewCount: youtubeSource.metadata.viewCount || 0,
          likeCount: youtubeSource.metadata.likeCount,
          commentCount: youtubeSource.metadata.commentCount,
          description: youtubeSource.metadata.description || '',
          tags: youtubeSource.metadata.tags || [],
          categoryId: youtubeSource.metadata.categoryId,
          defaultLanguage: youtubeSource.metadata.defaultLanguage,
          defaultAudioLanguage: youtubeSource.metadata.defaultAudioLanguage,
          liveBroadcastContent: youtubeSource.metadata.liveBroadcastContent,
          dimension: youtubeSource.metadata.dimension,
          definition: youtubeSource.metadata.definition,
          caption: youtubeSource.metadata.caption,
          licensedContent: youtubeSource.metadata.licensedContent,
          projection: youtubeSource.metadata.projection,
        },
        transcript: youtubeSource.metadata.transcript || youtubeSource.metadata.transcriptData || [],
        fullText: youtubeSource.pageContent || '',
        addedAt: new Date(),
      };
      setCurrentVideo(videoData);
    }
  }, [youtubeSource?.metadata?.videoId, setCurrentVideo, youtubeSource]);

  useEffect(() => {
    const regex = /\[(\d+)\]/g;
    let processedMessage = message.content;

    if (message.role === 'assistant' && message.content.includes('<think>')) {
      const openThinkTag = processedMessage.match(/<think>/g)?.length || 0;
      const closeThinkTag = processedMessage.match(/<\/think>/g)?.length || 0;

      if (openThinkTag > closeThinkTag) {
        processedMessage += '</think> <a> </a>'; // The extra <a> </a> is to prevent the the think component from looking bad
      }
    }

    if (message.role === 'assistant' && message.content.includes('</think>')) {
      setThinkingEnded(true);
    }

    // For speech, remove citation numbers
    setSpeechMessage(message.content.replace(regex, ''));
    
    // Keep the original message with citation markers for custom rendering
    setParsedMessage(processedMessage);
  }, [message.content, message.role]);

  const { speechStatus, start, stop } = useSpeech({ text: speechMessage });

  // Custom component to process text and wrap citations
  const TextWithCitations = ({ children }: { children: React.ReactNode }) => {
    if (typeof children !== 'string' || !message.sources || message.sources.length === 0) {
      return <>{children}</>;
    }

    const citationRegex = /\[(\d+(?:,\s*\d+)*)\]/g;
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = citationRegex.exec(children)) !== null) {
      // Add text before citation
      const matchIndex = match.index;
      const matchText = match[0];
      
      if (matchIndex > lastIndex) {
        parts.push(children.substring(lastIndex, matchIndex));
      }

      // Process citation numbers
      const citationNumbers = match[1].split(',').map(num => parseInt(num.trim()));
      
      citationNumbers.forEach((num, idx) => {
        if (!isNaN(num) && num > 0 && num <= message.sources!.length) {
          const source = message.sources![num - 1];
          parts.push(
            <CitationPopup
              key={`${matchIndex}-${num}`}
              citation={source}
              citationNumber={num}
              onCitationClick={openCitation}
            >
              <span className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative cursor-pointer hover:bg-light-200 dark:hover:bg-dark-200 transition-colors">
                {num}
              </span>
            </CitationPopup>
          );
          if (idx < citationNumbers.length - 1) {
            parts.push(' ');
          }
        }
      });

      lastIndex = matchIndex + matchText.length;
    }

    // Add remaining text
    if (lastIndex < children.length) {
      parts.push(children.substring(lastIndex));
    }

    return <>{parts}</>;
  };

  const processChildrenWithCitations = (children: any) => {
    if (Array.isArray(children)) {
      return children.map((child, index) => {
        if (typeof child === 'string') {
          return <TextWithCitations key={index}>{child}</TextWithCitations>;
        }
        return child;
      });
    }
    if (typeof children === 'string') {
      return <TextWithCitations>{children}</TextWithCitations>;
    }
    return children;
  };

  const markdownOverrides: MarkdownToJSX.Options = {
    overrides: {
      think: {
        component: ThinkTagProcessor,
        props: {
          thinkingEnded: thinkingEnded,
        },
      },
      p: {
        component: ({ children, ...props }) => (
          <p {...props}>
            {processChildrenWithCitations(children)}
          </p>
        ),
      },
      span: {
        component: ({ children, ...props }) => (
          <span {...props}>
            {processChildrenWithCitations(children)}
          </span>
        ),
      },
      li: {
        component: ({ children, ...props }) => (
          <li {...props}>
            {processChildrenWithCitations(children)}
          </li>
        ),
      },
      td: {
        component: ({ children, ...props }) => (
          <td {...props}>
            {processChildrenWithCitations(children)}
          </td>
        ),
      },
      h1: {
        component: ({ children, ...props }) => (
          <h1 {...props}>
            {processChildrenWithCitations(children)}
          </h1>
        ),
      },
      h2: {
        component: ({ children, ...props }) => (
          <h2 {...props}>
            {processChildrenWithCitations(children)}
          </h2>
        ),
      },
      h3: {
        component: ({ children, ...props }) => (
          <h3 {...props}>
            {processChildrenWithCitations(children)}
          </h3>
        ),
      },
      h4: {
        component: ({ children, ...props }) => (
          <h4 {...props}>
            {processChildrenWithCitations(children)}
          </h4>
        ),
      },
      h5: {
        component: ({ children, ...props }) => (
          <h5 {...props}>
            {processChildrenWithCitations(children)}
          </h5>
        ),
      },
      h6: {
        component: ({ children, ...props }) => (
          <h6 {...props}>
            {processChildrenWithCitations(children)}
          </h6>
        ),
      },
      div: {
        component: ({ children, ...props }) => (
          <div {...props}>
            {processChildrenWithCitations(children)}
          </div>
        ),
      },
      strong: {
        component: ({ children, ...props }) => (
          <strong {...props}>
            {processChildrenWithCitations(children)}
          </strong>
        ),
      },
      em: {
        component: ({ children, ...props }) => (
          <em {...props}>
            {processChildrenWithCitations(children)}
          </em>
        ),
      },
    },
  };

  return (
    <div>
      {message.role === 'user' && (
        <div
          className={cn(
            'w-full',
            messageIndex === 0 ? 'pt-16' : 'pt-8',
            'break-words',
          )}
        >
          <h2 className="text-black dark:text-white font-medium text-3xl lg:w-9/12">
            {message.content}
          </h2>
        </div>
      )}

      {message.role === 'assistant' && (
        <div className="flex flex-col space-y-9 lg:space-y-0 lg:flex-row lg:justify-between lg:space-x-9">
          <div
            ref={dividerRef}
            className="flex flex-col space-y-6 w-full lg:w-9/12"
          >
            {message.sources && message.sources.length > 0 && (
              <div className="flex flex-col space-y-2">
                <div className="flex flex-row items-center space-x-2">
                  <BookCopy className="text-black dark:text-white" size={20} />
                  <h3 className="text-black dark:text-white font-medium text-xl">
                    Sources
                  </h3>
                </div>
                <MessageSources sources={message.sources} />
              </div>
            )}
            
            {/* YouTube Video Info Card */}
            {youtubeSource?.metadata?.videoId && (
              <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136C4.495 20.455 12 20.455 12 20.455s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-red-900 dark:text-red-100 truncate">
                      {youtubeSource.metadata.title || 'YouTube Video'}
                    </h4>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                      {youtubeSource.metadata.author || 'Unknown'} • 
                      {youtubeSource.metadata.duration ? ` ${Math.floor(youtubeSource.metadata.duration / 60)}:${String(youtubeSource.metadata.duration % 60).padStart(2, '0')}` : ''} • 
                      {(youtubeSource.metadata.transcript || youtubeSource.metadata.transcriptData || []).length} segments
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => setIsVideoPageOpen(true)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-col space-y-2">
              <div className="flex flex-row items-center space-x-2">
                <Disc3
                  className={cn(
                    'text-black dark:text-white',
                    isLast && loading ? 'animate-spin' : 'animate-none',
                  )}
                  size={20}
                />
                <h3 className="text-black dark:text-white font-medium text-xl">
                  Answer
                </h3>
              </div>

              <Markdown
                className={cn(
                  'prose prose-h1:mb-3 prose-h2:mb-2 prose-h2:mt-6 prose-h2:font-[800] prose-h3:mt-4 prose-h3:mb-1.5 prose-h3:font-[600] dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 font-[400]',
                  'max-w-none break-words text-black dark:text-white',
                )}
                options={markdownOverrides}
              >
                {parsedMessage}
              </Markdown>
              {loading && isLast ? null : (
                <div className="flex flex-row items-center justify-between w-full text-black dark:text-white py-4 -mx-2">
                  <div className="flex flex-row items-center space-x-1">
                    {/*  <button className="p-2 text-black/70 dark:text-white/70 rounded-xl hover:bg-light-secondary dark:hover:bg-dark-secondary transition duration-200 hover:text-black text-black dark:hover:text-white">
                      <Share size={18} />
                    </button> */}
                    <Rewrite rewrite={rewrite} messageId={message.messageId} />
                  </div>
                  <div className="flex flex-row items-center space-x-1">
                    <Copy initialMessage={message.content} message={message} />
                    <button
                      onClick={() => {
                        if (speechStatus === 'started') {
                          stop();
                        } else {
                          start();
                        }
                      }}
                      className="p-2 text-black/70 dark:text-white/70 rounded-xl hover:bg-light-secondary dark:hover:bg-dark-secondary transition duration-200 hover:text-black dark:hover:text-white"
                    >
                      {speechStatus === 'started' ? (
                        <StopCircle size={18} />
                      ) : (
                        <Volume2 size={18} />
                      )}
                    </button>
                  </div>
                </div>
              )}
              {isLast &&
                message.suggestions &&
                message.suggestions.length > 0 &&
                message.role === 'assistant' &&
                !loading && (
                  <>
                    <div className="h-px w-full bg-light-secondary dark:bg-dark-secondary" />
                    <div className="flex flex-col space-y-3 text-black dark:text-white">
                      <div className="flex flex-row items-center space-x-2 mt-4">
                        <Layers3 />
                        <h3 className="text-xl font-medium">Related</h3>
                      </div>
                      <div className="flex flex-col space-y-3">
                        {message.suggestions.map((suggestion, i) => (
                          <div
                            className="flex flex-col space-y-3 text-sm"
                            key={i}
                          >
                            <div className="h-px w-full bg-light-secondary dark:bg-dark-secondary" />
                            <div
                              onClick={() => {
                                sendMessage(suggestion);
                              }}
                              className="cursor-pointer flex flex-row justify-between font-medium space-x-2 items-center"
                            >
                              <p className="transition duration-200 hover:text-[#24A0ED]">
                                {suggestion}
                              </p>
                              <Plus
                                size={20}
                                className="text-[#24A0ED] flex-shrink-0"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
            </div>
          </div>
          <div className="lg:sticky lg:top-20 flex flex-col items-center space-y-3 w-full lg:w-3/12 z-30 h-full pb-4">
            <SearchImages
              query={history[messageIndex - 1].content}
              chatHistory={history.slice(0, messageIndex - 1)}
              messageId={message.messageId}
            />
            <SearchVideos
              chatHistory={history.slice(0, messageIndex - 1)}
              query={history[messageIndex - 1].content}
              messageId={message.messageId}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageBox;
