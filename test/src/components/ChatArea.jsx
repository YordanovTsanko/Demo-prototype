import React, { useState } from 'react';
import MessageBubble from './MessageBubble';
import QuestionInput from './QuestionInput';
import { useChatMutation } from '../hooks/usePatents';

const ChatArea = ({ selectedPatent }) => {
  const [messages, setMessages] = useState([]);
  const chatMutation = useChatMutation();

  const handleQuestionSubmit = async (values, formikBag) => {
    if (!selectedPatent) return;

    const question = values.question;

    // Add user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: question,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // FIXED: Use patentNumber instead of _id
      const response = await chatMutation.mutateAsync({
        patentId: selectedPatent.patentNumber || selectedPatent.id,
        question,
      });

      // Add assistant response
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: response.answer,
        citations: response.citations,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Reset form
      formikBag.resetForm();
    } catch (error) {
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: error.message || 'Sorry, I encountered an error processing your question. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      console.error('Chat error:', error);
    }
  };

  if (!selectedPatent) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center px-6">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a Patent to Start</h3>
          <p className="text-gray-500 max-w-md">
            Choose a patent from the sidebar to begin asking questions about its content, 
            composition, manufacturing process, and more.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-800 truncate">
          {selectedPatent.patentNumber || selectedPatent.id}
        </h2>
        <p className="text-sm text-gray-500 truncate mt-1">
          {selectedPatent.title}
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <p className="text-gray-500 mb-4">
                Ask me anything about this patent! For example:
              </p>
              <div className="space-y-2 text-sm text-gray-400">
                <p>• What is this patent about?</p>
                <p>• What are the main components?</p>
                <p>• How is it manufactured?</p>
                <p>• What are its advantages?</p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        
        {/* Loading indicator */}
        {chatMutation.isPending && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              </svg>
            </div>
            <div className="flex-1 bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
        <QuestionInput
          onSubmit={handleQuestionSubmit}
          disabled={chatMutation.isPending}
        />
      </div>
    </div>
  );
};

export default ChatArea;