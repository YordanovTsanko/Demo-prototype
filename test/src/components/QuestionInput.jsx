import React from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';

const validationSchema = Yup.object({
  question: Yup.string()
    .trim()
    .min(3, 'Question must be at least 3 characters')
    .max(500, 'Question must be less than 500 characters')
    .required('Please enter a question'),
});

const QuestionInput = ({ onSubmit, disabled }) => {
  return (
    <Formik
      initialValues={{ question: '' }}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
    >
      {({ values, errors, touched, isSubmitting }) => (
        <Form className="space-y-2">
          <div className="relative">
            <Field
              name="question"
              as="textarea"
              rows="3"
              placeholder="Ask a question about this patent..."
              disabled={disabled || isSubmitting}
              className={`w-full px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.question && touched.question
                  ? 'border-red-300'
                  : 'border-gray-300'
              }`}
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-400">
              {values.question.length}/500
            </div>
          </div>

          {errors.question && touched.question && (
            <p className="text-sm text-red-600">{errors.question}</p>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Press Enter to send, Shift+Enter for new line
            </p>
            <button
              type="submit"
              disabled={disabled || isSubmitting || !values.question.trim()}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting || disabled ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Sending...</span>
                </span>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default QuestionInput;