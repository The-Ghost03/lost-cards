<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\ContactRequestController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\AlertSubscriptionController;
use App\Http\Controllers\Admin\DashboardController;

// Auth
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// Public posts
Route::get('/posts',     [PostController::class, 'index']);
Route::get('/posts/{post}', [PostController::class, 'show']);

// Protected
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout',  [AuthController::class, 'logout']);
    Route::get('/me',       [AuthController::class, 'me']);

    // Posts
    Route::post('/posts',                [PostController::class, 'store']);
    Route::patch('/posts/{post}/recover',[PostController::class, 'recover']);
    Route::delete('/posts/{post}',       [PostController::class, 'destroy']);

    // Contact requests
    Route::get('/posts/{post}/contact',                               [ContactRequestController::class, 'index']);
    Route::post('/posts/{post}/contact',                              [ContactRequestController::class, 'store']);
    Route::patch('/posts/{post}/contact/{request}/approve',           [ContactRequestController::class, 'approve']);

    // Messages
    Route::get('/conversations',                       [MessageController::class, 'conversations']);
    Route::get('/conversations/{post}/messages',       [MessageController::class, 'index']);
    Route::post('/conversations/{post}/messages',      [MessageController::class, 'store']);

    // Alerts
    Route::get('/alerts',         [AlertSubscriptionController::class, 'index']);
    Route::post('/alerts',        [AlertSubscriptionController::class, 'store']);
    Route::delete('/alerts/{id}', [AlertSubscriptionController::class, 'destroy']);

    // Admin
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/stats', [DashboardController::class, 'stats']);
        Route::get('/posts', [DashboardController::class, 'posts']);
    });
});
