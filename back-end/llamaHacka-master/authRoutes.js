// authRoutes.js
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;
  
    console.log('Requisição recebida:', req.body);  // Log do corpo da requisição
  
    if (!email || !senha) {
      console.log('Email ou senha não fornecidos');
      return res.status(400).json({ message: 'Email e senha são obrigatórios!' });
    }
  
    try {
      // Consultando o banco de dados para encontrar o usuário
      const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
      console.log('Resultado da consulta ao banco de dados:', result.rows);
  
      if (result.rows.length === 0) {
        console.log('Usuário não encontrado');
        return res.status(400).json({ message: 'Credenciais inválidas!' });
      }
  
      const user = result.rows[0];
  
      // Verificando a senha fornecida com a senha armazenada no banco de dados
      const isValidPassword = await checkPassword(senha, user.senha);
  
      if (!isValidPassword) {
        console.log('Senha inválida');
        return res.status(400).json({ message: 'Credenciais inválidas!' });
      }
  
      // Gerando o token JWT
      const token = generateToken(user.id);
      return res.status(200).json({ message: 'Autenticação bem-sucedida', token });
  
    } catch (err) {
      console.error('Erro ao realizar login:', err);
      return res.status(500).send('Erro ao realizar login.');
    }
  });
  