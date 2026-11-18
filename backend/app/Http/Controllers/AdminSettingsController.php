<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProfileRequest;
use App\Http\Resources\StoreProfileResource;
use App\Services\StoreProfile;

class AdminSettingsController extends Controller
{
    public function show(StoreProfile $profile): StoreProfileResource
    {
        return new StoreProfileResource($profile->get());
    }

    public function update(StoreProfileRequest $request, StoreProfile $profile): StoreProfileResource
    {
        return new StoreProfileResource($profile->save($request->validated()));
    }
}
