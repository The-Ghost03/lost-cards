<?php

namespace App\Http\Controllers;

use App\Models\AlertSubscription;
use Illuminate\Http\Request;

class AlertSubscriptionController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            AlertSubscription::where('user_id', $request->user()->id)->get()
        );
    }

    public function store(Request $request)
    {
        $request->validate(['name' => 'required|string|max:150']);

        $alert = AlertSubscription::firstOrCreate([
            'user_id' => $request->user()->id,
            'name'    => $request->name,
        ]);

        return response()->json($alert, 201);
    }

    public function destroy(Request $request, string $uuid)
    {
        $alert = AlertSubscription::where('uuid', $uuid)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $alert->delete();

        return response()->json(['message' => 'Alerte supprimée.']);
    }
}
