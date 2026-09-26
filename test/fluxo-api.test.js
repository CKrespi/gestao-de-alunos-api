import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import request from 'supertest';
import { expect } from 'chai';
import 'dotenv/config';

import app from '../src/app.js';
import mongoose, { ensureMongoConnection } from '../src/database/db.js';
import { loginAdmin, loginAluno } from './helpers/login.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dadosTeste = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'alunos.json'), 'utf8'));

describe('Fluxo de automação da API', function () {
  let server;
  let baseUrl;

  before(async () => {
    await ensureMongoConnection();
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  dadosTeste.forEach((alunoBase) => {
    it(`deve realizar o fluxo completo para o aluno ${alunoBase.nome}`, async () => {
      const uniqueSuffix = `${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
      const alunoParaCadastro = {
        ...alunoBase,
        nome: `${alunoBase.nome} ${uniqueSuffix.slice(-4)}`,
        email: `${alunoBase.email.split('@')[0]}.${uniqueSuffix}@example.com`,
        matricula: `${alunoBase.matricula}${uniqueSuffix.slice(-4)}`,
      };

      const admin = await loginAdmin(baseUrl);
      expect(admin).to.have.property('token');
      expect(admin.usuario).to.include({ role: 'admin' });

      const cadastroAluno = await request(baseUrl)
        .post('/api/admin/alunos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          nome: alunoParaCadastro.nome,
          email: alunoParaCadastro.email,
          matricula: alunoParaCadastro.matricula,
          senha: alunoParaCadastro.senha,
        });

      expect(cadastroAluno.status).to.equal(201);
      expect(cadastroAluno.body).to.include({
        nome: alunoParaCadastro.nome,
        email: alunoParaCadastro.email,
        matricula: alunoParaCadastro.matricula,
        role: 'aluno',
      });
      expect(cadastroAluno.body).to.not.have.property('senha');

      const matricula = await request(baseUrl)
        .post(`/api/admin/disciplinas/${alunoBase.disciplinaId}/matriculas`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ alunoId: cadastroAluno.body.id });

      expect(matricula.status).to.equal(201);
      expect(matricula.body).to.include({
        alunoId: cadastroAluno.body.id,
        disciplinaId: alunoBase.disciplinaId,
      });

      const alunoLogin = await loginAluno(baseUrl, alunoParaCadastro.email, alunoParaCadastro.senha);
      expect(alunoLogin).to.have.property('token');
      expect(alunoLogin.usuario).to.include({
        id: cadastroAluno.body.id,
        email: alunoParaCadastro.email,
        role: 'aluno',
      });

      const trabalhoData = {
        disciplinaId: alunoBase.disciplinaId,
        titulo: `${alunoBase.trabalho.titulo} ${uniqueSuffix.slice(-4)}`,
        descricao: 'Entrega realizada por automação de testes.',
      };

      const entregaTrabalho = await request(baseUrl)
        .post(`/api/alunos/${cadastroAluno.body.id}/trabalhos`)
        .set('Authorization', `Bearer ${alunoLogin.token}`)
        .send(trabalhoData);

      expect(entregaTrabalho.status).to.equal(201);
      expect(entregaTrabalho.body).to.include({
        alunoId: cadastroAluno.body.id,
        disciplinaId: alunoBase.disciplinaId,
        titulo: trabalhoData.titulo,
        status: 'entregue',
      });
      expect(entregaTrabalho.body).to.have.property('dataEntrega');
    });
  });
});
