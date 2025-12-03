import React from 'react';
import { API_BASE_URL } from '../api/config';

const PatentSidebar = ({ patents, selectedPatent, onSelectPatent }) => {
  const handleDownload = (e, patent) => {
    e.stopPropagation(); // Prevent patent selection when clicking download
    
    const downloadUrl = `${API_BASE_URL}/patents/${patent.patentNumber}/download`;
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${patent.patentNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!patents) {
    return (
      <div className="w-80 bg-white border-r border-gray-200 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading patents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-lg">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-primary-100">
        <h2 className="text-lg font-semibold text-gray-800">Patent Library</h2>
        <p className="text-xs text-gray-600 mt-1">{patents.length} patents available</p>
      </div>

      {/* Patent List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {patents.map((patent) => (
          <div
            key={patent.id}
            className={`rounded-lg border-2 transition-all duration-200 ${
              selectedPatent?.id === patent.id
                ? 'border-primary-500 bg-primary-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-sm'
            }`}
          >
            <button
              onClick={() => onSelectPatent(patent)}
              className="w-full text-left p-4"
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
                  <div className={`text-sm font-medium leading-tight line-clamp-2 ${
                    selectedPatent?.id === patent.id
                      ? 'text-gray-900'
                      : 'text-gray-700'
                  }`}>
                    {patent.title}
                  </div>
                  
                  {/* Patent Stats */}
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      {patent.numPages} pages
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {patent.sectionsCount} sections
                    </span>
                  </div>

                  {/* Keywords */}
                  {patent.keywords && patent.keywords.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {patent.keywords.slice(0, 3).map((keyword, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                        >
                          {keyword}
                        </span>
                      ))}
                      {patent.keywords.length > 3 && (
                        <span className="text-xs px-2 py-0.5 text-gray-400">
                          +{patent.keywords.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </button>

            {/* Download Button */}
            {patent.pdfAvailable && (
              <div className="px-4 pb-3">
                <button
                  onClick={(e) => handleDownload(e, patent)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600">
          <p className="font-medium mb-1">💡 Demo Features:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>Natural language questions</li>
            <li>Clear source citations</li>
            <li>PDF file downloads</li>
            <li>Real-time LLM responses</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PatentSidebar;