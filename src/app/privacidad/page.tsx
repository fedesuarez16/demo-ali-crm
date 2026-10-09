import type { Metadata } from 'next';

// Página pública (excluida del login en lib/supabase/middleware.ts).
// Meta la exige como URL de política de privacidad para la revisión de la app de WhatsApp.

export const metadata: Metadata = {
  title: 'Política de privacidad | Team Ali',
  description: 'Cómo Team Ali recopila, usa y protege los datos personales de sus contactos.',
};

const CONTACTO_EMAIL = 'menchuali2003@gmail.com';
const ULTIMA_ACTUALIZACION = '9 de octubre de 2026';

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-white">
      <article className="mx-auto max-w-3xl px-4 py-12 text-gray-800 sm:px-6">
        <header className="mb-10 border-b border-gray-200 pb-6">
          <h1 className="text-3xl font-semibold text-gray-900">Política de privacidad</h1>
          <p className="mt-2 text-sm text-gray-500">Última actualización: {ULTIMA_ACTUALIZACION}</p>
        </header>

        <div className="space-y-8 leading-relaxed">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">1. Quiénes somos</h2>
            <p>
              Team Ali es un equipo inmobiliario que gestiona consultas de compra, venta y alquiler de
              propiedades. Esta política describe cómo tratamos los datos personales de las personas que se
              comunican con nosotros, principalmente a través de WhatsApp, y de quienes usan nuestro sistema
              interno de gestión de clientes (CRM).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">2. Qué datos recopilamos</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>Nombre y número de teléfono o identificador de WhatsApp.</li>
              <li>El contenido de los mensajes que nos enviás (texto, audios, imágenes y documentos).</li>
              <li>
                Información sobre tu búsqueda: propiedades de interés, zona, presupuesto, tipo de operación y
                preferencias de contacto.
              </li>
              <li>Fechas y horarios de las conversaciones y de los seguimientos programados.</li>
            </ul>
            <p className="mt-3">
              No solicitamos datos de tarjetas, contraseñas ni información sensible en los términos de la Ley
              25.326.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">3. Para qué usamos tus datos</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>Responder tus consultas sobre propiedades y coordinar llamadas o visitas.</li>
              <li>Enviarte información y seguimientos relacionados con la consulta que hiciste.</li>
              <li>
                Asistir la atención con respuestas automáticas generadas por inteligencia artificial, siempre
                supervisadas por el equipo.
              </li>
              <li>Organizar internamente la gestión de clientes y mejorar la calidad de la atención.</li>
            </ul>
            <p className="mt-3">No vendemos ni alquilamos tus datos personales a terceros.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">4. Con quién compartimos los datos</h2>
            <p className="mb-3">
              Para operar el servicio usamos proveedores que tratan los datos por cuenta nuestra y solo para los
              fines descritos:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Meta Platforms (WhatsApp Business Platform), para enviar y recibir mensajes.</li>
              <li>Chatwoot, para gestionar las conversaciones.</li>
              <li>Supabase, para almacenar la información del CRM.</li>
              <li>OpenAI, para generar respuestas asistidas por inteligencia artificial.</li>
              <li>Vercel, para alojar esta aplicación web.</li>
            </ul>
            <p className="mt-3">
              Algunos de estos proveedores pueden almacenar información fuera de la República Argentina.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">5. Cuánto tiempo conservamos los datos</h2>
            <p>
              Conservamos tus datos mientras exista una consulta o relación comercial activa y durante el tiempo
              razonable posterior necesario para darle seguimiento, o hasta que nos pidas que los eliminemos.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">6. Tus derechos</h2>
            <p>
              Podés solicitar en cualquier momento el acceso, la rectificación, la actualización o la supresión de
              tus datos personales, y pedir que dejemos de enviarte mensajes. Respondemos dentro de los plazos de la
              Ley 25.326 de Protección de Datos Personales.
            </p>
            <p className="mt-3">
              La Agencia de Acceso a la Información Pública, en su carácter de órgano de control de la Ley 25.326,
              tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en
              sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.
            </p>
          </section>

          <section id="eliminacion-de-datos">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">7. Cómo pedir la eliminación de tus datos</h2>
            <ol className="list-decimal space-y-1 pl-6">
              <li>
                Escribinos a{' '}
                <a className="text-blue-600 underline" href={`mailto:${CONTACTO_EMAIL}`}>
                  {CONTACTO_EMAIL}
                </a>{' '}
                o respondé por WhatsApp con la palabra <strong>ELIMINAR</strong>.
              </li>
              <li>Indicá el número de teléfono desde el que te comunicaste con nosotros.</li>
              <li>
                Eliminamos tus datos del CRM y de nuestras herramientas de mensajería y te confirmamos cuando el
                proceso esté completo.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">8. Seguridad</h2>
            <p>
              Aplicamos medidas técnicas y organizativas razonables para proteger tus datos, como el acceso
              restringido al CRM mediante autenticación y conexiones cifradas.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-gray-900">9. Cambios y contacto</h2>
            <p>
              Podemos actualizar esta política. La versión vigente siempre está publicada en esta página. Para
              cualquier consulta sobre privacidad, escribinos a{' '}
              <a className="text-blue-600 underline" href={`mailto:${CONTACTO_EMAIL}`}>
                {CONTACTO_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
