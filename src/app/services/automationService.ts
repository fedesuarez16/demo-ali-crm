import { AutomationWorkflow, NodeData, NodeConnection } from '../types';

// Datos de ejemplo para mostrar en la interfaz
const sampleWorkflows: AutomationWorkflow[] = [
  {
    id: '1',
    name: 'Seguimiento de Leads Nuevos',
    description: 'Envía mensajes automáticos de seguimiento a leads nuevos',
    active: true,
    nodes: [
      {
        id: 'node-1',
        type: 'trigger',
        label: 'Nuevo Lead',
        description: 'Se activa cuando se registra un nuevo lead',
        position: { x: 100, y: 100 },
        data: {
          eventType: 'nuevoLead',
          conditions: {}
        }
      },
      {
        id: 'node-2',
        type: 'delay',
        label: 'Espera',
        description: 'Espera 1 día antes de enviar el mensaje',
        position: { x: 400, y: 100 },
        data: {
          delayTime: 1,
          timeUnit: 'days'
        }
      },
      {
        id: 'node-3',
        type: 'message',
        label: 'Mensaje de Bienvenida',
        description: 'Envía un mensaje de bienvenida al lead',
        position: { x: 700, y: 100 },
        data: {
          messageTemplate: 'Hola {{nombreCompleto}}, gracias por registrarte. ¿En qué podemos ayudarte?',
          variables: { nombreCompleto: 'lead.nombreCompleto' },
          channel: 'whatsapp'
        }
      }
    ],
    connections: [
      {
        id: 'conn-1',
        source: 'node-1',
        target: 'node-2',
        label: ''
      },
      {
        id: 'conn-2',
        source: 'node-2',
        target: 'node-3',
        label: ''
      }
    ],
    createdAt: '2024-10-01T10:00:00Z',
    updatedAt: '2024-10-01T10:00:00Z'
  }
];

export const getWorkflows = (): Promise<AutomationWorkflow[]> => {
  return Promise.resolve(sampleWorkflows);
};

export const getWorkflowById = (id: string): Promise<AutomationWorkflow | undefined> => {
  const workflow = sampleWorkflows.find(w => w.id === id);
  return Promise.resolve(workflow);
};

export const createWorkflow = (workflow: Omit<AutomationWorkflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<AutomationWorkflow> => {
  const newWorkflow: AutomationWorkflow = {
    ...workflow,
    id: `wf-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  sampleWorkflows.push(newWorkflow);
  return Promise.resolve(newWorkflow);
};

export const updateWorkflow = (id: string, workflow: Partial<AutomationWorkflow>): Promise<AutomationWorkflow | undefined> => {
  const index = sampleWorkflows.findIndex(w => w.id === id);
  
  if (index === -1) {
    return Promise.resolve(undefined);
  }
  
  const updatedWorkflow = {
    ...sampleWorkflows[index],
    ...workflow,
    updatedAt: new Date().toISOString()
  };
  
  sampleWorkflows[index] = updatedWorkflow;
  return Promise.resolve(updatedWorkflow);
};

export const deleteWorkflow = (id: string): Promise<boolean> => {
  const index = sampleWorkflows.findIndex(w => w.id === id);
  
  if (index === -1) {
    return Promise.resolve(false);
  }
  
  sampleWorkflows.splice(index, 1);
  return Promise.resolve(true);
};

// Tipos de nodos disponibles para la automatización
export const getAvailableNodeTypes = () => {
  return [
    {
      type: 'trigger',
      label: 'Disparador',
      description: 'Inicia el flujo de automatización',
      options: [
        { value: 'nuevoLead', label: 'Nuevo Lead' },
        { value: 'leadActualizado', label: 'Lead Actualizado' },
        { value: 'propiedadPublicada', label: 'Propiedad Publicada' }
      ]
    },
    {
      type: 'condition',
      label: 'Condición',
      description: 'Evalúa una condición para decidir el flujo',
      options: [
        { value: 'estadoLead', label: 'Estado del Lead' },
        { value: 'presupuesto', label: 'Presupuesto' },
        { value: 'zonaInteres', label: 'Zona de Interés' }
      ]
    },
    {
      type: 'delay',
      label: 'Retardo',
      description: 'Espera un tiempo determinado',
      options: [
        { value: 'tiempoFijo', label: 'Tiempo Fijo' },
        { value: 'hastaDia', label: 'Hasta Día Específico' }
      ]
    },
    {
      type: 'message',
      label: 'Mensaje',
      description: 'Envía un mensaje automático',
      options: [
        { value: 'whatsapp', label: 'WhatsApp' },
        { value: 'email', label: 'Email' },
        { value: 'sms', label: 'SMS' },
        { value: 'notificacion', label: 'Notificación' }
      ]
    },
    {
      type: 'action',
      label: 'Acción',
      description: 'Ejecuta una acción en el sistema',
      options: [
        { value: 'actualizarEstadoLead', label: 'Actualizar Estado Lead' },
        { value: 'asignarAgente', label: 'Asignar Agente' },
        { value: 'programarTarea', label: 'Programar Tarea' }
      ]
    }
  ];
}; 