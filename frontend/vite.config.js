import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        // API_PROXY_TARGET (`.env.local`) permet de pointer un autre backend
        // quand PHP/Docker ne tournent pas en local (ex. l'API de prod).
        //
        // `/sanctum` est indispensable : AuthContext.login() appelle
        // getCsrfCookie() (GET /sanctum/csrf-cookie) AVANT POST /api/login.
        // Sans ce proxy, ce premier appel renvoie 404 et la connexion échoue
        // sans qu'aucune requête de login ne soit émise. nginx en prod
        // proxifie bien les deux préfixes (voir frontend/nginx.conf).
        '/api': {
          target: env.API_PROXY_TARGET || 'http://localhost:8000',
          changeOrigin: true,
          secure: true,
        },
        '/sanctum': {
          target: env.API_PROXY_TARGET || 'http://localhost:8000',
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})
