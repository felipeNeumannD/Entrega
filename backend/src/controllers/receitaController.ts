import type { Request, Response } from 'express';
import pool from "../config/db.js";

// GET /receitas
export async function listar(req: Request, res: Response) {
  try {
    const { tipo, busca } = req.query;
    let sql = "SELECT * FROM receita WHERE 1=1";
    const params: any[] = [];

    if (tipo && tipo !== "todos") {
      sql += " AND tipo_receita = ?";
      params.push(tipo);
    }
    if (busca) {
      sql += " AND (nome LIKE ? OR descricao LIKE ?)";
      params.push(`%${busca}%`, `%${busca}%`);
    }

    sql += " ORDER BY data_registro DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Erro ao listar receitas." });
  }
}

// GET /receitas/:id
export async function buscarPorId(req: Request, res: Response) {
  try {
    const [rows] = await pool.query("SELECT * FROM receita WHERE id = ?", [req.params.id]);
    const lista = rows as any[];
    if (!lista.length) { res.status(404).json({ error: "Receita não encontrada." }); return; }
    res.json(lista[0]);
  } catch {
    res.status(500).json({ error: "Erro ao buscar receita." });
  }
}

// POST /receitas
export async function criar(req: Request, res: Response) {
  const { nome, descricao, data_registro, custo, tipo_receita } = req.body;
  if (!nome || !descricao || !data_registro || custo == null || !tipo_receita) {
    res.status(400).json({ error: "Todos os campos são obrigatórios." });
    return;
  }
  try {
    const [result] = await pool.query(
      "INSERT INTO receita (nome, descricao, data_registro, custo, tipo_receita) VALUES (?, ?, ?, ?, ?)",
      [nome, descricao, data_registro, custo, tipo_receita]
    ) as any;
    res.status(201).json({ id: result.insertId, nome, descricao, data_registro, custo, tipo_receita });
  } catch {
    res.status(500).json({ error: "Erro ao criar receita." });
  }
}

// PUT /receitas/:id
export async function atualizar(req: Request, res: Response) {
  const { nome, descricao, data_registro, custo, tipo_receita } = req.body;
  if (!nome || !descricao || !data_registro || custo == null || !tipo_receita) {
    res.status(400).json({ error: "Todos os campos são obrigatórios." });
    return;
  }
  try {
    await pool.query(
      "UPDATE receita SET nome=?, descricao=?, data_registro=?, custo=?, tipo_receita=? WHERE id=?",
      [nome, descricao, data_registro, custo, tipo_receita, req.params.id]
    );
    res.json({ id: Number(req.params.id), nome, descricao, data_registro, custo, tipo_receita });
  } catch {
    res.status(500).json({ error: "Erro ao atualizar receita." });
  }
}

// DELETE /receitas/:id
export async function deletar(req: Request, res: Response) {
  try {
    await pool.query("DELETE FROM receita WHERE id = ?", [req.params.id]);
    res.json({ message: "Receita excluída com sucesso." });
  } catch {
    res.status(500).json({ error: "Erro ao excluir receita." });
  }
}