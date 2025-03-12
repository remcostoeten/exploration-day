'use client'

import { useState, useRef, useEffect } from 'react';
import { IChatMessage } from '@/modules/chat/types';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import SuggestedQuestions from './suggested-questions/SuggestedQuestions';
import { SpeedControl } from './SpeedControl';
import { useChatSpeed } from '../context/ChatSpeedContext';
import { toast } from 'sonner';

interface IChatInterfaceProps {
  messages: IChatMessage[];
  onSendMessage: (message: string, speedMultiplier: number) => void;
  isLoading: boolean;
}

const ChatInterface = ({ messages, onSendMessage, isLoading }: IChatInterfaceProps) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [nonContextCount, setNonContextCount] = useState(0);
  const [showHumanSupport, setShowHumanSupport] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { speedMultiplier } = useChatSpeed();

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputValue.trim();

    // Basic validation
    if (!trimmedInput || isLoading) return;

    // Check if the input is primarily English using a simple regex
    const nonEnglishPattern = /[^\x00-\x7F]+/;
    if (nonEnglishPattern.test(trimmedInput)) {
      toast.error('Please use English for your questions.');
      return;
    }

    // Check for minimum length
    if (trimmedInput.length < 3) {
      toast.error('Your question is too short. Please be more specific.');
      return;
    }

    onSendMessage(trimmedInput, speedMultiplier);
    setInputValue('');
  };

  const handleSuggestedQuestionClick = (question: string) => {
    onSendMessage(question, speedMultiplier);
  };

  const handleFeedback = async (messageId: string, isHelpful: boolean, comment?: string) => {
    // Find the message content
    const message = messages.find(msg => msg.id === messageId);
    if (!message) return;

    try {
      // Send feedback to the API
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          isHelpful,
          comment,
          messageContent: message.content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send feedback');
      }

      console.log('Feedback sent successfully');
    } catch (error) {
      console.error('Error sending feedback:', error);
    }
  };

  // Function to handle speaking to a human
  const handleSpeakToHuman = () => {
    // You can implement your human support routing logic here
    toast.success("Connecting you to human support...");
    // Reset the counters
    setNonContextCount(0);
    setShowHumanSupport(false);
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  useEffect(() => {
    if (!showScrollButton) {
      scrollToBottom();
    }
  }, [messages, showScrollButton]);

  useEffect(() => {
    // Check if the last message is empty (which means it's still streaming)
    const lastMessage = messages[messages.length - 1];
    setIsTyping(isLoading && (!lastMessage || lastMessage.content === ''));
  }, [messages, isLoading]);

  useEffect(() => {
    // Check the last two messages for non-contextual responses
    if (messages.length >= 2) {
      const lastMessage = messages[messages.length - 1];

      // Check if the last message contains phrases indicating lack of context
      const nonContextPhrases = [
        "I don't understand",
        "I'm not sure what you mean",
        "Could you please clarify",
        "I cannot help with that",
        "I don't have information about",
        "I'm not able to assist with",
        "That's not something I can help with"
      ];

      if (lastMessage.role === 'assistant' &&
        nonContextPhrases.some(phrase => lastMessage.content.toLowerCase().includes(phrase.toLowerCase()))) {
        setNonContextCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            setShowHumanSupport(true);
          }
          return newCount;
        });
      } else {
        // Reset the counter if we get a proper response
        setNonContextCount(0);
        setShowHumanSupport(false);
      }
    }
  }, [messages]);

  const suggestedQuestions = [
    'How do I start a course?',
    'How do I unenroll from a course?',
    'What is the structure of a course?',
    'How do I choose a mentor?',
    'Can I get an invoice for my purchase?'
  ];

  return (
    <div className="flex flex-col h-full">
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-6 relative scroll-smooth"
      >
        <MessageList
          messages={messages}
          onFeedback={handleFeedback}
        />
        {isTyping && (
          <div className="flex space-x-2 p-4" role="status" aria-label="Agent is typing">
            <span className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce"></span>
          </div>
        )}
        {showHumanSupport && (
          <div className="flex flex-col items-center p-4 bg-purple-50 rounded-lg border border-purple-200 my-4">
            <p className="text-purple-800 mb-3">Would you like to speak with a human support agent?</p>
            <button
              onClick={handleSpeakToHuman}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Connect with Human Support
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />

        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 p-2 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all hover:scale-110 active:scale-95"
            aria-label="Scroll to bottom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        )}
      </div>

      {messages?.length <= 2 && (
        <div className="px-6">
          <SuggestedQuestions
            questions={suggestedQuestions}
            onQuestionClick={handleSuggestedQuestionClick}
          />
        </div>
      )}

      {process.env.NODE_ENV === 'development' && <SpeedControl />}

      <div className="p-6 pt-4">
        <MessageInput
          value={inputValue}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          placeholder="Type your question here..."
        />
      </div>
    </div>
  );
};

export default ChatInterface;