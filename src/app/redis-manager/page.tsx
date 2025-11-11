'use client';

import React from 'react';
import AppLayout from '../components/AppLayout';
import RedisJidManager from '../components/RedisJidManager';
import Link from 'next/link';

export default function RedisManagerPage() {
  return (
    <AppLayout>
      <div className="mb-8">
        {/* Breadcrumbs */}
        <div className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-slate-200 mb-6">
          <div className="px-2 py-2">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li className="inline-flex items-center">
                  <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                    </svg>
                    Inicio
                  </Link>
                </li>
                <li aria-current="page">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                    </svg>
                    <span className="ml-1 text-sm font-regular text-gray-600 md:ml-2">Gestión Redis</span>
                  </div>
                </li>
              </ol>
            </nav>
          </div>

          {/* Título */}
          <div className="px-6 py-2 flex justify-between items-center border-t border-gray-200">
            <div>
              <h1 className="text-md font-semibold text-slate-800 tracking-tight">Gestión de Redis JIDs</h1>
              <p className="text-sm text-gray-600 mt-1">
                Interfaz web para replicar las funciones del workflow n8n
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Conectado
              </div>
            </div>
          </div>
        </div>

        {/* Información del webhook n8n */}
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-green-900 mb-1">
                Conectado a n8n Webhooks
              </h3>
              <div className="text-sm text-green-800 space-y-1">
                <p>• <strong>Agregar JID</strong>: Envía a <code className="bg-green-100 px-1 rounded">/webhook-test/agregar-jid</code></p>
                <p>• <strong>Eliminar JID</strong>: Envía a <code className="bg-green-100 px-1 rounded">/webhook/eliminar-jid</code></p>
                <p>• <strong>Procesamiento</strong>: n8n maneja toda la lógica Redis automáticamente</p>
                <p>• <strong>Base URL</strong>: <code className="bg-green-100 px-1 rounded">mia-n8n.w9weud.easypanel.host</code></p>
              </div>
            </div>
          </div>
        </div>

        {/* Información sobre payload */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-900 mb-1">
                Payload Enviado a n8n
              </h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Agregar JID</strong>: <code className="bg-blue-100 px-1 rounded">{"{ \"jid\": \"numero@s.whatsapp.net\", \"ttl\": 86400 }"}</code></p>
                <p><strong>Eliminar JID</strong>: <code className="bg-blue-100 px-1 rounded">{"{ \"jid\": \"numero@s.whatsapp.net\" }"}</code></p>
              </div>
            </div>
          </div>
        </div>

        {/* Componente principal */}
        <RedisJidManager />

        {/* Información técnica */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Información Técnica</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• <strong>Almacenamiento</strong>: Simulación en memoria (para producción usar Redis real)</p>
            <p>• <strong>TTL por defecto</strong>: 24 horas (86400 segundos)</p>
            <p>• <strong>Formato JID</strong>: Se auto-completa con @s.whatsapp.net si no se incluye</p>
            <p>• <strong>Limpieza automática</strong>: Las claves expiradas se eliminan automáticamente</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
