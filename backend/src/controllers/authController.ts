import type { Request, Response } from "express";
import pool from "../config/db.js";

export async function login(req: Request, res: Response) {
  const { login, senha } = req.body as { login: string; senha: string };

  if (!login || !senha) {
    res.status(400).json({ error: "Login e senha são obrigatórios." });
    return;
  }

  try {
    const [rows] = await pool.query(
      "SELECT * FROM usuario WHERE login = ? AND senha = ? AND situacao = 'ativo' LIMIT 1",
      [login, senha]
    );

    const usuarios = rows as any[];
    if (!usuarios.length) {
      res.status(401).json({ error: "Login ou senha inválidos." });
      return;
    }

    const user = usuarios[0];

    res.json({
      usuario: { id: user.id, nome: user.nome, login: user.login },
    });
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: err });
  }
}