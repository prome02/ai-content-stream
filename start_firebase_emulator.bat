@echo off
chcp 65001

REM Firebase 模擬器啟動批次檔
REM 設定模擬器資料儲存到指定資料夾
set EMULATOR_DIR=C:\Users\prome\Documents\firebase emu\ai-content-stream

echo ============================================
echo       Firebase 模擬器啟動腳本
echo ============================================
echo.
echo [設定資訊]
echo 專案名稱: demo-test-project
echo 模擬器資料路徑: %EMULATOR_DIR%
echo.

REM 建立資料目錄
if not exist "%EMULATOR_DIR%" (
    echo 建立模擬器資料目錄...
    mkdir "%EMULATOR_DIR%"
    echo ✓ 目錄建立完成
) else (
    echo ✓ 模擬器資料目錄已存在
)

echo.
echo [啟動資訊]
echo 即將啟動以下模擬器:
echo • Firestore: http://localhost:8080
echo • Auth: http://localhost:9099
echo • Firebase UI: http://localhost:4000
echo.
echo [操作指引]
echo 1. 模擬器啟動完成後，可在瀏覽器開啟 http://localhost:4000
echo 2. 停止模擬器請按 Ctrl+C
echo 3. 資料會自動儲存到 %EMULATOR_DIR%
echo.
echo ============================================
echo.

echo 正在啟動 Firebase 模擬器...
echo.

REM 啟動 Firebase 模擬器
npx firebase emulators:start ^
    --project demo-test-project ^
    --only firestore,auth,ui ^
    --import "%EMULATOR_DIR%" ^
    --export-on-exit

echo.
echo ✅ Firebase 模擬器已關閉
echo.
pause