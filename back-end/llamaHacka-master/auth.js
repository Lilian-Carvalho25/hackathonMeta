const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
dotenv.config();

// Verificar se a variável JWT_SECRET está definida
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET não está definido');
  process.exit(1);  // Finaliza o processo se a variável de ambiente não estiver configurada
}

// Função para verificar a senha usando bcrypt
async function checkPassword(plainPassword, hashedPassword) {
  try {
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return isMatch;
  } catch (err) {
    throw new Error('Erro ao verificar a senha');
  }
}

// Função para gerar o token JWT
function generateToken(userId) {
  // Aqui estamos gerando um token com o ID do usuário e um tempo de expiração de 1 hora
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return token;
}

module.exports = { generateToken, checkPassword };
