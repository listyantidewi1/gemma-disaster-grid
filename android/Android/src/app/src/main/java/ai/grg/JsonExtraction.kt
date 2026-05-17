package ai.grg

import kotlinx.serialization.json.Json

/**
 * Extract a parseable JSON object from raw Gemma 4 output.
 *
 * Mirrors `extract_json_from_model_output` in `grg/schemas.py`. The model
 * may emit a `<|channel>thought ... <channel|>` reasoning trace before
 * the JSON, or wrap output in ```json fences. This function iterates
 * over every balanced `{...}` substring and returns the first one that
 * round-trips through the JSON parser. That way schema templates inside
 * the system prompt (which contain `<placeholder>` markers and are not
 * valid JSON) get skipped in favor of the model's real output.
 *
 * Returns null if no JSON-like candidate is found.
 * Returns the first balanced substring as a fallback if no candidate parses.
 */
fun extractJsonFromModelOutput(text: String): String? {
    val json = Json { ignoreUnknownKeys = true }
    val candidates = mutableListOf<String>()
    var i = 0
    while (i < text.length) {
        if (text[i] != '{') {
            i++
            continue
        }
        var depth = 0
        var inString = false
        var escape = false
        var closed = false
        var j = i
        while (j < text.length) {
            val ch = text[j]
            when {
                escape -> escape = false
                ch == '\\' -> escape = true
                ch == '"' -> inString = !inString
                !inString && ch == '{' -> depth++
                !inString && ch == '}' -> {
                    depth--
                    if (depth == 0) {
                        val candidate = text.substring(i, j + 1)
                        candidates.add(candidate)
                        try {
                            json.parseToJsonElement(candidate)
                            return candidate
                        } catch (_: Exception) {
                            // Not parseable; keep searching for a later valid one.
                        }
                        i = j + 1
                        closed = true
                        break
                    }
                }
            }
            j++
        }
        if (!closed) break
    }
    return candidates.firstOrNull()
}

/**
 * Best-effort repair of a JSON object that was truncated by a token-limit
 * hit during generation. Walks the open `{` / `[` stack, finds the last
 * safely closeable position, and appends matching closers.
 *
 * Mirrors `attempt_truncated_json_repair` in `grg/schemas.py`.
 *
 * Returns null if the input is too damaged to recover.
 */
fun attemptTruncatedJsonRepair(text: String): String? {
    val start = text.indexOf('{')
    if (start == -1) return null
    val s = text.substring(start)

    var inString = false
    var escape = false
    var lastSafe = -1
    for ((idx, ch) in s.withIndex()) {
        when {
            escape -> escape = false
            ch == '\\' -> escape = true
            ch == '"' -> inString = !inString
            !inString && ch in ",}]" -> lastSafe = idx
        }
    }
    if (lastSafe == -1) return null

    val trimmed = s.substring(0, lastSafe + 1).trimEnd().trimEnd(',').trimEnd()

    inString = false
    escape = false
    val stack = mutableListOf<Char>()
    for (ch in trimmed) {
        when {
            escape -> escape = false
            ch == '\\' -> escape = true
            ch == '"' -> inString = !inString
            !inString && ch in "{[" -> stack.add(ch)
            !inString && ch in "}]" -> if (stack.isNotEmpty()) stack.removeAt(stack.size - 1)
        }
    }

    val closing = stack.asReversed().joinToString("") { if (it == '{') "}" else "]" }
    return trimmed + closing
}

/**
 * High-level parse helper: extract → optionally repair → decode.
 *
 * Use this on raw Gemma 4 E2B output to produce a typed [EdgeTriageReport].
 * Returns null and a diagnostic message on failure.
 *
 * Example:
 *   val (report, error) = parseEdgeReport(rawModelOutput)
 *   if (report != null) showResult(report) else log(error)
 */
fun parseEdgeReport(raw: String): Pair<EdgeTriageReport?, String?> {
    val json = Json { ignoreUnknownKeys = true; isLenient = true }
    val extracted = extractJsonFromModelOutput(raw)
        ?: attemptTruncatedJsonRepair(raw)
        ?: return null to "no balanced JSON object found in model output"
    return try {
        json.decodeFromString(EdgeTriageReport.serializer(), extracted) to null
    } catch (e: Exception) {
        null to "schema validation error: ${e.message}"
    }
}
