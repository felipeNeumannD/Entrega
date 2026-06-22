CREATE TABLE IF NOT EXISTS usuario (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nome      VARCHAR(100) NOT NULL,
  login     VARCHAR(50)  NOT NULL UNIQUE,
  senha     VARCHAR(100) NOT NULL,
  situacao  ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo'
);

CREATE TABLE IF NOT EXISTS receita (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  nome           VARCHAR(100)          NOT NULL,
  descricao      TEXT                  NOT NULL,
  data_registro  DATE                  NOT NULL,
  custo          DECIMAL(10,2)         NOT NULL,
  tipo_receita   ENUM('doce','salgada') NOT NULL
);

INSERT INTO usuario (nome, login, senha, situacao) VALUES
  ('Administrador', 'admin', 'admin123', 'ativo');

INSERT INTO receita (nome, descricao, data_registro, custo, tipo_receita) VALUES
  ('Bolo de Chocolate',   'Bolo fofo com cobertura de chocolate ao leite',           '2024-01-15', 35.00, 'doce'),
  ('Brigadeiro Gourmet',  'Brigadeiro com chocolate 70% cacau e granulado belga',    '2024-02-03', 12.00, 'doce'),
  ('Pudim de Leite',      'Pudim cremoso de leite condensado com calda de caramelo', '2024-02-20', 22.00, 'doce'),
  ('Quiche de Frango',    'Torta salgada com frango desfiado e requeijão cremoso',   '2024-03-10', 28.50, 'salgada'),
  ('Coxinha de Frango',   'Coxinha crocante com massa de batata e frango temperado', '2024-04-05',  5.50, 'salgada');
