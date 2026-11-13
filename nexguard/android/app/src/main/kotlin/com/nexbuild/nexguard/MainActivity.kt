package com.nexbuild.nexguard

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.io.FileOutputStream

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.nexbuild.nexguard/image_compress"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            if (call.method == "compressImage") {
                val path = call.argument<String>("path")
                val maxWidth = call.argument<Int>("maxWidth") ?: 600
                val quality = call.argument<Int>("quality") ?: 70
                if (path == null) {
                    result.error("INVALID_PATH", "Path is null", null)
                    return@setMethodCallHandler
                }
                try {
                    val file = File(path)
                    if (!file.exists()) {
                        result.success(path)
                        return@setMethodCallHandler
                    }

                    // Decode bounds only
                    val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                    BitmapFactory.decodeFile(path, options)
                    val srcWidth = options.outWidth
                    val srcHeight = options.outHeight

                    if (srcWidth <= 0 || srcHeight <= 0) {
                        result.success(path)
                        return@setMethodCallHandler
                    }

                    // Fast sample size calculation
                    var inSampleSize = 1
                    var w = srcWidth
                    var h = srcHeight
                    while (w / 2 >= maxWidth || h / 2 >= maxWidth) {
                        w /= 2
                        h /= 2
                        inSampleSize *= 2
                    }

                    val decodeOptions = BitmapFactory.Options().apply {
                        this.inSampleSize = inSampleSize
                    }
                    val bitmap = BitmapFactory.decodeFile(path, decodeOptions)
                    if (bitmap == null) {
                        result.success(path)
                        return@setMethodCallHandler
                    }

                    // Write downscaled JPEG to app cache
                    val cacheDir = applicationContext.cacheDir
                    val compressedFile = File(cacheDir, "comp_${System.currentTimeMillis()}.jpg")
                    val out = FileOutputStream(compressedFile)
                    bitmap.compress(Bitmap.CompressFormat.JPEG, quality, out)
                    out.flush()
                    out.close()
                    bitmap.recycle()

                    result.success(compressedFile.absolutePath)
                } catch (e: Exception) {
                    result.success(path)
                }
            } else {
                result.notImplemented()
            }
        }
    }
}

