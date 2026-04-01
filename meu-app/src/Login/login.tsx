// Login.tsx
import { useState } from "react";
import type { Usuario } from "../App";
import { apiLogin } from "../services/api";

interface Props {
  onLogin: (usuario: Usuario) => void;
}

export default function Login({ onLogin }: Props) {
  const [form, setForm] = useState({ login: "", senha: "" });
  const [erro, setErro] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErro("");
  }

  async function handleLogin() {
    try {
      const data = await apiLogin(form.login, form.senha);
      localStorage.setItem("token", data.token);
      onLogin(data.usuario);
    } catch (err: any) {
      setErro(err.message || "Erro ao realizar login.");
    }
  }

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.logoArea}>
          <div style={s.logoIcon}>🍴</div>
          <h1 style={s.title}>Livro de Receitas</h1>
          <p style={s.subtitle}>GESTÃO DE RECEITAS</p>
        </div>
        <div style={s.field}>
          <label style={s.label}>Login</label>
          <input
            style={s.input}
            type="text"
            name="login"
            placeholder="seu login"
            value={form.login}
            onChange={handleChange}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>
        <div style={s.field}>
          <label style={s.label}>Senha</label>
          <input
            style={s.input}
            type="password"
            name="senha"
            placeholder="••••••••"
            value={form.senha}
            onChange={handleChange}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>
        <button style={s.btn} onClick={handleLogin}>
          Entrar
        </button>
        {erro && <p style={s.erro}>{erro}</p>}
        <p style={s.hint}>
          Login: <strong>admin</strong> / Senha: <strong>admin123</strong>
        </p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "#3d2b1f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    background: "#faf7f2",
    borderRadius: 20,
    padding: "48px 44px",
    width: "100%",
    maxWidth: 400,
  },
  logoArea: { textAlign: "center", marginBottom: 32 },
  logoIcon: {
    width: 56,
    height: 56,
    background: "#c2623f",
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 26,
    margin: "0 auto 12px",
  },
  title: {
    fontFamily: "Georgia, serif",
    fontSize: 28,
    color: "#3d2b1f",
    marginBottom: 4,
  },
  subtitle: { fontSize: 12, color: "#8a7a6e", letterSpacing: "0.6px" },
  field: { marginBottom: 18 },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: "#8a7a6e",
    letterSpacing: "0.7px",
    textTransform: "uppercase",
    marginBottom: 7,
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    border: "1.5px solid #e8ddd4",
    borderRadius: 10,
    fontSize: 14,
    background: "white",
    color: "#3d2b1f",
    outline: "none",
    boxSizing: "border-box",
  },
  btn: {
    width: "100%",
    padding: 13,
    background: "#c2623f",
    color: "white",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    marginTop: 8,
  },
  erro: { color: "#c23f3f", fontSize: 13, textAlign: "center", marginTop: 10 },
  hint: { fontSize: 12, color: "#8a7a6e", textAlign: "center", marginTop: 14 },
};
