#!/usr/bin/env bash
set -euo pipefail

# ─── Cores ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERRO]${NC} $*"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

# ─── Ler variáveis do env sem executar o arquivo ─────────────────────────────
read_env() {
  local env_file="$1"
  local key="$2"
  grep "^${key}=" "$env_file" | cut -d'=' -f2-
}

# ─── Configurar ambiente ──────────────────────────────────────────────────────
setup_env() {
  local env="$1"
  [[ "$env" == "homolog" || "$env" == "prod" ]] || error "Ambiente inválido. Use: homolog ou prod"

  local env_file="$SCRIPT_DIR/../.env.${env}"
  [ -f "$env_file" ] || error "Arquivo .env.${env} não encontrado."

  DB_CONTAINER="homolog_db"
  [ "$env" = "prod" ] && DB_CONTAINER="prod_db"

  DB_USER=$(read_env "$env_file" "DB_USER")
  DB_PASS=$(read_env "$env_file" "DB_PASSWORD")
  DB_NAME=$(read_env "$env_file" "DB_NAME")
}

# ─── Executar SQL no container ────────────────────────────────────────────────
db_exec() {
  docker exec "$DB_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" "$@" 2>/dev/null
}

db_exec_file() {
  docker exec -i "$DB_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" 2>/dev/null
}

# ─── Garantir tabela de controle ─────────────────────────────────────────────
ensure_migrations_table() {
  db_exec -e "
    CREATE TABLE IF NOT EXISTS _schema_versions (
      version     VARCHAR(10)  NOT NULL PRIMARY KEY,
      descricao   VARCHAR(255) NOT NULL DEFAULT '',
      aplicado_em DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status      ENUM('aplicada','revertida') NOT NULL DEFAULT 'aplicada'
    );"
}

# ─── Extrair versão do nome do arquivo ───────────────────────────────────────
get_version() {
  basename "$1" | grep -oE '^[0-9]+'
}

get_descricao() {
  basename "$1" .sql | sed 's/^[0-9]*_//' | tr '_' ' '
}

# ─── STATUS ──────────────────────────────────────────────────────────────────
cmd_status() {
  local env="$1"
  setup_env "$env"
  ensure_migrations_table

  echo ""
  echo -e "${BOLD}${BLUE}══════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${BLUE}   MIGRATIONS — ${env^^}  (banco: ${DB_NAME})${NC}"
  echo -e "${BOLD}${BLUE}══════════════════════════════════════════════════════${NC}"
  printf "\n  %-6s %-30s %-12s %s\n" "VER" "DESCRIÇÃO" "STATUS" "APLICADO EM"
  echo "  ──────────────────────────────────────────────────────"

  local tem_pendente=0

  for arquivo in "$MIGRATIONS_DIR"/*.sql; do
    [[ "$arquivo" == *.down.sql ]] && continue
    [ -f "$arquivo" ] || continue

    local ver descricao status_str data
    ver=$(get_version "$arquivo")
    descricao=$(get_descricao "$arquivo")

    local row
    row=$(db_exec -sNe \
      "SELECT status, aplicado_em FROM _schema_versions WHERE version='${ver}';" 2>/dev/null || echo "")

    if [ -z "$row" ]; then
      status_str="${YELLOW}pendente${NC}"
      data="-"
      tem_pendente=1
    else
      local st dt
      st=$(echo "$row" | awk '{print $1}')
      dt=$(echo "$row" | awk '{print $2, $3}')
      if [ "$st" = "aplicada" ]; then
        status_str="${GREEN}aplicada${NC}"
      else
        status_str="${RED}revertida${NC}"
        tem_pendente=1
      fi
      data="$dt"
    fi

    printf "  %-6s %-30s " "$ver" "$descricao"
    echo -e "${status_str}  ${data}"
  done

  echo ""
  if [ "$tem_pendente" = "1" ]; then
    warn "Há migrations pendentes. Execute: ./migrate.sh up ${env}"
  else
    success "Todas as migrations estão aplicadas."
  fi
  echo ""
}

# ─── UP ──────────────────────────────────────────────────────────────────────
cmd_up() {
  local env="$1"
  setup_env "$env"
  ensure_migrations_table

  local aplicadas=0 ignoradas=0

  echo ""
  info "Aplicando migrations pendentes em ${env^^}..."
  echo ""

  for arquivo in "$MIGRATIONS_DIR"/*.sql; do
    [[ "$arquivo" == *.down.sql ]] && continue
    [ -f "$arquivo" ] || continue

    local ver descricao
    ver=$(get_version "$arquivo")
    descricao=$(get_descricao "$arquivo")

    local ja
    ja=$(db_exec -sNe \
      "SELECT COUNT(*) FROM _schema_versions WHERE version='${ver}' AND status='aplicada';" 2>/dev/null || echo "0")

    if [ "$ja" = "1" ]; then
      echo -e "  ${GREEN}✓${NC} ${ver} — ${descricao} (já aplicada)"
      ignoradas=$((ignoradas + 1))
    else
      echo -e "  ${CYAN}→${NC} Aplicando ${ver} — ${descricao}..."
      db_exec_file < "$arquivo"
      db_exec -e "
        INSERT INTO _schema_versions (version, descricao, status)
        VALUES ('${ver}', '${descricao}', 'aplicada')
        ON DUPLICATE KEY UPDATE status='aplicada', aplicado_em=NOW();"
      echo -e "  ${GREEN}✓${NC} ${ver} — ${descricao} aplicada!"
      aplicadas=$((aplicadas + 1))
    fi
  done

  echo ""
  success "${aplicadas} aplicada(s), ${ignoradas} já existente(s)."
  echo ""
}

# ─── DOWN (rollback de uma versão específica) ─────────────────────────────────
cmd_down() {
  local env="$1"
  local ver="$2"
  setup_env "$env"
  ensure_migrations_table

  local down_file
  down_file=$(find "$MIGRATIONS_DIR" -name "${ver}*.down.sql" | head -1)

  [ -f "$down_file" ] || error "Arquivo de rollback não encontrado: ${ver}*.down.sql"

  local descricao
  descricao=$(get_descricao "${down_file%.down.sql}.sql")

  warn "Reverter migration ${ver} — ${descricao} em ${env^^}? (s/N)"
  read -r confirm
  [[ "$confirm" =~ ^[sS]$ ]] || { info "Cancelado."; exit 0; }

  info "Revertendo ${ver}..."
  db_exec_file < "$down_file"
  db_exec -e "UPDATE _schema_versions SET status='revertida' WHERE version='${ver}';"
  success "Migration ${ver} revertida."
}

# ─── HISTORY ─────────────────────────────────────────────────────────────────
cmd_history() {
  local env="$1"
  setup_env "$env"
  ensure_migrations_table

  echo ""
  echo -e "${BOLD}${BLUE}══ HISTÓRICO — ${env^^} ══${NC}"
  printf "\n  %-6s %-30s %-12s %s\n" "VER" "DESCRIÇÃO" "STATUS" "DATA"
  echo "  ──────────────────────────────────────────────────────"
  db_exec -e "SELECT version, descricao, status, aplicado_em FROM _schema_versions ORDER BY aplicado_em DESC;" \
    | tail -n +2 \
    | while IFS=$'\t' read -r v d s dt; do
        local cor="$GREEN"
        [ "$s" = "revertida" ] && cor="$RED"
        printf "  %-6s %-30s ${cor}%-12s${NC} %s\n" "$v" "$d" "$s" "$dt"
      done
  echo ""
}

# ─── Menu de uso ─────────────────────────────────────────────────────────────
usage() {
  echo ""
  echo -e "${CYAN}Uso:${NC} ./migrate.sh <comando> <homolog|prod> [versão]"
  echo ""
  echo "  status  <env>        Mostra migrations aplicadas e pendentes"
  echo "  up      <env>        Aplica todas as migrations pendentes"
  echo "  down    <env> <ver>  Reverte uma migration (requer arquivo .down.sql)"
  echo "  history <env>        Histórico completo de migrations"
  echo ""
  echo -e "${CYAN}Exemplos:${NC}"
  echo "  ./migrate.sh status  homolog"
  echo "  ./migrate.sh up      homolog"
  echo "  ./migrate.sh up      prod"
  echo "  ./migrate.sh down    homolog 001"
  echo "  ./migrate.sh history prod"
  echo ""
  echo -e "${CYAN}Convenção de nomes:${NC}"
  echo "  db/migrations/001_create_tabela.sql       ← migration"
  echo "  db/migrations/001_create_tabela.down.sql  ← rollback (opcional)"
  echo ""
}

# ─── Main ────────────────────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || error "Docker não encontrado."

COMMAND="${1:-}"
ENV="${2:-}"

case "$COMMAND" in
  status)  [ -n "$ENV" ] || { usage; error "Informe o ambiente."; }; cmd_status "$ENV" ;;
  up)      [ -n "$ENV" ] || { usage; error "Informe o ambiente."; }; cmd_up "$ENV" ;;
  down)    [ -n "$ENV" ] || { usage; error "Informe o ambiente."; }; cmd_down "$ENV" "${3:-}" ;;
  history) [ -n "$ENV" ] || { usage; error "Informe o ambiente."; }; cmd_history "$ENV" ;;
  *)       usage ;;
esac
