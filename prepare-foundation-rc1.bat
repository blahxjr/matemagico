@echo off

echo ========================================
echo MateMagico - Foundation RC1
echo ========================================

echo.
echo 1. Criando branch...
git checkout -b foundation-rc1 2>nul

echo.
echo 2. Adicionando apenas arquivos da Foundation...

git add .github/workflows/ci.yml
git add package.json
git add package-lock.json
git add turbo.json
git add scripts/test-db.mjs

git add apps/api/package.json
git add packages/database/package.json
git add packages/modules/auth/package.json
git add packages/modules/membership/package.json

git add packages/events/package.json
git add packages/events/src/index.ts
git add packages/events/src/contracts.ts
git add packages/events/src/contracts.test.ts

git add apps/web/package.json
git add packages/shared-types/package.json
git add packages/testing/package.json

git add apps/api/src/app.ts
git add apps/api/src/auth-routes.ts
git add apps/api/src/main.ts
git add apps/api/src/membership-routes.ts
git add apps/api/src/observability.e2e.test.ts

git add packages/logger/package.json
git add packages/logger/src/index.ts
git add packages/logger/src/logger.ts
git add packages/logger/src/logger.test.ts

git add packages/composition-root/package.json
git add packages/composition-root/src/provisional-ports.ts
git add packages/composition-root/src/provisional-ports.test.ts

echo.
echo 3. Conferindo staged...
git status

echo.
echo 4. Criando Commit 1...
git commit -m "feat(foundation): postgres ci and contract tests"

echo.
echo 5. Push da branch...
git push -u origin foundation-rc1

echo.
echo ========================================
echo RC1 enviado.
echo Agora abra o Pull Request.
echo ========================================
pause