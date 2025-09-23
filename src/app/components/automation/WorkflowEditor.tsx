'use client';

import React, { useState, useRef, useEffect } from 'react';
import Node from './Node';
import Connection from './Connection';
import NodePanel from './NodePanel';
import NodeProperties from './NodeProperties';
import { NodeData, NodeConnection, NodeType, AutomationWorkflow } from '../../types';

interface WorkflowEditorProps {
  workflow: AutomationWorkflow;
  onSave: (workflow: AutomationWorkflow) => void;
}

const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ workflow, onSave }) => {
  const [nodes, setNodes] = useState<NodeData[]>(workflow.nodes);
  const [connections, setConnections] = useState<NodeConnection[]>(workflow.connections);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState(workflow.name);
  const [workflowDescription, setWorkflowDescription] = useState(workflow.description);
  const [isActive, setIsActive] = useState(workflow.active);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Función para actualizar el workflow
  const updateWorkflow = () => {
    onSave({
      ...workflow,
      name: workflowName,
      description: workflowDescription,
      active: isActive,
      nodes,
      connections,
    });
  };

  // Seleccionar un nodo
  const handleSelectNode = (id: string) => {
    if (isConnecting) {
      // Estamos conectando nodos
      if (connectionStart && connectionStart !== id) {
        // Crear nueva conexión
        const newConnection: NodeConnection = {
          id: `conn-${Date.now()}`,
          source: connectionStart,
          target: id,
          label: '',
        };
        
        setConnections([...connections, newConnection]);
        setIsConnecting(false);
        setConnectionStart(null);
      }
    } else {
      setSelectedNodeId(id);
    }
  };
  
  // Agregar un nuevo nodo
  const handleAddNode = (type: NodeType, label: string, description: string) => {
    // Determinar posición inicial para el nuevo nodo
    const initialPosition = { x: 200, y: 200 };
    
    // Crear datos por defecto según el tipo de nodo
    let defaultData: any = {};
    switch (type) {
      case 'trigger':
        defaultData = { eventType: 'nuevoLead', conditions: {} };
        break;
      case 'message':
        defaultData = { 
          messageTemplate: 'Hola {{nombreCompleto}}, gracias por tu interés.',
          variables: { nombreCompleto: 'lead.nombreCompleto' },
          channel: 'whatsapp'
        };
        break;
      case 'condition':
        defaultData = { condition: 'estado', comparator: '==', value: 'nuevo' };
        break;
      case 'delay':
        defaultData = { delayTime: 1, timeUnit: 'hours' };
        break;
      case 'action':
        defaultData = { actionType: 'actualizarEstadoLead', parameters: {} };
        break;
    }
    
    const newNode: NodeData = {
      id: `node-${Date.now()}`,
      type,
      label,
      description,
      position: initialPosition,
      data: defaultData,
    };
    
    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
  };
  
  // Actualizar un nodo
  const handleUpdateNode = (nodeId: string, updates: Partial<NodeData>) => {
    setNodes(nodes.map(node => 
      node.id === nodeId 
        ? { ...node, ...updates } 
        : node
    ));
  };
  
  // Manejar el arrastre de un nodo
  const handleNodeDrag = (nodeId: string, position: { x: number; y: number }) => {
    setNodes(nodes.map(node => 
      node.id === nodeId 
        ? { ...node, position } 
        : node
    ));
  };
  
  // Eliminar un nodo
  const handleDeleteNode = () => {
    if (!selectedNodeId) return;
    
    // Eliminar el nodo
    setNodes(nodes.filter(node => node.id !== selectedNodeId));
    
    // Eliminar conexiones relacionadas con el nodo
    setConnections(connections.filter(
      conn => conn.source !== selectedNodeId && conn.target !== selectedNodeId
    ));
    
    setSelectedNodeId(null);
  };
  
  // Iniciar la conexión de nodos
  const handleStartConnection = () => {
    if (!selectedNodeId) return;
    
    setIsConnecting(true);
    setConnectionStart(selectedNodeId);
  };
  
  // Cancelar la conexión actual
  const handleCancelConnection = () => {
    setIsConnecting(false);
    setConnectionStart(null);
  };
  
  // Escuchar la tecla Escape para cancelar la conexión
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelConnection();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const selectedNode = selectedNodeId ? nodes.find(node => node.id === selectedNodeId) || null : null;
  
  return (
    <div className="flex flex-col h-screen">
      <div className="bg-white p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                className="text-2xl font-semibold bg-transparent focus:outline-none focus:border-b-2 focus:border-blue-500"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Nombre del flujo"
              />
              <div className="flex items-center">
                <span className="mr-2">Activo</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isActive}
                    onChange={() => setIsActive(!isActive)}
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            <input
              type="text"
              className="text-gray-600 mt-1 w-full bg-transparent focus:outline-none"
              value={workflowDescription}
              onChange={(e) => setWorkflowDescription(e.target.value)}
              placeholder="Descripción del flujo"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={updateWorkflow}
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <NodePanel onAddNode={handleAddNode} />
        
        <div className="flex-1 relative bg-gray-50 overflow-auto" ref={canvasRef}>
          {/* Grid de fondo */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundSize: '20px 20px',
              backgroundImage: 'radial-gradient(circle, #ddd 1px, transparent 1px)',
              backgroundPosition: '0 0',
            }}
          />
          
          {/* Conexiones */}
          {connections.map((connection) => (
            <Connection
              key={connection.id}
              connection={connection}
              nodes={nodes}
            />
          ))}
          
          {/* Nodos */}
          {nodes.map((node) => (
            <Node
              key={node.id}
              node={node}
              selected={selectedNodeId === node.id}
              onSelect={handleSelectNode}
              onNodeDrag={handleNodeDrag}
            />
          ))}
          
          {/* Barra de herramientas */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-full shadow-lg p-2 flex space-x-2">
            {selectedNodeId && (
              <>
                <button
                  onClick={handleDeleteNode}
                  className="p-2 rounded-full hover:bg-gray-100 text-red-500"
                  title="Eliminar nodo"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <button
                  onClick={handleStartConnection}
                  className={`p-2 rounded-full hover:bg-gray-100 ${isConnecting ? 'bg-blue-100 text-blue-500' : ''}`}
                  title="Conectar nodos"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 015.656 0l4 4a4 4 0 11-5.656 5.656l-1.102-1.101" />
                  </svg>
                </button>
              </>
            )}
            
            {isConnecting && (
              <button
                onClick={handleCancelConnection}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                title="Cancelar conexión"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        <NodeProperties
          selectedNode={selectedNode}
          onUpdateNode={handleUpdateNode}
        />
      </div>
    </div>
  );
};

export default WorkflowEditor; 