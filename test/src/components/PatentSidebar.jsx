import React from 'react';

const PatentSidebar = ({ patents, selectedPatent, onSelectPatent }) => {
  console.log(patents);
  
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-lg">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-primary-100">
        <h2 className="text-lg font-semibold text-gray-800">Patent Library</h2>
        <p className="text-xs text-gray-600 mt-1">{patents?.length || 0} patents available</p>
      </div>

      {/* Patent List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {patents?.map((patent) => (
          <button
            key={patent.id}
            onClick={() => onSelectPatent(patent)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
              selectedPatent?.id === patent.id
                ? 'border-primary-500 bg-primary-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-1 p-2 rounded-lg ${
                selectedPatent?.id === patent.id
                  ? 'bg-primary-100'
                  : 'bg-gray-100'
              }`}>
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-mono mb-1 ${
                  selectedPatent?.id === patent.id
                    ? 'text-primary-700'
                    : 'text-gray-500'
                }`}>
                  {patent.patentNumber}
                </div>
                <div className={`text-sm font-medium leading-tight ${
                  selectedPatent?.id === patent.id
                    ? 'text-gray-900'
                    : 'text-gray-700'
                }`}>
                  {patent.title}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600">
          <p className="font-medium mb-1">💡 Demo Features:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>Natural language questions</li>
            <li>Clear source citations</li>
            <li>Real-time responses</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PatentSidebar;