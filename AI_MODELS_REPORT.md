# Informe de Arquitectura de IA — Organizador Docente

**Fecha de actualización:** 2026-04-22  
**Entorno:** Google Gemini API + Vercel AI SDK  

Este informe detalla la infraestructura de Inteligencia Artificial implementada en la plataforma **Organizador Docente**, especificando los modelos utilizados y su propósito en cada módulo operativo. La plataforma ha sido migrada recientemente a la serie **Gemini 2.5** para garantizar el máximo rendimiento y estabilidad a largo plazo.

---

## 1. Resumen de Modelos Utilizados

| Identificador en Código | Modelo Real (API) | Capacidades | Módulos que lo utilizan |
| :--- | :--- | :--- | :--- |
| `geminiFlash` | `gemini-2.5-flash` | Razonamiento Avanzado + Visión | Planificación, Reportes, Transcripción |
| `geminiFlashLite` | `gemini-2.5-flash-lite` | Alta Velocidad + Costo Mínimo | Corrección Batch, Pre-digest |

---

## 2. Detalle por Módulo

### 🧠 Planificación Docente (`/api/ai/generate-plan`)
*   **Modelo:** `gemini-2.5-flash`
*   **Función:** Generación de contenido pedagógico hiperprofesional (Objetivos, Desarrollo, Bibliografía, Cierre).
*   **Justificación:** Se utiliza la versión Flash completa para asegurar la coherencia pedagógica y un razonamiento más profundo en la diagramación docente.

### 📊 Reporte de Desempeño Estudiantil (`/api/ai/generate-report`)
*   **Modelo:** `gemini-2.5-flash`
*   **Función:** Síntesis cualitativa del perfil del alumno. Analiza promedios, tasas de asistencia, observaciones y notas diarias.
*   **Justificación:** La serie 2.5 Flash ofrece un seguimiento de instrucciones superior para generar informes narrativos y datos estructurados JSON precisos.

### 📝 Corrección Automática de Trabajos (`/api/ai/correct`)
*   **Modelo:** `gemini-2.5-flash-lite`
*   **Función:** Evaluación de entregas de alumnos contrastándolas con material de referencia y criterios.
*   **Justificación:** Tarea ideal para Flash-Lite por su alta velocidad y bajo costo en procesamiento por lotes (Batch Mode), permitiendo corregir múltiples alumnos de forma eficiente.

### 📚 Pre-procesamiento de Materiales (`/api/ai/pre-digest`)
*   **Modelo:** `gemini-2.5-flash-lite`
*   **Función:** Compresión de materiales de lectura extensos y consignas para crear un "digest" de contexto.
*   **Justificación:** Tarea de extracción y resumen que no requiere la potencia máxima de razonamiento de Pro o Flash.

### 👁️ Transcripción de Imágenes/Manuscritos (`/api/ai/transcribe`)
*   **Modelo:** `gemini-2.5-flash` (Multimodal/Vision)
*   **Función:** Conversión de imágenes de trabajos prácticos (fotos) en texto digital.
*   **Justificación:** Flash 2.5 ofrece una precisión significativamente mayor en el reconocimiento de escritura manuscrita y OCR en comparación con la versión Lite.

---

## 3. Configuración de Infraestructura

La configuración central se encuentra en `src/lib/ai/gemini.ts`, lo que permite realizar cambios de modelos a nivel global.

### Archivos de Configuración Clave:
- **Configuración del Modelo:** `src/lib/ai/gemini.ts`
- **Prompts del Sistema:** `src/lib/ai/prompts.ts`
- **Esquemas de Datos (Zod):** `src/lib/ai/schemas.ts`

---

*Informe actualizado para reflejar la migración a Gemini 2.5 y la optimización de recursos.*
