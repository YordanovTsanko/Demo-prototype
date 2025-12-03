import React, { useState } from "react";
import PatentSidebar from "../components/PatentSidebar";
import ChatArea from "../components/ChatArea";
import { usePatents } from "../hooks/usePatents";

const ChatPage = () => {
  const [selectedPatent, setSelectedPatent] = useState(null);
  const { data: patents, isLoading, error } = usePatents();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Connection Error
          </h2>
          <p className="text-gray-600 mb-4">
            Unable to connect to the backend server. Please ensure the server is
            running on port 5000.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <PatentSidebar
        patents={patents}
        selectedPatent={selectedPatent}
        onSelectPatent={setSelectedPatent}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Patent Chat Demo
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Ask questions about patents in natural language
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-lg">
              <span className="text-yellow-600 text-sm">⚡</span>
              <span className="text-xs font-medium text-yellow-700">
                Demo Mode
              </span>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <ChatArea selectedPatent={selectedPatent} />
      </div>
    </div>
  );
};

export default ChatPage;
