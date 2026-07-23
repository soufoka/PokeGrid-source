' Abre o PokeGrid sem a janela preta do cmd.
' Dica: clique com o botao direito neste arquivo > Enviar para > Area de trabalho (criar atalho).
' Nenhuma janela de terminal precisa ficar aberta: o app roda solto.
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
pasta = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = pasta

' precisa do Node.js instalado
If sh.Run("cmd /c where npm >nul 2>nul", 0, True) <> 0 Then
  MsgBox "O Node.js nao esta instalado." & vbCrLf & _
         "Baixe a versao LTS em https://nodejs.org e instale." & vbCrLf & _
         "Depois abra este arquivo de novo.", 48, "PokeGrid"
  WScript.Quit
End If

' primeira vez: instala com a janela visivel (ela fecha sozinha ao terminar)
If Not fso.FolderExists(pasta & "\node_modules") Then
  sh.Run "cmd /c title PokeGrid - primeira instalacao && echo Instalando o necessario, aguarde... && npm install", 1, True
End If

' abre o app sem janela nenhuma (0 = oculta); fechar terminais nao afeta o app
sh.Run "cmd /c npm start", 0, False
