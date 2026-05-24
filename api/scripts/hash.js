const bcrypt = require('bcryptjs');

const passwords = [
  { label: 'superadmin', plain: 'kikokiko' },
  { label: 'admin',      plain: 'okokok' },
  { label: 'warga',      plain: 'wargabrazil' },
];

(async () => {
  for (const p of passwords) {
    const hash = await bcrypt.hash(p.plain, 12);
    console.log(`${p.label}: ${hash}`);
  }
})();