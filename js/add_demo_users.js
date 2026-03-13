const fs = require('fs');
let html = fs.readFileSync('c:\\Users\\AIO\\Downloads\\PatrimoNet\\index.html', 'utf8');

// The dist backup missed the 4 users added today, so let's inject them at the end of the DEMO_USERS array.
const newDemoUsers = `
      { id: 11, prenume: 'Pedagog', nume: 'Internat', email: 'pedagog', parola: 'ped123', rol: 'pedagog' },
      { id: 12, prenume: 'Bucătar', nume: 'Șef', email: 'bucatar', parola: 'buc123', rol: 'bucatar' },
      { id: 13, prenume: 'Îngrijitor', nume: 'Curățenie', email: 'ingrijitor', parola: 'ing123', rol: 'ingrijitor' },
      { id: 14, prenume: 'Paznic', nume: 'Poartă', email: 'paznic', parola: 'paz123', rol: 'paznic' },
      { id: 15, prenume: 'Profesor', nume: 'Demo', email: 'profesor2', parola: 'prof123', rol: 'profesor' }
    ];`;

const oldDemoUsersEnd = `
      { id: 10, prenume: 'Muncitor', nume: 'Mentenan?a 2', email: 'mentenanta2', parola: 'men123', rol: 'mentenanta' }
    ];`;

const altOldDemoUsersEnd = `
      { id: 10, prenume: 'Muncitor', nume: 'Mentenanță 2', email: 'mentenanta2', parola: 'men123', rol: 'mentenanta' }
    ];`;

html = html.replace(oldDemoUsersEnd, newDemoUsers);
html = html.replace(altOldDemoUsersEnd, newDemoUsers);

// Fix potential straggler question marks in the codebase from the old backup
html = html.replace(/Mentenan\?a/g, 'Mentenanță');
html = html.replace(/achizi\?ie/g, 'achiziție');
html = html.replace(/loca\?ie/g, 'locație');
html = html.replace(/func\?ie/g, 'funcție');
html = html.replace(/Situa\?ie/g, 'Situație');

// Also update the login screen card UI text where the demo credentials are listed
const newDemoCreds = `
        <div class="demo-cred-row"><span>pedagog</span><span>ped123</span><span>Pedagog</span></div>
        <div class="demo-cred-row"><span>mentenanta</span><span>men123</span><span>Mentenanță</span></div>
      </div>
    </div>`;

html = html.replace(/<div class="demo-cred-row"><span>mentenanta<\/span><span>men123<\/span><span>Mentenanță<\/span><\/div>(\s*)<\/div>(\s*)<\/div>/g, newDemoCreds);

fs.writeFileSync('c:\\Users\\AIO\\Downloads\\PatrimoNet\\index.html', html, 'utf8');
console.log('Restored the 5 extra demo users inside DEMO_USERS array successfully.');
