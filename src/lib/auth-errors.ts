interface AuthErrorTranslation {
    title: string
    description: string
}

const AUTH_ERROR_MAP: Array<{ match: string; translation: AuthErrorTranslation }> = [
    {
        match: 'Invalid login credentials',
        translation: {
            title: 'Credenciales incorrectas',
            description: 'El email o la contraseña son incorrectos. Verificá tus datos e intentá de nuevo.',
        },
    },
    {
        match: 'Email not confirmed',
        translation: {
            title: 'Email sin confirmar',
            description: 'Revisá tu bandeja de entrada y hacé clic en el enlace de confirmación antes de iniciar sesión.',
        },
    },
    {
        match: 'User already registered',
        translation: {
            title: 'Email ya registrado',
            description: 'Ya existe una cuenta con ese email. Intentá iniciar sesión o recuperar tu contraseña.',
        },
    },
    {
        match: 'Password should be at least 6 characters',
        translation: {
            title: 'Contraseña muy corta',
            description: 'La contraseña debe tener al menos 6 caracteres.',
        },
    },
    {
        match: 'Unable to validate email address',
        translation: {
            title: 'Email inválido',
            description: 'El formato del email no es válido. Verificá que esté bien escrito.',
        },
    },
    {
        match: 'over_email_send_rate_limit',
        translation: {
            title: 'Demasiados intentos',
            description: 'Esperá unos minutos antes de volver a intentarlo.',
        },
    },
    {
        match: 'For security purposes',
        translation: {
            title: 'Demasiados intentos',
            description: 'Por seguridad, esperá unos minutos antes de volver a intentarlo.',
        },
    },
    {
        match: 'Email rate limit exceeded',
        translation: {
            title: 'Demasiados intentos',
            description: 'Esperá unos minutos antes de volver a intentarlo.',
        },
    },
    {
        match: 'Signup is disabled',
        translation: {
            title: 'Registro deshabilitado',
            description: 'El registro de nuevas cuentas está temporalmente deshabilitado.',
        },
    },
]

export function translateAuthError(message: string): AuthErrorTranslation {
    for (const entry of AUTH_ERROR_MAP) {
        if (message.includes(entry.match)) {
            return entry.translation
        }
    }
    return {
        title: 'Error de autenticación',
        description: 'Ocurrió un error inesperado. Intentá de nuevo o contactá al soporte.',
    }
}
