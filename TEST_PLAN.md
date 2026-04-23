# Plan de Tests Completos — Organizador Docente

**Objetivo:** Alcanzar cobertura suficiente para publicar la app con confianza.  
**Secuencia:** 6 fases, de infraestructura crítica hacia la capa de presentación.

---

## Fase 0: Hecho ✅

| Área | Tests | Estado |
|------|-------|--------|
| Vitest + jsdom + setup global | `vitest.config.ts`, `test/setup.ts` | ✅ |
| Mock Supabase reutilizable | `test/mocks/supabase.ts` | ✅ |
| Hooks: useStudents | 6 tests | ✅ |
| Hooks: useGrades | 7 tests | ✅ |
| Hooks: useAttendance | 9 tests | ✅ |
| API: generate-plan | 3 tests | ✅ |
| Componente: StudentForm | 5 tests | ✅ |
| E2E: Auth público + redirecciones | 14 tests | ✅ |
| Pipeline CI básico | `.github/workflows/test.yml` | ✅ |

---

## Fase 1: Hooks de Negocio Críticos
**Prioridad: ALTA** — Son la base de toda la lógica. Sin ellos probados, los componentes y E2E son frágiles.

### 1.1 `useCourses` (`src/hooks/__tests__/useCourses.test.ts`)
- [ ] fetchCourses: carga cursos por escuela, incluye join con teachers
- [ ] fetchCourses: retorna [] cuando no hay user
- [ ] createCourse: inserta curso + vincula teacher logueado
- [ ] createCourse: retorna false si falta user
- [ ] updateCourse: actualiza nombre/materia/año/division
- [ ] deleteCourse: elimina curso y retorna true
- [ ] deleteCourse: error muestra toast

### 1.2 `useSchools` (`src/hooks/__tests__/useSchools.test.ts`)
- [ ] fetchSchools: carga escuelas del teacher autenticado
- [ ] createSchool: inserta con teacher_id del user
- [ ] updateSchool: cambia nombre/dirección
- [ ] deleteSchool: elimina escuela y sus cursos en cascada (o maneja error de FK)
- [ ] switchActiveSchool: persiste en localStorage / estado

### 1.3 `useLessonPlans` (`src/hooks/__tests__/useLessonPlans.test.ts`)
- [ ] fetchLessonPlans: por course_id, ordenados por fecha
- [ ] createLessonPlan: inserta con contenido HTML y fecha
- [ ] updateLessonPlan: edita contenido y tema
- [ ] deleteLessonPlan: elimina por id
- [ ] fetchLessonPlans: filtro por rango de fechas (si aplica)

### 1.4 `useAssignments` (`src/hooks/__tests__/useAssignments.test.ts`)
- [ ] fetchAssignments: por course_id con estado (borrador/activo/cerrado)
- [ ] createAssignment: inserta con título, tipo, fecha entrega, criterios
- [ ] updateAssignment: edita campos
- [ ] deleteAssignment: elimina
- [ ] changeAssignmentStatus: transiciones de estado válidas

### 1.5 `useObservations` (`src/hooks/__tests__/useObservations.test.ts`)
- [ ] fetchObservations: por student_id, ordenadas por fecha desc
- [ ] addObservation: inserta con content, date, teacher_id
- [ ] deleteObservation: elimina propia, rechaza si no es del teacher

### 1.6 `useStudentProfile` (`src/hooks/__tests__/useStudentProfile.test.ts`)
- [ ] fetchProfile: carga alumno + cursos + resumen académico
- [ ] fetchPerformanceHistory: snapshot de IA + métricas calculadas
- [ ] fetchProfile: maneja alumno inexistente (404)

### 1.7 `useTeacher` (`src/hooks/__tests__/useTeacher.test.ts`)
- [ ] fetchTeacher: carga perfil del user logueado
- [ ] updateProfile: edita nombre, avatar, preferencias
- [ ] fetchTeacher: retorna null si no hay sesión

**Entregable:** 7 archivos de tests bajo `src/hooks/__tests__/`, ~40-50 tests nuevos.
**Tiempo estimado:** 3-4 horas (reutilizan el mock de Supabase existente).

---

## Fase 2: Componentes de UI Interactivos
**Prioridad: ALTA** — El usuario toca estos componentes en cada sesión.

### 2.1 Formularios
- [ ] `AttendanceGrid` (`components/attendance/__tests__/attendance-grid.test.tsx`)
  - Renderiza alumnos del curso con checkboxes/estados
  - Click en celda cambia estado presente → ausente → justificado
  - Botón "Marcar todos presentes" llama a hook
  - Botón "Borrar todo" requiere confirmación
  - Navegación entre fechas dispara re-fetch

- [ ] `GradesSpreadsheet` (`components/grades/__tests__/grades-spreadsheet.test.tsx`)
  - Renderiza tabla con alumnos x períodos
  - Edición inline de nota dispara saveGrade
  - Cambio de período en select actualiza vista
  - Cálculo de promedio dinámico (optimistic)
  - Indicador de color según nota (verde/amarillo/rojo)

- [ ] `LessonPlanForm` (`components/lesson-plans/__tests__/lesson-plan-form.test.tsx`)
  - Campos título, fecha, tipo, contenido HTML
  - Botón "Generar con IA" llama API y pega HTML resultante
  - Guardar llama create/update según initialData
  - Cancelar no persiste cambios

- [ ] `AssignmentForm` (`components/assignments/__tests__/assignment-form.test.tsx`)
  - Título, descripción, fecha entrega, tipo
  - Adjuntar criterios de evaluación
  - Cambio de estado (borrador → publicado)

- [ ] `CourseForm` (`components/schools/__tests__/course-form.test.tsx`)
  - Campos: nombre, materia, año, división
  - Vinculación a escuela activa
  - Validación: año y división requeridos

- [ ] `SchoolForm` (`components/schools/__tests__/school-form.test.tsx`)
  - Nombre, dirección, teléfono
  - Crear escuela activa automáticamente

### 2.2 Visualizaciones
- [ ] `StudentImportModal` (`components/students/__tests__/student-import-modal.test.tsx`)
  - Upload de CSV/Excel parsea preview
  - Preview muestra filas válidas/inválidas
  - Importar llama bulkCreateStudents
  - Errores de formato muestran toast

- [ ] `KanbanBoard` (`components/assignments/__tests__/kanban-board.test.tsx`)
  - Renderiza columnas por estado
  - Tarjetas muestran título, fecha, conteo de entregas
  - Click en tarjeta abre detalle (si aplica)

- [ ] `StudentReportPrintable` (`components/students/__tests__/student-report-printable.test.tsx`)
  - Renderiza resumen con nombre, promedio, asistencia
  - Sección de observaciones del docente
  - Botón "Imprimir" / "Descargar PDF"

**Entregable:** ~9 archivos de tests bajo `src/components/**/__tests__/`, ~25-30 tests.
**Tiempo estimado:** 4-5 horas.

---

## Fase 3: API Routes de Backend
**Prioridad: ALTA** — Consumen tokens de IA y persisten datos sensibles.

### 3.1 IA (mock de `ai-sdk`)
- [ ] `api/ai/correct` (`src/app/api/ai/correct/__tests__/route.test.ts`)
  - 401 sin sesión
  - 400 sin assignment_id o digest
  - 404 cuando no hay entregas pendientes
  - Batch de 2+ submissions genera correcciones
  - Persistencia en tabla `ai_corrections`
  - Manejo de error de Gemini (500)

- [ ] `api/ai/generate-report` (`src/app/api/ai/generate-report/__tests__/route.test.ts`)
  - 401 sin sesión
  - 400 sin student_id o course_id
  - Flujo completo: fetch student → grades → attendance → corrections → observations → generateObject → upsert snapshot
  - Calcula métricas correctamente (promedio, tasa asistencia)
  - Formato del prompt enviado a Gemini

- [ ] `api/ai/pre-digest` (`src/app/api/ai/pre-digest/__tests__/route.test.ts`)
  - 400 sin assignment_id
  - Procesa material de referencia y genera digest
  - Guarda digest en tabla para reutilizar

- [ ] `api/ai/transcribe` (`src/app/api/ai/transcribe/__tests__/route.test.ts`)
  - 400 sin file_url
  - Mock de transcribe para audio/imagen
  - Límite de tamaño de archivo

### 3.2 Auth
- [ ] `api/auth/callback` (`src/app/auth/callback/__tests__/route.test.ts`)
  - Intercambia code por sesión
  - Redirección con parámetro `next`
  - Manejo de error de OAuth (state mismatch)

**Entregable:** 5 archivos de tests bajo `src/app/api/**/__tests__/`, ~20 tests.
**Tiempo estimado:** 3-4 horas.
**Nota:** Requiere mocks de `generateObject`, `generateText` del SDK `ai`, y del Supabase server-client.

---

## Fase 4: Integración de Flujos Críticos
**Prioridad: MEDIA** — Verifican que múltiples capas trabajan juntas.

### 4.1 Flujo: Crear curso → Agregar alumnos → Tomar asistencia
- [ ] E2E: Teacher crea escuela y curso
- [ ] E2E: Importa 3 alumnos desde CSV
- [ ] E2E: Abre asistencia del día, marca 2 presentes / 1 ausente
- [ ] E2E: Cambia de fecha, verifica que asistencia está vacía
- [ ] E2E: Vuelve a fecha anterior, verifica persistencia

### 4.2 Flujo: Crear trabajo → Entregar → Corregir con IA
- [ ] E2E: Teacher crea assignment con criterios
- [ ] E2E: Estudiante (o simulación) sube entrega
- [ ] E2E: Teacher ejecuta corrección IA desde el panel
- [ ] E2E: Revisa correcciones generadas y sugerencias

### 4.3 Flujo: Generar informe de alumno
- [ ] E2E: Navega a perfil de alumno
- [ ] E2E: Carga notas y asistencia
- [ ] E2E: Click "Generar informe con IA"
- [ ] E2E: Espera generación, revisa contenido del informe
- [ ] E2E: Descarga/imprime informe

**Entregable:** 3 archivos de E2E bajo `e2e/flows/`, ~10-15 tests.
**Tiempo estimado:** 4-6 horas.
**Nota:** Estos tests requieren autenticación real o un mecanismo de seed de datos. Opciones:
- Seed de Supabase local (Docker) o proyecto de staging
- OAuth mock con `playwright` usando `page.route` para interceptar callbacks
- O saltearlos para v1 y dejarlos como tests de smoke post-deploy

---

## Fase 5: Seguridad, Resiliencia y Edge Cases
**Prioridad: MEDIA** — Previene incidentes en producción.

### 5.1 Seguridad
- [ ] E2E: Usuario no autenticado no accede a `/api/ai/*` (401 en todas)
- [ ] E2E: Teacher A no ve datos de Teacher B (verificar por school_id/teacher_id)
- [ ] E2E: No se puede eliminar curso de otro teacher (403 o no aparece en UI)
- [ ] Unit: `useStudents` filtra por `teacher_id` implícitamente (si la query lo hace)

### 5.2 Resiliencia / Edge Cases
- [ ] Unit: `useStudents.bulkCreateStudents` con CSV de 500 filas (límite de batch)
- [ ] Unit: `useAttendance` con 40 alumnos, verificar que markAllAsPresent no crea duplicados
- [ ] Unit: `useGrades` con nota inválida (negativa o >10) → validación en UI o hook
- [ ] API: Payload > 1MB en generate-report → manejo de error
- [ ] API: Gemini rate limit (429) → retry o mensaje al usuario
- [ ] E2E: Pérdida de conexión durante guardado → toast de error, estado no corrupto

**Entregable:** ~10 tests dispersos en unit + E2E.
**Tiempo estimado:** 2-3 horas.

---

## Fase 6: Performance, A11y y Mobile
**Prioridad: BAJA** — Mejoran calidad pero no bloquean publicación.

### 6.1 Performance (Playwright + Lighthouse)
- [ ] E2E: `/dashboard` carga LCP < 2.5s en desktop
- [ ] E2E: `/cursos/[id]` carga LCP < 2.5s
- [ ] E2E: `/login` carga LCP < 1.5s

### 6.2 Accesibilidad (Axe + Playwright)
- [ ] E2E: `/login` pasa axe-core (sin contrast errors, inputs con label)
- [ ] E2E: `/dashboard` navegable con teclado (Tab, Enter, Escape)
- [ ] E2E: `StudentForm` anuncia errores a screen readers

### 6.3 Mobile
- [ ] E2E: AttendanceGrid usable en viewport 375x812 (iPhone SE)
- [ ] E2E: Sidebar colapsa en mobile, menú hamburguesa funciona
- [ ] E2E: GradesSpreadsheet permite scroll horizontal en tabla

**Entregable:** ~8 tests E2E adicionales con `Pixel 5` y `iPhone SE` projects.
**Tiempo estimado:** 2-3 horas.

---

## Resumen de Estimaciones

| Fase | Tests nuevos | Tiempo est. | Bloquea publicación |
|------|-------------|-------------|---------------------|
| 0: Hecho | 44 | — | — |
| 1: Hooks negocio | ~45 | 3-4h | **SÍ** |
| 2: Componentes UI | ~28 | 4-5h | **SÍ** |
| 3: API routes | ~20 | 3-4h | **SÍ** |
| 4: Flujos E2E | ~12 | 4-6h | Recomendado |
| 5: Seguridad + Edge | ~10 | 2-3h | **SÍ** |
| 6: Perf / A11y / Mobile | ~8 | 2-3h | NO (post-v1) |
| **Total restante** | **~123** | **18-28h** | |

**Mínimo viable para publicar:** Fases 1 + 2 + 3 + 5 (~80 tests, ~12-16h).

---

## Secuencia Recomendada de Ejecución

### Iteración 1 (MVP de publicación) — ~12-16h
1. **Día 1:** Fase 1 (todos los hooks)
2. **Día 2:** Fase 2 (componentes críticos: AttendanceGrid, GradesSpreadsheet, LessonPlanForm)
3. **Día 3:** Fase 3 (API routes de IA) + Fase 5 (seguridad básica)

### Iteración 2 (Confianza) — ~8-10h
4. **Día 4:** Fase 2 (formularios restantes) + Fase 4 (1 flujo E2E: asistencia)
5. **Día 5:** Fase 4 (flujos de informe y corrección) + Fase 5 (edge cases)

### Iteración 3 (Pulido) — ~4-6h
6. **Día 6:** Fase 6 (performance, a11y, mobile)

---

## Infraestructura Adicional Necesaria

| Necesidad | Archivo | Descripción |
|-----------|---------|-------------|
| Mock de `ai-sdk` | `test/mocks/ai-sdk.ts` | `generateText`, `generateObject` con respuestas controladas |
| Mock de Supabase server | `test/mocks/supabase-server.ts` | `createClient` para API routes con session mock |
| Seed de datos E2E | `e2e/fixtures/` | JSON con escuela, curso, alumnos, notas pre-cargados para flujos |
| Helpers E2E auth | `e2e/helpers/auth.ts` | `loginAsTeacher(page)` que usa credenciales de test o bypass OAuth |

---

## Comandos para ejecutar por fase

```bash
# Solo hooks
npx vitest run src/hooks/__tests__

# Solo componentes
npx vitest run src/components

# Solo API
npx vitest run src/app/api

# Solo E2E auth + navegación
npx playwright test e2e/auth.spec.ts e2e/navigation.spec.ts --project=chromium

# Solo E2E flujos
npx playwright test e2e/flows --project=chromium

# Todo (pre-publicación)
npm run test && npx playwright test --project=chromium
```
