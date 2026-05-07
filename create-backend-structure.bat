@echo off
setlocal enabledelayedexpansion
echo ================================================
echo    Creating NestJS Backend Project Structure...
echo ================================================

set BASE=.

:: Root files
type nul > "%BASE%\package.json"
type nul > "%BASE%\nest-cli.json"
type nul > "%BASE%\.env.example"
type nul > "%BASE%\docker-compose.yml"

:: src structure
mkdir "%BASE%\src" 2>nul
type nul > "%BASE%\src\main.ts"

:: modules
mkdir "%BASE%\src\modules\auth\strategies" 2>nul
mkdir "%BASE%\src\modules\auth\dto" 2>nul
type nul > "%BASE%\src\modules\auth\auth.module.ts"
type nul > "%BASE%\src\modules\auth\auth.controller.ts"
type nul > "%BASE%\src\modules\auth\auth.service.ts"
type nul > "%BASE%\src\modules\auth\strategies\jwt.strategy.ts"
type nul > "%BASE%\src\modules\auth\strategies\jwt-refresh.strategy.ts"
type nul > "%BASE%\src\modules\auth\strategies\google.strategy.ts"
type nul > "%BASE%\src\modules\auth\dto\login.dto.ts"
type nul > "%BASE%\src\modules\auth\dto\register.dto.ts"
type nul > "%BASE%\src\modules\auth\dto\refresh-token.dto.ts"

mkdir "%BASE%\src\modules\users\entities" 2>nul
type nul > "%BASE%\src\modules\users\users.module.ts"
type nul > "%BASE%\src\modules\users\users.controller.ts"
type nul > "%BASE%\src\modules\users\users.service.ts"
type nul > "%BASE%\src\modules\users\entities\user.entity.ts"

mkdir "%BASE%\src\modules\colleges\entities" 2>nul
type nul > "%BASE%\src\modules\colleges\colleges.module.ts"
type nul > "%BASE%\src\modules\colleges\colleges.controller.ts"
type nul > "%BASE%\src\modules\colleges\colleges.service.ts"
type nul > "%BASE%\src\modules\colleges\entities\college.entity.ts"
type nul > "%BASE%\src\modules\colleges\entities\university.entity.ts"

mkdir "%BASE%\src\modules\quiz\entities" 2>nul
type nul > "%BASE%\src\modules\quiz\quiz.module.ts"
type nul > "%BASE%\src\modules\quiz\quiz.controller.ts"
type nul > "%BASE%\src\modules\quiz\quiz.service.ts"
type nul > "%BASE%\src\modules\quiz\entities\quiz-session.entity.ts"
type nul > "%BASE%\src\modules\quiz\entities\question.entity.ts"

mkdir "%BASE%\src\modules\ai" 2>nul
type nul > "%BASE%\src\modules\ai\ai.module.ts"
type nul > "%BASE%\src\modules\ai\ai.controller.ts"
type nul > "%BASE%\src\modules\ai\recommendation.service.ts"
type nul > "%BASE%\src\modules\ai\chatbot.service.ts"
type nul > "%BASE%\src\modules\ai\salary-predictor.service.ts"
type nul > "%BASE%\src\modules\ai\lang-detection.service.ts"

mkdir "%BASE%\src\modules\i18n" 2>nul
type nul > "%BASE%\src\modules\i18n\i18n.module.ts"
type nul > "%BASE%\src\modules\i18n\i18n.service.ts"
type nul > "%BASE%\src\modules\i18n\locale.middleware.ts"

mkdir "%BASE%\src\modules\notifications\templates" 2>nul
type nul > "%BASE%\src\modules\notifications\notifications.module.ts"
type nul > "%BASE%\src\modules\notifications\notifications.service.ts"
type nul > "%BASE%\src\modules\notifications\templates\otp.ar.hbs"
type nul > "%BASE%\src\modules\notifications\templates\otp.en.hbs"
type nul > "%BASE%\src\modules\notifications\templates\otp.fr.hbs"

mkdir "%BASE%\src\modules\analytics" 2>nul
type nul > "%BASE%\src\modules\analytics\analytics.module.ts"
type nul > "%BASE%\src\modules\analytics\analytics.controller.ts"
type nul > "%BASE%\src\modules\analytics\analytics.service.ts"

:: common
mkdir "%BASE%\src\common\decorators" 2>nul
mkdir "%BASE%\src\common\guards" 2>nul
mkdir "%BASE%\src\common\filters" 2>nul
mkdir "%BASE%\src\common\interceptors" 2>nul
mkdir "%BASE%\src\common\pipes" 2>nul

type nul > "%BASE%\src\common\decorators\roles.decorator.ts"
type nul > "%BASE%\src\common\decorators\current-user.decorator.ts"
type nul > "%BASE%\src\common\decorators\locale.decorator.ts"
type nul > "%BASE%\src\common\guards\jwt-auth.guard.ts"
type nul > "%BASE%\src\common\guards\roles.guard.ts"
type nul > "%BASE%\src\common\filters\http-exception.filter.ts"
type nul > "%BASE%\src\common\filters\i18n-exception.filter.ts"
type nul > "%BASE%\src\common\interceptors\logging.interceptor.ts"
type nul > "%BASE%\src\common\interceptors\transform.interceptor.ts"
type nul > "%BASE%\src\common\interceptors\locale.interceptor.ts"
type nul > "%BASE%\src\common\pipes\validation.pipe.ts"

:: database
mkdir "%BASE%\src\database\migrations" 2>nul
mkdir "%BASE%\src\database\seeds" 2>nul
type nul > "%BASE%\src\database\seeds\colleges.seed.ts"
type nul > "%BASE%\src\database\seeds\quiz-questions.seed.ts"

:: config
mkdir "%BASE%\src\config" 2>nul
type nul > "%BASE%\src\config\app.config.ts"
type nul > "%BASE%\src\config\database.config.ts"
type nul > "%BASE%\src\config\jwt.config.ts"
type nul > "%BASE%\src\config\redis.config.ts"
type nul > "%BASE%\src\config\ai.config.ts"

:: test
mkdir "%BASE%\test" 2>nul
type nul > "%BASE%\test\app.e2e-spec.ts"
type nul > "%BASE%\test\auth.e2e-spec.ts"
type nul > "%BASE%\test\jest-e2e.json"

echo.
echo ================================================
echo ✅ NestJS Backend structure created successfully!
echo ================================================
echo.
echo Current directory: %CD%
echo You can now open the backend folder in VS Code.
pause