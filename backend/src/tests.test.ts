/**
 * Testes Unitários - receitas & auth controllers
 * Ferramentas: Jest + ts-jest
 * 20 testes cobrindo: listar, buscarPorId, criar, atualizar, deletar, pdf, login
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

import { jest, describe, it, expect } from "@jest/globals";

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.pipe   = jest.fn().mockReturnValue(res);
  return res;
}

function mockReq(overrides: Record<string, any> = {}): any {
  return { params: {}, query: {}, body: {}, ...overrides };
}

// ─── Mocks globais ───────────────────────────────────────────────────────────

// Pool simulado — cada teste pode sobrescrever `mockQueryImpl`
let mockQueryImpl: jest.Mock = jest.fn();

jest.mock("./config/db.js", () => ({
  default: { query: (...args: any[]) => mockQueryImpl(...args) },
}));

// PDFKit simulado
const pdfDocEndMock  = jest.fn();
const pdfDocPipeMock = jest.fn();
const pdfDocTextMock = jest.fn().mockReturnThis();
const pdfDocMoveMock = jest.fn().mockReturnThis();

jest.mock("pdfkit", () =>
  jest.fn().mockImplementation(() => ({
    pipe:     pdfDocPipeMock,
    fontSize: jest.fn().mockReturnThis(),
    text:     pdfDocTextMock,
    moveDown: pdfDocMoveMock,
    end:      pdfDocEndMock,
  }))
);

// Importações após os mocks
import { listar, buscarPorId, criar, atualizar, deletar, pdf } from "./controllers/receitaController.js";
import { login } from "./controllers/authController.js";

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCO 1 — listar (GET /receitas)
// ═══════════════════════════════════════════════════════════════════════════════

describe("listar", () => {
  // 1 ── Retorna todas as receitas sem filtros
  it("1. deve retornar todas as receitas sem filtros", async () => {
    const fakeRows = [{ id: 1, nome: "Bolo", tipo_receita: "doce" }];
    mockQueryImpl = jest.fn().mockResolvedValue([fakeRows]);

    const req = mockReq({ query: {} });
    const res = mockRes();

    await listar(req, res);

    expect(res.json).toHaveBeenCalledWith(fakeRows);
    const sql: string = mockQueryImpl.mock.calls[0][0];
    expect(sql).toContain("SELECT * FROM receita");
  });

  // 2 ── Filtra por tipo_receita quando 'tipo' é informado
  it("2. deve filtrar por tipo_receita quando tipo != 'todos'", async () => {
    mockQueryImpl = jest.fn().mockResolvedValue([[{ id: 2, nome: "Pudim", tipo_receita: "doce" }]]);

    const req = mockReq({ query: { tipo: "doce" } });
    const res = mockRes();

    await listar(req, res);

    const sql: string = mockQueryImpl.mock.calls[0][0];
    const params: any[] = mockQueryImpl.mock.calls[0][1];
    expect(sql).toContain("AND tipo_receita = ?");
    expect(params).toContain("doce");
  });

  // 3 ── Filtra por busca usando LIKE
  it("3. deve aplicar filtro LIKE quando busca é informada", async () => {
    mockQueryImpl = jest.fn().mockResolvedValue([[{ id: 3, nome: "Torta" }]]);

    const req = mockReq({ query: { busca: "Torta" } });
    const res = mockRes();

    await listar(req, res);

    const sql: string = mockQueryImpl.mock.calls[0][0];
    const params: any[] = mockQueryImpl.mock.calls[0][1];
    expect(sql).toContain("LIKE ?");
    expect(params).toContain("%Torta%");
  });

  // 4 ── Retorna 500 em caso de erro no banco
  it("4. deve retornar 500 quando o banco lança erro", async () => {
    mockQueryImpl = jest.fn().mockRejectedValue(new Error("DB error"));

    const req = mockReq({ query: {} });
    const res = mockRes();

    await listar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Erro ao listar receitas." });
  });

  // 5 ── Ignora o filtro de tipo quando tipo === 'todos'
  it("5. deve ignorar filtro de tipo quando tipo === 'todos'", async () => {
    mockQueryImpl = jest.fn().mockResolvedValue([[]]);

    const req = mockReq({ query: { tipo: "todos" } });
    const res = mockRes();

    await listar(req, res);

    const sql: string = mockQueryImpl.mock.calls[0][0];
    expect(sql).not.toContain("AND tipo_receita = ?");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCO 2 — buscarPorId (GET /receitas/:id)
// ═══════════════════════════════════════════════════════════════════════════════

describe("buscarPorId", () => {
  // 6 ── Retorna a receita quando encontrada
  it("6. deve retornar a receita quando encontrada", async () => {
    const fakeReceita = { id: 1, nome: "Bolo de cenoura" };
    mockQueryImpl = jest.fn().mockResolvedValue([[fakeReceita]]);

    const req = mockReq({ params: { id: "1" } });
    const res = mockRes();

    await buscarPorId(req, res);

    expect(res.json).toHaveBeenCalledWith(fakeReceita);
  });

  // 7 ── Retorna 404 quando não encontrada
  it("7. deve retornar 404 quando a receita não existe", async () => {
    mockQueryImpl = jest.fn().mockResolvedValue([[]]);

    const req = mockReq({ params: { id: "999" } });
    const res = mockRes();

    await buscarPorId(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Receita não encontrada." });
  });

  // 8 ── Retorna 500 em erro de banco
  it("8. deve retornar 500 quando o banco lança erro", async () => {
    mockQueryImpl = jest.fn().mockRejectedValue(new Error("fail"));

    const req = mockReq({ params: { id: "1" } });
    const res = mockRes();

    await buscarPorId(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCO 3 — criar (POST /receitas)
// ═══════════════════════════════════════════════════════════════════════════════

describe("criar", () => {
  const validBody = {
    nome: "Brownie",
    descricao: "Chocolate intenso",
    data_registro: "2024-01-01",
    custo: 15.0,
    tipo_receita: "doce",
  };

  // 9 ── Cria receita com dados válidos e retorna 201
  it("9. deve criar receita e retornar 201 com os dados", async () => {
    mockQueryImpl = jest.fn().mockResolvedValue([{ insertId: 42 }]);

    const req = mockReq({ body: validBody });
    const res = mockRes();

    await criar(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 42, nome: "Brownie" }));
  });

  // 10 ── Retorna 400 quando campo obrigatório está ausente
  it("10. deve retornar 400 quando campo obrigatório está ausente", async () => {
    const req = mockReq({ body: { nome: "Sem descricao" } });
    const res = mockRes();

    await criar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Todos os campos são obrigatórios." });
  });

  // 11 ── Retorna 500 quando o banco lança erro
  it("11. deve retornar 500 quando o banco lança erro ao criar", async () => {
    mockQueryImpl = jest.fn().mockRejectedValue(new Error("insert fail"));

    const req = mockReq({ body: validBody });
    const res = mockRes();

    await criar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // 12 ── Retorna 400 quando custo é null
  it("12. deve retornar 400 quando custo é null", async () => {
    const req = mockReq({ body: { ...validBody, custo: null } });
    const res = mockRes();

    await criar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCO 4 — atualizar (PUT /receitas/:id)
// ═══════════════════════════════════════════════════════════════════════════════

describe("atualizar", () => {
  const validBody = {
    nome: "Brigadeiro",
    descricao: "Doce brasileiro",
    data_registro: "2024-02-01",
    custo: 5.0,
    tipo_receita: "doce",
  };

  // 13 ── Atualiza com sucesso e retorna os dados
  it("13. deve atualizar receita e retornar os dados atualizados", async () => {
    mockQueryImpl = jest.fn().mockResolvedValue([{}]);

    const req = mockReq({ params: { id: "1" }, body: validBody });
    const res = mockRes();

    await atualizar(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 1, nome: "Brigadeiro" }));
  });

  // 14 ── Retorna 400 quando body incompleto
  it("14. deve retornar 400 quando body está incompleto na atualização", async () => {
    const req = mockReq({ params: { id: "1" }, body: { nome: "Só nome" } });
    const res = mockRes();

    await atualizar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  // 15 ── Retorna 500 quando o banco lança erro
  it("15. deve retornar 500 quando o banco lança erro ao atualizar", async () => {
    mockQueryImpl = jest.fn().mockRejectedValue(new Error("update fail"));

    const req = mockReq({ params: { id: "1" }, body: validBody });
    const res = mockRes();

    await atualizar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCO 5 — deletar (DELETE /receitas/:id)
// ═══════════════════════════════════════════════════════════════════════════════

describe("deletar", () => {
  // 16 ── Deleta com sucesso e retorna mensagem
  it("16. deve deletar a receita e retornar mensagem de sucesso", async () => {
    mockQueryImpl = jest.fn().mockResolvedValue([{}]);

    const req = mockReq({ params: { id: "1" } });
    const res = mockRes();

    await deletar(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: "Receita excluída com sucesso." });
  });

  // 17 ── Retorna 500 quando o banco lança erro
  it("17. deve retornar 500 quando o banco lança erro ao deletar", async () => {
    mockQueryImpl = jest.fn().mockRejectedValue(new Error("delete fail"));

    const req = mockReq({ params: { id: "1" } });
    const res = mockRes();

    await deletar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCO 6 — pdf (GET /receitas/pdf)
// ═══════════════════════════════════════════════════════════════════════════════

describe("pdf", () => {
  // 18 ── Define headers corretos e chama doc.end()
  it("18. deve definir headers PDF e encerrar o documento", async () => {
    const req = mockReq();
    const res = mockRes();

    await pdf(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      "attachment; filename=documento.pdf"
    );
    expect(pdfDocEndMock).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCO 7 — login (POST /auth/login)
// ═══════════════════════════════════════════════════════════════════════════════

describe("login", () => {
  // 19 ── Retorna dados do usuário com credenciais válidas
  it("19. deve retornar dados do usuário com credenciais válidas", async () => {
    const fakeUser = { id: 1, nome: "Admin", login: "admin", situacao: "ativo" };
    mockQueryImpl = jest.fn().mockResolvedValue([[fakeUser]]);

    const req = mockReq({ body: { login: "admin", senha: "1234" } });
    const res = mockRes();

    await login(req, res);

    expect(res.json).toHaveBeenCalledWith({
      usuario: { id: 1, nome: "Admin", login: "admin" },
    });
  });

  // 20 ── Retorna 401 quando credenciais inválidas
  it("20. deve retornar 401 quando credenciais são inválidas", async () => {
    mockQueryImpl = jest.fn().mockResolvedValue([[]]);

    const req = mockReq({ body: { login: "errado", senha: "errado" } });
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Login ou senha inválidos." });
  });
});
