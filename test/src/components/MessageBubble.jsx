import React from 'react';

const MessageBubble = ({ message }) => {
  const isUser = message.type === 'user';
  const isError = message.type === 'error';

  if (isError) {
    return (
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-sm text-red-800">{message.content}</p>
          <p className="text-xs text-red-600 mt-2">
            Make sure the backend server is running on port 5000
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-primary-600' : 'bg-primary-100'
      }`}>
        {isUser ? (
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        ) : (
          <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          </svg>
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-3xl ${isUser ? 'flex justify-end' : ''}`}>
        <div className={`rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 text-gray-800'
        }`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

          {/* Citations */}
          {message.citations && message.citations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-300 space-y-1">
              <p className="text-xs font-medium text-gray-600 mb-2">Sources:</p>
              {message.citations.map((citation, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center space-x-1 bg-white text-primary-700 px-2 py-1 rounded text-xs mr-2 mb-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium">{citation.patentId}</span>
                  <span className="text-gray-400">•</span>
                  <span>Page {citation.page}</span>
                  <span className="text-gray-400">•</span>
                  <span>{citation.section}</span>
                </div>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <p className={`text-xs mt-2 ${isUser ? 'text-primary-100' : 'text-gray-500'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;