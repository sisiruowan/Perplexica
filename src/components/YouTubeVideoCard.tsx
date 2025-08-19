'use client';

import { useState } from 'react';
import { Play, Clock, User, FileText, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface YouTubeVideoCardProps {
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  url: string;
  transcriptLength?: number;
  onPlayInline?: () => void;
}

const YouTubeVideoCard = ({
  videoId,
  title,
  author,
  thumbnail,
  url,
  transcriptLength,
  onPlayInline
}: YouTubeVideoCardProps) => {
  const [showEmbed, setShowEmbed] = useState(false);
  const [showTranscriptInfo, setShowTranscriptInfo] = useState(false);

  const handlePlayInline = () => {
    setShowEmbed(!showEmbed);
    if (onPlayInline) {
      onPlayInline();
    }
  };

  return (
    <div className="my-4 rounded-lg border border-light-200 dark:border-dark-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Video Thumbnail/Embed */}
      <div className="relative aspect-video bg-black">
        {showEmbed ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title={title}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            <img
              src={thumbnail}
              alt={title}
              className="w-full h-full object-cover"
            />
            <button
              onClick={handlePlayInline}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
            >
              <div className="bg-red-600 rounded-full p-4 group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-white fill-white" />
              </div>
            </button>
          </>
        )}
      </div>

      {/* Video Info */}
      <div className="p-4 bg-light-secondary dark:bg-dark-secondary">
        <h3 className="font-semibold text-lg line-clamp-2 mb-2 text-black dark:text-white">
          {title}
        </h3>
        
        <div className="flex items-center gap-4 text-sm text-black/70 dark:text-white/70 mb-3">
          <div className="flex items-center gap-1">
            <User size={14} />
            <span>{author}</span>
          </div>
          {transcriptLength && (
            <div className="flex items-center gap-1">
              <FileText size={14} />
              <span>{transcriptLength} captions</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 bg-light-primary dark:bg-dark-primary rounded-md hover:opacity-80 transition-opacity text-sm"
          >
            <ExternalLink size={14} />
            <span>Watch on YouTube</span>
          </a>
          
          {transcriptLength && (
            <button
              onClick={() => setShowTranscriptInfo(!showTranscriptInfo)}
              className="flex items-center gap-1 px-3 py-1.5 bg-light-100 dark:bg-dark-100 rounded-md hover:opacity-80 transition-opacity text-sm"
            >
              <FileText size={14} />
              <span>Transcript Info</span>
              {showTranscriptInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>

        {/* Transcript Info */}
        {showTranscriptInfo && transcriptLength && (
          <div className="mt-3 p-3 bg-light-100 dark:bg-dark-100 rounded-md text-sm">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <FileText size={16} />
              <span className="font-medium">Transcript Available</span>
            </div>
            <p className="mt-1 text-black/70 dark:text-white/70">
              This video has {transcriptLength} caption segments that have been processed and are available for Q&A.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default YouTubeVideoCard;
