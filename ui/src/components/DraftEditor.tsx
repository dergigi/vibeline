'use client';

import React, { useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { motion } from 'framer-motion';

interface DraftEditorProps {
  initialContent: string;
  onClose: () => void;
}

export const DraftEditor: React.FC<DraftEditorProps> = ({ initialContent, onClose }) => {
  const [content, setContent] = useState(initialContent);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Draft
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Close
          </button>
        </div>
        
        <div className="flex-1 overflow-auto">
          <div data-color-mode="dark">
            <MDEditor
              value={content}
              onChange={value => setContent(value || '')}
              preview="edit"
              height={500}
              className="w-full"
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}; 