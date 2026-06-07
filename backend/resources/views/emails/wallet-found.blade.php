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
    .highlight { background: #fff7ed; border-radius: 10px; padding: 14px 16px; margin: 16px 0; }
    .highlight strong { color: #c2410c; }
    .btn { display: inline-block; background: #f97316; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 15px; margin-top: 8px; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">LostCards</div>
    <h1>Bonjour {{ $recipient->name }} !</h1>
    <p>Bonne nouvelle — un portefeuille correspondant à votre alerte vient d'être signalé sur LostCards.</p>

    <div class="highlight">
      <p style="margin:0"><strong>Nom sur les cartes :</strong> {{ $post->name_partial }}</p>
      <p style="margin:8px 0 0"><strong>Lieu :</strong> {{ $post->location }}</p>
      <p style="margin:8px 0 0"><strong>Documents trouvés :</strong> {{ implode(', ', $post->documents) }}</p>
    </div>

    <p>Rendez-vous sur la plateforme pour voir l'annonce et contacter le retrouveur.</p>

    <a class="btn" href="{{ config('app.frontend_url') }}/posts/{{ $post->uuid }}">
      Voir l'annonce →
    </a>

    <div class="footer">
      <p>LostCards · Abidjan, Côte d'Ivoire<br>Pour ne plus recevoir ces alertes, connectez-vous et supprimez votre alerte.</p>
    </div>
  </div>
</body>
</html>
