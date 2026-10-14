plugins {
  alias(libs.plugins.android.application)
}

// CI passes -PforgeVersionCode=<run number>; local builds default to 1.
val forgeVersionCode = (findProperty("forgeVersionCode") as String?)?.toIntOrNull() ?: 1

android {
  namespace = "com.burkiuze.forge"
  compileSdk = 36

  defaultConfig {
    applicationId = "com.burkiuze.forge"
    minSdk = 24
    targetSdk = 36
    versionCode = forgeVersionCode
    versionName = "1.0.$forgeVersionCode"
  }

  // Release signing comes from the environment (CI secrets). Without it the release
  // APK/AAB are produced unsigned and must be signed afterwards.
  val keystorePath = System.getenv("KEYSTORE_PATH") ?: "${rootDir}/my-upload-key.jks"
  val hasReleaseKey = file(keystorePath).exists() && System.getenv("STORE_PASSWORD") != null
  signingConfigs {
    if (hasReleaseKey) {
      create("release") {
        storeFile = file(keystorePath)
        storePassword = System.getenv("STORE_PASSWORD")
        keyAlias = System.getenv("KEY_ALIAS") ?: "upload"
        keyPassword = System.getenv("KEY_PASSWORD") ?: System.getenv("STORE_PASSWORD")
      }
    }
  }

  buildTypes {
    release {
      isMinifyEnabled = false
      isCrunchPngs = false
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
      if (hasReleaseKey) signingConfig = signingConfigs.getByName("release")
    }
  }
  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
  buildFeatures { buildConfig = true }
  androidResources { noCompress += listOf("glb", "gltf", "wasm", "bin") }
  dependenciesInfo {
    includeInApk = false
    includeInBundle = true
  }
}

dependencies {
  implementation(libs.androidx.webkit)
}
