<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\ContactRequestController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\AlertSubscriptionController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\AnalyticsController;

// Public analytics tracking (throttled, no auth required)
Route::post('/analytics/track', [AnalyticsController::class, 'track'])->middleware('throttle:120,1');

// Public auth
Route::post('/register',         [AuthController::class, 'register']);
Route::post('/login',            [AuthController::class, 'login']);
Route::post('/forgot-password',  [AuthController::class, 'forgotPassword']);
Route::post('/reset-password',   [AuthController::class, 'resetPassword']);

// Public posts
Route::get('/posts',        [PostController::class, 'index']);
Route::get('/posts/{post}', [PostController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout',     [AuthController::class, 'logout']);
    Route::get('/me',          [AuthController::class, 'me']);
    Route::patch('/me/status', [AuthController::class, 'updateStatus']);
    Route::delete('/me',       [AuthController::class, 'deleteAccount']);

    Route::post('/posts',                 [PostController::class, 'store']);
    Route::patch('/posts/{post}/recover', [PostController::class, 'recover']);
    Route::delete('/posts/{post}',        [PostController::class, 'destroy']);

    Route::get('/posts/{post}/contact',                                    [ContactRequestController::class, 'index']);
    Route::post('/posts/{post}/contact',                                   [ContactRequestController::class, 'store']);
    Route::patch('/posts/{post}/contact/{contactRequest}/approve',         [ContactRequestController::class, 'approve']);
    Route::patch('/posts/{post}/contact/{contactRequest}/reject',          [ContactRequestController::class, 'reject']);
    Route::get('/posts/{post}/contact/{contactRequest}/selfie',            [ContactRequestController::class, 'selfie']);

    Route::get('/conversations',                   [MessageController::class, 'conversations']);
    Route::get('/conversations/{post}/messages',   [MessageController::class, 'index']);
    Route::post('/conversations/{post}/messages',  [MessageController::class, 'store']);

    Route::get('/alerts',         [AlertSubscriptionController::class, 'index']);
    Route::post('/alerts',        [AlertSubscriptionController::class, 'store']);
    Route::delete('/alerts/{id}', [AlertSubscriptionController::class, 'destroy']);

    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/stats',           [DashboardController::class, 'stats']);
        Route::get('/posts',           [DashboardController::class, 'posts']);
        Route::get('/users',           [DashboardController::class, 'users']);
        Route::patch('/users/{user}',  [DashboardController::class, 'updateUser']);
        Route::delete('/users/{user}', [DashboardController::class, 'deleteUser']);
        Route::get('/analytics',       [AnalyticsController::class, 'stats']);
    });
});
