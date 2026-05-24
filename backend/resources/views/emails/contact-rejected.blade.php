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
    .highlight { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 14px 16px; margin: 16px 0; }
    .highlight strong { color: #9f1239; }
    .btn { display: inline-block; background: #f97316; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 15px; margin-top: 8px; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🔑 LostCards</div>
    <h1>Bonjour {{ $requester->name }},</h1>
    <p>Malheureusement, le retrouveur n'a pas pu confirmer votre identité avec le selfie envoyé.</p>

    <div class="highlight">
      <p style="margin:0"><strong>❌ Selfie non validé</strong></p>
      <p style="margin:8px 0 0"><strong>Annonce :</strong> {{ $post->name_partial }}</p>
    </div>

    <p>Si vous pensez qu'il s'agit d'une erreur, vous pouvez retenter en envoyant un selfie plus clair ou dans une meilleure lumière.</p>

    <a class="btn" href="{{ config('app.frontend_url') }}/posts/{{ $post->id }}">
      Réessayer →
    </a>

    <div class="footer">
      <p>LostCards · Abidjan, Côte d'Ivoire</p>
    </div>
  </div>
</body>
</html>
