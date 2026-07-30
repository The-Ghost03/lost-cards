<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    /**
     * Authentifie les requêtes suivantes comme l'utilisateur donné,
     * via le guard Sanctum (pas de token HTTP réel nécessaire).
     * Voir aussi les tests d'AuthTest qui, eux, valident le vrai flux
     * register/login -> token Bearer -> /me.
     */
    protected function actingAsUser(\App\Models\User $user, array $abilities = ['*']): static
    {
        Sanctum::actingAs($user, $abilities);

        return $this;
    }
}
