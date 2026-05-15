const candidates = [
  { email: 'teste.api.20260407110345@empresa.com', password: 'Copilot!123' },
  { email: 'copilot.tipoescola@local.test', password: 'Copilot!123' },
]

async function main() {
  for (const candidate of candidates) {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(candidate),
    })

    const payload = await response.json().catch(() => null)
    console.log(JSON.stringify({
      email: candidate.email,
      status: response.status,
      ok: response.ok,
      hasUser: Boolean(payload && payload.user),
      accessCount: Array.isArray(payload?.user?.acessos) ? payload.user.acessos.length : null,
    }, null, 2))
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
