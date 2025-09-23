'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { createWorkflow } from '../../services/automationService';
import AppLayout from '../../components/AppLayout';
import WorkflowEditor from '../../components/automation/WorkflowEditor';
import { AutomationWorkflow } from '../../types';

// Plantilla para un nuevo flujo de trabajo
const emptyWorkflow: AutomationWorkflow = {
  id: 'temp-new',
  name: 'Nueva automatización',
  description: 'Descripción de la automatización',
  active: false,
  nodes: [
    {
      id: 'node-trigger',
      type: 'trigger',
      label: 'Nuevo Lead',
      description: 'Se activa cuando se registra un nuevo lead',
      position: { x: 200, y: 200 },
      data: {
        eventType: 'nuevoLead',
        conditions: {}
      }
    }
  ],
  connections: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const NewWorkflow = () => {
  const router = useRouter();

  const handleSave = async (workflow: AutomationWorkflow) => {
    try {
      const newWorkflow = await createWorkflow({
        name: workflow.name,
        description: workflow.description,
        active: workflow.active,
        nodes: workflow.nodes,
        connections: workflow.connections
      });
      
      alert('Flujo de trabajo creado correctamente');
      router.push('/automatizaciones');
    } catch (err) {
      console.error('Error al crear el flujo de trabajo:', err);
      alert('Ocurrió un error al crear el flujo de trabajo');
    }
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)]">
        <WorkflowEditor workflow={emptyWorkflow} onSave={handleSave} />
      </div>
    </AppLayout>
  );
};

export default NewWorkflow; 