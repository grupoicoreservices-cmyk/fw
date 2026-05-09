# How to publish to GitHub

Guia rápido para subir este projeto para o seu repositório GitHub.

## 1. Criar o repositório no GitHub

Vá em https://github.com/new e crie um repositório chamado, por exemplo, `firewall-console`. **Não** marque as opções de README, .gitignore ou LICENSE (já temos).

## 2. Subir o código

Na pasta do projeto (`/app` neste preview, ou onde você baixou os arquivos):

```bash
# Inicializa o repositório local
git init
git branch -M main

# Adiciona arquivos (o .gitignore já cobre tudo que não deve ir)
git add .

# Primeiro commit
git commit -m "feat: initial release - Firewall Console v1.0"

# Adiciona o remote do seu repositório (substitua SEU_USUARIO)
git remote add origin https://github.com/SEU_USUARIO/firewall-console.git

# Push
git push -u origin main
```

Se você preferir SSH:
```bash
git remote add origin git@github.com:SEU_USUARIO/firewall-console.git
```

## 3. Atualizar URLs no código

Depois de criar o repositório, edite os links nos arquivos abaixo, substituindo `SEU_USUARIO` pelo seu usuário real:

```bash
sed -i 's|SEU_USUARIO|seuuser|g' README.md quick-install.sh CHANGELOG.md
git add -A && git commit -m "chore: update repo URLs" && git push
```

## 4. Criar uma release (opcional mas recomendado)

```bash
git tag -a v1.0.0 -m "Release 1.0.0 - Initial public release"
git push origin v1.0.0
```

Na interface do GitHub: vá em **Releases** → **Draft a new release** → escolha a tag `v1.0.0` → cole o conteúdo do `CHANGELOG.md` → **Publish**.

## 5. Compartilhar a instalação one-liner

Depois de publicar, qualquer um pode instalar com:

```bash
curl -fsSL https://raw.githubusercontent.com/SEU_USUARIO/firewall-console/main/quick-install.sh | sudo bash
```

Ou se quiser proteger ainda mais, force uma versão específica:

```bash
curl -fsSL https://raw.githubusercontent.com/SEU_USUARIO/firewall-console/v1.0.0/quick-install.sh | sudo bash
```

## 6. Atualizações futuras

No servidor onde você já instalou:

```bash
cd /opt/firewall-console
sudo git pull
sudo docker compose pull
sudo docker compose up -d --build
```

## 7. Workflow de CI (GitHub Actions)

O arquivo `.github/workflows/build.yml` já está configurado e executa em todo push/PR:
- Lint do backend (ruff)
- Smoke import test do backend
- Build do frontend
- Build das imagens Docker (sem push)

Se quiser publicar imagens em GHCR, adicione um step de push depois do `Build backend/frontend image` com login no `ghcr.io` usando `GITHUB_TOKEN`.

---

**Pronto!** Seu Firewall Console está online no GitHub e qualquer um com Ubuntu 24 pode instalar com 1 comando. 🚀
