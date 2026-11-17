package com.siapmobile

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import com.facebook.react.bridge.*
import com.facebook.react.ReactPackage
import com.facebook.react.uimanager.ViewManager
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature

class DeviceIdentityModule(context: ReactApplicationContext): ReactContextBaseJavaModule(context) {
  override fun getName() = "SiapDeviceIdentity"
  private val alias = "siap_attendance_device_v1"
  private fun store(): KeyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
  @Synchronized private fun ensureKey() {
    if (!store().containsAlias(alias)) {
      val generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_RSA, "AndroidKeyStore")
      generator.initialize(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY)
        .setKeySize(2048).setDigests(KeyProperties.DIGEST_SHA256)
        .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1).build())
      generator.generateKeyPair()
    }
  }
  @ReactMethod fun publicKey(promise: Promise) {
    try { ensureKey(); promise.resolve(Base64.encodeToString(store().getCertificate(alias).publicKey.encoded, Base64.NO_WRAP)) }
    catch (e: Exception) { promise.reject("DEVICE_KEY", "Gagal membuat identitas perangkat", e) }
  }
  @ReactMethod fun sign(payload: String, promise: Promise) {
    try {
      ensureKey()
      val signature = Signature.getInstance("SHA256withRSA")
      signature.initSign(store().getKey(alias, null) as java.security.PrivateKey)
      signature.update(payload.toByteArray(Charsets.UTF_8))
      promise.resolve(Base64.encodeToString(signature.sign(), Base64.NO_WRAP))
    } catch (e: Exception) { promise.reject("DEVICE_SIGN", "Gagal memverifikasi perangkat", e) }
  }
}
class DeviceIdentityPackage: ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(DeviceIdentityModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
