'use client';

import { useState, useEffect, useRef } from 'react';
import { Document } from '@langchain/core/documents';
import { X, ExternalLink, FileText, Globe, AlertCircle, Maximize2 } from 'lucide-react';

interface CitationSidebarProps {
  isOpen: boolean;
  citation: Document | null;
  citationNumber: number | null;
  onClose: () => void;
}

const CitationSidebar = ({ isOpen, citation, citationNumber, onClose }: CitationSidebarProps) => {
  const [contentType, setContentType] = useState<'pdf' | 'web' | 'file'>('file');
  const [isLoading, setIsLoading] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [highlightedParagraph, setHighlightedParagraph] = useState<string>('');
  const [urlCopied, setUrlCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (citation && isOpen) {
      // Reset states when citation changes
      setIframeError(false);
      setUrlCopied(false);
      
      // Clear any existing timeout
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      
      loadContent(citation);
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [citation, isOpen]);

  const loadContent = async (doc: Document) => {
    setIsLoading(true);
    setIframeError(false);
    
    const metadata = doc.metadata;
    const isPDF = metadata.fileType === 'pdf' || 
                  metadata.url?.toLowerCase().endsWith('.pdf');
    const isWebContent = metadata.url && 
                         metadata.url !== 'File' && 
                         !isPDF;
    
    setContentType(isPDF ? 'pdf' : isWebContent ? 'web' : 'file');
    
    // Since the entire pageContent is the cited content, we'll highlight it all
    // or find the most substantial part if it's very long
    const fullContent = doc.pageContent.trim();
    const paragraphs = fullContent.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    // Always try to highlight the most relevant content
    if (paragraphs.length === 0) {
      setHighlightedParagraph(fullContent);
    } else if (paragraphs.length === 1) {
      // Single paragraph, highlight it all
      setHighlightedParagraph(paragraphs[0].trim());
    } else {
      // Multiple paragraphs - find the most substantial ones
      const substantialParagraphs = paragraphs
        .filter(p => p.trim().length > 30) // Lower threshold for better matching
        .sort((a, b) => b.length - a.length);
      
      if (substantialParagraphs.length > 0) {
        // Use the longest paragraph as the highlight target
        setHighlightedParagraph(substantialParagraphs[0].trim());
      } else {
        // Fallback to first paragraph
        setHighlightedParagraph(paragraphs[0].trim());
      }
    }
    
    setIsLoading(false);
  };

  const getErrorTitle = () => {
    if (!citation?.metadata.url) return 'Direct webpage viewing not available';
    
    const url = citation.metadata.url;
    
    if (url.includes('news.microsoft.com') || url.includes('microsoft.com')) {
      return 'Microsoft website blocks embedding';
    } else if (url.includes('finance.yahoo.com') || url.includes('yahoo.com')) {
      return 'Yahoo Finance blocks embedding';
    } else if (url.includes('sciencenewstoday.org')) {
      return 'Showing text content to prevent loading issues';
    } else if (url.includes('github.com')) {
      return 'GitHub blocks embedding for security';
    } else if (url.includes('linkedin.com') || url.includes('twitter.com') || url.includes('x.com') || url.includes('facebook.com')) {
      return 'Social media platform blocks embedding';
    } else if (url.includes('cnn.com') || url.includes('bbc.com') || url.includes('reuters.com') || url.includes('bloomberg.com') || url.includes('wsj.com') || url.includes('nytimes.com') || url.includes('washingtonpost.com')) {
      return 'News website blocks embedding';
    } else {
      return 'Direct webpage viewing not available';
    }
  };

  const getErrorMessage = () => {
    if (!citation?.metadata.url) return 'This website has disabled embedding for security or privacy reasons.';
    
    const url = citation.metadata.url;
    
    if (url.includes('news.microsoft.com') || url.includes('microsoft.com')) {
      return 'Microsoft websites use Content Security Policy (CSP) and X-Frame-Options to prevent embedding for security reasons. The extracted content is displayed below.';
    } else if (url.includes('finance.yahoo.com') || url.includes('yahoo.com')) {
      return 'Yahoo Finance uses Content Security Policy (CSP) with frame-ancestors restrictions to prevent embedding. Only specific domains like aol.com and ouryahoo.com are allowed. The extracted content is displayed below.';
    } else if (url.includes('sciencenewstoday.org')) {
      return 'This website contains scripts that may cause repeated reloading. Displaying extracted content instead.';
    } else if (url.includes('github.com')) {
      return 'GitHub prevents embedding to protect user privacy and security. View the extracted content below.';
    } else if (url.includes('linkedin.com') || url.includes('twitter.com') || url.includes('x.com') || url.includes('facebook.com')) {
      return 'Social media platforms block embedding to protect user privacy and prevent unauthorized access.';
    } else if (url.includes('cnn.com') || url.includes('bbc.com') || url.includes('reuters.com') || url.includes('bloomberg.com') || url.includes('wsj.com') || url.includes('nytimes.com') || url.includes('washingtonpost.com')) {
      return 'Major news websites use Content Security Policy (CSP) to prevent embedding for security and copyright protection. The extracted content is shown below.';
    } else {
      return 'This website has disabled embedding for security or privacy reasons. The extracted content is shown below.';
    }
  };

  const renderWebContent = () => {
    if (!citation || !citation.metadata.url) return null;
    
    // Check for problematic websites that cause infinite reloading or block embedding
    const problematicDomains = [
      'sciencenewstoday.org',
      'litespeed.com',
      'news.microsoft.com',
      'microsoft.com',
      'encord.com',
      'github.com',
      'linkedin.com',
      'twitter.com',
      'x.com',
      'facebook.com',
      'instagram.com',
      'finance.yahoo.com',
      'yahoo.com',
      'aol.com',
      'cnn.com',
      'bbc.com',
      'reuters.com',
      'bloomberg.com',
      'wsj.com',
      'nytimes.com',
      'washingtonpost.com',
      // Add more domains as needed
    ];
    
    const isProblematicSite = problematicDomains.some(domain => 
      citation.metadata.url.includes(domain)
    );
    
    // If it's a problematic site or iframe has error, show text content
    if (iframeError || isProblematicSite) {
      return (
        <div className="h-full bg-gray-50 dark:bg-gray-900 overflow-auto">
          <div className="p-6">
            {/* Error header */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                    {getErrorTitle()}
                  </h4>
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    {getErrorMessage()}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mb-6">
              <a
                href={citation.metadata.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Original Page</span>
              </a>
              
              {/* Copy URL button */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(citation.metadata.url);
                  setUrlCopied(true);
                  setTimeout(() => setUrlCopied(false), 2000);
                }}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span>{urlCopied ? 'Copied!' : 'Copy URL'}</span>
              </button>
            </div>

            {/* Citation content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  Citation Content
                </h4>
                {renderTextContent()}
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Try to load iframe
    return (
      <div className="relative h-full flex flex-col">
        {/* Info bar */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-900 dark:text-blue-100">
                Loading webpage...
              </span>
            </div>
            <a
              href={citation.metadata.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center space-x-1"
            >
              <span>Open externally</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Iframe container */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900 z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading webpage...</p>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={citation.metadata.url}
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            onLoad={() => {
              // Clear timeout if iframe loads successfully
              if (loadTimeoutRef.current) {
                clearTimeout(loadTimeoutRef.current);
              }
              
              setIsLoading(false);
              
              // Set a timeout to detect problematic scripts that cause reloading
              loadTimeoutRef.current = setTimeout(() => {
                // If we're still loading after 10 seconds, likely a problematic script
                if (isLoading) {
                  console.warn('Iframe taking too long to load, switching to text view');
                  setIframeError(true);
                  setIsLoading(false);
                }
              }, 10000);
              
              // Check if iframe actually loaded content
              try {
                if (iframeRef.current?.contentWindow?.document?.body?.innerHTML === '') {
                  setIframeError(true);
                }
              } catch (e) {
                // Cross-origin, can't check content - this is normal
              }
            }}
            onError={() => {
              if (loadTimeoutRef.current) {
                clearTimeout(loadTimeoutRef.current);
              }
              setIframeError(true);
              setIsLoading(false);
            }}
            title={citation.metadata.title || 'Web content'}
          />
        </div>
      </div>
    );
  };

  const renderTextContent = () => {
    if (!citation) return null;
    
    const paragraphs = citation.pageContent.split(/\n\n+/);
    
    // Find which paragraph(s) to highlight using fuzzy matching
    const findHighlightedParagraphs = () => {
      const highlighted = new Set<number>();
      
      if (!highlightedParagraph || highlightedParagraph.length === 0) {
        // If no specific highlight target, highlight the first substantial paragraph
        paragraphs.forEach((paragraph, index) => {
          if (paragraph.trim().length > 50) {
            highlighted.add(index);
            return; // Only highlight the first one
          }
        });
        return highlighted;
      }
      
      paragraphs.forEach((paragraph, index) => {
        const trimmedParagraph = paragraph.trim();
        if (!trimmedParagraph) return;
        
        // Check for exact match
        if (trimmedParagraph === highlightedParagraph) {
          highlighted.add(index);
          return;
        }
        
        // Check if the highlighted paragraph is contained within this paragraph
        if (trimmedParagraph.includes(highlightedParagraph)) {
          highlighted.add(index);
          return;
        }
        
        // Check if this paragraph is contained within the highlighted paragraph
        if (highlightedParagraph.includes(trimmedParagraph) && trimmedParagraph.length > 30) {
          highlighted.add(index);
          return;
        }
        
        // Check for significant overlap (at least 60% of smaller text for better matching)
        const overlap = getTextOverlap(trimmedParagraph, highlightedParagraph);
        const minLength = Math.min(trimmedParagraph.length, highlightedParagraph.length);
        if (minLength > 0 && overlap / minLength > 0.6) {
          highlighted.add(index);
        }
        
        // Check for word-level similarity
        const words1 = trimmedParagraph.toLowerCase().split(/\s+/);
        const words2 = highlightedParagraph.toLowerCase().split(/\s+/);
        const commonWords = words1.filter(word => 
          word.length > 3 && words2.includes(word)
        );
        
        if (commonWords.length >= Math.min(5, Math.floor(Math.min(words1.length, words2.length) * 0.3))) {
          highlighted.add(index);
        }
      });
      
      // If no matches found, try to find the most similar paragraph
      if (highlighted.size === 0) {
        let bestMatch = -1;
        let bestScore = 0;
        
        paragraphs.forEach((paragraph, index) => {
          const trimmedParagraph = paragraph.trim();
          if (trimmedParagraph.length < 30) return;
          
          const overlap = getTextOverlap(trimmedParagraph, highlightedParagraph);
          const score = overlap / Math.max(trimmedParagraph.length, highlightedParagraph.length);
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = index;
          }
        });
        
        if (bestMatch >= 0 && bestScore > 0.1) {
          highlighted.add(bestMatch);
        } else {
          // Last resort: highlight the first substantial paragraph
          paragraphs.forEach((paragraph, index) => {
            if (paragraph.trim().length > 50) {
              highlighted.add(index);
              return;
            }
          });
        }
      }
      
      return highlighted;
    };
    
    const highlightedIndices = findHighlightedParagraphs();
    let hasScrolled = false;
    
    return (
      <div className="space-y-4 prose prose-sm dark:prose-invert max-w-none">
        {paragraphs.map((paragraph, index) => {
          const trimmedParagraph = paragraph.trim();
          if (!trimmedParagraph) return null;
          
          const isHighlighted = highlightedIndices.has(index);
          
          return isHighlighted ? (
            <div
              key={index}
              className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 pl-4 pr-2 py-2 rounded-r-lg transition-all duration-300"
              ref={(el) => {
                if (el && isOpen && !hasScrolled) {
                  hasScrolled = true;
                  setTimeout(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 300);
                }
              }}
            >
              <p className="mb-0 font-medium">{trimmedParagraph}</p>
            </div>
          ) : (
            <p key={index} className="text-gray-700 dark:text-gray-300">
              {trimmedParagraph}
            </p>
          );
        })}
      </div>
    );
  };
  
  // Helper function to calculate text overlap
  const getTextOverlap = (text1: string, text2: string) => {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    let overlap = 0;
    set1.forEach(word => {
      if (set2.has(word) && word.length > 2) {
        overlap += word.length;
      }
    });
    
    return overlap;
  };

  const renderPDFContent = () => {
    if (!citation) return null;
    
    return (
      <div className="h-full bg-gray-50 dark:bg-gray-900 overflow-auto">
        <div className="p-8">
          {/* PDF header */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div>
                <h4 className="text-sm font-medium text-red-900 dark:text-red-100">
                  PDF Document
                </h4>
                <p className="text-xs text-red-800 dark:text-red-200 mt-1">
                  Displaying extracted text content. For full PDF experience, please download the file.
                </p>
              </div>
            </div>
          </div>

          {/* PDF content styled like a document */}
          <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg">
            <div className="p-12 max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
                {citation.metadata.title || 'PDF Document'}
              </h1>
              <div className="space-y-4">
                {renderTextContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFileContent = () => {
    if (!citation) return null;
    
    return (
      <div className="h-full overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  File Content
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {citation.metadata.fileName || 'Uploaded file'}
                </p>
              </div>
            </div>
          </div>
          {renderTextContent()}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (!citation || isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      );
    }

    switch (contentType) {
      case 'web':
        return renderWebContent();
      case 'pdf':
        return renderPDFContent();
      default:
        return renderFileContent();
    }
  };

  return (
    <>
      {/* Backdrop - covers entire screen when sidebar is open */}
      <div 
        className={`fixed inset-0 bg-black/20 dark:bg-black/40 transition-opacity z-40 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-full lg:w-[800px] xl:w-[1000px] bg-light-primary dark:bg-dark-primary border-l border-light-200 dark:border-dark-200 transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-light-200 dark:border-dark-200 bg-white dark:bg-gray-900">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Citation</span>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-sm font-semibold">
                  [{citationNumber}]
                </span>
              </div>
              <h3 className="text-lg font-semibold text-black dark:text-white truncate max-w-[400px]">
                {citation?.metadata.title || 'Untitled'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          
          {/* Citation Info Bar */}
          {citation && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-light-200 dark:border-dark-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {citation.metadata.url && citation.metadata.url !== 'File' ? (
                    <>
                      <img
                        src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${citation.metadata.url}`}
                        width={16}
                        height={16}
                        alt="favicon"
                        className="rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new URL(citation.metadata.url).hostname.replace('www.', '')}
                      </span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {citation.metadata.fileName || 'Local File'}
                      </span>
                    </>
                  )}
                </div>
                {citation.metadata.url && citation.metadata.url !== 'File' && (
                  <a
                    href={citation.metadata.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    <span>View Original</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}
          
          {/* Content */}
          <div 
            ref={contentRef}
            className="flex-1 overflow-hidden"
          >
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  );
};

export default CitationSidebar;