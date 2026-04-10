export const APP_NAME = 'Organizador Docente'
export const APP_DESCRIPTION = 'Tu herramienta integral para la gestión educativa'

export const NAV_ITEMS = [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Escuelas', href: '/escuelas', icon: 'Building2' },
    { label: 'Alumnos', href: '/alumnos', icon: 'Users' },
    { label: 'Trabajos Prácticos', href: '/trabajos', icon: 'ClipboardList' },
    { label: 'Calificaciones', href: '/calificaciones', icon: 'BarChart3' },
    { label: 'Asistencia', href: '/asistencia', icon: 'CalendarCheck' },
    { label: 'Planificaciones', href: '/planificaciones', icon: 'FileText' },
] as const

export const COURSE_COLORS = [
    '#6366f1', // Indigo
    '#14b8a6', // Teal
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#10b981', // Emerald
    '#f97316', // Orange
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#84cc16', // Lime
] as const

export const GRADE_CATEGORIES = [
    { value: 'tp', label: 'Trabajo Práctico' },
    { value: 'parcial', label: 'Parcial' },
    { value: 'concepto', label: 'Concepto' },
    { value: 'participacion', label: 'Participación' },
    { value: 'exposicion_oral', label: 'Exposición Oral' },
    { value: 'investigacion', label: 'Investigación' },
    { value: 'autoevaluacion', label: 'Autoevaluación' },
    { value: 'examen', label: 'Examen' },
] as const

export const ASSIGNMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    borrador: { label: 'Borrador', color: 'bg-gray-100 text-gray-700' },
    asignado: { label: 'Asignado', color: 'bg-blue-100 text-blue-700' },
    entregado: { label: 'Entregado', color: 'bg-green-100 text-green-700' },
}

export const ATTENDANCE_LABELS: Record<string, { label: string; short: string; color: string }> = {
    presente: { label: 'Presente', short: 'P', color: 'bg-green-500 text-white' },
    ausente: { label: 'Ausente', short: 'A', color: 'bg-red-500 text-white' },
    tardanza: { label: 'Tardanza', short: 'T', color: 'bg-amber-500 text-white' },
    justificado: { label: 'Justificado', short: 'J', color: 'bg-blue-500 text-white' },
}

export const GRADE_PERIOD_LABELS: Record<string, string> = {
    '1er_trimestre': '1er Trimestre',
    '2do_trimestre': '2do Trimestre',
    '3er_trimestre': '3er Trimestre',
    'final': 'Final',
}

export const SCHOOL_LEVEL_LABELS: Record<string, string> = {
    primaria: 'Primaria',
    secundaria: 'Secundaria',
    terciario: 'Terciario',
    universitario: 'Universitario',
}

export const SCHOOL_SHIFT_LABELS: Record<string, string> = {
    'mañana': 'Mañana',
    tarde: 'Tarde',
    noche: 'Noche',
    vespertino: 'Vespertino',
}
