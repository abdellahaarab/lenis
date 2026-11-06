import { exec } from 'child_process'

const cmd = `"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --headless=new --user-data-dir="%TEMP%\\edge-console" --enable-logging=stderr --v=1 http://localhost:4173/`

exec(cmd, (err, stdout, stderr) => {
  console.log('STDOUT:\n', stdout)
  console.log('STDERR:\n', stderr)
})
