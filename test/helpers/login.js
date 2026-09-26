import request from 'supertest';

export async function loginAdmin(baseUrl) {
  const payload = {
    email: process.env.ADMIN_EMAIL,
    senha: process.env.ADMIN_PASSWORD,
  };

  const resposta = await request(baseUrl).post('/api/auth/login').send(payload);

  if (resposta.status !== 200) {
    throw new Error(`Login de administrador falhou: ${resposta.status} ${JSON.stringify(resposta.body)}`);
  }

  return resposta.body;
}

export async function loginAluno(baseUrl, email, senha) {
  const resposta = await request(baseUrl).post('/api/auth/login').send({ email, senha });

  if (resposta.status !== 200) {
    throw new Error(`Login de aluno falhou: ${resposta.status} ${JSON.stringify(resposta.body)}`);
  }

  return resposta.body;
}
