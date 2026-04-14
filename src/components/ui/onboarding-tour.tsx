'use client'

import { useEffect, useRef } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useTeacher } from '@/hooks/use-teacher'

export function OnboardingTour() {
    const { teacher, loading, updatePreferences } = useTeacher()
    const hasStarted = useRef(false)

    useEffect(() => {
        if (loading || !teacher || hasStarted.current) return

        const preferences = (teacher.preferences as any) || {}
        if (preferences.has_seen_tutorial) return

        hasStarted.current = true

        const driverObj = driver({
            showProgress: true,
            animate: true,
            allowClose: true,
            stagePadding: 4,
            nextBtnText: 'Siguiente',
            prevBtnText: 'Anterior',
            doneBtnText: 'Finalizar',
            onCloseClick: () => {
                updatePreferences({ has_seen_tutorial: true })
            },
            onDestroyed: () => {
                updatePreferences({ has_seen_tutorial: true })
            },
            steps: [
                {
                    popover: {
                        title: '¡Bienvenido al Organizador Docente!',
                        description: 'Te daremos un recorrido rápido para que aproveches al máximo tu nuevo asistente educativo. ¡Empecemos!',
                    }
                },
                {
                    element: '#tour-logo',
                    popover: {
                        title: 'Tu Identidad Académica',
                        description: 'Este es el corazón de tu plataforma. Desde aquí siempre puedes volver al inicio con un clic.',
                        side: "bottom",
                        align: 'start'
                    }
                },
                {
                    element: '#tour-nav',
                    popover: {
                        title: 'Menú de Módulos',
                        description: 'Gestiona tus escuelas, cursos, alumnos y planificaciones desde esta barra lateral.',
                        side: "right",
                        align: 'start'
                    }
                },
                {
                    element: '#tour-search',
                    popover: {
                        title: 'Buscador Inteligente',
                        description: '¿Buscas un alumno o un TP específico? Escríbelo aquí y encuéntralo al instante.',
                        side: "bottom",
                        align: 'start'
                    }
                },
                {
                    element: '#tour-theme',
                    popover: {
                        title: 'Modo Noche / Día',
                        description: '¿Prefieres trabajar con menos brillo? Cambia entre modo oscuro y claro aquí.',
                        side: "bottom",
                        align: 'end'
                    }
                },
                {
                    element: '#tour-settings',
                    popover: {
                        title: 'Tu Configuración',
                        description: 'Personaliza tu perfil, firma digital y preferencias generales desde aquí.',
                        side: "top",
                        align: 'start'
                    }
                },
                {
                    popover: {
                        title: '¡Todo listo!',
                        description: 'Ya puedes empezar a cargar tus cursos y probar el Copiloto de IA en las planificaciones. ¡Éxitos en tus clases!',
                    }
                }
            ]
        })

        // Pequeño delay para asegurar que el DOM esté listo y las animaciones de entrada terminadas
        const timer = setTimeout(() => {
            driverObj.drive()
        }, 1000)

        return () => clearTimeout(timer)
    }, [teacher, loading, updatePreferences])

    return null
}
