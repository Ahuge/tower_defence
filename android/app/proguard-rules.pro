# ProGuard / R8 rules for the Factions release build.
#
# Capacitor + the Cordova bridge find plugin classes by name via
# reflection, so keeping plugin entry points prevents R8 from
# inlining them and breaking the JS → native bridge at runtime.
# Each -keep rule below exists because removing it would break a
# specific plugin call in a release build.

# ─── Capacitor core + plugin annotation scanning ─────────────────

-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }

# ─── Cordova plugins (routed through Capacitor's Cordova bridge) ──

-keep class org.apache.cordova.** { *; }
# cordova-plugin-purchase — IAP / Play Billing
-keep class cc.fovea.purchase.** { *; }
-keep class com.android.billingclient.** { *; }

# ─── @capacitor-community/admob ──────────────────────────────────

-keep class com.getcapacitor.community.admob.** { *; }
-keep class com.google.android.gms.ads.** { *; }

# ─── @osmanraifgunes/capacitor-game-connect — Play Games Services ─

-keep class com.osmanraifgunes.capacitorgameconnect.** { *; }
-keep class com.google.android.gms.games.** { *; }
-keep class com.google.android.gms.common.** { *; }

# ─── Shared Google Play Services glue ────────────────────────────

-keep class com.google.android.gms.common.api.** { *; }
-keep class com.google.api.services.** { *; }

# ─── Preserve stack-trace line numbers in release crash reports ──

-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ─── Suppress noisy warnings that aren't actionable ──────────────

-dontwarn org.apache.cordova.**
-dontwarn com.getcapacitor.**
-dontwarn com.google.android.gms.**
