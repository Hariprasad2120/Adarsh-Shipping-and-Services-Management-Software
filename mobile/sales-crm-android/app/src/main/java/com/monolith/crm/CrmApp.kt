package com.monolith.crm

import android.app.Application
import com.monolith.crm.data.repository.CrmRepository

class CrmApp : Application() {
    lateinit var repository: CrmRepository
        private set

    override fun onCreate() {
        super.onCreate()
        repository = CrmRepository(this)
    }
}
