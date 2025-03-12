'use client';

import { useState, useEffect, useRef } from 'react';
import { IChatMessage } from '@/modules/chat/types';
import ChatInterface from '@/modules/chat/components/ChatInterface';
import { ChatSpeedProvider } from '@/modules/chat/context/ChatSpeedContext';

const SupportChatbotInner = () => {
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Add initial welcome message
    setMessages([
      {
        id: '1',
        content: 'Hello! Welcome to All You Can Learn support. How can I help you today?',
        role: 'assistant',
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Clean up any ongoing requests when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSendMessage = async (message: string, speedMultiplier: number = 1) => {
    if (!message.trim()) return;
    console.log("Sending message:", message, "Speed:", speedMultiplier);

    // Add user message
    const userMessage: IChatMessage = {
      id: Date.now().toString(),
      content: message,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Create a placeholder for the assistant's message
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: IChatMessage = {
      id: assistantMessageId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController();

      // Get streaming response from AI
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, speedMultiplier }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let done = false;
      let fullContent = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);

            if (data === '[DONE]') {
              done = true;
              break;
            }

            try {
              const parsedData = JSON.parse(data);
              if (parsedData.content) {
                fullContent = parsedData.content;
                // Update the assistant message with the full content
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: fullContent }
                      : msg
                  )
                );
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
      } else {
        console.error('Error getting response:', error);
        // Update the assistant message with an error
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                ...msg,
                content: 'Sorry, an error occurred. Please try again later.'
              }
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
    setIsMaximized(false); // Reset maximize state when closing
  };

  const toggleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMaximized(!isMaximized);
  };

  return (
    <>
      {isChatOpen && (
        <div className="fixed inset-0 bg-black/5 backdrop-blur-sm transition-all"
          onClick={toggleChat}
          aria-hidden="true"
        />
      )}
      <div className={`fixed z-50 transition-all duration-300 ${isMaximized
          ? 'inset-4 lg:inset-6'
          : 'bottom-6 right-6'
        }`}>
        {!isChatOpen ? (
          <button
            onClick={toggleChat}
            className="w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
            aria-label="Open support chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
        ) : (
          <div className={`bg-white rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-3 duration-300 ${isMaximized ? 'w-full h-full' : 'w-[440px] h-[750px]'
            }`}>
            <div className="flex items-center justify-between px-6 py-4 border-b bg-purple-600 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                <h2 className="text-xl font-semibold text-white">All You Can Learn Support</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMaximize}
                  className="text-white/80 hover:text-white transition-colors p-1.5 hover:bg-purple-500 rounded-lg active:scale-95"
                  aria-label={isMaximized ? "Minimize chat" : "Maximize chat"}
                >
                  {isMaximized ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={toggleChat}
                  className="text-white/80 hover:text-white transition-colors p-1.5 hover:bg-purple-500 rounded-lg active:scale-95"
                  aria-label="Close support chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-gray-50">
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Wrap the component with the ChatSpeedProvider
const SupportChatbot = () => (
  <ChatSpeedProvider>
    <SupportChatbotInner />
  </ChatSpeedProvider>
);

export default SupportChatbot;