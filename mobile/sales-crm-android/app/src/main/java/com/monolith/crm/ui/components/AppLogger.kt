package com.monolith.crm.ui.components

import androidx.compose.runtime.mutableStateListOf
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Singleton in-app error/event logger that stores log entries
 * for display in a debug overlay within the app.
 */
object AppLogger {

    data class LogEntry(
        val timestamp: String,
        val level: Level,
        val tag: String,
        val message: String,
        val details: String? = null
    )

    enum class Level { INFO, WARN, ERROR }

    private val _logs = mutableStateListOf<LogEntry>()
    val logs: List<LogEntry> get() = _logs

    val errorCount: Int get() = _logs.count { it.level == Level.ERROR }
    val warnCount: Int get() = _logs.count { it.level == Level.WARN }

    private val dateFormat = SimpleDateFormat("HH:mm:ss.SSS", Locale.getDefault())

    fun info(tag: String, message: String, details: String? = null) {
        addEntry(Level.INFO, tag, message, details)
    }

    fun warn(tag: String, message: String, details: String? = null) {
        addEntry(Level.WARN, tag, message, details)
    }

    fun error(tag: String, message: String, throwable: Throwable? = null) {
        val details = throwable?.let { e ->
            buildString {
                appendLine("${e.javaClass.simpleName}: ${e.message}")
                e.stackTrace.take(5).forEach { appendLine("  at $it") }
                e.cause?.let { cause ->
                    appendLine("Caused by: ${cause.javaClass.simpleName}: ${cause.message}")
                }
            }
        }
        addEntry(Level.ERROR, tag, message, details)
    }

    fun error(tag: String, message: String, detailText: String) {
        addEntry(Level.ERROR, tag, message, detailText)
    }

    fun clear() {
        _logs.clear()
    }

    private fun addEntry(level: Level, tag: String, message: String, details: String?) {
        val entry = LogEntry(
            timestamp = dateFormat.format(Date()),
            level = level,
            tag = tag,
            message = message,
            details = details
        )
        // Keep max 100 entries
        if (_logs.size >= 100) {
            _logs.removeAt(0)
        }
        _logs.add(entry)
    }
}
