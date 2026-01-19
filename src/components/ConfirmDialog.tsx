import React from 'react';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 safe-area-inset-top safe-area-inset-bottom">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mx-4 max-w-md w-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{message}</h3>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 touch-manipulation min-h-[44px]"
          >
            Yes
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 touch-manipulation min-h-[44px]"
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
}
