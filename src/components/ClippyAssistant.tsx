'use client';

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { X, MessageCircle, Sparkles, Laugh, Brain, Zap, Music } from 'lucide-react';

interface ClippyState {
  position: { x: number; y: number };
  isOpen: boolean;
  lastInteraction: number;
}

interface ClippyMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const JOKES = [
  { trigger: 'search', jokes: [
    "Looks like you're searching for answers. I found mine in the fridge! 🍕",
    "I see you're looking for something. Have you tried turning it off and on again? 😄",
    "Searching, eh? I once searched for my glasses for an hour. They were on my head! 🤓"
  ]},
  { trigger: 'code', jokes: [
    "Writing code? Remember: it's not a bug, it's a feature! 🐛",
    "Why do programmers prefer dark mode? Because light attracts bugs! 💡",
    "I tried to catch some bugs earlier. I had to use a try-catch block! 😆"
  ]},
  { trigger: 'ai', jokes: [
    "AI is like me - artificially intelligent and naturally funny! 🤖",
    "I asked AI to tell me a joke. It said 'Your code.' Ouch! 😅",
    "Why did the AI go to therapy? It had too many deep learning issues! 🧠"
  ]},
  { trigger: 'citation', jokes: [
    "So many citations! Are you writing a research paper or collecting them like Pokémon? 📚",
    "Citations everywhere! I cite my sources too: 'Trust me, I'm a paperclip.' 📎",
    "All these citations remind me of my bibliography: [1] Me, [2] Myself, [3] I 📖"
  ]},
  { trigger: 'default', jokes: [
    "I've been floating here so long, I'm considering charging rent! 🏠",
    "Did you know I can do a backflip? Just kidding, I'm stuck in 2D! 🤸",
    "I'm like good documentation - always here when you need me! 📚"
  ]}
];

const TIPS = [
  "💡 Pro tip: You can drag me anywhere on the screen!",
  "🎯 Did you know? Clicking citation numbers opens detailed information!",
  "⚡ Quick tip: Use keyboard shortcuts for faster navigation!",
  "🔍 Fun fact: I can see what you're working on and provide context-aware help!",
  "🌟 Remember: I'm here to make your experience more enjoyable!"
];

export interface ClippyAssistantRef {
  showTip: (message: string, duration?: number) => void;
}

const ClippyAssistant = forwardRef<ClippyAssistantRef>((props, ref) => {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<ClippyState>({
    position: { x: 20, y: 100 },
    isOpen: false,
    lastInteraction: Date.now()
  });
  
  const [messages, setMessages] = useState<ClippyMessage[]>([
    {
      id: '1',
      text: "Hi! I'm Clippy 2.0! 📎 Your friendly AI assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [showJoke, setShowJoke] = useState(false);
  const [currentJoke, setCurrentJoke] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [mood, setMood] = useState<'happy' | 'thinking' | 'excited' | 'winking' | 'embarrassed'>('happy');
  const [showTip, setShowTip] = useState(false);
  const [currentTip, setCurrentTip] = useState('');
  const [customTip, setCustomTip] = useState('');
  const [customTipTimeout, setCustomTipTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isDancing, setIsDancing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const clippyRef = useRef<HTMLDivElement>(null);

  // Expose showTip method to parent components
  useImperativeHandle(ref, () => ({
    showTip: (message: string, duration: number = 5000) => {
      // Clear any existing custom tip timeout
      if (customTipTimeout) {
        clearTimeout(customTipTimeout);
      }
      
      // Set the custom tip
      setCustomTip(message);
      setShowTip(true);
      setCurrentTip(message);
      setMood('excited');
      setIsDancing(true);
      
      // Auto-hide after duration
      const timeout = setTimeout(() => {
        setShowTip(false);
        setCustomTip('');
        setIsDancing(false);
        setMood('happy');
      }, duration);
      
      setCustomTipTimeout(timeout);
    }
  }));

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
    
    // Set initial position based on window size
    if (typeof window !== 'undefined') {
      const defaultX = Math.max(20, window.innerWidth - 120);
      const defaultY = Math.max(100, window.innerHeight - 200);
      
      setState(prev => ({
        ...prev,
        position: { x: defaultX, y: defaultY }
      }));
      
      // Load saved state
      const savedState = localStorage.getItem('clippyState');
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          setState(prev => ({
            ...prev,
            position: parsed.position || { x: defaultX, y: defaultY },
            lastInteraction: Date.now()
          }));
        } catch (e) {
          console.error('Failed to parse saved state:', e);
        }
      }
    }

    // Show welcome animation
    setTimeout(() => {
      setIsAnimating(true);
      setMood('excited');
      setTimeout(() => {
        setIsAnimating(false);
        setMood('happy');
        // Show initial tip
        const randomTip = TIPS[Math.floor(Math.random() * TIPS.length)];
        setCurrentTip(randomTip);
        setShowTip(true);
        setTimeout(() => {
          setShowTip(false);
        }, 6000);
      }, 1000);
    }, 1000);
  }, []);

  // Save state to localStorage
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      const stateToSave = {
        position: state.position
      };
      localStorage.setItem('clippyState', JSON.stringify(stateToSave));
    }
  }, [state.position, mounted]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle inactivity timer
  useEffect(() => {
    if (!mounted) return;

    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      
      setState(prev => ({ ...prev, lastInteraction: Date.now() }));
      setShowJoke(false);
      setMood('happy');
      
      inactivityTimerRef.current = setTimeout(() => {
        const random = Math.random();
        if (random < 0.7) {
          showContextualJoke();
        } else {
          showRandomTip();
        }
      }, 60000); // 1 minute
    };

    resetInactivityTimer();

    // Listen for user activity
    const handleActivity = () => resetInactivityTimer();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [mounted]);

  const showContextualJoke = async () => {
    if (typeof document === 'undefined') return;
    
    // Show loading state
    setMood('thinking');
    setIsAnimating(true);
    
    // Add a "thinking" message
    const thinkingMessage: ClippyMessage = {
      id: Date.now().toString(),
      text: "Let me think of a good joke... 🤔",
      isUser: false,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, thinkingMessage]);
    
    try {
      // Extract relevant content from the page
      const pageContent = extractPageContent();
      
      // Call the AI joke API
      const response = await fetch('/api/jokes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: pageContent.content,
          context: pageContent.context
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate joke');
      }
      
      const { joke } = await response.json();
      
      // Replace the thinking message with the actual joke
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        if (lastIndex >= 0 && newMessages[lastIndex].text.includes("Let me think")) {
          newMessages[lastIndex] = {
            id: Date.now().toString(),
            text: joke + " 😄",
            isUser: false,
            timestamp: new Date()
          };
        } else {
          // Fallback: add as new message
          newMessages.push({
            id: Date.now().toString(),
            text: joke + " 😄",
            isUser: false,
            timestamp: new Date()
          });
        }
        return newMessages;
      });
      
      setMood('winking');
    } catch (error) {
      console.error('Error generating AI joke:', error);
      
      // Fallback to predefined jokes
      const pageText = document.body.innerText.toLowerCase();
      let jokeCategory = 'default';
      
      if (pageText.includes('search') || pageText.includes('query')) {
        jokeCategory = 'search';
      } else if (pageText.includes('code') || pageText.includes('function') || pageText.includes('github')) {
        jokeCategory = 'code';
      } else if (pageText.includes('ai') || pageText.includes('gpt') || pageText.includes('model')) {
        jokeCategory = 'ai';
      } else if (document.querySelectorAll('.citation-popup').length > 5) {
        jokeCategory = 'citation';
      }
      
      const categoryJokes = JOKES.find(j => j.trigger === jokeCategory)?.jokes || JOKES[4].jokes;
      const randomJoke = categoryJokes[Math.floor(Math.random() * categoryJokes.length)];
      
      // Replace the thinking message with fallback joke
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        if (lastIndex >= 0 && newMessages[lastIndex].text.includes("Let me think")) {
          newMessages[lastIndex] = {
            id: Date.now().toString(),
            text: randomJoke + " 😄 (Oops, my AI brain hiccupped! Here's a classic instead.)",
            isUser: false,
            timestamp: new Date()
          };
        }
        return newMessages;
      });
      
      setMood('embarrassed');
    }
    
    setTimeout(() => {
      setIsAnimating(false);
      setMood('happy');
    }, 2000);
  };

  const extractPageContent = () => {
    if (typeof document === 'undefined') {
      return { content: 'general conversation', context: '' };
    }
    
    // Get the main content from chat messages
    const chatMessages = document.querySelectorAll('[class*="message"]');
    const recentMessages: string[] = [];
    
    // Extract recent chat content (last 3 messages)
    for (let i = Math.max(0, chatMessages.length - 3); i < chatMessages.length; i++) {
      const messageText = chatMessages[i]?.textContent?.trim();
      if (messageText && messageText.length > 10) {
        recentMessages.push(messageText);
      }
    }
    
    // Get search-related content
    const searchInputs = document.querySelectorAll('input[type="text"], textarea');
    const searchContent: string[] = [];
    
    searchInputs.forEach(input => {
      const value = (input as HTMLInputElement).value?.trim();
      if (value && value.length > 5) {
        searchContent.push(value);
      }
    });
    
    // Get citation content
    const citations = document.querySelectorAll('[class*="citation"]');
    const hasCitations = citations.length > 0;
    
    // Get page title and meta content
    const pageTitle = document.title || '';
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    
    // Combine content intelligently
    let content = '';
    let context = '';
    
    if (recentMessages.length > 0) {
      content = recentMessages.join(' ').substring(0, 500); // Limit to 500 chars
      context = 'chat conversation';
    } else if (searchContent.length > 0) {
      content = searchContent.join(' ').substring(0, 500);
      context = 'search query';
    } else if (pageTitle) {
      content = (pageTitle + ' ' + metaDescription).substring(0, 500);
      context = 'page content';
    } else {
      content = 'AI assistant conversation';
      context = 'general';
    }
    
    // Add context about citations
    if (hasCitations) {
      context += ', with citations';
    }
    
    // Add context about current page features
    const pageText = document.body.innerText.toLowerCase();
    if (pageText.includes('youtube')) {
      context += ', YouTube content';
    }
    if (pageText.includes('search') || pageText.includes('query')) {
      context += ', search interface';
    }
    
    return { content: content.trim(), context: context.trim() };
  };

  const showRandomTip = () => {
    const randomTip = TIPS[Math.floor(Math.random() * TIPS.length)];
    setCurrentTip(randomTip);
    setShowTip(true);
    setShowJoke(false);
    setMood('excited');
    
    setTimeout(() => {
      setShowTip(false);
      setMood('happy');
    }, 6000);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    const userMessage: ClippyMessage = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    const userInput = inputValue.toLowerCase();
    setInputValue('');
    setMood('thinking');
    
    // Generate contextual response
    setTimeout(() => {
      let response = '';
      
      if (userInput.includes('help')) {
        response = "I'm here to help! 🌟 You can:\n• Search for information\n• Click citations for details\n• Chat with me anytime\n• Drag me around the screen\nWhat would you like to know more about?";
        setMood('excited');
      } else if (userInput.includes('joke')) {
        // Generate AI joke asynchronously
        response = "Let me think of a good joke for you... 🤔";
        setMood('thinking');
        
        // Generate AI joke in the background
        setTimeout(async () => {
          try {
            const pageContent = extractPageContent();
            const jokeResponse = await fetch('/api/jokes', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                content: pageContent.content,
                context: pageContent.context + ', user requested joke'
              }),
            });
            
            if (jokeResponse.ok) {
              const { joke } = await jokeResponse.json();
              
              // Replace the thinking message with the AI joke
              setMessages(prev => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                if (lastIndex >= 0 && newMessages[lastIndex].text.includes("Let me think of a good joke")) {
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    text: joke + "\n\n😄 Want to hear another one?"
                  };
                }
                return newMessages;
              });
              setMood('winking');
            } else {
              throw new Error('AI joke failed');
            }
          } catch (error) {
            // Fallback to predefined jokes
            const pageText = document.body.innerText.toLowerCase();
            let jokeCategory = 'default';
            
            if (pageText.includes('search') || pageText.includes('query')) {
              jokeCategory = 'search';
            } else if (pageText.includes('code') || pageText.includes('function') || pageText.includes('github')) {
              jokeCategory = 'code';
            } else if (pageText.includes('ai') || pageText.includes('gpt') || pageText.includes('model')) {
              jokeCategory = 'ai';
            } else if (document.querySelectorAll('.citation-popup').length > 5) {
              jokeCategory = 'citation';
            }
            
            const categoryJokes = JOKES.find(j => j.trigger === jokeCategory)?.jokes || JOKES[4].jokes;
            const randomJoke = categoryJokes[Math.floor(Math.random() * categoryJokes.length)];
            
            // Replace the thinking message with fallback joke
            setMessages(prev => {
              const newMessages = [...prev];
              const lastIndex = newMessages.length - 1;
              if (lastIndex >= 0 && newMessages[lastIndex].text.includes("Let me think of a good joke")) {
                newMessages[lastIndex] = {
                  ...newMessages[lastIndex],
                  text: randomJoke + "\n\n😄 (My AI brain hiccupped, but here's a classic!)"
                };
              }
              return newMessages;
            });
            setMood('embarrassed');
            setTimeout(() => setMood('happy'), 2000);
          }
        }, 500);
      } else if (userInput.includes('dance')) {
        setIsDancing(true);
        setTimeout(() => setIsDancing(false), 3000);
        response = "Look at me go! 💃 *does the paperclip shuffle* Did you like my moves?";
        setMood('excited');
      } else if (userInput.includes('citation') || userInput.includes('reference')) {
        response = "Citations are important! 📚 Click on any [number] to see detailed information in the sidebar. The highlighted content shows exactly what's being referenced!";
      } else if (userInput.includes('search')) {
        response = "Searching is easy! 🔍 Just type your query and I'll help find relevant information. Pro tip: Be specific for better results!";
      } else if (userInput.includes('thank')) {
        response = "You're welcome! 😊 It's my pleasure to help. Is there anything else you'd like to know?";
        setMood('happy');
      } else {
        const responses = [
          "That's interesting! Tell me more about it... 🤔",
          "Great question! Here's what I think... 💭",
          "Ah, I see what you mean! Have you considered... 💡",
          "Fascinating point! Let me share a thought... 🎯",
          "I love your curiosity! Here's something to consider... 🌟"
        ];
        response = responses[Math.floor(Math.random() * responses.length)];
      }
      
      const assistantMessage: ClippyMessage = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setMood('happy');
    }, 1000);
  };

  const getClippyExpression = () => {
    const expressions = {
      happy: "◉‿◉",
      thinking: "◉_◉",
      excited: "◉▽◉",
      winking: "◉‿◉)",
      embarrassed: "◉﹏◉"
    };
    return expressions[mood];
  };

  // Calculate chat window position to ensure it's always visible and never overlaps Clippy
  const getChatWindowPosition = () => {
    const chatWidth = 384; // w-96 = 24rem = 384px
    const chatHeight = 500;
    const margin = 20; // Increased margin to ensure no overlap
    const clippyWidth = 80;
    const clippyHeight = 80;
    
    // Calculate positions with enough clearance to avoid overlapping Clippy
    const leftPosition = state.position.x - chatWidth - margin;
    const rightPosition = state.position.x + clippyWidth + margin;
    const topPosition = state.position.y - chatHeight - margin; // Position above Clippy with margin
    const bottomPosition = state.position.y + clippyHeight + margin; // Position below Clippy with margin
    
    // Check available space
    const hasLeftSpace = leftPosition >= margin;
    const hasRightSpace = rightPosition + chatWidth <= window.innerWidth - margin;
    const hasTopSpace = topPosition >= margin;
    const hasBottomSpace = bottomPosition + chatHeight <= window.innerHeight - margin;
    
    // Priority order: left (top/bottom), right (top/bottom), forced positions
    // Always prefer horizontal positioning to avoid overlapping Clippy vertically
    
    if (hasLeftSpace) {
      // Left side positioning - prefer middle alignment with Clippy
      const middleAlignedTop = state.position.y + (clippyHeight - chatHeight) / 2;
      const safeTop = Math.max(margin, Math.min(middleAlignedTop, window.innerHeight - chatHeight - margin));
      
      return {
        position: 'middle-left',
        style: {
          top: `${safeTop - state.position.y}px`,
          left: `${leftPosition - state.position.x}px`
        }
      };
    }
    
    if (hasRightSpace) {
      // Right side positioning - prefer middle alignment with Clippy
      const middleAlignedTop = state.position.y + (clippyHeight - chatHeight) / 2;
      const safeTop = Math.max(margin, Math.min(middleAlignedTop, window.innerHeight - chatHeight - margin));
      
      return {
        position: 'middle-right',
        style: {
          top: `${safeTop - state.position.y}px`,
          left: `${rightPosition - state.position.x}px`
        }
      };
    }
    
    // If no horizontal space, try vertical positioning
    if (hasTopSpace) {
      // Position above Clippy, centered horizontally
      const centerAlignedLeft = state.position.x + (clippyWidth - chatWidth) / 2;
      const safeLeft = Math.max(margin, Math.min(centerAlignedLeft, window.innerWidth - chatWidth - margin));
      
      return {
        position: 'top-center',
        style: {
          top: `${topPosition - state.position.y}px`,
          left: `${safeLeft - state.position.x}px`
        }
      };
    }
    
    if (hasBottomSpace) {
      // Position below Clippy, centered horizontally
      const centerAlignedLeft = state.position.x + (clippyWidth - chatWidth) / 2;
      const safeLeft = Math.max(margin, Math.min(centerAlignedLeft, window.innerWidth - chatWidth - margin));
      
      return {
        position: 'bottom-center',
        style: {
          top: `${bottomPosition - state.position.y}px`,
          left: `${safeLeft - state.position.x}px`
        }
      };
    }
    
    // Last resort: force left side with partial visibility, but never overlap
    const forcedLeft = Math.max(-chatWidth + 100, leftPosition); // Keep more visible
    const middleAlignedTop = state.position.y + (clippyHeight - chatHeight) / 2;
    const safeTop = Math.max(margin, Math.min(middleAlignedTop, window.innerHeight - chatHeight - margin));
    
    return {
      position: 'forced-left',
      style: {
        top: `${safeTop - state.position.y}px`,
        left: `${forcedLeft - state.position.x}px`
      }
    };
  };

  // Manual drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    // Allow dragging even when chat is open, but not from the chat window itself
    const target = e.target as HTMLElement;
    if (target.closest('.chat-window')) return;
    
    const startX = e.clientX - state.position.x;
    const startY = e.clientY - state.position.y;
    setIsDragging(true);

    const handleMouseMove = (e: MouseEvent) => {
      setState(prev => ({
        ...prev,
        position: {
          x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - startX)),
          y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - startY))
        }
      }));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return null;
  }

  return (
    <>
      <div 
        ref={clippyRef}
        className="fixed z-[9999]"
        style={{
          left: `${state.position.x}px`,
          top: `${state.position.y}px`,
          transition: isDragging ? 'none' : 'all 0.2s ease-out',
          pointerEvents: 'auto'
        }}
      >
        {/* Clippy Character */}
        <div 
          className={`
            select-none cursor-move
            ${isAnimating ? 'animate-bounce' : ''}
            ${isDancing ? 'animate-spin' : ''}
          `}
          onMouseDown={handleMouseDown}
        >
          <div
            onClick={() => !state.isOpen && setState(prev => ({ ...prev, isOpen: true }))}
            className={`
              relative bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800
              rounded-full w-20 h-20 shadow-2xl border-4 border-white dark:border-gray-600
              flex items-center justify-center text-3xl font-bold
              hover:scale-110 transition-all duration-300 group
              ${!state.isOpen && !isDragging ? 'cursor-pointer' : 'cursor-move'}
            `}
          >
            {/* Clippy Face */}
            <div className="text-gray-700 dark:text-gray-300">
              {getClippyExpression()}
            </div>
            
            {/* Paperclip decoration */}
            <div className="absolute -top-2 -right-2 text-2xl animate-pulse">
              📎
            </div>
            
            {/* Activity indicators */}
            <div className="absolute -top-3 -left-3 text-sm">
              {mood === 'thinking' && '💭'}
              {mood === 'excited' && '✨'}
              {mood === 'winking' && '😉'}
              {mood === 'embarrassed' && '😅'}
            </div>
            
            {/* Speech bubble indicator when closed */}
            {!state.isOpen && (
              <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white rounded-full p-1.5 group-hover:scale-110 transition-transform">
                <MessageCircle size={14} />
              </div>
            )}
          </div>
        </div>

        {/* Joke Bubble */}
        {showJoke && !state.isOpen && (
          <div className="absolute top-0 left-24 w-64 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 border-2 border-gray-200 dark:border-gray-700">
              <div className="flex items-start space-x-2">
                <Laugh className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5 animate-pulse" />
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {currentJoke}
                </p>
              </div>
              <div className="absolute -left-2 top-4 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-white dark:border-r-gray-800 border-b-8 border-b-transparent"></div>
            </div>
          </div>
        )}

        {/* Tip Bubble - positioned to the left with enhanced visibility */}
        {showTip && !state.isOpen && (
          <div className={`absolute top-0 right-24 w-72 animate-fade-in ${customTip ? 'z-50' : ''}`}>
            <div className={`
              ${customTip 
                ? 'bg-gradient-to-r from-red-500 to-pink-500 dark:from-red-600 dark:to-pink-600 text-white shadow-2xl border-2 border-red-300 dark:border-red-700' 
                : 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-700'}
              rounded-lg p-4 shadow-xl transform transition-all duration-300 hover:scale-105
              ${isDancing ? 'animate-bounce' : ''}
            `}>
              <div className="flex items-start space-x-2">
                {customTip ? (
                  <>
                    <Sparkles className="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5 animate-pulse" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white mb-1">🎉 Mode Switched!</p>
                      <p className="text-sm text-white/90">
                        {currentTip}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {currentTip}
                    </p>
                  </>
                )}
              </div>
              <div className={`absolute -right-2 top-4 w-0 h-0 border-t-8 border-t-transparent border-l-8 ${customTip ? 'border-l-red-500 dark:border-l-red-600' : 'border-l-blue-50 dark:border-l-blue-900/20'} border-b-8 border-b-transparent`}></div>
            </div>
          </div>
        )}

        {/* Chat Window - positioned intelligently to stay in viewport */}
        {state.isOpen && (() => {
          const positionInfo = getChatWindowPosition();
          return (
            <div 
              className="absolute w-96 h-[500px] bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 animate-fade-in chat-window"
              style={positionInfo.style}
            >
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-lg select-none">
              <div className="flex items-center space-x-2">
                <div className="text-2xl animate-bounce">📎</div>
                <div>
                  <h3 className="font-semibold">Clippy Assistant 2.0</h3>
                  <p className="text-xs opacity-90">Your AI-powered helper</p>
                </div>
              </div>
              <button
                onClick={() => setState(prev => ({ ...prev, isOpen: false }))}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-center space-x-2 p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <button
                onClick={() => {
                  showContextualJoke();
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/30 transition-colors text-sm"
              >
                <Laugh size={14} />
                <span>Tell Joke</span>
              </button>
              <button
                onClick={() => {
                  showRandomTip();
                  setState(prev => ({ ...prev, isOpen: false }));
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors text-sm"
              >
                <Brain size={14} />
                <span>Get Tip</span>
              </button>
              <button
                onClick={() => {
                  setIsDancing(true);
                  setTimeout(() => setIsDancing(false), 3000);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/30 transition-colors text-sm"
              >
                <Music size={14} />
                <span>Dance!</span>
              </button>
            </div>

            {/* Chat Messages */}
            <div className="h-[300px] overflow-y-auto p-4 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div
                    className={`
                      max-w-[80%] p-3 rounded-lg text-sm whitespace-pre-wrap
                      ${message.isUser 
                        ? 'bg-blue-500 text-white rounded-br-none' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-bl-none'
                      }
                    `}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-b-lg">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex space-x-2"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me anything... (try 'help' or 'dance'!)"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 flex items-center space-x-1 shadow-lg"
                >
                  <Sparkles size={16} />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
          );
        })()}
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { 
            opacity: 0;
            transform: translateY(-4px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
});

ClippyAssistant.displayName = 'ClippyAssistant';

export default ClippyAssistant;