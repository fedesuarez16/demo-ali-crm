'use client';

import React from 'react';
import { NodeType } from '../../types';
import { getAvailableNodeTypes } from '../../services/automationService';

interface NodePanelProps {
  onAddNode: (type: NodeType, label: string, description: string) => void;
}

const NodePanel: React.FC<NodePanelProps> = ({ onAddNode }) => {
  const nodeTypes = getAvailableNodeTypes();

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, type: NodeType, label: string, description: string) => {
    e.dataTransfer.setData('nodeType', type);
    e.dataTransfer.setData('nodeLabel', label);
    e.dataTransfer.setData('nodeDescription', description);
  };

  const getNodeIcon = (type: NodeType) => {
    switch (type) {
      case 'trigger':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'action':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'condition':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        );
      case 'delay':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 6v6l4 4" />
          </svg>
        );
      case 'message':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 4v16m8-8H4" />
          </svg>
        );
    }
  };

  const getNodeColor = (type: NodeType) => {
    switch (type) {
      case 'trigger':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'action':
        return 'bg-green-500 hover:bg-green-600';
      case 'condition':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'delay':
        return 'bg-purple-500 hover:bg-purple-600';
      case 'message':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <div className="w-64 h-full bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Nodos disponibles</h2>
      
      <div className="space-y-6">
        {nodeTypes.map((category) => (
          <div key={category.type} className="space-y-2">
            <h3 className="font-medium text-sm text-gray-500 uppercase tracking-wider">{category.label}</h3>
            
            {category.options.map((option) => (
              <div
                key={option.value}
                draggable
                onDragStart={(e) => handleDragStart(e, category.type as NodeType, option.label, category.description)}
                className={`${getNodeColor(category.type as NodeType)} cursor-grab rounded-md p-2 text-white flex items-center transition-colors`}
                onClick={() => onAddNode(category.type as NodeType, option.label, category.description)}
              >
                <div className="mr-2">
                  {getNodeIcon(category.type as NodeType)}
                </div>
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NodePanel; 