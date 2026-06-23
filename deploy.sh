#!/usr/bin/env bash
set -euo pipefail

# ─── Cores ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERRO]${NC} $*"; exit 1; }

# ─── Verificações iniciais ────────────────────────────────────────────────────
check_deps() {
  command -v docker >/dev/null 2>&1 || error "Docker não encontrado. Instale em https://docs.docker.com/engine/install/ubuntu/"
  docker compose version >/dev/null 2>&1 || error "Docker Compose não encontrado."
}

# ─── Funções de ambiente ──────────────────────────────────────────────────────
env_up() {
  local env=$1
  local compose_file="docker-compose.${env}.yml"
  local env_file=".env.${env}"

  [ -f "$compose_file" ] || error "Arquivo $compose_file não encontrado."
  [ -f "$env_file" ]     || error "Arquivo $env_file não encontrado."

  info "Subindo ambiente: ${env^^}"
  docker compose -f "$compose_file" --env-file "$env_file" up --build -d
  success "Ambiente ${env^^} no ar!"

  if [ "$env" = "homolog" ]; then
    echo -e "${GREEN}  → Frontend: http://localhost:8080${NC}"
    echo -e "${GREEN}  → Backend:  http://localhost:3001${NC}"
  else
    echo -e "${GREEN}  → Frontend: http://localhost:80${NC}"
    echo -e "${GREEN}  → Backend:  http://localhost:3000${NC}"
  fi
}

env_down() {
  local env=$1
  local compose_file="docker-compose.${env}.yml"
  local env_file=".env.${env}"

  [ -f "$compose_file" ] || error "Arquivo $compose_file não encontrado."

  info "Derrubando ambiente: ${env^^}"
  docker compose -f "$compose_file" --env-file "$env_file" down
  success "Ambiente ${env^^} parado."
}

env_reset() {
  local env=$1
  local compose_file="docker-compose.${env}.yml"
  local env_file=".env.${env}"

  warn "Isso vai apagar o banco de dados do ambiente ${env^^}. Continuar? (s/N)"
  read -r confirm
  [[ "$confirm" =~ ^[sS]$ ]] || { info "Operação cancelada."; return; }

  info "Resetando ambiente: ${env^^}"
  docker compose -f "$compose_file" --env-file "$env_file" down -v
  docker compose -f "$compose_file" --env-file "$env_file" up --build -d
  success "Ambiente ${env^^} resetado com banco limpo."
}

env_logs() {
  local env=$1
  local compose_file="docker-compose.${env}.yml"
  local env_file=".env.${env}"
  local service="${2:-}"

  info "Logs do ambiente ${env^^} ${service:+(serviço: $service)}"
  docker compose -f "$compose_file" --env-file "$env_file" logs -f $service
}

env_status() {
  echo ""
  echo -e "${BLUE}══════════════════════════════════════════${NC}"
  echo -e "${BLUE}        STATUS DOS AMBIENTES              ${NC}"
  echo -e "${BLUE}══════════════════════════════════════════${NC}"

  echo -e "\n${CYAN}── HOMOLOGAÇÃO (porta 8080) ──${NC}"
  docker ps --filter "name=homolog_" --format "  {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null \
    || echo "  Nenhum container rodando"

  echo -e "\n${CYAN}── PRODUÇÃO (porta 80) ──${NC}"
  docker ps --filter "name=prod_" --format "  {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null \
    || echo "  Nenhum container rodando"

  echo -e "\n${CYAN}── VOLUMES ──${NC}"
  docker volume ls --filter "name=entrega_homolog_db" --filter "name=entrega_prod_db" \
    --format "  {{.Name}}" 2>/dev/null || echo "  Nenhum volume"
  echo ""
}

# ─── Menu de uso ─────────────────────────────────────────────────────────────
usage() {
  echo ""
  echo -e "${CYAN}Uso:${NC} ./deploy.sh <comando> [ambiente] [opções]"
  echo ""
  echo -e "${CYAN}Comandos:${NC}"
  echo "  up      <homolog|prod>     Sobe o ambiente (build + start)"
  echo "  down    <homolog|prod>     Para o ambiente"
  echo "  reset   <homolog|prod>     Para, apaga o banco e sobe do zero"
  echo "  logs    <homolog|prod> [serviço]   Mostra logs em tempo real"
  echo "  status                     Mostra status de todos os ambientes"
  echo "  up-all                     Sobe homologação e produção juntos"
  echo "  down-all                   Para todos os ambientes"
  echo ""
  echo -e "${CYAN}Exemplos:${NC}"
  echo "  ./deploy.sh up homolog"
  echo "  ./deploy.sh up prod"
  echo "  ./deploy.sh logs homolog backend"
  echo "  ./deploy.sh reset homolog"
  echo "  ./deploy.sh status"
  echo ""
}

# ─── Main ────────────────────────────────────────────────────────────────────
check_deps

COMMAND="${1:-}"
ENV="${2:-}"

case "$COMMAND" in
  up)
    [[ "$ENV" == "homolog" || "$ENV" == "prod" ]] || { usage; error "Ambiente inválido. Use: homolog ou prod"; }
    env_up "$ENV"
    ;;
  down)
    [[ "$ENV" == "homolog" || "$ENV" == "prod" ]] || { usage; error "Ambiente inválido. Use: homolog ou prod"; }
    env_down "$ENV"
    ;;
  reset)
    [[ "$ENV" == "homolog" || "$ENV" == "prod" ]] || { usage; error "Ambiente inválido. Use: homolog ou prod"; }
    env_reset "$ENV"
    ;;
  logs)
    [[ "$ENV" == "homolog" || "$ENV" == "prod" ]] || { usage; error "Ambiente inválido. Use: homolog ou prod"; }
    env_logs "$ENV" "${3:-}"
    ;;
  status)
    env_status
    ;;
  up-all)
    env_up homolog
    echo ""
    env_up prod
    ;;
  down-all)
    env_down homolog || true
    env_down prod    || true
    success "Todos os ambientes parados."
    ;;
  *)
    usage
    ;;
esac
