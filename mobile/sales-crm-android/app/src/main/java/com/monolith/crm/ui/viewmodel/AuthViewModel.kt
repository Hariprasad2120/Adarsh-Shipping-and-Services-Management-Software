package com.monolith.crm.ui.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.monolith.crm.data.repository.CrmRepository
import com.monolith.crm.ui.components.AppLogger
import kotlinx.coroutines.launch

class AuthViewModel(private val repository: CrmRepository) : ViewModel() {

    var rememberMe by mutableStateOf(repository.isRememberMeEnabled())
    var email by mutableStateOf(if (repository.isRememberMeEnabled()) repository.getRememberedEmail() else "")
    var password by mutableStateOf(if (repository.isRememberMeEnabled()) repository.getRememberedPassword() else "")
    var baseUrl by mutableStateOf(repository.getBaseUrl())
    var isLoading by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var isLoggedIn by mutableStateOf(repository.getAuthToken() != null)
    var hasConsent by mutableStateOf(repository.hasConsent())
    var hasFolderSetup by mutableStateOf(repository.getSelectedFolderUri() != null)

    fun login(onSuccess: () -> Unit) {
        errorMessage = null
        if (email.isBlank() || password.isBlank()) {
            errorMessage = "Please enter email and password"
            AppLogger.warn("Auth", "Login attempted with empty credentials")
            return
        }

        isLoading = true

        // Save the URL BEFORE making the API call
        repository.setBaseUrl(baseUrl)
        AppLogger.info("Auth", "Login attempt → $baseUrl", "Email: $email")

        viewModelScope.launch {
            val result = repository.login(email, password)
            isLoading = false
            if (result.isSuccess) {
                isLoggedIn = true
                repository.saveRememberedCredentials(email, password, rememberMe)
                AppLogger.info("Auth", "Login successful", "User: ${result.getOrNull()?.user?.name}")
                onSuccess()
            } else {
                val error = result.exceptionOrNull()
                errorMessage = error?.message ?: "Login failed"
                AppLogger.error("Auth", "Login failed: ${error?.message}", error)
            }
        }
    }

    fun submitConsent(agreed: Boolean, onDone: () -> Unit) {
        repository.setConsent(agreed)
        hasConsent = agreed
        AppLogger.info("Consent", if (agreed) "User accepted T&C" else "User declined T&C")
        onDone()
    }

    fun saveFolderUri(uri: String) {
        repository.setSelectedFolderUri(uri)
        hasFolderSetup = true
        AppLogger.info("Setup", "Recorder folder selected", "URI: $uri")
    }

    fun logout() {
        repository.logout()
        isLoggedIn = false
        email = ""
        password = ""
        AppLogger.info("Auth", "User logged out")
    }
}

class AuthViewModelFactory(private val repository: CrmRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(AuthViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return AuthViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
