<?php

namespace App\Http\Controllers;

use App\Http\Requests\BannerRequest;
use App\Http\Resources\BannerResource;
use App\Models\Banner;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class AdminBannerController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return BannerResource::collection(Banner::query()->orderBy('position')->orderBy('id')->get());
    }

    public function store(BannerRequest $request): BannerResource
    {
        return new BannerResource(Banner::create($request->validated()));
    }

    public function show(Banner $banner): BannerResource
    {
        return new BannerResource($banner);
    }

    public function update(BannerRequest $request, Banner $banner): BannerResource
    {
        $banner->update($request->validated());

        return new BannerResource($banner);
    }

    public function destroy(Banner $banner): Response
    {
        $banner->delete();

        return response()->noContent();
    }
}
