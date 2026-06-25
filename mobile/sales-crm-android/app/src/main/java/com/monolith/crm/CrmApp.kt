package com.monolith.crm

import android.app.Application
import com.monolith.crm.data.repository.CrmRepository
import com.monolith.crm.hrms.data.repository.HrmsRepository
import com.monolith.crm.hrms.face.FaceNetModel

class CrmApp : Application() {
    lateinit var repository: CrmRepository
        private set

    lateinit var hrmsRepository: HrmsRepository
        private set

    lateinit var faceNetModel: FaceNetModel
        private set

    override fun onCreate() {
        super.onCreate()
        repository = CrmRepository(this)
        hrmsRepository = HrmsRepository(this, repository)
        faceNetModel = FaceNetModel(this)
        // Pre-load FaceNet model in background (non-blocking)
        Thread {
            faceNetModel.loadModel()
        }.start()
    }
}
