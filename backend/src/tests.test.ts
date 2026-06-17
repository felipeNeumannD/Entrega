/**
 * Testes Unitários - receitas & auth controllers
 * Ferramentas: Jest + ts-jest
 * 20 testes cobrindo: listar, buscarPorId, criar, atualizar, deletar, pdf, login
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from "@jest/globals";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockRes() {
  const res: any = {};
  res.status    = jest.fn().mockReturnValue(res);
  res.json      = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.pipe      = jest.fn().mockReturnValue(res);
  return res;
}

function mockReq(overrides: Record<string, any> = {}): any {
  return { params: {}, query: {}, body: {}, ...overrides };
}

// ─── Estado dos mocks ─────────────────────────────────────────────────────────

let mockQueryImpl: any = jest.fn();


const mockResolve = (val: unknown) => (jest.fn() as jest.Mock<any>).mockResolvedValue(val);
const mockReject  = (err: unknown) => (jest.fn() as jest.Mock<any>).mockRejectedValue(err);

const pdfDocEndMock  = jest.fn();
const pdfDocPipeMock = jest.fn();
const pdfDocTextMock = jest.fn().mockReturnThis();
const pdfDocMoveMock = jest.fn().mockReturnThis();

// ─── Mocks de módulo (devem vir antes dos imports dinâmicos) ─────────────────

jest.unstable_mockModule("./config/db.js", () => ({
  default: { query: (...args: any[]) => mockQueryImpl(...args) },
}));

jest.unstable_mockModule("pdfkit", () => ({
  default: jest.fn().mockImplementation(() => ({
    pipe:     pdfDocPipeMock,
    fontSize: jest.fn().mockReturnThis(),
    text:     pdfDocTextMock,
    moveDown: pdfDocMoveMock,
    end:      pdfDocEndMock,
  })),
}));

// ─── Imports dinâmicos após os mocks ─────────────────────────────────────────

let listar: any, buscarPorId: any, criar: any, atualizar: any, deletar: any, pdf: any;
let login: any;

beforeAll(async () => {
  const receita = await import("./controllers/receitaController.js");
  listar      = receita.listar;
  buscarPorId = receita.buscarPorId;
  criar       = receita.criar;
  atualizar   = receita.atualizar;
  deletar     = receita.deletar;
  pdf         = receita.pdf;

  const auth = await import("./controllers/authController.js");
  login = auth.login;
});

beforeEach(() => {
  mockQueryImpl = jest.fn();
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCO 1 — listar (GET /receitas)
// ═══════════════════════════════════════════════════════════════════════════════

describe("listar", () => {
  it("1. deve retornar todas as receitas sem filtros", async () => {
    const fakeRows = [{ id: 1, nome: "Bolo", tipo_receita: "doce" }];
    mockQueryImpl = mockResolve([fakeRows]);

    const req = mockReq({ query: {} });
    const res = mockRes();

    await listar(req, res);

    expect(res.json).toHaveBeenCalledWith(fakeRows);
    const sql: string = mockQueryImpl.mock.calls[0]![0] as string;
    expect(sql).toContain("SELECT * FROM receita");
  });

  it("2. deve filtrar por tipo_receita quando tipo != 'todos'", async () => {
    mockQueryImpl = mockResolve([[{ id: 2, nome: "Pudim", tipo_receita: "doce" }]]);

    const req = mockReq({ query: { tipo: "doce" } });
    const res = mockRes();

    await listar(req, res);

    const sql: string    = mockQueryImpl.mock.calls[0]![0] as string;
    const params: any[]  = mockQueryImpl.mock.calls[0]![1] as any[];
    expect(sql).toContain("AND tipo_receita = ?");
    expect(params).toContain("doce");
  });

  it("3. deve aplicar filtro LIKE quando busca é informada", async () => {
    mockQueryImpl = mockResolve([[{ id: 3, nome: "Torta" }]]);

    const req = mockReq({ query: { busca: "Torta" } });
    const res = mockRes();

    await listar(req, res);

    const sql: string   = mockQueryImpl.mock.calls[0]![0] as string;
    const params: any[] = mockQueryImpl.mock.calls[0]![1] as any[];
    expect(sql).toContain("LIKE ?");
    expect(params).toContain("%Torta%");
  });

  it("4. deve retornar 500 quando o banco lança erro", async () => {
    mockQueryImpl = mockReject(new Error("DB error"));

    const req = mockReq({ query: {} });
    const res = mockRes();

    await listar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Erro ao listar receitas." });
  });

  it("5. deve ignorar filtro de tipo quando tipo === 'todos'", async () => {
    mockQueryImpl = mockResolve([[]]);

    const req = mockReq({ query: { tipo: "todos" } });
    const res = mockRes();

    await listar(req, res);

    const sql: string = mockQueryImpl.mock.calls[0]![0] as string;
    expect(sql).not.toContain("AND tipo_receita = ?");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCO 2 — buscarPorId (GET /receitas/:id)
// ═══════════════════════════════════════════════════════════════════════════════

describe("buscarPorId", () => {
  it("6. deve retornar a receita quando encontrada", async () => {
    const fakeReceita = { id: 1, nome: "Bolo de cenoura" };
    mockQueryImpl = mockResolve([[fakeReceita]]);

    const req = mockReq({ params: { id: "1" } });
    const res = mockRes();

    await buscarPorId(req, res);

    expect(res.json).toHaveBeenCalledWith(fakeReceita);
  });

  it("7. deve retornar 404 quando a receita não existe", async () => {
    mockQueryImpl = mockResolve([[]]);

    const req = mockReq({ params: { id: "999" } });
    const res = mockRes();

    await buscarPorId(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Receita não encontrada." });
  });

  it("8. deve retornar 500 quando o banco lança erro", async () => {
    mockQueryImpl = mockReject(new Error("fail"));

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

  it("9. deve criar receita e retornar 201 com os dados", async () => {
    mockQueryImpl = mockResolve([{ insertId: 42 }]);

    const req = mockReq({ body: validBody });
    const res = mockRes();

    await criar(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 42, nome: "Brownie" }));
  });

  it("10. deve retornar 400 quando campo obrigatório está ausente", async () => {
    const req = mockReq({ body: { nome: "Sem descricao" } });
    const res = mockRes();

    await criar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Todos os campos são obrigatórios." });
  });

  it("11. deve retornar 500 quando o banco lança erro ao criar", async () => {
    mockQueryImpl = mockReject(new Error("insert fail"));

    const req = mockReq({ body: validBody });
    const res = mockRes();

    await criar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

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

  it("13. deve atualizar receita e retornar os dados atualizados", async () => {
    mockQueryImpl = mockResolve([{}]);

    const req = mockReq({ params: { id: "1" }, body: validBody });
    const res = mockRes();

    await atualizar(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 1, nome: "Brigadeiro" }));
  });

  it("14. deve retornar 400 quando body está incompleto na atualização", async () => {
    const req = mockReq({ params: { id: "1" }, body: { nome: "Só nome" } });
    const res = mockRes();

    await atualizar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("15. deve retornar 500 quando o banco lança erro ao atualizar", async () => {
    mockQueryImpl = mockReject(new Error("update fail"));

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
  it("16. deve deletar a receita e retornar mensagem de sucesso", async () => {
    mockQueryImpl = mockResolve([{}]);

    const req = mockReq({ params: { id: "1" } });
    const res = mockRes();

    await deletar(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: "Receita excluída com sucesso." });
  });

  it("17. deve retornar 500 quando o banco lança erro ao deletar", async () => {
    mockQueryImpl = mockReject(new Error("delete fail"));

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
  it("19. deve retornar dados do usuário com credenciais válidas", async () => {
    const fakeUser = { id: 1, nome: "Admin", login: "admin", situacao: "ativo" };
    mockQueryImpl = mockResolve([[fakeUser]]);

    const req = mockReq({ body: { login: "admin", senha: "1234" } });
    const res = mockRes();

    await login(req, res);

    expect(res.json).toHaveBeenCalledWith({
      usuario: { id: 1, nome: "Admin", login: "admin" },
    });
  });

  it("20. deve retornar 401 quando credenciais são inválidas", async () => {
    mockQueryImpl = mockResolve([[]]);

    const req = mockReq({ body: { login: "errado", senha: "errado" } });
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Login ou senha inválidos." });
  });
});
