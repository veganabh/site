#!/usr/bin/env bash
# Hook: formata arquivo editado com Prettier, se disponível.
# Recebe payload Claude Code em stdin e extrai tool_input.file_path.
# Exit 0 sempre — hook nunca bloqueia edit.

set +e

INPUT=$(cat)

# Tenta extrair file_path via python (presente em Windows dev env e CI)
FILE=$(printf '%s' "$INPUT" | python -c "import sys, json
try:
  d = json.load(sys.stdin)
  print(d.get('tool_input', {}).get('file_path', ''))
except Exception:
  print('')" 2>/dev/null)

if [ -z "$FILE" ]; then
  exit 0
fi

# Só formata se o arquivo está dentro do subprojeto e tem extensão reconhecida
case "$FILE" in
  *"/Site/app/"*|*"\\Site\\app\\"*)
    case "$FILE" in
      *.ts|*.tsx|*.js|*.jsx|*.json|*.css|*.md|*.mdx)
        cd "$(dirname "$0")/../.." 2>/dev/null || exit 0
        if [ -x ./node_modules/.bin/prettier ]; then
          ./node_modules/.bin/prettier --write "$FILE" >/dev/null 2>&1
        fi
        ;;
    esac
    ;;
esac

exit 0
