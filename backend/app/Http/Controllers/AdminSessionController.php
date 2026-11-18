<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Resources\AdminResource;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AdminSessionController extends Controller
{
    public function login(LoginRequest $request): AdminResource
    {
        if (! Auth::guard('web')->attempt([...$request->validated(), 'role' => 'admin'])) {
            throw ValidationException::withMessages(['email' => 'Email atau kata sandi admin salah.']);
        }

        $request->session()->regenerate();

        return new AdminResource($request->user());
    }

    public function show(Request $request): AdminResource
    {
        return new AdminResource($request->user());
    }

    public function logout(Request $request): Response
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }
}
