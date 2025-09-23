'use client';

import React from 'react';
import { NodeData } from '../../types';

interface NodeProps {
  node: NodeData;
  selected: boolean;
  onSelect: (id: string) => void;
  onNodeDrag: (id: string, position: { x: number; y: number }) => void;
}

const Node: React.FC<NodeProps> = ({ node, selected, onSelect, onNodeDrag }) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [position, setPosition] = React.useState(node.position);
  const nodeRef = React.useRef<HTMLDivElement>(null);

  const getNodeColor = () => {
    switch (node.type) {
      case 'trigger':
        return 'bg-blue-500';
      case 'action':
        return 'bg-green-500';
      case 'condition':
        return 'bg-yellow-500';
      case 'delay':
        return 'bg-purple-500';
      case 'message':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getNodeIcon = () => {
    switch (node.type) {
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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && nodeRef.current) {
      const canvas = nodeRef.current.parentElement;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const newX = e.clientX - rect.left - 80;
        const newY = e.clientY - rect.top - 20;
        
        setPosition({ x: newX, y: newY });
        onNodeDrag(node.id, { x: newX, y: newY });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleClick = () => {
    onSelect(node.id);
  };

  return (
    <div
      ref={nodeRef}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: selected ? 10 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      className={`w-48 rounded-lg shadow-md ${selected ? 'ring-2 ring-blue-500' : ''}`}
      onClick={handleClick}
    >
      <div
        className={`${getNodeColor()} text-white px-4 py-2 rounded-t-lg flex items-center justify-between`}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center">
          <div className="mr-2">
            {getNodeIcon()}
          </div>
          <span className="font-medium">{node.label}</span>
        </div>
      </div>
      
      <div className="bg-white p-3 rounded-b-lg border border-gray-200">
        <p className="text-xs text-gray-600">{node.description || 'Sin descripción'}</p>
        
        {/* Puntos de conexión */}
        <div className="w-3 h-3 rounded-full bg-gray-500 absolute -left-1 top-1/2 transform -translate-y-1/2"></div>
        <div className="w-3 h-3 rounded-full bg-gray-500 absolute -right-1 top-1/2 transform -translate-y-1/2"></div>
      </div>
    </div>
  );
};

export default Node; 