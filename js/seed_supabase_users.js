/**
 * PatrimoNet — Script de Creare Conturi Demo în Supabase Auth
 * 
 * Rulează cu: node seed_supabase_users.js
 * 
 * Acest script folosește supabase.auth.signUp() (cu anon key) pentru a crea
 * fiecare utilizator demo în baza de date Supabase Auth.
 * 
 * NOTĂ: Emailurile scurte care nu conțin '@' sunt transformate automat
 * în format valid adăugând '@patrimonet.app'.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pztgawexnbuuwygidppm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dGdhd2V4bmJ1dXd5Z2lkcHBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODg5MzAsImV4cCI6MjA4NzM2NDkzMH0.tLW1Fwg3KFnwa9IOA9DunLuSrIrUvQkxCArsr4PeRoI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Funcție helper: transformă username scurt în email valid
function toEmail(raw) {
  if (raw.includes('@')) return raw;
  return raw + '@patrimonet.app';
}

// Lista completă de utilizatori demo din index.html DEMO_USERS
const DEMO_USERS = [
  { email: 'catalin@patrimonet.ro', password: '762262', prenume: 'Oance', nume: 'Catalin Traian', rol: 'super_admin' },
  { email: 'patrimoniu', password: 'pat123', prenume: 'Oance', nume: 'Carmen Mihaela', rol: 'school_admin' },
  { email: 'director', password: 'dir123', prenume: 'Director', nume: 'Școală', rol: 'director' },
  { email: 'dir.adj1', password: 'dir123', prenume: 'Director', nume: 'Adjunct 1', rol: 'director' },
  { email: 'dir.adj2', password: 'dir123', prenume: 'Director', nume: 'Adjunct 2', rol: 'director' },
  { email: 'contabil', password: 'con123', prenume: 'Contabil', nume: 'Șef', rol: 'contabil' },
  { email: 'info', password: 'info123', prenume: 'Informatician', nume: 'Școlar', rol: 'informatician' },
  { email: 'profesor', password: 'prof123', prenume: 'Profesor', nume: 'Demo', rol: 'profesor' },
  { email: 'mentenanta', password: 'men123', prenume: 'Muncitor', nume: 'Mentenanță 1', rol: 'mentenanta' },
  { email: 'mentenanta2', password: 'men123', prenume: 'Muncitor', nume: 'Mentenanță 2', rol: 'mentenanta' },
  { email: 'pedagog', password: 'ped123', prenume: 'Pedagog', nume: 'Internat', rol: 'pedagog' },
  { email: 'bucatar', password: 'buc123', prenume: 'Bucătar', nume: 'Șef', rol: 'bucatar' },
  { email: 'ingrijitor', password: 'ing123', prenume: 'Îngrijitor', nume: 'Curățenie', rol: 'ingrijitor' },
  { email: 'paznic', password: 'paz123', prenume: 'Paznic', nume: 'Poartă', rol: 'paznic' },
  { email: 'profesor2', password: 'prof123', prenume: 'Profesor', nume: 'Demo 2', rol: 'profesor' },
  { email: 'admin@scoala2.ro', password: 'sc2admin', prenume: 'Admin', nume: 'Școala 2', rol: 'school_admin' }
];

async function seedUsers() {
  console.log('=== PatrimoNet — Seed Supabase Auth Users ===\n');
  
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of DEMO_USERS) {
    const email = toEmail(user.email);
    const password = user.password;

    // Supabase necesită parole de minim 6 caractere
    const safePassword = password.length >= 6 ? password : password + '123';

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: safePassword,
        options: {
          data: {
            prenume: user.prenume,
            nume: user.nume,
            rol: user.rol
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          console.log(`⏭️  SKIP: ${email} (deja existent)`);
          skipped++;
        } else {
          console.error(`❌ EROARE: ${email} — ${error.message}`);
          errors++;
        }
      } else {
        console.log(`✅ CREAT: ${email} (${user.prenume} ${user.nume} / ${user.rol})`);
        created++;
      }
    } catch (err) {
      console.error(`❌ EXCEPȚIE: ${email} — ${err.message}`);
      errors++;
    }

    // Mică pauza între cereri pentru a nu depăși rate-limit-ul
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n=== REZULTAT ===');
  console.log(`✅ Create:  ${created}`);
  console.log(`⏭️  Existente: ${skipped}`);
  console.log(`❌ Erori:   ${errors}`);
  console.log(`📊 Total:   ${DEMO_USERS.length}`);

  if (created > 0) {
    console.log('\n📋 IMPORTANT: Trebuie să actualizezi și emailurile din DEMO_USERS din index.html');
    console.log('   astfel încât cele care nu au "@" să devină "@patrimonet.app".');
    console.log('   Exemplu: "patrimoniu" → "patrimoniu@patrimonet.app"');
  }
}

seedUsers();
