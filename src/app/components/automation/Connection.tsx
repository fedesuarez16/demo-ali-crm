'use client';

import React from 'react';
import { NodeConnection, NodeData } from '../../types';

interface ConnectionProps {
  connection: NodeConnection;
  nodes: NodeData[];
}

const Connection: React.FC<ConnectionProps> = ({ connection, nodes }) => {
  const sourceNode = nodes.find(node => node.id === connection.source);
  const targetNode = nodes.find(node => node.id === connection.target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  // Calcular los puntos de inicio y fin de la conexión
  const startX = sourceNode.position.x + 72;  // Ancho del nodo / 2 + desplazamiento
  const startY = sourceNode.position.y;
  const endX = targetNode.position.x - 72;    // - (Ancho del nodo / 2 + desplazamiento)
  const endY = targetNode.position.y;

  // Calcular los puntos de control para la curva Bezier
  const controlPointX1 = startX + Math.min(100, Math.abs(endX - startX) / 2);
  const controlPointX2 = endX - Math.min(100, Math.abs(endX - startX) / 2);

  // Path para la curva Bezier
  const path = `M${startX},${startY} C${controlPointX1},${startY} ${controlPointX2},${endY} ${endX},${endY}`;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <path
        d={path}
        stroke="rgba(107, 114, 128, 0.7)"
        strokeWidth="2"
        fill="none"
        markerEnd="url(#arrowhead)"
      />
      
      {connection.label && (
        <text
          x={(startX + endX) / 2}
          y={(startY + endY) / 2 - 10}
          fontSize="12"
          fill="#6B7280"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {connection.label}
        </text>
      )}
      
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="rgba(107, 114, 128, 0.7)" />
        </marker>
      </defs>
    </svg>
  );
};

export default Connection; 