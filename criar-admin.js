require('dotenv').config();
const readline = require('readline');
const { initDb } = require('./src/database/database');
const userService = require('./src/services/userService');

(async () => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (q) => new Promise(resolve => rl.question(q, resolve));

  const db = await initDb().catch(err => {
    console.error('Erro ao conectar ao banco de dados:', err);
    process.exit(1);
  });

  try {
    const email = await question('Digite o e-mail para o novo administrador: ');
    const existing = await userService.findUserByEmail(db, email);

    if (existing) {
      if (existing.is_admin) {
        console.log('Este usuário já é administrador.');
      } else {
        const ans = await question('Este usuário já existe. Deseja promovê-lo a administrador? (s/n) ');
        if (ans.trim().toLowerCase() === 's') {
          await userService.updateUser(db, existing.id, { is_admin: 1 });
          console.log('Usuário promovido a administrador.');
        } else {
          console.log('Nenhuma alteração realizada.');
        }
      }
    } else {
      const password = await question('Digite a senha: ');
      const user = await userService.createUser(db, email, password, 1, 1);
      console.log(`Administrador criado com ID ${user.id}.`);
    }
  } catch (err) {
    console.error('Erro ao processar:', err);
  } finally {
    rl.close();
    db.close();
  }
})();
