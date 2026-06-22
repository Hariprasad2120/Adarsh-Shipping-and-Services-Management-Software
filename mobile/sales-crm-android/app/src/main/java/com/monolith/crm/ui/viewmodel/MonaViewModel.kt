package com.monolith.crm.ui.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.monolith.crm.data.repository.CrmRepository
import com.monolith.crm.ui.components.AppLogger
import kotlinx.coroutines.launch

data class ChatMessage(val content: String, val isUser: Boolean, val timestamp: Long = System.currentTimeMillis())

class MonaViewModel(private val repository: CrmRepository) : ViewModel() {

    val messages = mutableStateListOf<ChatMessage>()
    var inputText by mutableStateOf("")
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    init {
        // Add a welcoming message from Mona
        messages.add(
            ChatMessage(
                content = "Hello! I am Mona, your AI shipping and services assistant. How can I help you today?",
                isUser = false
            )
        )
    }

    fun sendMessage() {
        val text = inputText.trim()
        if (text.isEmpty()) return

        // Add user message to list
        messages.add(ChatMessage(content = text, isUser = true))
        inputText = ""
        errorMessage = null
        isLoading = true

        AppLogger.info("MonaChat", "Sending query to Mona", "Query: $text")

        viewModelScope.launch {
            val result = repository.chatWithMona(text)
            isLoading = false
            if (result.isSuccess) {
                val response = result.getOrNull()
                if (response != null) {
                    messages.add(ChatMessage(content = response.content, isUser = false))
                    AppLogger.info("MonaChat", "Received response from Mona")
                } else {
                    errorMessage = "Empty response received"
                    AppLogger.warn("MonaChat", "Empty response from Mona API")
                }
            } else {
                val error = result.exceptionOrNull()
                errorMessage = error?.message ?: "Failed to get response"
                messages.add(ChatMessage(content = "Sorry, I couldn't process that request: ${errorMessage}", isUser = false))
                AppLogger.error("MonaChat", "Error chatting with Mona: ${error?.message}", error)
            }
        }
    }

    fun clearChat() {
        messages.clear()
        messages.add(
            ChatMessage(
                content = "Conversation cleared. How can I help you now?",
                isUser = false
            )
        )
        errorMessage = null
        isLoading = true

        viewModelScope.launch {
            repository.chatWithMona("", action = "clear")
            isLoading = false
            AppLogger.info("MonaChat", "Conversation cleared on backend")
        }
    }
}

class MonaViewModelFactory(private val repository: CrmRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(MonaViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return MonaViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
