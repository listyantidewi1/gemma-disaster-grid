package ai.grg

/**
 * Configuration for the phone -> dashboard sync.
 *
 * INGEST_URL is the public POST endpoint on the NusaSiaga deployment.
 * INGEST_TOKEN is a shared secret matched against the server's
 * TRIAGE_INGEST_TOKEN env var. This is hackathon-grade auth — the secret
 * is shipped in the APK, so an attacker who reverse-engineers the binary
 * could POST garbage to the dashboard. Mitigation for production:
 * per-device tokens minted server-side after install-time enrollment.
 */
object TriageConfig {
    const val INGEST_URL: String = "https://nusasiaga.vercel.app/api/reports"
    const val INGEST_TOKEN: String = "grg_2026hack_a7f3c92e8b5d1f4c6e9a2b8d5f1c3e7a"

    /** Connect timeout for the upload, in milliseconds. */
    const val CONNECT_TIMEOUT_MS: Int = 5_000

    /** Read timeout (waiting for response after the POST is sent). */
    const val READ_TIMEOUT_MS: Int = 10_000
}
