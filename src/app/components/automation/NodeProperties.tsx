'use client';

import React from 'react';
import { NodeData, TriggerNodeData, MessageNodeData, ConditionNodeData, DelayNodeData, ActionNodeData } from '../../types';

interface NodePropertiesProps {
  selectedNode: NodeData | null;
  onUpdateNode: (nodeId: string, updates: Partial<NodeData>) => void;
}

const NodeProperties: React.FC<NodePropertiesProps> = ({ selectedNode, onUpdateNode }) => {
  if (!selectedNode) {
    return (
      <div className="w-64 h-full bg-white border-l border-gray-200 p-4">
        <p className="text-gray-500">Seleccione un nodo para ver sus propiedades</p>
      </div>
    );
  }

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateNode(selectedNode.id, { label: e.target.value });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateNode(selectedNode.id, { description: e.target.value });
  };

  const renderTriggerProperties = (data: TriggerNodeData) => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Tipo de evento</label>
          <select
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={data.eventType}
            onChange={(e) => 
              onUpdateNode(selectedNode.id, { 
                data: { ...data, eventType: e.target.value } 
              })
            }
          >
            <option value="nuevoLead">Nuevo Lead</option>
            <option value="leadActualizado">Lead Actualizado</option>
            <option value="propiedadPublicada">Propiedad Publicada</option>
          </select>
        </div>
      </div>
    );
  };

  const renderMessageProperties = (data: MessageNodeData) => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Canal</label>
          <select
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={data.channel}
            onChange={(e) => 
              onUpdateNode(selectedNode.id, { 
                data: { ...data, channel: e.target.value } 
              })
            }
          >
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
            <option value="notificacion">Notificación</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Plantilla de mensaje</label>
          <textarea
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            rows={4}
            value={data.messageTemplate}
            onChange={(e) => 
              onUpdateNode(selectedNode.id, { 
                data: { ...data, messageTemplate: e.target.value } 
              })
            }
          />
          <p className="mt-1 text-xs text-gray-500">Utiliza {'{{'} variable {'}}'}  para insertar variables dinámicas</p>
        </div>
      </div>
    );
  };

  const renderConditionProperties = (data: ConditionNodeData) => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Condición</label>
          <input
            type="text"
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={data.condition}
            onChange={(e) => 
              onUpdateNode(selectedNode.id, { 
                data: { ...data, condition: e.target.value } 
              })
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Comparador</label>
          <select
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={data.comparator}
            onChange={(e) => 
              onUpdateNode(selectedNode.id, { 
                data: { ...data, comparator: e.target.value } 
              })
            }
          >
            <option value="==">Igual (==)</option>
            <option value="!=">Diferente (!=)</option>
            <option value=">">{'>'}  Mayor que</option>
            <option value="<">{'<'}  Menor que</option>
            <option value=">=">{'>='} Mayor o igual</option>
            <option value="<=">{'<='} Menor o igual</option>
            <option value="contains">Contiene</option>
            <option value="not_contains">No contiene</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Valor</label>
          <input
            type="text"
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={data.value.toString()}
            onChange={(e) => 
              onUpdateNode(selectedNode.id, { 
                data: { ...data, value: e.target.value } 
              })
            }
          />
        </div>
      </div>
    );
  };

  const renderDelayProperties = (data: DelayNodeData) => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Tiempo de espera</label>
          <div className="flex items-center mt-1">
            <input
              type="number"
              className="block w-full border-gray-300 rounded-l-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={data.delayTime}
              onChange={(e) => 
                onUpdateNode(selectedNode.id, { 
                  data: { ...data, delayTime: parseInt(e.target.value) } 
                })
              }
            />
            <select
              className="border-gray-300 rounded-r-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={data.timeUnit}
              onChange={(e) => 
                onUpdateNode(selectedNode.id, { 
                  data: { ...data, timeUnit: e.target.value } 
                })
              }
            >
              <option value="seconds">Segundos</option>
              <option value="minutes">Minutos</option>
              <option value="hours">Horas</option>
              <option value="days">Días</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  const renderActionProperties = (data: ActionNodeData) => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Tipo de acción</label>
          <select
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={data.actionType}
            onChange={(e) => 
              onUpdateNode(selectedNode.id, { 
                data: { ...data, actionType: e.target.value } 
              })
            }
          >
            <option value="actualizarEstadoLead">Actualizar Estado Lead</option>
            <option value="asignarAgente">Asignar Agente</option>
            <option value="programarTarea">Programar Tarea</option>
          </select>
        </div>
      </div>
    );
  };

  const renderPropertiesByType = () => {
    switch (selectedNode.type) {
      case 'trigger':
        return renderTriggerProperties(selectedNode.data as TriggerNodeData);
      case 'message':
        return renderMessageProperties(selectedNode.data as MessageNodeData);
      case 'condition':
        return renderConditionProperties(selectedNode.data as ConditionNodeData);
      case 'delay':
        return renderDelayProperties(selectedNode.data as DelayNodeData);
      case 'action':
        return renderActionProperties(selectedNode.data as ActionNodeData);
      default:
        return <p>No hay propiedades disponibles para este tipo de nodo</p>;
    }
  };

  return (
    <div className="w-64 h-full bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Propiedades del nodo</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Etiqueta</label>
          <input
            type="text"
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={selectedNode.label}
            onChange={handleLabelChange}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Descripción</label>
          <input
            type="text"
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={selectedNode.description || ''}
            onChange={handleDescriptionChange}
          />
        </div>
        
        <hr className="my-4" />
        
        {renderPropertiesByType()}
      </div>
    </div>
  );
};

export default NodeProperties; 