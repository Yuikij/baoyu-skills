#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -eq 0 ]]; then
  echo "Please run as normal user, not root."
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
TOOL_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
SERVICE_SRC="${SCRIPT_DIR}/cookie-json-receiver.service"
SYSTEMD_DIR="${HOME}/.config/systemd/user"
ENV_DIR="${HOME}/.config/cookie-json-receiver"
ENV_FILE="${ENV_DIR}/env"
SERVICE_NAME="cookie-json-receiver@${USER}.service"
SERVICE_TARGET="${SYSTEMD_DIR}/${SERVICE_NAME}"

mkdir -p "${SYSTEMD_DIR}" "${ENV_DIR}" "${HOME}/.local/share/baoyu-skills/gemini-web"

if [[ ! -f "${ENV_FILE}" ]]; then
  cp "${SCRIPT_DIR}/env.example" "${ENV_FILE}"
  sed -i "s|/home/your-user|${HOME}|g" "${ENV_FILE}"
  echo "Created ${ENV_FILE}" 
fi

cp "${SERVICE_SRC}" "${SERVICE_TARGET}"

# Patch WorkingDirectory to current local checkout path
sed -i "s|%h/baoyu-skills/skills/baoyu-danger-gemini-web/tools/cookie-json-receiver|${TOOL_DIR}|g" "${SERVICE_TARGET}"

systemctl --user daemon-reload
systemctl --user enable --now "${SERVICE_NAME}"

echo "Installed and started: ${SERVICE_NAME}"
echo "Check status: systemctl --user status ${SERVICE_NAME}"
echo "View logs:     journalctl --user -u ${SERVICE_NAME} -f"

echo "If service doesn't auto start after reboot, run:"
echo "  sudo loginctl enable-linger ${USER}"
