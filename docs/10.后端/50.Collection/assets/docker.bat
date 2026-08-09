@echo off
echo winsock reset start
%1 %2
ver|find "5.">nul&&goto :Admin
mshta vbscript:createobject("shell.application").shellexecute("%~s0","goto :Admin","","runas",1)(window.close)&goto :eof
:Admin
cmd  /c netsh winsock reset
echo winsock reset end
start /min "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
exit
