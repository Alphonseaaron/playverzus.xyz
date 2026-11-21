import 'package:dio/dio.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/app_config.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final bool isNetworkError;

  const ApiException(
    this.message, {
    this.statusCode,
    this.isNetworkError = false,
  });

  @override
  String toString() => message;
}

class _CacheEntry {
  final dynamic data;
  final DateTime expiresAt;
  const _CacheEntry(this.data, this.expiresAt);
}

class ApiClient {
  ApiClient._();

  static String? _sessionToken;
  static void Function()? onUnauthorized;

  // User-isolated short-TTL GET cache + in-flight request deduplication
  static final Map<String, _CacheEntry> _getCache = {};
  static final Map<String, Future<dynamic>> _inFlight = {};

  static void clearCache() {
    _getCache.clear();
    _inFlight.clear();
  }

  static void setAccessToken(String? token) {
    if (_sessionToken != token) {
      clearCache(); // Strict user-data isolation across sign-in/sign-out
    }
    _sessionToken = token;
  }

  static final Dio dio = _createDio();

  static Dio _createDio() {
    final client = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 12),
        receiveTimeout: const Duration(seconds: 15),
        headers: const {'Content-Type': 'application/json'},
      ),
    );

    client.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          options.baseUrl = AppConfig.apiBaseUrl;
          String? token = _sessionToken;
          if (token == null || token.isEmpty) {
            try {
              token = Supabase.instance.client.auth.currentSession?.accessToken;
            } catch (_) {}
          }
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (err, handler) {
          if (err.response?.statusCode == 401 && _sessionToken != null) {
            onUnauthorized?.call();
          }
          return handler.next(err);
        },
      ),
    );

    return client;
  }

  static ApiException _mapError(Object err) {
    if (err is ApiException) return err;
    if (err is DioException) {
      final code = err.response?.statusCode;
      final data = err.response?.data;
      if (data is Map && data['message'] != null) {
        final rawMsg = data['message'];
        final msg = rawMsg is List ? rawMsg.join(', ') : rawMsg.toString();
        return ApiException(msg, statusCode: code);
      }
      if (err.type == DioExceptionType.connectionTimeout ||
          err.type == DioExceptionType.receiveTimeout) {
        return const ApiException(
          'Server took too long to respond. Try again.',
          isNetworkError: true,
        );
      }
      if (err.type == DioExceptionType.connectionError) {
        return const ApiException(
          'Unable to connect to Playverzus servers. Check your internet connection.',
          isNetworkError: true,
        );
      }
      if (code == 401) {
        return const ApiException(
          'Your session expired. Sign in again.',
          statusCode: 401,
        );
      }
      if (code == 403) {
        return const ApiException(
          'You do not have permission for this action.',
          statusCode: 403,
        );
      }
      if (code != null && code >= 500) {
        return ApiException(
          'Server error ($code). Please retry shortly.',
          statusCode: code,
        );
      }
      return ApiException(
        err.message ?? 'Request failed.',
        statusCode: code,
      );
    }
    return ApiException(err.toString());
  }

  static Duration _defaultTtlFor(String path) {
    if (path.startsWith('/games')) return const Duration(seconds: 60);
    if (path.startsWith('/leaderboard') || path.startsWith('/polls')) {
      return const Duration(seconds: 12);
    }
    if (path.startsWith('/tournaments') || path.startsWith('/ratings')) {
      return const Duration(seconds: 8);
    }
    // Live match polling & wallet endpoints stay uncached by default
    return Duration.zero;
  }

  static Future<dynamic> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    bool forceRefresh = false,
  }) async {
    final key = queryParameters == null || queryParameters.isEmpty
        ? path
        : '$path?${queryParameters.entries.map((e) => '${e.key}=${e.value}').join('&')}';
    final ttl = forceRefresh ? Duration.zero : _defaultTtlFor(path);

    if (ttl > Duration.zero) {
      final cached = _getCache[key];
      if (cached != null && DateTime.now().isBefore(cached.expiresAt)) {
        return cached.data;
      }
    }

    final existing = _inFlight[key];
    if (existing != null) return existing;

    final future = () async {
      try {
        final res =
            await dio.get<dynamic>(path, queryParameters: queryParameters);
        if (ttl > Duration.zero) {
          _getCache[key] = _CacheEntry(res.data, DateTime.now().add(ttl));
        }
        return res.data;
      } catch (e) {
        throw _mapError(e);
      } finally {
        _inFlight.remove(key);
      }
    }();

    _inFlight[key] = future;
    return future;
  }

  static Future<dynamic> post(String path, {Object? data}) async {
    try {
      final res = await dio.post<dynamic>(path, data: data);
      _getCache.clear(); // Invalidate cached GETs after any state mutation
      return res.data;
    } catch (e) {
      throw _mapError(e);
    }
  }

  static Future<dynamic> patch(String path, {Object? data}) async {
    try {
      final res = await dio.patch<dynamic>(path, data: data);
      _getCache.clear();
      return res.data;
    } catch (e) {
      throw _mapError(e);
    }
  }

  static Future<dynamic> delete(String path, {Object? data}) async {
    try {
      final res = await dio.delete<dynamic>(path, data: data);
      _getCache.clear();
      return res.data;
    } catch (e) {
      throw _mapError(e);
    }
  }
}
