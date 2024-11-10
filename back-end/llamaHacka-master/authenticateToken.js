const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

function authenticateToken(req, res, next) {
  const token = req.header('Authorization')?.split(' ')[1]; // Pega o token do header 'Authorization'

  if (!token) {
    return res.status(401).json({ message: 'Token não fornecido!' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido ou expirado!' });
    }

    // Adiciona o ID do usuário ao objeto da requisição
    req.userId = decoded.userId;
    next();
  });
}

module.exports = authenticateToken;
