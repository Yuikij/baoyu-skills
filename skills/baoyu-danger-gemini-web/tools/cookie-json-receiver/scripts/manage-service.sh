#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-status}"
SERVICE_NAME="cookie-json-receiver@${USER}.service"

case "${ACTION}" in
  start)
    systemctl --user start "${SERVICE_NAME}"
    ;;
  stop)
    systemctl --user stop "${SERVICE_NAME}"
    ;;
  restart)
    systemctl --user restart "${SERVICE_NAME}"
    ;;
  status)
    systemctl --user status "${SERVICE_NAME}"
    ;;
  logs)
    journalctl --user -u "${SERVICE_NAME}" -f
    ;;
  disable)
    systemctl --user disable --now "${SERVICE_NAME}"
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|logs|disable}"
    exit 1
    ;;
esac
