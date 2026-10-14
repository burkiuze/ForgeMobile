package com.example

import android.content.Context
import android.os.Bundle
import android.util.Log
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
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

class MainActivity : ComponentActivity() {
  private val auth by lazy { FirebaseAuth.getInstance() }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()

    setContent {
      var currentUser by remember { mutableStateOf<FirebaseUser?>(auth.currentUser) }

      LaunchedEffect(Unit) {
        auth.addAuthStateListener { firebaseAuth ->
          currentUser = firebaseAuth.currentUser
        }
      }

      Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFF141414)
      ) {
        if (currentUser == null) {
          SignInScreen(
            onSignInSuccess = { user ->
              currentUser = user
            }
          )
        } else {
          AuthenticatedAppScreen(
            user = currentUser!!,
            onSignOut = {
              auth.signOut()
              currentUser = null
            }
          )
        }
      }
    }
  }
}

@Composable
fun SignInScreen(onSignInSuccess: (FirebaseUser) -> Unit) {
  val context = LocalContext.current
  val coroutineScope = rememberCoroutineScope()
  var isLoading by remember { mutableStateOf(false) }
  var errorMessage by remember { mutableStateOf<String?>(null) }

  Scaffold(
    containerColor = Color(0xFF141414)
  ) { padding ->
    Box(
      modifier = Modifier
        .fillMaxSize()
        .padding(padding)
        .padding(24.dp),
      contentAlignment = Alignment.Center
    ) {
      Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier.fillMaxWidth()
      ) {
        // Forge stylized Logo
        Box(
          modifier = Modifier
            .size(72.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xFF1C1C1C))
            .border(1.dp, Color(0xFF333333), RoundedCornerShape(16.dp)),
          contentAlignment = Alignment.Center
        ) {
          Text(
            text = "F",
            fontSize = 42.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFFF05A22)
          )
        }

        Spacer(modifier = Modifier.height(20.dp))

        Text(
          text = "FORGE MOBILE",
          fontSize = 24.sp,
          fontWeight = FontWeight.ExtraBold,
          color = Color(0xFFEDE6D8),
          letterSpacing = 2.sp
        )

        Text(
          text = "Shaped by fire • AI-Native Game Engine",
          fontSize = 13.sp,
          color = Color(0xFFF2B233),
          modifier = Modifier.padding(top = 4.dp)
        )

        Spacer(modifier = Modifier.height(36.dp))

        Box(
          modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xFF1C1C1C))
            .border(1.dp, Color(0xFF262626), RoundedCornerShape(16.dp))
            .padding(20.dp)
        ) {
          Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
              text = "Giriş Yap veya Kayıt Ol",
              fontSize = 17.sp,
              fontWeight = FontWeight.SemiBold,
              color = Color(0xFFEDE6D8)
            )
            Text(
              text = "Sign in or create your cloud creator account",
              fontSize = 12.sp,
              color = Color(0xFF9E988D),
              textAlign = TextAlign.Center,
              modifier = Modifier.padding(top = 4.dp, bottom = 20.dp)
            )

            if (isLoading) {
              CircularProgressIndicator(
                color = Color(0xFFF05A22),
                modifier = Modifier.size(36.dp)
              )
            } else {
              Button(
                onClick = {
                  coroutineScope.launch {
                    isLoading = true
                    errorMessage = null
                    try {
                      val user = performGoogleSignIn(context)
                      if (user != null) {
                        // Record or update user in Firestore
                        saveUserToFirestore(user)
                        onSignInSuccess(user)
                      }
                    } catch (e: GetCredentialCancellationException) {
                      Log.w("Auth", "Sign-in was cancelled by user: ${e.message}")
                    } catch (e: Exception) {
                      Log.e("Auth", "Google sign-in error", e)
                      errorMessage = e.localizedMessage ?: "Authentication failed"
                    } finally {
                      isLoading = false
                    }
                  }
                },
                colors = ButtonDefaults.buttonColors(
                  containerColor = Color(0xFFF05A22),
                  contentColor = Color.White
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                  .fillMaxWidth()
                  .height(50.dp)
              ) {
                Row(
                  verticalAlignment = Alignment.CenterVertically,
                  horizontalArrangement = Arrangement.Center
                ) {
                  Text(
                    text = "G",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White,
                    modifier = Modifier.padding(end = 12.dp)
                  )
                  Text(
                    text = "Google ile Giriş Yap",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
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

        Spacer(modifier = Modifier.height(32.dp))

        Text(
          text = "made by burkiuze",
          fontSize = 11.sp,
          color = Color(0xFFEDE6D8).copy(alpha = 0.35f)
        )
      }
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
fun AuthenticatedAppScreen(user: FirebaseUser, onSignOut: () -> Unit) {
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

        // Floating Back / Profile button
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
              text = user.displayName?.take(1)?.uppercase() ?: user.email?.take(1)?.uppercase() ?: "U",
              fontSize = 32.sp,
              fontWeight = FontWeight.Bold,
              color = Color(0xFFF2B233)
            )
          }

          Spacer(modifier = Modifier.height(16.dp))

          Text(
            text = user.displayName ?: "Forge Creator",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFFEDE6D8)
          )

          Text(
            text = user.email ?: "",
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
            Text("Google Cloud Firestore Aktif", fontSize = 12.sp, color = Color(0xFFEDE6D8))
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
