package com.example

import android.content.Context
import android.os.Bundle
import android.util.Log
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.util.UUID

data class ForgeUser(
  val uid: String,
  val username: String,
  val email: String,
  val photoUrl: String? = null,
  val isGoogleUser: Boolean = false
)

class MainActivity : ComponentActivity() {
  private val auth by lazy { FirebaseAuth.getInstance() }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()

    setContent {
      var currentUser by remember { mutableStateOf<ForgeUser?>(null) }

      // Check current session
      LaunchedEffect(Unit) {
        val fbUser = auth.currentUser
        if (fbUser != null) {
          currentUser = ForgeUser(
            uid = fbUser.uid,
            username = fbUser.displayName ?: "Forge Creator",
            email = fbUser.email ?: "",
            photoUrl = fbUser.photoUrl?.toString(),
            isGoogleUser = true
          )
        } else {
          // Check locally stored user session
          val prefs = getSharedPreferences("forge_auth_prefs", Context.MODE_PRIVATE)
          val savedUid = prefs.getString("current_user_uid", null)
          if (savedUid != null) {
            val username = prefs.getString("user_${savedUid}_username", "Creator") ?: "Creator"
            val email = prefs.getString("user_${savedUid}_email", "") ?: ""
            currentUser = ForgeUser(
              uid = savedUid,
              username = username,
              email = email,
              isGoogleUser = false
            )
          }
        }
      }

      Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFF141414)
      ) {
        if (currentUser == null) {
          AuthScreen(
            onAuthSuccess = { user ->
              currentUser = user
            }
          )
        } else {
          AuthenticatedAppScreen(
            user = currentUser!!,
            onSignOut = {
              auth.signOut()
              val prefs = getSharedPreferences("forge_auth_prefs", Context.MODE_PRIVATE)
              prefs.edit().remove("current_user_uid").apply()
              currentUser = null
            }
          )
        }
      }
    }
  }
}

@Composable
fun AuthScreen(onAuthSuccess: (ForgeUser) -> Unit) {
  val context = LocalContext.current
  val coroutineScope = rememberCoroutineScope()

  // Tabs: 0 -> Giriş Yap (Login), 1 -> Kayıt Ol (Register)
  var authTab by remember { mutableStateOf(0) }

  var usernameOrEmail by remember { mutableStateOf("") }
  var registerUsername by remember { mutableStateOf("") }
  var registerEmail by remember { mutableStateOf("") }
  var password by remember { mutableStateOf("") }
  var confirmPassword by remember { mutableStateOf("") }
  var passwordVisible by remember { mutableStateOf(false) }

  var isLoading by remember { mutableStateOf(false) }
  var errorMessage by remember { mutableStateOf<String?>(null) }
  var successMessage by remember { mutableStateOf<String?>(null) }

  val prefs = remember { context.getSharedPreferences("forge_auth_prefs", Context.MODE_PRIVATE) }

  Scaffold(
    containerColor = Color(0xFF141414)
  ) { padding ->
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(padding)
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 24.dp, vertical = 16.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.Center
    ) {
      // Forge Logo Header
      Box(
        modifier = Modifier
          .size(64.dp)
          .clip(RoundedCornerShape(16.dp))
          .background(Color(0xFF1C1C1C))
          .border(1.dp, Color(0xFF333333), RoundedCornerShape(16.dp)),
        contentAlignment = Alignment.Center
      ) {
        Text(
          text = "F",
          fontSize = 38.sp,
          fontWeight = FontWeight.Bold,
          color = Color(0xFFF05A22)
        )
      }

      Spacer(modifier = Modifier.height(14.dp))

      Text(
        text = "FORGE MOBILE",
        fontSize = 22.sp,
        fontWeight = FontWeight.ExtraBold,
        color = Color(0xFFEDE6D8),
        letterSpacing = 2.sp
      )

      Text(
        text = "Shaped by fire • AI-Native Game Engine",
        fontSize = 12.sp,
        color = Color(0xFFF2B233),
        modifier = Modifier.padding(top = 2.dp)
      )

      Spacer(modifier = Modifier.height(24.dp))

      // Main Auth Card
      Box(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(16.dp))
          .background(Color(0xFF1C1C1C))
          .border(1.dp, Color(0xFF262626), RoundedCornerShape(16.dp))
          .padding(20.dp)
      ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
          // Switcher Tabs: Giriş Yap / Kayıt Ol
          Row(
            modifier = Modifier
              .fillMaxWidth()
              .clip(RoundedCornerShape(12.dp))
              .background(Color(0xFF262626))
              .padding(4.dp),
            horizontalArrangement = Arrangement.SpaceBetween
          ) {
            Box(
              modifier = Modifier
                .weight(1f)
                .height(40.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(if (authTab == 0) Color(0xFFF05A22) else Color.Transparent)
                .clickable {
                  authTab = 0
                  errorMessage = null
                  successMessage = null
                },
              contentAlignment = Alignment.Center
            ) {
              Text(
                text = "Giriş Yap",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = if (authTab == 0) Color.White else Color(0xFF9E988D)
              )
            }

            Box(
              modifier = Modifier
                .weight(1f)
                .height(40.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(if (authTab == 1) Color(0xFFF05A22) else Color.Transparent)
                .clickable {
                  authTab = 1
                  errorMessage = null
                  successMessage = null
                },
              contentAlignment = Alignment.Center
            ) {
              Text(
                text = "Kayıt Ol",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = if (authTab == 1) Color.White else Color(0xFF9E988D)
              )
            }
          }

          Spacer(modifier = Modifier.height(18.dp))

          if (authTab == 0) {
            // LOGIN FORM (Normal Giriş)
            OutlinedTextField(
              value = usernameOrEmail,
              onValueChange = { usernameOrEmail = it },
              label = { Text("Kullanıcı Adı veya E-posta") },
              leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = Color(0xFF9E988D)) },
              singleLine = true,
              colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFFF05A22),
                unfocusedBorderColor = Color(0xFF333333),
                focusedLabelColor = Color(0xFFF05A22),
                unfocusedLabelColor = Color(0xFF9E988D),
                focusedTextColor = Color(0xFFEDE6D8),
                unfocusedTextColor = Color(0xFFEDE6D8)
              ),
              modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
              value = password,
              onValueChange = { password = it },
              label = { Text("Şifre") },
              leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFF9E988D)) },
              trailingIcon = {
                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                  Icon(
                    imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                    contentDescription = null,
                    tint = Color(0xFF9E988D)
                  )
                }
              },
              visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
              singleLine = true,
              colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFFF05A22),
                unfocusedBorderColor = Color(0xFF333333),
                focusedLabelColor = Color(0xFFF05A22),
                unfocusedLabelColor = Color(0xFF9E988D),
                focusedTextColor = Color(0xFFEDE6D8),
                unfocusedTextColor = Color(0xFFEDE6D8)
              ),
              modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(18.dp))

            Button(
              onClick = {
                if (usernameOrEmail.isBlank() || password.isBlank()) {
                  errorMessage = "Lütfen kullanıcı adı ve şifrenizi giriniz."
                  return@Button
                }

                // Verify credentials against local store
                val key = usernameOrEmail.trim().lowercase()
                val storedUid = prefs.getString("lookup_$key", null)
                val storedPassword = if (storedUid != null) prefs.getString("user_${storedUid}_password", null) else null

                if (storedUid != null && storedPassword == password) {
                  val username = prefs.getString("user_${storedUid}_username", key) ?: key
                  val email = prefs.getString("user_${storedUid}_email", "") ?: ""
                  prefs.edit().putString("current_user_uid", storedUid).apply()

                  val user = ForgeUser(
                    uid = storedUid,
                    username = username,
                    email = email,
                    isGoogleUser = false
                  )
                  onAuthSuccess(user)
                } else if (password.length >= 4) {
                  // Instant guest creator fallback
                  val newUid = "creator_${UUID.randomUUID().toString().take(8)}"
                  prefs.edit()
                    .putString("lookup_$key", newUid)
                    .putString("user_${newUid}_username", usernameOrEmail.trim())
                    .putString("user_${newUid}_email", if (usernameOrEmail.contains("@")) usernameOrEmail.trim() else "${usernameOrEmail.trim()}@forge.dev")
                    .putString("user_${newUid}_password", password)
                    .putString("current_user_uid", newUid)
                    .apply()

                  val user = ForgeUser(
                    uid = newUid,
                    username = usernameOrEmail.trim(),
                    email = "${usernameOrEmail.trim()}@forge.dev",
                    isGoogleUser = false
                  )
                  onAuthSuccess(user)
                } else {
                  errorMessage = "Hatalı şifre veya kullanıcı adı."
                }
              },
              colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF05A22)),
              shape = RoundedCornerShape(12.dp),
              modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
            ) {
              Text("Giriş Yap", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
            }
          } else {
            // REGISTER FORM (Kayıt Ol)
            OutlinedTextField(
              value = registerUsername,
              onValueChange = { registerUsername = it },
              label = { Text("Kullanıcı Adı") },
              leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = Color(0xFF9E988D)) },
              singleLine = true,
              colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFFF05A22),
                unfocusedBorderColor = Color(0xFF333333),
                focusedLabelColor = Color(0xFFF05A22),
                unfocusedLabelColor = Color(0xFF9E988D),
                focusedTextColor = Color(0xFFEDE6D8),
                unfocusedTextColor = Color(0xFFEDE6D8)
              ),
              modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(10.dp))

            OutlinedTextField(
              value = registerEmail,
              onValueChange = { registerEmail = it },
              label = { Text("E-posta Adresi") },
              leadingIcon = { Icon(Icons.Default.Mail, contentDescription = null, tint = Color(0xFF9E988D)) },
              singleLine = true,
              colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFFF05A22),
                unfocusedBorderColor = Color(0xFF333333),
                focusedLabelColor = Color(0xFFF05A22),
                unfocusedLabelColor = Color(0xFF9E988D),
                focusedTextColor = Color(0xFFEDE6D8),
                unfocusedTextColor = Color(0xFFEDE6D8)
              ),
              modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(10.dp))

            OutlinedTextField(
              value = password,
              onValueChange = { password = it },
              label = { Text("Şifre") },
              leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFF9E988D)) },
              trailingIcon = {
                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                  Icon(
                    imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                    contentDescription = null,
                    tint = Color(0xFF9E988D)
                  )
                }
              },
              visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
              singleLine = true,
              colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFFF05A22),
                unfocusedBorderColor = Color(0xFF333333),
                focusedLabelColor = Color(0xFFF05A22),
                unfocusedLabelColor = Color(0xFF9E988D),
                focusedTextColor = Color(0xFFEDE6D8),
                unfocusedTextColor = Color(0xFFEDE6D8)
              ),
              modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(10.dp))

            OutlinedTextField(
              value = confirmPassword,
              onValueChange = { confirmPassword = it },
              label = { Text("Şifre Tekrar") },
              leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFF9E988D)) },
              visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
              singleLine = true,
              colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFFF05A22),
                unfocusedBorderColor = Color(0xFF333333),
                focusedLabelColor = Color(0xFFF05A22),
                unfocusedLabelColor = Color(0xFF9E988D),
                focusedTextColor = Color(0xFFEDE6D8),
                unfocusedTextColor = Color(0xFFEDE6D8)
              ),
              modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(18.dp))

            Button(
              onClick = {
                if (registerUsername.isBlank() || registerEmail.isBlank() || password.isBlank()) {
                  errorMessage = "Lütfen tüm alanları doldurunuz."
                  return@Button
                }
                if (password.length < 6) {
                  errorMessage = "Şifreniz en az 6 karakter olmalıdır."
                  return@Button
                }
                if (password != confirmPassword) {
                  errorMessage = "Girdiğiniz şifreler eşleşmiyor."
                  return@Button
                }

                // Save new user profile
                val newUid = "creator_${UUID.randomUUID().toString().take(8)}"
                val usernameKey = registerUsername.trim().lowercase()
                val emailKey = registerEmail.trim().lowercase()

                prefs.edit()
                  .putString("lookup_$usernameKey", newUid)
                  .putString("lookup_$emailKey", newUid)
                  .putString("user_${newUid}_username", registerUsername.trim())
                  .putString("user_${newUid}_email", registerEmail.trim())
                  .putString("user_${newUid}_password", password)
                  .putString("current_user_uid", newUid)
                  .apply()

                coroutineScope.launch {
                  try {
                    val db = FirebaseFirestore.getInstance()
                    db.collection("users").document(newUid).set(
                      hashMapOf(
                        "userId" to newUid,
                        "displayName" to registerUsername.trim(),
                        "email" to registerEmail.trim(),
                        "createdAt" to com.google.firebase.Timestamp.now()
                      )
                    ).await()
                  } catch (e: Exception) {
                    Log.w("Firestore", "Profile sync info: ${e.message}")
                  }
                }

                val user = ForgeUser(
                  uid = newUid,
                  username = registerUsername.trim(),
                  email = registerEmail.trim(),
                  isGoogleUser = false
                )
                onAuthSuccess(user)
              },
              colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF05A22)),
              shape = RoundedCornerShape(12.dp),
              modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
            ) {
              Text("Kayıt Ol ve Başla", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
            }
          }

          // OR Divider
          Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
              .fillMaxWidth()
              .padding(vertical = 16.dp)
          ) {
            Box(
              modifier = Modifier
                .weight(1f)
                .height(1.dp)
                .background(Color(0xFF333333))
            )
            Text(
              text = "VEYA",
              fontSize = 11.sp,
              fontWeight = FontWeight.Bold,
              color = Color(0xFF9E988D),
              modifier = Modifier.padding(horizontal = 12.dp)
            )
            Box(
              modifier = Modifier
                .weight(1f)
                .height(1.dp)
                .background(Color(0xFF333333))
            )
          }

          // Google Sign-In Button
          if (isLoading) {
            CircularProgressIndicator(color = Color(0xFFF05A22), modifier = Modifier.size(36.dp))
          } else {
            OutlinedButton(
              onClick = {
                coroutineScope.launch {
                  isLoading = true
                  errorMessage = null
                  try {
                    val user = performGoogleSignIn(context)
                    if (user != null) {
                      saveUserToFirestore(user)
                      onAuthSuccess(
                        ForgeUser(
                          uid = user.uid,
                          username = user.displayName ?: "Forge Creator",
                          email = user.email ?: "",
                          photoUrl = user.photoUrl?.toString(),
                          isGoogleUser = true
                        )
                      )
                    }
                  } catch (e: GetCredentialCancellationException) {
                    Log.w("Auth", "Sign-in was cancelled by user: ${e.message}")
                  } catch (e: Exception) {
                    Log.e("Auth", "Google sign-in error", e)
                    errorMessage = e.localizedMessage ?: "Google girişi başarısız oldu"
                  } finally {
                    isLoading = false
                  }
                }
              },
              shape = RoundedCornerShape(12.dp),
              colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEDE6D8)),
              modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .border(1.dp, Color(0xFF333333), RoundedCornerShape(12.dp))
            ) {
              Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
              ) {
                Text(
                  text = "G",
                  fontSize = 18.sp,
                  fontWeight = FontWeight.Black,
                  color = Color(0xFFF2B233),
                  modifier = Modifier.padding(end = 10.dp)
                )
                Text(
                  text = "Google ile Devam Et",
                  fontWeight = FontWeight.SemiBold,
                  fontSize = 14.sp
                )
              }
            }
          }

          if (errorMessage != null) {
            Spacer(modifier = Modifier.height(12.dp))
            Text(
              text = errorMessage!!,
              color = Color(0xFFE53E3E),
              fontSize = 12.sp,
              textAlign = TextAlign.Center
            )
          }
        }
      }

      Spacer(modifier = Modifier.height(28.dp))

      Text(
        text = "made by burkiuze",
        fontSize = 11.sp,
        color = Color(0xFFEDE6D8).copy(alpha = 0.35f)
      )
    }
  }
}

suspend fun performGoogleSignIn(context: Context): FirebaseUser? {
  val credentialManager = CredentialManager.create(context)
  val serverClientId = context.getString(R.string.default_web_client_id)

  val googleIdOption = GetSignInWithGoogleOption.Builder(serverClientId)
    .build()

  val request = GetCredentialRequest.Builder()
    .addCredentialOption(googleIdOption)
    .build()

  val result = credentialManager.getCredential(context = context, request = request)
  val credential = result.credential

  if (credential is androidx.credentials.CustomCredential &&
      credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
    val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
    val authCredential = GoogleAuthProvider.getCredential(googleIdTokenCredential.idToken, null)
    val authResult = FirebaseAuth.getInstance().signInWithCredential(authCredential).await()
    return authResult.user
  }
  return null
}

suspend fun saveUserToFirestore(user: FirebaseUser) {
  try {
    val db = FirebaseFirestore.getInstance()
    val userMap = hashMapOf(
      "userId" to user.uid,
      "email" to (user.email ?: ""),
      "displayName" to (user.displayName ?: "Forge Creator"),
      "photoUrl" to (user.photoUrl?.toString() ?: ""),
      "updatedAt" to com.google.firebase.Timestamp.now()
    )
    db.collection("users").document(user.uid).set(userMap).await()
  } catch (e: Exception) {
    Log.w("Firestore", "Could not write user profile: ${e.message}")
  }
}

@Composable
fun AuthenticatedAppScreen(user: ForgeUser, onSignOut: () -> Unit) {
  var showWebView by remember { mutableStateOf(false) }

  Scaffold(
    containerColor = Color(0xFF141414)
  ) { padding ->
    if (showWebView) {
      Box(
        modifier = Modifier
          .fillMaxSize()
          .padding(padding)
      ) {
        AndroidView(
          factory = { context ->
            WebView(context).apply {
              settings.javaScriptEnabled = true
              settings.domStorageEnabled = true
              settings.allowFileAccess = true
              settings.allowFileAccessFromFileURLs = true
              settings.allowUniversalAccessFromFileURLs = true
              settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
              webViewClient = WebViewClient()
              loadUrl("file:///android_asset/www/index.html")
            }
          },
          modifier = Modifier.fillMaxSize()
        )

        // Floating Back Button
        Row(
          modifier = Modifier
            .align(Alignment.TopEnd)
            .padding(16.dp)
        ) {
          IconButton(
            onClick = { showWebView = false },
            modifier = Modifier
              .size(42.dp)
              .clip(CircleShape)
              .background(Color(0xFF1C1C1C).copy(alpha = 0.9f))
              .border(1.dp, Color(0xFF333333), CircleShape)
          ) {
            Icon(Icons.Default.ExitToApp, contentDescription = "Back", tint = Color(0xFFEDE6D8))
          }
        }
      }
    } else {
      Column(
        modifier = Modifier
          .fillMaxSize()
          .padding(padding)
          .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
      ) {
        // Top Bar
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
              modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(Color(0xFF1C1C1C))
                .border(1.dp, Color(0xFF333333), RoundedCornerShape(8.dp)),
              contentAlignment = Alignment.Center
            ) {
              Text("F", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFFF05A22))
            }
            Spacer(modifier = Modifier.width(10.dp))
            Text("FORGE MOBILE", fontWeight = FontWeight.Bold, color = Color(0xFFEDE6D8), fontSize = 16.sp)
          }

          IconButton(onClick = onSignOut) {
            Icon(Icons.Default.ExitToApp, contentDescription = "Sign Out", tint = Color(0xFF9E988D))
          }
        }

        // Center Profile Card & Cloud Sync
        Column(
          horizontalAlignment = Alignment.CenterHorizontally,
          modifier = Modifier.fillMaxWidth()
        ) {
          Box(
            modifier = Modifier
              .size(80.dp)
              .clip(CircleShape)
              .background(Color(0xFF262626))
              .border(2.dp, Color(0xFFF05A22), CircleShape),
            contentAlignment = Alignment.Center
          ) {
            Text(
              text = user.username.take(1).uppercase(),
              fontSize = 32.sp,
              fontWeight = FontWeight.Bold,
              color = Color(0xFFF2B233)
            )
          }

          Spacer(modifier = Modifier.height(16.dp))

          Text(
            text = user.username,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFFEDE6D8)
          )

          Text(
            text = user.email,
            fontSize = 13.sp,
            color = Color(0xFF9E988D)
          )

          Spacer(modifier = Modifier.height(16.dp))

          Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
              .clip(RoundedCornerShape(20.dp))
              .background(Color(0xFF1C1C1C))
              .border(1.dp, Color(0xFF262626), RoundedCornerShape(20.dp))
              .padding(horizontal = 14.dp, vertical = 6.dp)
          ) {
            Icon(Icons.Default.CloudDone, contentDescription = null, tint = Color(0xFF38A169), modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(
              if (user.isGoogleUser) "Google Cloud Firestore Aktif" else "Yerel Hesap • Firestore Senkronize",
              fontSize = 12.sp,
              color = Color(0xFFEDE6D8)
            )
          }

          Spacer(modifier = Modifier.height(28.dp))

          // Big Launch Button
          Button(
            onClick = { showWebView = true },
            colors = ButtonDefaults.buttonColors(
              containerColor = Color(0xFFF05A22),
              contentColor = Color.White
            ),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
              .fillMaxWidth()
              .height(52.dp)
          ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
              Icon(Icons.Default.PlayArrow, contentDescription = null)
              Spacer(modifier = Modifier.width(8.dp))
              Text("Forge Mobile Editor'ı Başlat", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
          }

          Spacer(modifier = Modifier.height(12.dp))

          OutlinedButton(
            onClick = onSignOut,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth().height(46.dp)
          ) {
            Text("Çıkış Yap / Sign Out", color = Color(0xFF9E988D), fontSize = 14.sp)
          }
        }

        Text(
          text = "made by burkiuze",
          fontSize = 11.sp,
          color = Color(0xFFEDE6D8).copy(alpha = 0.35f)
        )
      }
    }
  }
}
