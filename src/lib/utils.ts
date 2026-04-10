import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
    return clsx(inputs)
}

export function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

export function formatDate(date: string | Date, locale: string = 'es-AR'): string {
    return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(new Date(date))
}

export function formatTime(time: string): string {
    return time.slice(0, 5) // "08:00:00" -> "08:00"
}

export function getDayName(dayOfWeek: number): string {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    return days[dayOfWeek]
}

export function getGradeColor(value: number): string {
    if (value < 4) return 'text-red-600 bg-red-50'
    if (value < 7) return 'text-amber-600 bg-amber-50'
    return 'text-green-600 bg-green-50'
}

export function getAttendanceColor(status: string): string {
    switch (status) {
        case 'presente': return 'text-green-600 bg-green-50'
        case 'ausente': return 'text-red-600 bg-red-50'
        case 'tardanza': return 'text-amber-600 bg-amber-50'
        case 'justificado': return 'text-blue-600 bg-blue-50'
        default: return 'text-gray-600 bg-gray-50'
    }
}
