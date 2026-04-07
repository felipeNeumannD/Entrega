const BASE_URL = "http://177.44.248.15/api";

function headers() {
  return {
    "Content-Type": "application/json"
  };
}

// ── Auth ──
export async function apiLogin(login: string, senha: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, senha }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json(); // { token, usuario }
}

// ── Receitas ──
export async function apiListar(tipo?: string, busca?: string) {
  const params = new URLSearchParams();
  if (tipo && tipo !== "todos") params.set("tipo", tipo);
  if (busca) params.set("busca", busca);
  const res = await fetch(`${BASE_URL}/receitas?${params}`, { headers: headers() });
  if (!res.ok) throw new Error("Erro ao carregar receitas.");
  return res.json();
}

export async function apiCriar(data: Omit<Receita, "id">) {
  const res = await fetch(`${BASE_URL}/receitas`, {
    method: "POST", headers: headers(), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erro ao criar receita.");
  return res.json();
}

export async function apiAtualizar(id: number, data: Omit<Receita, "id">) {
  const res = await fetch(`${BASE_URL}/receitas/${id}`, {
    method: "PUT", headers: headers(), body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erro ao atualizar receita.");
  return res.json();
}

export async function apiDeletar(id: number) {
  const res = await fetch(`${BASE_URL}/receitas/${id}`, {
    method: "DELETE", headers: headers(),
  });
  if (!res.ok) throw new Error("Erro ao excluir receita.");
}

interface Receita {
  id: number;
  nome: string;
  descricao: string;
  data_registro: string;
  custo: number;
  tipo_receita: "doce" | "salgada";
}