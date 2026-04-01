import './App.css'

import { useState } from "react";
import Login from './Login/login';
import Receitas from './Cadastros/receita';

export interface Usuario {
  id: number;
  nome: string;
  login: string;
}

function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  if (!usuario) {
    return <Login onLogin={setUsuario} />;
  }

  return <Receitas usuario={usuario} onLogout={() => setUsuario(null)} />;
}

export default App
