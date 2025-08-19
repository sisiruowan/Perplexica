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
  const contentRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (citation && isOpen) {
      loadContent(citation);
    }
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
    
    // Extract the most relevant paragraph from the pageContent
    const paragraphs = doc.pageContent.split(/\n\n+/);
    const relevantParagraph = paragraphs.find(p => p.trim().length > 100) || paragraphs[0] || '';
    setHighlightedParagraph(relevantParagraph.trim());
    
    setIsLoading(false);
  };

  const renderWebContent = () => {
    if (!citation || !citation.metadata.url) return null;
    
    return (
      <div className="relative h-full flex flex-col">
        {/* Instructions bar */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Viewing Original Web Page
              </h4>
              <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
                The original webpage is displayed below. Some sites may not allow embedding.
              </p>
              <div className="bg-white dark:bg-gray-800 rounded p-3 mb-2">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cited content:
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                  "{highlightedParagraph.substring(0, 200)}{highlightedParagraph.length > 200 ? '...' : ''}"
                </p>
              </div>
              <a
                href={citation.metadata.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Open in new tab for best experience</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Iframe container */}
        <div className="flex-1 relative">
          {iframeError ? (
            <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50 dark:bg-gray-900">
              <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Unable to Display Web Page</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4 max-w-md">
                This website doesn't allow embedding. This is a security feature implemented by the website.
              </p>
              <a
                href={citation.metadata.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              
              {/* Show text content as fallback */}
              <div className="mt-8 w-full max-w-4xl">
                <h4 className="text-sm font-medium mb-3">Citation Text Content:</h4>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  {renderTextContent()}
                </div>
              </div>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              )}
              <iframe
                ref={iframeRef}
                src={citation.metadata.url}
                className="w-full h-full border-0"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIframeError(true);
                  setIsLoading(false);
                }}
                title={citation.metadata.title || 'Web content'}
              />
            </>
          )}
        </div>
      </div>
    );
  };

  const renderTextContent = () => {
    if (!citation) return null;
    
    const paragraphs = citation.pageContent.split(/\n\n+/);
    
    return (
      <div className="space-y-4 prose prose-sm dark:prose-invert max-w-none">
        {paragraphs.map((paragraph, index) => {
          const trimmedParagraph = paragraph.trim();
          if (!trimmedParagraph) return null;
          
          const isHighlighted = trimmedParagraph === highlightedParagraph;
          
          return isHighlighted ? (
            <div
              key={index}
              className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 pl-4 pr-2 py-2 rounded-r-lg transition-all duration-300"
              ref={(el) => {
                if (el && isOpen) {
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
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 dark:bg-black/40 transition-opacity z-40 lg:hidden ${
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