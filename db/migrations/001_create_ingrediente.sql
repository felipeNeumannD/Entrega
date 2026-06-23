-- Migration: 001_create_ingrediente
-- Descrição: Cria tabela de ingredientes das receitas

CREATE TABLE IF NOT EXISTS ingrediente (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  receita_id   INT NOT NULL,
  nome         VARCHAR(100) NOT NULL,
  quantidade   DECIMAL(10,2) NOT NULL,
  unidade      VARCHAR(20) NOT NULL,
  CONSTRAINT fk_ingrediente_receita
    FOREIGN KEY (receita_id) REFERENCES receita(id) ON DELETE CASCADE
);
