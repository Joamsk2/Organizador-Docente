
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon Key not found in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function registerTestUser() {
    const email = 'testeo1@gmail.com';
    const password = 'tes123';
    const fullName = 'Usuario de Testeo';

    console.log(`Intentando registrar usuario: ${email}...`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName },
        },
    });

    if (error) {
        console.error('Error al registrar:', error.message);
        if (error.message.includes('User already registered')) {
            console.log('El usuario ya existe. Intentando iniciar sesión para verificar...');
            const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
            if (loginError) {
                console.error('Error al iniciar sesión:', loginError.message);
            } else {
                console.log('Inicio de sesión exitoso. El usuario ya estaba listo.');
            }
        }
    } else {
        console.log('Usuario registrado exitosamente:', data.user.id);
        if (data.session) {
            console.log('Sesión iniciada automáticamente (confirmación de email probablemente desactivada).');
        } else {
            console.log('Usuario creado pero requiere confirmación de email (o la sesión no se inició).');
        }
    }
}

registerTestUser();
