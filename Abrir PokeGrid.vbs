' Abre o PokeGrid sem a janela preta do cmd.
' Dica: clique com o botao direito neste arquivo > Enviar para > Area de trabalho (criar atalho).
' Fechar qualquer janela de terminal NAO fecha o app aberto por aqui.
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
pasta = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = pasta
If Not fso.FolderExists(pasta & "\node_modules") Then
  ' primeira vez: usa o iniciar.bat visivel pra acompanhar a instalacao
  sh.Run """" & pasta & "\iniciar.bat""", 1, False
Else
  ' 0 = janela oculta; o app abre sozinho, sem cmd
  sh.Run "cmd /c npm start", 0, False
End If
