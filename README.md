# CRM para Inmobiliaria

Aplicación de demostración de un CRM para el sector inmobiliario, diseñado para gestionar y filtrar leads según su interés en propiedades.

## Características

- **Gestión de Leads**: Visualización y filtrado de contactos clasificados como "fríos", "tibios" o "calientes".
- **Filtros Avanzados**: Permite filtrar por:
  - Zona de interés
  - Presupuesto máximo
  - Tipo de propiedad
  - Estado del lead
  - Cantidad mínima de ambientes
  - Motivo de interés
- **Interfaz Responsiva**: Diseñada con Tailwind CSS para adaptarse a diferentes dispositivos.

## Tecnologías Utilizadas

- **Next.js**: Framework React para aplicaciones web.
- **TypeScript**: Para un desarrollo tipado y robusto.
- **Tailwind CSS**: Para el diseño de la interfaz.

## Estructura de Datos

Cada lead incluye la siguiente información:
- Nombre completo
- Email
- Teléfono
- Estado del lead (frío, tibio, caliente)
- Presupuesto estimado
- Zona de interés
- Tipo de propiedad buscada
- Superficie mínima deseada
- Cantidad de ambientes
- Motivo de interés
- Fecha de contacto
- Observaciones

## Instalación y Uso

1. Clonar el repositorio:
```bash
git clone [url-del-repositorio]
```

2. Instalar dependencias:
```bash
npm install
```

3. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

4. Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

## Licencia

Este proyecto es una demostración y se proporciona como está, sin garantías de ningún tipo.
