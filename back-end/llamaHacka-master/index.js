const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Carregar as variáveis de ambiente
dotenv.config();

// Configuração do Pool de Conexões com PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Necessário para a conexão com o banco de dados na nuvem
  },
  connectionTimeoutMillis: 10000, // Timeout de 10 segundos
});

// Inicializar o servidor Express
const app = express();
const port = process.env.PORT || 3000;

// Middleware para fazer parsing do corpo da requisição
app.use(express.json());

// Função para autenticação do token JWT
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

// Rota para verificar se o servidor está funcionando
app.get('/', (req, res) => {
  res.send('API está funcionando!');
});

// Rota para login e gerar token JWT
app.post('/auth/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Credenciais inválidas!' });
    }

    const user = result.rows[0];
    
    // Verificando a senha
    const isValidPassword = senha === user.senha; // Aqui deve ser usada uma função bcrypt para comparar as senhas de forma segura
    
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Credenciais inválidas!' });
    }

    // Gerar o token JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return res.status(200).json({ message: 'Autenticação bem-sucedida', token });
  } catch (err) {
    console.error('Erro ao realizar login:', err);
    return res.status(500).send('Erro ao realizar login.');
  }
});

// Rota para adicionar um usuário
app.post('/users/add', [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('email').isEmail().withMessage('Email inválido'),
  body('senha').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('perfil').notEmpty().withMessage('Perfil é obrigatório')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { nome, email, senha, perfil } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO usuarios (nome, email, senha, perfil)
      VALUES ($1, $2, $3, $4) RETURNING id;
    `, [nome, email, senha, perfil]);

    res.status(201).json({ message: 'Usuário criado com sucesso!', userId: result.rows[0].id });
  } catch (err) {
    console.error('Erro ao adicionar usuário:', err.message);
    res.status(500).send('Erro ao adicionar usuário.');
  }
});

// Rota para pegar todos os usuários
app.get('/users', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM usuarios');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao consultar usuários:', err.message);
    res.status(500).send('Erro ao consultar usuários');
  }
});

// Rota para atualizar um usuário
app.put('/users/update/:id', [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('email').isEmail().withMessage('Email inválido'),
  body('senha').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('perfil').notEmpty().withMessage('Perfil é obrigatório')
], async (req, res) => {
  const { id } = req.params;
  const { nome, email, senha, perfil } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const result = await pool.query(`
      UPDATE usuarios
      SET nome = $1, email = $2, senha = $3, perfil = $4
      WHERE id = $5 RETURNING id;
    `, [nome, email, senha, perfil, id]);

    if (result.rows.length > 0) {
      res.status(200).json({ message: 'Usuário atualizado com sucesso!', userId: result.rows[0].id });
    } else {
      res.status(404).json({ message: 'Usuário não encontrado!' });
    }
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).send('Erro ao atualizar usuário.');
  }
});

// Rota para adicionar uma escola
app.post('/schools/add', [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('localizacao').notEmpty().withMessage('Localização é obrigatória'),
  body('tipo').notEmpty().withMessage('Tipo é obrigatório'),
  body('ano_fundacao').isInt().withMessage('Ano de fundação deve ser um número')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { nome, localizacao, tipo, ano_fundacao, id_startup } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO escolas (nome, localizacao, tipo, ano_fundacao, id_startup)
      VALUES ($1, $2, $3, $4, $5) RETURNING id;
    `, [nome, localizacao, tipo, ano_fundacao, id_startup]);

    res.status(201).json({ message: 'Escola criada com sucesso!', schoolId: result.rows[0].id });
  } catch (err) {
    console.error('Erro ao adicionar escola:', err.message);
    res.status(500).send('Erro ao adicionar escola.');
  }
});

// Rota para adicionar uma turma
app.post('/classes/add', [
  body('nome').notEmpty().withMessage('Nome da turma é obrigatório'),
  body('ano').isInt().withMessage('Ano deve ser um número'),
  body('id_escola').isInt().withMessage('ID da escola é obrigatório')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { nome, ano, id_escola } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO turmas (nome, ano, id_escola)
      VALUES ($1, $2, $3) RETURNING id;
    `, [nome, ano, id_escola]);

    res.status(201).json({ message: 'Turma criada com sucesso!', classId: result.rows[0].id });
  } catch (err) {
    console.error('Erro ao adicionar turma:', err);
    res.status(500).send('Erro ao adicionar turma.');
  }
});

// Rota para adicionar um plano bimestral
app.post('/bimonthly/add', [
  body('titulo').notEmpty().withMessage('Título é obrigatório'),
  body('descricao').notEmpty().withMessage('Descrição é obrigatória'),
  body('objetivos').notEmpty().withMessage('Objetivos são obrigatórios'),
  body('conteudo_programatico').notEmpty().withMessage('Conteúdo programático é obrigatório'),
  body('id_diretor').isInt().withMessage('ID do diretor é obrigatório')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id_diretor, titulo, descricao, objetivos, conteudo_programatico, data_criacao } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO planos_bimestrais (id_diretor, titulo, descricao, objetivos, conteudo_programatico, data_criacao)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;
    `, [id_diretor, titulo, descricao, objetivos, conteudo_programatico, data_criacao]);

    res.status(201).json({ message: 'Plano bimestral criado com sucesso!', bimonthlyId: result.rows[0].id });
  } catch (err) {
    console.error('Erro ao adicionar plano bimestral:', err);
    res.status(500).send('Erro ao adicionar plano bimestral.');
  }
});

// Inicializa o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
