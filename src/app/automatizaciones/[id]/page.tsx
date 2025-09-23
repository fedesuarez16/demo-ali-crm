'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getWorkflowById, updateWorkflow } from '../../services/automationService';
import AppLayout from '../../components/AppLayout';
import WorkflowEditor from '../../components/automation/WorkflowEditor';
import { AutomationWorkflow } from '../../types';

const EditWorkflow = () => {
  const params = useParams();
  const router = useRouter();
  const [workflow, setWorkflow] = useState<AutomationWorkflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Asegurarse de que id es string
  const id = typeof params.id === 'string' ? params.id : 
             Array.isArray(params.id) ? params.id[0] : 
             'new'; // Valor por defecto

  useEffect(() => {
    const fetchWorkflow = async () => {
      if (id === 'new') {
        setError('ID no válido');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await getWorkflowById(id);
        if (!data) {
          setError('No se encontró el flujo de trabajo solicitado');
        } else {
          setWorkflow(data);
        }
      } catch (err) {
        console.error('Error al cargar el flujo de trabajo:', err);
        setError('Ocurrió un error al cargar el flujo de trabajo');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkflow();
  }, [id]);

  const handleSave = async (updatedWorkflow: AutomationWorkflow) => {
    if (id === 'new') {
      setError('No se puede guardar, ID no válido');
      return;
    }
    
    try {
      await updateWorkflow(id, updatedWorkflow);
      alert('Flujo de trabajo guardado correctamente');
      router.push('/automatizaciones');
    } catch (err) {
      console.error('Error al guardar el flujo de trabajo:', err);
      alert('Ocurrió un error al guardar el flujo de trabajo');
    }
  };

  return (
    <AppLayout>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white rounded-lg shadow">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Error</h3>
          <p className="mt-2 text-gray-500">{error}</p>
          <button 
            onClick={() => router.push('/automatizaciones')}
            className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600"
          >
            Volver a automatizaciones
          </button>
        </div>
      ) : workflow ? (
        <div className="h-[calc(100vh-4rem)]">
          <WorkflowEditor workflow={workflow} onSave={handleSave} />
        </div>
      ) : null}
    </AppLayout>
  );
};

export default EditWorkflow; 