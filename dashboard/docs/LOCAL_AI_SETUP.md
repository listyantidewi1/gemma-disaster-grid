# Local AI Setup

This project can call a local Ollama model from `POST /api/analyze`.

## 1. Install Ollama on Windows

1. Download Ollama for Windows from:
   <https://ollama.com/download/windows>
2. Run the installer.
3. Open a new PowerShell window after installation so `ollama` is available in `PATH`.

Verify:

```powershell
ollama --version
```

## 2. Run Ollama

Ollama usually starts automatically after installation. If it is not running:

```powershell
ollama serve
```

Keep that terminal open while developing.

## 3. Pull the Gemma 4 Model

```powershell
ollama pull gemma4:e2b
```

Check that the model exists:

```powershell
ollama list
```

## 4. Verify Ollama HTTP API

Ollama should listen on `http://localhost:11434`.

```powershell
Invoke-RestMethod http://localhost:11434/api/tags
```

You should see a list of local models, including `gemma4:e2b`.

## 5. Test `/api/analyze`

Start the Next.js app:

```powershell
npm.cmd run dev
```

Then test the API route:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/analyze `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"report":"Dense smoke near peatland. Visibility below 200 meters. Residents report breathing difficulty."}'
```

Expected response fields:

```json
{
  "severity": "HIGH",
  "aqiEstimate": "...",
  "evacuationRecommendation": "...",
  "environmentalImpact": "...",
  "source": "gemma-local"
}
```

If Ollama is unavailable, the app returns a safe fallback with:

```json
{
  "source": "mock-fallback"
}
```

## Troubleshooting

- `source` is `mock-fallback`: confirm Ollama is running and `gemma4:e2b` is installed.
- `ollama` command not found: restart PowerShell or reinstall Ollama.
- `localhost:11434` does not respond: run `ollama serve`.
- Model not found: run `ollama pull gemma4:e2b`.
- Slow first response: the model may be loading into memory; retry after a few seconds.
- Port conflict: make sure no other service is using `11434`.
