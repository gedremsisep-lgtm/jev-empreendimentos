; =====================================================================
;  Instalador do JeV Empreendimentos
;  Gerado com NSIS. Instala só para o usuário atual, sem pedir senha de
;  administrador, e cria os atalhos com o ícone da JeV.
; =====================================================================

Unicode true
SetCompressor /SOLID lzma
SetCompressorDictSize 64

!define NOME       "JeV Empreendimentos"
!define VERSAO     "1.0.1"
!define EMPRESA    "JeV Empreendimentos"
!define EXE        "JeV Empreendimentos.exe"
!define PASTA_REG  "Software\JeV Empreendimentos"
!define DESINST_REG "Software\Microsoft\Windows\CurrentVersion\Uninstall\JeVEmpreendimentos"

Name "${NOME} ${VERSAO}"
OutFile "dist\JeV-Empreendimentos-Instalador-${VERSAO}.exe"
InstallDir "$LOCALAPPDATA\Programs\jev-empreendimentos"
InstallDirRegKey HKCU "${PASTA_REG}" "InstallDir"
RequestExecutionLevel user
ShowInstDetails hide
ShowUnInstDetails hide

VIProductVersion "1.0.1.0"
VIAddVersionKey /LANG=1046 "ProductName"     "${NOME}"
VIAddVersionKey /LANG=1046 "CompanyName"     "${EMPRESA}"
VIAddVersionKey /LANG=1046 "FileDescription" "Instalador do ${NOME}"
VIAddVersionKey /LANG=1046 "FileVersion"     "${VERSAO}"
VIAddVersionKey /LANG=1046 "ProductVersion"  "${VERSAO}"
VIAddVersionKey /LANG=1046 "LegalCopyright"  "© ${EMPRESA}"

!include "MUI2.nsh"
!include "FileFunc.nsh"

!define MUI_ICON   "build\icon.ico"
!define MUI_UNICON "build\icon.ico"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Abrir o JeV Empreendimentos agora"
!define MUI_WELCOMEPAGE_TITLE "Instalar o ${NOME}"
!define MUI_WELCOMEPAGE_TEXT "Este assistente vai instalar o ${NOME} versão ${VERSAO} neste computador.$\r$\n$\r$\nO sistema guarda os dados no próprio computador e funciona sem internet. A instalação não pede senha de administrador e não mexe em nada fora da sua pasta de usuário.$\r$\n$\r$\nClique em Avançar para continuar."
!define MUI_DIRECTORYPAGE_TEXT_TOP "O ${NOME} será instalado na pasta abaixo. Para escolher outra, clique em Procurar."

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "PortugueseBR"

; ---------------------------------------------------------------- instalar
Section "Programa" SecPrograma
  SectionIn RO
  SetOutPath "$INSTDIR"

  ; se já houver uma versão aberta, o arquivo fica travado
  ClearErrors
  Delete "$INSTDIR\${EXE}"
  IfErrors 0 +3
    MessageBox MB_OK|MB_ICONEXCLAMATION "O JeV Empreendimentos parece estar aberto. Feche o programa e tente de novo."
    Abort

  File /r "dist\win-unpacked\*.*"
  File "/oname=jev.ico" "build\icon.ico"

  WriteRegStr HKCU "${PASTA_REG}" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${PASTA_REG}" "Version"    "${VERSAO}"

  ; atalhos com o ícone da JeV
  CreateShortCut "$DESKTOP\${NOME}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\jev.ico" 0
  CreateDirectory "$SMPROGRAMS\${NOME}"
  CreateShortCut "$SMPROGRAMS\${NOME}\${NOME}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\jev.ico" 0
  CreateShortCut "$SMPROGRAMS\${NOME}\Desinstalar o ${NOME}.lnk" "$INSTDIR\Desinstalar.exe"

  ; arquivos .jev abrem no sistema com dois cliques
  WriteRegStr HKCU "Software\Classes\.jev" "" "JeV.Pacote"
  WriteRegStr HKCU "Software\Classes\JeV.Pacote" "" "Pacote da JeV"
  WriteRegStr HKCU "Software\Classes\JeV.Pacote\DefaultIcon" "" "$INSTDIR\jev.ico"
  WriteRegStr HKCU "Software\Classes\JeV.Pacote\shell\open\command" "" '"$INSTDIR\${EXE}" "%1"'

  ; aparece em Aplicativos e Recursos, do Windows
  WriteUninstaller "$INSTDIR\Desinstalar.exe"
  WriteRegStr   HKCU "${DESINST_REG}" "DisplayName"     "${NOME}"
  WriteRegStr   HKCU "${DESINST_REG}" "DisplayVersion"  "${VERSAO}"
  WriteRegStr   HKCU "${DESINST_REG}" "Publisher"       "${EMPRESA}"
  WriteRegStr   HKCU "${DESINST_REG}" "DisplayIcon"     "$INSTDIR\jev.ico"
  WriteRegStr   HKCU "${DESINST_REG}" "InstallLocation" "$INSTDIR"
  WriteRegStr   HKCU "${DESINST_REG}" "UninstallString" '"$INSTDIR\Desinstalar.exe"'
  WriteRegDWORD HKCU "${DESINST_REG}" "NoModify" 1
  WriteRegDWORD HKCU "${DESINST_REG}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKCU "${DESINST_REG}" "EstimatedSize" "$0"

  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
SectionEnd

; ---------------------------------------------------------------- desinstalar
Section "Uninstall"
  Delete "$DESKTOP\${NOME}.lnk"
  Delete "$SMPROGRAMS\${NOME}\${NOME}.lnk"
  Delete "$SMPROGRAMS\${NOME}\Desinstalar o ${NOME}.lnk"
  RMDir  "$SMPROGRAMS\${NOME}"

  DeleteRegKey HKCU "Software\Classes\.jev"
  DeleteRegKey HKCU "Software\Classes\JeV.Pacote"
  DeleteRegKey HKCU "${DESINST_REG}"
  DeleteRegKey HKCU "${PASTA_REG}"

  RMDir /r "$INSTDIR\locales"
  RMDir /r "$INSTDIR\resources"
  RMDir /r "$INSTDIR\swiftshader"
  Delete "$INSTDIR\*.*"
  RMDir  "$INSTDIR"

  MessageBox MB_OK|MB_ICONINFORMATION "O JeV Empreendimentos foi removido.$\r$\n$\r$\nSeus dados NÃO foram apagados: eles continuam guardados no computador, e voltam a aparecer se você instalar o sistema de novo."
SectionEnd
