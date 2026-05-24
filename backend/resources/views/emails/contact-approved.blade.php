<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Inter, sans-serif; background: #f9fafb; margin: 0; padding: 20px; }
    .card { background: #fff; max-width: 520px; margin: 0 auto; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
    .logo { color: #f97316; font-weight: 700; font-size: 20px; margin-bottom: 24px; }
    h1 { font-size: 20px; color: #111827; margin: 0 0 12px; }
    p { color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
    .highlight { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 16px; margin: 16px 0; }
    .highlight strong { color: #166534; }
    .btn { display: inline-block; background: #f97316; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 15px; margin-top: 8px; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🔑 LostCards</div>
    <h1>Bonne nouvelle, {{ $requester->name }} !</h1>
    <p>Votre identité a été vérifiée par le retrouveur. Vous pouvez maintenant accéder à l'adresse de récupération et contacter le retrouveur directement.</p>

    <div class="highlight">
      <p style="margin:0"><strong>✅ Identité confirmée</strong></p>
      <p style="margin:8px 0 0"><strong>Portefeuille :</strong> {{ $post->name_partial }}</p>
      <p style="margin:8px 0 0"><strong>Lieu de trouvaille :</strong> {{ $post->location }}</p>
    </div>

    <p>Rendez-vous sur l'annonce pour voir l'adresse de récupération et envoyer un message au retrouveur.</p>

    <a class="btn" href="{{ config('app.frontend_url') }}/posts/{{ $post->id }}">
      Voir l'adresse et contacter →
    </a>

    <div class="footer">
      <p>LostCards · Abidjan, Côte d'Ivoire</p>
    </div>
  </div>
</body>
</html>
