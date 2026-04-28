import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, X, Bot } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = 'llama2';
const OLLAMA_TIMEOUT = 5000; // 5 second timeout for connection check
const OLLAMA_RETRY_ATTEMPTS = 2;

// Check if Ollama is running and accessible
const checkOllamaConnection = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT);
    
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
};

const extractOllamaText = (data: unknown): string => {
  if (!data || typeof data !== 'object') return 'Sorry, I couldn\'t generate a response.';

  const obj = data as Record<string, unknown>;

  if (typeof obj.response === 'string' && obj.response.trim()) return obj.response;
  if (typeof obj.text === 'string' && obj.text.trim()) return obj.text;

  const choices = obj.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const firstChoice = choices[0] as Record<string, unknown>;
    if (typeof firstChoice.text === 'string' && firstChoice.text.trim()) {
      return firstChoice.text;
    }
    const message = firstChoice.message;
    if (message && typeof message === 'object') {
      const messageObj = message as Record<string, unknown>;
      if (typeof messageObj.content === 'string' && messageObj.content.trim()) {
        return messageObj.content;
      }
    }
  }

  const output = obj.output;
  if (Array.isArray(output)) {
    const first = output[0];
    if (first && typeof first === 'object') {
      const firstObj = first as Record<string, unknown>;
      if (typeof firstObj.content === 'string' && firstObj.content.trim()) {
        return firstObj.content;
      }
    }
  }

  if (typeof output === 'string' && output.trim()) return output;

  try {
    return JSON.stringify(data);
  } catch {
    return 'Sorry, I couldn\'t generate a response.';
  }
};

const getAvailableOllamaModel = async (preferred: string): Promise<string> => {
  // Check connection first with timeout
  const isConnected = await checkOllamaConnection();
  if (!isConnected) {
    throw new Error('Ollama is not running. Please start Ollama and ensure it\'s accessible at localhost:11434');
  }

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < OLLAMA_RETRY_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT);
      
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to load Ollama models (HTTP ${response.status})`);
      }

      const data = await response.json();
      const models = Array.isArray(data?.models) 
        ? data.models.map((m: { name: string }) => m.name)
        : [];

      if (models.length === 0) {
        throw new Error('No Ollama models found. Please pull a model (e.g., `ollama pull llama2`)');
      }

      if (models.includes(preferred)) return preferred;
      return models[0];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < OLLAMA_RETRY_ATTEMPTS - 1) {
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  throw lastError || new Error('Failed to connect to Ollama after multiple attempts');
};

export default function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      text: input,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const prompt = `You are a helpful, professional AI assistant. You can help with a wide variety of topics including mathematics, science, writing, coding, analysis, creative tasks, and much more.

User question: ${input}

Provide clear, concise, and helpful responses. Be professional, friendly, and thorough in your explanations. Use formatting and structure to make answers easy to read.`;

      const model = await getAvailableOllamaModel(DEFAULT_OLLAMA_MODEL);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for generation

      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          temperature: 0.2,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const errorBody = contentType.includes('application/json')
          ? await response.json().catch(() => null)
          : await response.text().catch(() => null);

        throw new Error(
          `Ollama request failed (${response.status}): ${
            errorBody
              ? typeof errorBody === 'string'
                ? errorBody
                : JSON.stringify(errorBody)
              : response.statusText
          }`
        );
      }

      const data = await response.json();
      let responseText = extractOllamaText(data);

      const aiMessage: Message = {
        id: Date.now() + 1,
        text: responseText,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure Ollama is running with a compatible model.`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 flex items-center justify-center shadow-xl z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="Open AI Assistant"
      >
        <MessageCircle size={24} className="text-white" />
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 left-6 w-96 h-[550px] bg-white border-2 border-blue-200 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-blue-500">
              <div className="flex items-center gap-2">
                <Bot size={20} className="text-white" />
                <span className="font-semibold text-white text-lg">AI Assistant</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-blue-50 to-blue-100">
              {messages.length === 0 && (
                <div className="text-center text-blue-700 py-8">
                  <Bot size={32} className="mx-auto mb-2 opacity-70 text-blue-600" />
                  <p className="font-semibold">Hello! 👋 How can I assist you today?</p>
                  <p className="text-sm mt-2 text-blue-600">I'm here to help with questions, ideas, writing, coding, analysis, and much more.</p>
                </div>
              )}
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-xl ${
                      msg.isUser
                        ? 'bg-blue-600 text-white rounded-bl-none shadow-md'
                        : 'bg-white text-gray-800 border border-blue-200 rounded-br-none shadow-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    <p className={`text-xs mt-1 opacity-50 ${msg.isUser ? 'text-blue-200' : 'text-gray-500'}`}>
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white border border-blue-200 p-3 rounded-xl rounded-br-none shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}} />
                      <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse" style={{animationDelay: '0.4s'}} />
                      <span className="text-sm text-gray-700 ml-1">Thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-blue-200 bg-white">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message here..."
                  className="flex-1 px-4 py-2 bg-blue-50 border border-blue-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-lg flex items-center justify-center transition-colors text-white shadow-md hover:shadow-lg"
                  title="Send message (Ctrl+Enter)"
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Press Enter to send</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}