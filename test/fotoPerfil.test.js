const request = require('supertest');
const express = require('express');

jest.mock('../src/utils/getFotoPerfil', () => ({
  getFotoPerfil: jest.fn()
}));

const { getFotoPerfil } = require('../src/utils/getFotoPerfil');
const fotoPerfilController = require('../src/controllers/fotoPerfilController');

const app = express();
app.get('/api/foto-perfil/:numero', fotoPerfilController.obterFoto);

describe('GET /api/foto-perfil/:numero', () => {
  it('returns profile photo using mocked service', async () => {
    getFotoPerfil.mockResolvedValue('data:image/jpeg;base64,abc123');
    const res = await request(app).get('/api/foto-perfil/5511999999999');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ foto: 'data:image/jpeg;base64,abc123' });
  });
});
