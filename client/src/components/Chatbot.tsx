"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import api from "@/lib/api";

type Message = {
  id: string;
  role: "user" | "bot";
  content: string;
};

const renderMessageContent = (content: string) => {
  const parts = content.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, idx) => {
    const isUrl = /^https?:\/\//.test(part);
    if (!isUrl) {
      return <span key={`text-${idx}`}>{part}</span>;
    }

    return (
      <a
        key={`url-${idx}`}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-2 underline-offset-2 break-all text-blue-300 hover:text-blue-200"
      >
        {part}
      </a>
    );
  });
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "bot",
      content: "Chào bạn! Tôi có thể giúp gì cho bạn? Hãy thử gõ 'hướng dẫn' nhé.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleChat = () => setIsOpen((prev) => !prev);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: userMessage },
    ]);
    setIsLoading(true);

    try {
      const { data } = await api.post("/chatbot", { message: userMessage });
      const botResponse = data?.data?.response || "Rất tiếc, tôi không thể xử lý yêu cầu lúc này.";
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "bot", content: botResponse },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "bot", content: "Đã có lỗi xảy ra. Hãy thử lại sau." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        aria-label="Open Chatbot"
      >
        {isOpen ? <X size={26} /> : <MessageCircle size={26} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-indigo-600 text-white p-4 flex justify-between items-center sm:rounded-t-xl">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageCircle size={20} />
              Trợ lý Thư viện
            </h3>
            <button onClick={toggleChat} className="text-indigo-100 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto max-h-[400px] min-h-[300px] bg-gray-50 flex flex-col gap-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[85%] p-3 rounded-lg text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white self-end rounded-br-none"
                    : "bg-white text-gray-800 self-start rounded-bl-none border border-gray-200 shadow-sm"
                }`}
              >
                {msg.role === "bot" ? renderMessageContent(msg.content) : msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="bg-white text-gray-500 self-start p-3 rounded-lg rounded-bl-none border border-gray-200 shadow-sm flex gap-1 items-center">
                 <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse"></span>
                 <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse delay-75"></span>
                 <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse delay-150"></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-200 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập yêu cầu..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900 bg-white placeholder-gray-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2 flex items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
