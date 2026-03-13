// Vite env loader — safe fallback for static servers
let supabaseUrl = '';
let supabaseKey = '';

try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
        supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    }
} catch (e) {
    console.warn('[ENV] import.meta.env is not available, using existing window values if present.');
}

window.ENV_SUPABASE_URL = supabaseUrl || window.ENV_SUPABASE_URL || '';
window.ENV_SUPABASE_ANON_KEY = supabaseKey || window.ENV_SUPABASE_ANON_KEY || '';
