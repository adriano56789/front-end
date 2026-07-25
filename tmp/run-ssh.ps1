$proc = New-Object System.Diagnostics.Process
$proc.StartInfo.FileName = "ssh.exe"
$proc.StartInfo.Arguments = "-i C:\Users\adria\.ssh\id_opencode -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@2.25.192.154 `"docker ps --format 'table {{.Names}} {{.Ports}} {{.Status}}' && cat /root/srs/conf/srs.conf && echo SPLITTER && cat /app/nginx/nginx.conf && echo SPLITTER2 && find /usr/local/srs/objs/nginx/html/live/ -name '*.m3u8' 2>/dev/null && docker exec srs ls /usr/local/srs/objs/nginx/html/live/ 2>/dev/null`""
$proc.StartInfo.UseShellExecute = $false
$proc.StartInfo.RedirectStandardInput = $true
$proc.StartInfo.RedirectStandardOutput = $true
$proc.StartInfo.RedirectStandardError = $true
$proc.StartInfo.StandardOutputEncoding = [System.Text.Encoding]::UTF8
$proc.StartInfo.StandardErrorEncoding = [System.Text.Encoding]::UTF8
$proc.Start() | Out-Null
$proc.WaitForExit(20000)
$stdout = $proc.StandardOutput.ReadToEnd()
$stderr = $proc.StandardError.ReadToEnd()
Write-Output $stdout
if ($stderr) { Write-Output "ERR: $stderr" }
$proc.Dispose()
