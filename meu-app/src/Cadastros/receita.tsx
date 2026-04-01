// Receitas.tsx
import { useEffect, useState } from "react";
import type { Usuario } from "../App";
import { apiAtualizar, apiCriar, apiDeletar, apiListar } from "../services/api";

interface Receita {
  id: number;
  nome: string;
  descricao: string;
  data_registro: string;
  custo: number;
  tipo_receita: "doce" | "salgada";
}

interface Props {
  usuario: Usuario;
  onLogout: () => void;
}

const emptyForm = (): Omit<Receita, "id"> => ({
  nome: "",
  descricao: "",
  data_registro: new Date().toISOString().split("T")[0],
  custo: 0,
  tipo_receita: "doce",
});

export default function Receitas({ usuario, onLogout }: Props) {
  const [receitas, setReceitas]         = useState<Receita[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filtro, setFiltro]             = useState<"todos" | "doce" | "salgada">("todos");
  const [busca, setBusca]               = useState("");
  const [modalAberto, setModalAberto]   = useState(false);
  const [editId, setEditId]             = useState<number | null>(null);
  const [form, setForm]                 = useState<Omit<Receita, "id">>(emptyForm());
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => {
    carregarReceitas();
  }, [filtro, busca]);

  async function carregarReceitas() {
    setLoading(true);
    try {
      const data = await apiListar(filtro, busca);
      setReceitas(data);
    } catch {
      alert("Erro ao carregar receitas.");
    } finally {
      setLoading(false);
    }
  }

  // ── derivados ──
  const lista      = receitas; // filtro/busca já vêm da API
  const totalDoce  = receitas.filter((r) => r.tipo_receita === "doce").length;
  const totalSalg  = receitas.filter((r) => r.tipo_receita === "salgada").length;
  const custoMedio = receitas.length
    ? receitas.reduce((a, r) => a + r.custo, 0) / receitas.length
    : 0;

  // ── modal ──
  function openCreate() { setEditId(null); setForm(emptyForm()); setModalAberto(true); }
  function openEdit(r: Receita) {
    setEditId(r.id);
    setForm({ nome: r.nome, descricao: r.descricao, data_registro: r.data_registro, custo: r.custo, tipo_receita: r.tipo_receita });
    setModalAberto(true);
  }
  function closeModal() { setModalAberto(false); setEditId(null); }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === "custo" ? parseFloat(value) || 0 : value }));
  }

  async function saveReceita() {
    if (!form.nome.trim() || !form.descricao.trim() || !form.data_registro) return;
    try {
      if (editId !== null) {
        await apiAtualizar(editId, form);
      } else {
        await apiCriar(form);
      }
      closeModal();
      carregarReceitas();
    } catch {
      alert("Erro ao salvar receita.");
    }
  }

  async function deleteReceita(id: number) {
    try {
      await apiDeletar(id);
      setConfirmDelete(null);
      carregarReceitas();
    } catch {
      alert("Erro ao excluir receita.");
    }
  }

  const formatDate = (d: string) => {
    const [y, m, di] = d.split("-");
    return `${di}/${m}/${y}`;
  };

  return (
    <div style={s.wrapper}>
      {/* TOPBAR */}
      <div style={s.topbar}>
        <span style={s.brand}>🍴 Livro de Receitas</span>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={s.userLabel}>👤 {usuario.nome}</span>
          <button style={s.btnLogout} onClick={onLogout}>Sair</button>
        </div>
      </div>

      <div style={s.main}>
        {/* HEADER */}
        <div style={s.pageHeader}>
          <div>
            <h1 style={s.pageTitle}>Receitas</h1>
            <p style={s.pageSub}>Gerencie suas receitas doces e salgadas</p>
          </div>
          <button style={s.btnNew} onClick={openCreate}>＋ Nova Receita</button>
        </div>

        {/* STATS */}
        <div style={s.stats}>
          {[
            { label: "Total",      val: receitas.length, color: "#3d2b1f" },
            { label: "Doces",      val: totalDoce,       color: "#b05a8a" },
            { label: "Salgadas",   val: totalSalg,       color: "#4a7a6e" },
            { label: "Custo médio",val: `R$ ${custoMedio.toFixed(2).replace(".", ",")}`, color: "#c2623f" },
          ].map((st) => (
            <div key={st.label} style={s.statCard}>
              <div style={s.statLabel}>{st.label}</div>
              <div style={{ ...s.statVal, color: st.color }}>{st.val}</div>
            </div>
          ))}
        </div>

        {/* FILTROS */}
        <div style={s.filters}>
          {(["todos", "doce", "salgada"] as const).map((f) => (
            <button
              key={f}
              style={{ ...s.filterBtn, ...(filtro === f ? s.filterActive : {}) }}
              onClick={() => setFiltro(f)}
            >
              {f === "todos" ? "Todas" : f === "doce" ? "🍰 Doces" : "🥘 Salgadas"}
            </button>
          ))}
          <input
            style={s.searchInput}
            type="text"
            placeholder="Buscar receita..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {/* GRID */}
        {loading ? (
          <div style={s.empty}><p style={{ fontFamily: "Georgia, serif", fontSize: 18 }}>Carregando...</p></div>
        ) : lista.length === 0 ? (
          <div style={s.empty}>
            <p style={{ fontFamily: "Georgia, serif", fontSize: 20, marginBottom: 6 }}>Nenhuma receita encontrada</p>
            <span style={{ fontSize: 14 }}>Tente outro filtro ou busca</span>
          </div>
        ) : (
          <div style={s.grid}>
            {lista.map((r) => (
              <div key={r.id} style={s.card}>
                <div style={{ ...s.cardAccent, background: r.tipo_receita === "doce" ? "#b05a8a" : "#4a7a6e" }} />
                <div style={s.cardHeader}>
                  <span style={s.cardName}>{r.nome}</span>
                  <span style={{ ...s.badge, background: r.tipo_receita === "doce" ? "#f5e8f0" : "#e5f0ee", color: r.tipo_receita === "doce" ? "#b05a8a" : "#4a7a6e" }}>
                    {r.tipo_receita === "doce" ? "🍰 Doce" : "🥘 Salgada"}
                  </span>
                </div>
                <p style={s.cardDesc}>{r.descricao}</p>
                <div style={s.cardMeta}>
                  <span style={s.cardCusto}>R$ {Number(r.custo).toFixed(2).replace(".", ",")}</span>
                  <span style={s.cardData}>{formatDate(r.data_registro)}</span>
                </div>
                <div style={s.cardActions}>
                  <button style={s.btnEdit} onClick={() => openEdit(r)}>✏️ Editar</button>
                  <button style={s.btnDel}  onClick={() => setConfirmDelete(r.id)}>🗑 Excluir</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL FORM */}
      {modalAberto && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>{editId !== null ? "Editar Receita" : "Nova Receita"}</h2>
            <div style={s.formGrid}>
              <div style={{ ...s.formField, gridColumn: "1 / -1" }}>
                <label style={s.formLabel}>Nome da Receita</label>
                <input style={s.formInput} name="nome" value={form.nome} onChange={handleChange} placeholder="Ex: Bolo de Chocolate" />
              </div>
              <div style={{ ...s.formField, gridColumn: "1 / -1" }}>
                <label style={s.formLabel}>Descrição</label>
                <textarea style={{ ...s.formInput, minHeight: 80, resize: "vertical" }} name="descricao" value={form.descricao} onChange={handleChange} placeholder="Descreva a receita..." />
              </div>
              <div style={s.formField}>
                <label style={s.formLabel}>Tipo</label>
                <select style={s.formInput} name="tipo_receita" value={form.tipo_receita} onChange={handleChange}>
                  <option value="doce">🍰 Doce</option>
                  <option value="salgada">🥘 Salgada</option>
                </select>
              </div>
              <div style={s.formField}>
                <label style={s.formLabel}>Custo (R$)</label>
                <input style={s.formInput} type="number" name="custo" value={form.custo} onChange={handleChange} min={0} step={0.01} />
              </div>
              <div style={s.formField}>
                <label style={s.formLabel}>Data de Registro</label>
                <input style={s.formInput} type="date" name="data_registro" value={form.data_registro} onChange={handleChange} />
              </div>
            </div>
            <div style={s.modalActions}>
              <button style={s.btnCancel} onClick={closeModal}>Cancelar</button>
              <button style={s.btnSave}   onClick={saveReceita}>Salvar Receita</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE */}
      {confirmDelete !== null && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: 380, textAlign: "center" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🗑</p>
            <h2 style={s.modalTitle}>Excluir receita?</h2>
            <p style={{ fontSize: 14, color: "#8a7a6e", marginBottom: 24 }}>Essa ação não poderá ser desfeita.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button style={s.btnCancel} onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button style={{ ...s.btnSave, background: "#c23f3f" }} onClick={() => deleteReceita(confirmDelete)}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrapper:     { minHeight: "100vh", background: "#faf7f2", fontFamily: "'Segoe UI', sans-serif", display: "flex", flexDirection: "column" },
  topbar:      { background: "#3d2b1f", color: "white", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 58, position: "sticky", top: 0, zIndex: 100 },
  brand:       { fontFamily: "Georgia, serif", fontSize: 20 },
  userLabel:   { fontSize: 13, color: "rgba(255,255,255,0.7)" },
  btnLogout:   { background: "rgba(255,255,255,0.12)", border: "none", color: "white", padding: "6px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer" },
  main:        { flex: 1, padding: "32px 28px", maxWidth: 1100, width: "100%", margin: "0 auto" },
  pageHeader:  { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 },
  pageTitle:   { fontFamily: "Georgia, serif", fontSize: 28, color: "#3d2b1f" },
  pageSub:     { fontSize: 13, color: "#8a7a6e", marginTop: 2 },
  btnNew:      { background: "#c2623f", color: "white", border: "none", padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer" },
  stats:       { display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" },
  statCard:    { background: "white", border: "1.5px solid #e8ddd4", borderRadius: 12, padding: "14px 20px", flex: 1, minWidth: 110 },
  statLabel:   { fontSize: 11, color: "#8a7a6e", textTransform: "uppercase", letterSpacing: "0.7px" },
  statVal:     { fontSize: 22, fontWeight: 500, marginTop: 2 },
  filters:     { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22, alignItems: "center" },
  filterBtn:   { padding: "7px 16px", borderRadius: 20, border: "1.5px solid #e8ddd4", background: "white", fontSize: 13, cursor: "pointer", color: "#3d2b1f" },
  filterActive:{ background: "#3d2b1f", color: "white", border: "1.5px solid #3d2b1f" },
  searchInput: { padding: "7px 14px", border: "1.5px solid #e8ddd4", borderRadius: 20, fontSize: 13, outline: "none", color: "#3d2b1f", background: "white", width: 200 },
  grid:        { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 },
  card:        { background: "white", borderRadius: 16, border: "1.5px solid #e8ddd4", padding: 20, position: "relative", overflow: "hidden" },
  cardAccent:  { position: "absolute", top: 0, left: 0, right: 0, height: 4 },
  cardHeader:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  cardName:    { fontFamily: "Georgia, serif", fontSize: 17, color: "#3d2b1f", flex: 1, paddingRight: 8 },
  badge:       { fontSize: 11, padding: "3px 9px", borderRadius: 20, fontWeight: 500, whiteSpace: "nowrap" },
  cardDesc:    { fontSize: 13, color: "#8a7a6e", lineHeight: 1.6, marginBottom: 14 },
  cardMeta:    { display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e8ddd4", paddingTop: 12 },
  cardCusto:   { fontSize: 15, fontWeight: 500, color: "#c2623f" },
  cardData:    { fontSize: 11, color: "#8a7a6e" },
  cardActions: { display: "flex", gap: 6, marginTop: 12 },
  btnEdit:     { padding: "5px 12px", borderRadius: 7, border: "1.5px solid #e8ddd4", background: "white", fontSize: 12, cursor: "pointer", color: "#c2623f" },
  btnDel:      { padding: "5px 12px", borderRadius: 7, border: "1.5px solid #f0d5d5", background: "white", fontSize: 12, cursor: "pointer", color: "#c23f3f" },
  empty:       { textAlign: "center", padding: "60px 20px", color: "#8a7a6e" },
  overlay:     { position: "fixed", inset: 0, background: "rgba(61,43,31,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal:       { background: "#faf7f2", borderRadius: 18, padding: 36, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" },
  modalTitle:  { fontFamily: "Georgia, serif", fontSize: 22, marginBottom: 24, color: "#3d2b1f" },
  formGrid:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  formField:   { display: "flex", flexDirection: "column", gap: 6 },
  formLabel:   { fontSize: 12, fontWeight: 500, color: "#8a7a6e", letterSpacing: "0.7px", textTransform: "uppercase" },
  formInput:   { padding: "10px 13px", border: "1.5px solid #e8ddd4", borderRadius: 9, fontSize: 14, background: "white", color: "#3d2b1f", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
  modalActions:{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" },
  btnCancel:   { padding: "10px 20px", border: "1.5px solid #e8ddd4", background: "white", borderRadius: 9, fontSize: 14, cursor: "pointer", color: "#3d2b1f" },
  btnSave:     { padding: "10px 22px", background: "#c2623f", color: "white", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: "pointer" },
};