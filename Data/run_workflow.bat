@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
for %%I in ("%ROOT%") do set "ROOT=%%~fI"
cd /d "%ROOT%"

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python n'est pas disponible dans PATH.
  pause
  exit /b 1
)

:MENU_WORKFLOW
cls
echo ============================================================
echo Hydro Sentinel - Data Preparation Launcher
echo Root: %ROOT%
echo ============================================================
echo 1. Precipitation modele (AROME/ECMWF)
echo 2. Precipitation observee (DataTable)
echo 3. Debit observe
echo 4. Volume observe
echo 0. Quitter
echo ============================================================
set /p WF=Choisir workflow [0-4]: 

if "%WF%"=="0" exit /b 0
if "%WF%"=="1" goto SET_WF1
if "%WF%"=="2" goto SET_WF2
if "%WF%"=="3" goto SET_WF3
if "%WF%"=="4" goto SET_WF4

echo [ERROR] Choix invalide.
ping 127.0.0.1 -n 2 >nul
goto MENU_WORKFLOW

:SET_WF1
set "WF_LABEL=Precipitation modele"
set "SCRIPT_REL=scripts\prepare_precip_model.py"
set "TEMPLATE_REL=templates\precip\template_precip_multi_station_mm.xlsx"
set "DEF_INPUT_REL=data_raw\model\precip\stations"
set "DEF_OUT_REL=outputs\runs"
set "FILE_FILTER=*.csv"
set "EXTRA_MODE=MODEL"
set "EXTRA_ARGS="
goto INIT_PATHS

:SET_WF2
set "WF_LABEL=Precipitation observee"
set "SCRIPT_REL=scripts\prepare_precip_observed.py"
set "TEMPLATE_REL=templates\precip\template_precip_multi_station_mm.xlsx"
set "DEF_INPUT_REL=data_raw\observed\precip"
set "DEF_OUT_REL=outputs\runs"
set "FILE_FILTER=*.xlsx *.csv"
set "EXTRA_MODE=NONE"
set "EXTRA_ARGS="
goto INIT_PATHS

:SET_WF3
set "WF_LABEL=Debit observe"
set "SCRIPT_REL=scripts\prepare_flow_observed.py"
set "TEMPLATE_REL=templates\flow\template_flow_multi_station_m3s.xlsx"
set "DEF_INPUT_REL=data_raw\observed\flow"
set "DEF_OUT_REL=outputs\runs"
set "FILE_FILTER=*.xls *.xlsx *.csv"
set "EXTRA_MODE=FLOW"
set "EXTRA_ARGS="
goto INIT_PATHS

:SET_WF4
set "WF_LABEL=Volume observe"
set "SCRIPT_REL=scripts\prepare_volume_observed.py"
set "TEMPLATE_REL=templates\volume\template_volume_multi_station_hm3.xlsx"
set "DEF_INPUT_REL=data_raw\observed\volume"
set "DEF_OUT_REL=outputs\runs"
set "FILE_FILTER=*.xls *.xlsx *.csv"
set "EXTRA_MODE=VOLUME"
set "EXTRA_ARGS="
goto INIT_PATHS

:INIT_PATHS
call :RESOLVE_PATH "%SCRIPT_REL%" SCRIPT_ABS
call :RESOLVE_PATH "%TEMPLATE_REL%" TEMPLATE_ABS
call :RESOLVE_PATH "%DEF_INPUT_REL%" DEF_INPUT_ABS
call :RESOLVE_PATH "%DEF_OUT_REL%" DEF_OUT_ABS
goto ASK_MODE

:ASK_MODE
cls
echo Workflow       : %WF_LABEL%
echo Script         : %SCRIPT_ABS%
echo Template       : %TEMPLATE_ABS%
echo Input defaut   : %DEF_INPUT_ABS%
echo Output defaut  : %DEF_OUT_ABS%
echo Filtres batch  : %FILE_FILTER%
echo.
echo 1. Traiter un seul fichier
echo 2. Traiter un dossier (batch)
set /p MODE=Choisir mode [1-2]: 
if "%MODE%"=="1" set "MODE_LABEL=Single file"
if "%MODE%"=="2" set "MODE_LABEL=Batch folder"
if not defined MODE_LABEL (
  echo [ERROR] Mode invalide.
  ping 127.0.0.1 -n 2 >nul
  goto ASK_MODE
)

echo.
echo [DETAIL] Mode choisi: %MODE% - %MODE_LABEL%
call :CONFIRM "Valider ce mode"
if errorlevel 1 (
  set "MODE_LABEL="
  goto ASK_MODE
)

goto ASK_INPUT

:ASK_INPUT
set "MODE_LABEL="
echo.
set "INP_RAW="
set /p INP_RAW=Chemin input (Enter=defaut: %DEF_INPUT_ABS%): 
if "%INP_RAW%"=="" set "INP_RAW=%DEF_INPUT_REL%"
call :RESOLVE_PATH "%INP_RAW%" INP_ABS

set "INP_TYPE=missing"
if exist "%INP_ABS%\*" set "INP_TYPE=directory"
if "%INP_TYPE%"=="missing" if exist "%INP_ABS%" set "INP_TYPE=file"

echo [DETAIL] Input choisi: %INP_ABS%
echo [DETAIL] Type detecte : %INP_TYPE%

if "%INP_TYPE%"=="directory" (
  call :COUNT_MATCH "%INP_ABS%" "%FILE_FILTER%" INP_MATCH_COUNT
  echo [DETAIL] Fichiers detectes selon filtres: !INP_MATCH_COUNT!
)

if "%INP_TYPE%"=="missing" (
  echo [WARNING] Le chemin input n'existe pas encore.
)

call :CONFIRM "Valider cet input"
if errorlevel 1 goto ASK_INPUT

goto ASK_OUTPUT

:ASK_OUTPUT
echo.
set "OUT_RAW="
set /p OUT_RAW=Chemin output (Enter=defaut: %DEF_OUT_ABS%): 
if "%OUT_RAW%"=="" set "OUT_RAW=%DEF_OUT_REL%"
call :RESOLVE_PATH "%OUT_RAW%" OUT_ABS

echo [DETAIL] Output choisi: %OUT_ABS%
if exist "%OUT_ABS%\*" (
  echo [DETAIL] Etat output: dossier existant
) else (
  echo [DETAIL] Etat output: sera cree si valide
)

call :CONFIRM "Valider cet output"
if errorlevel 1 goto ASK_OUTPUT

if /I "%EXTRA_MODE%"=="MODEL" goto ASK_MODEL
if /I "%EXTRA_MODE%"=="FLOW" goto ASK_RESAMPLE
if /I "%EXTRA_MODE%"=="VOLUME" goto ASK_RESAMPLE

goto RUN_CONFIRM

:ASK_MODEL
echo.
set "MODEL="
set /p MODEL=Model label (Enter=AROME): 
if "%MODEL%"=="" set "MODEL=AROME"
set "EXTRA_ARGS=--model %MODEL%"
echo [DETAIL] Parametre modele: %MODEL%
call :CONFIRM "Valider ce parametre"
if errorlevel 1 goto ASK_MODEL
goto RUN_CONFIRM

:ASK_RESAMPLE
echo.
set "RS="
set "AGG="
set /p RS=Resample rule (Enter=1h): 
if "%RS%"=="" set "RS=1h"
set /p AGG=Aggregation (Enter=mean): 
if "%AGG%"=="" set "AGG=mean"
set "EXTRA_ARGS=--resample-rule %RS% --agg %AGG%"
echo [DETAIL] Resample rule: %RS%
echo [DETAIL] Aggregation  : %AGG%
call :CONFIRM "Valider ces parametres"
if errorlevel 1 goto ASK_RESAMPLE
goto RUN_CONFIRM

:RUN_CONFIRM
echo.
echo ============================================================
echo Execution summary
echo Workflow: %WF_LABEL%
echo Script  : %SCRIPT_ABS%
echo Template: %TEMPLATE_ABS%
echo Input   : %INP_ABS%
echo Output  : %OUT_ABS%
echo Filtres : %FILE_FILTER%
echo Extra   : %EXTRA_ARGS%
echo ============================================================

if not exist "%SCRIPT_ABS%" (
  echo [ERROR] Script introuvable: %SCRIPT_ABS%
  pause
  exit /b 1
)
if not exist "%TEMPLATE_ABS%" (
  echo [ERROR] Template introuvable: %TEMPLATE_ABS%
  pause
  exit /b 1
)

call :CONFIRM "Lancer l'execution"
if errorlevel 1 goto MENU_WORKFLOW

if not exist "%OUT_ABS%" mkdir "%OUT_ABS%" >nul 2>nul

if "%MODE%"=="1" goto RUN_SINGLE
if "%MODE%"=="2" goto RUN_BATCH

:RUN_SINGLE
if not exist "%INP_ABS%" (
  echo [ERROR] Input introuvable: %INP_ABS%
  pause
  exit /b 1
)

set "SINGLE_INPUT=%INP_ABS%"

if exist "%INP_ABS%\*" (
  call :COUNT_MATCH "%INP_ABS%" "%FILE_FILTER%" DETECTED
  echo.
  echo [DEBUG] Mode single avec input dossier
  echo [DEBUG] Filtres utilises : %FILE_FILTER%
  echo [DEBUG] Dossier scanne   : %INP_ABS%
  echo [DEBUG] Fichiers detectes: !DETECTED!

  if !DETECTED! EQU 0 (
    echo [ERROR] Aucun fichier detecte dans le dossier input.
    pause
    exit /b 1
  )

  set /a IDX=0
  pushd "%INP_ABS%"
  for %%P in (%FILE_FILTER%) do (
    for %%F in (%%P) do (
      if exist "%%F" (
        set /a IDX+=1
        set "FILE_!IDX!=%%F"
      )
    )
  )
  popd

  if !DETECTED! EQU 1 (
    set "SINGLE_INPUT=%INP_ABS%\!FILE_1!"
    echo [INFO] Fichier selectionne automatiquement: !FILE_1!
  ) else (
    echo.
    echo Selectionner un fichier:
    for /L %%I in (1,1,!DETECTED!) do echo   %%I. !FILE_%%I!
    :ASK_SINGLE_CHOICE
    set "CHOICE="
    set /p CHOICE=Choix [1-!DETECTED!]: 
    if not defined CHOICE goto ASK_SINGLE_CHOICE
    echo(!CHOICE!| findstr /r "^[0-9][0-9]*$" >nul
    if errorlevel 1 goto ASK_SINGLE_CHOICE
    if !CHOICE! LSS 1 goto ASK_SINGLE_CHOICE
    if !CHOICE! GTR !DETECTED! goto ASK_SINGLE_CHOICE
    set "SINGLE_INPUT=%INP_ABS%\!FILE_%CHOICE%!"
    echo [INFO] Fichier selectionne: !FILE_%CHOICE%!
  )
)

echo.
echo [RUN] python "%SCRIPT_ABS%" --input "%SINGLE_INPUT%" --template "%TEMPLATE_ABS%" --outdir "%OUT_ABS%" %EXTRA_ARGS%
python "%SCRIPT_ABS%" --input "%SINGLE_INPUT%" --template "%TEMPLATE_ABS%" --outdir "%OUT_ABS%" %EXTRA_ARGS%
set "RC=%ERRORLEVEL%"
echo.
echo Code retour: %RC%
pause
exit /b %RC%

:RUN_BATCH
if not exist "%INP_ABS%\*" (
  echo [ERROR] Dossier input introuvable: %INP_ABS%
  pause
  exit /b 1
)

call :COUNT_MATCH "%INP_ABS%" "%FILE_FILTER%" DETECTED

echo.
echo [DEBUG] Filtres utilises : %FILE_FILTER%
echo [DEBUG] Dossier scanne   : %INP_ABS%
echo [DEBUG] Fichiers detectes: !DETECTED!

if !DETECTED! EQU 0 (
  echo [WARNING] Aucun fichier trouve avec filtres: %FILE_FILTER%
  pause
  exit /b 0
)

set /a COUNT=0
pushd "%INP_ABS%"
for %%P in (%FILE_FILTER%) do (
  for %%F in (%%P) do (
    if exist "%%F" (
      set /a COUNT+=1
      echo.
      echo ---- [!COUNT!] %%F
      python "%SCRIPT_ABS%" --input "%INP_ABS%\%%F" --template "%TEMPLATE_ABS%" --outdir "%OUT_ABS%" %EXTRA_ARGS%
      echo ---- retour: !ERRORLEVEL!
    )
  )
)
popd

echo.
echo Batch termine. Fichiers traites: !COUNT!
pause
exit /b 0

:COUNT_MATCH
setlocal EnableDelayedExpansion
set "_DIR=%~1"
set "_FILTERS=%~2"
set /a _CNT=0
pushd "!_DIR!" >nul 2>nul
if errorlevel 1 (
  endlocal & set "%~3=0"
  exit /b 0
)
for %%P in (!_FILTERS!) do (
  for %%F in (%%P) do (
    if exist "%%F" set /a _CNT+=1
  )
)
popd >nul
endlocal & set "%~3=%_CNT%"
exit /b 0

:RESOLVE_PATH
setlocal
set "_P=%~1"
if "%_P:~1,1%"==":" (
  set "_R=%_P%"
) else (
  set "_R=%ROOT%%_P%"
)
for %%I in ("%_R%") do set "_R=%%~fI"
endlocal & set "%~2=%_R%"
exit /b 0

:CONFIRM
set "_Q=%~1"
:CONFIRM_LOOP
set "_A="
set /p _A=%_Q% [O/N]: 
if /I "%_A%"=="O" exit /b 0
if /I "%_A%"=="N" exit /b 1
if /I "%_A%"=="Y" exit /b 0
if /I "%_A%"=="YES" exit /b 0
if /I "%_A%"=="NO" exit /b 1
goto CONFIRM_LOOP
