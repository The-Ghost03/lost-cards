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
    .btn { display: inline-block; background: #f97316; color: #fff !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 15px; margin-top: 8px; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; }
    .warn { background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:12px 14px; margin:16px 0; color:#92400e; font-size:13px }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">LostCards</div>
    <h1>Bonjour {{ $user->name }},</h1>
    <p>Vous avez demandé à réinitialiser votre mot de passe sur LostCards. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>

    <a class="btn" href="{{ $resetUrl }}">Réinitialiser mon mot de passe</a>

    <div class="warn">
      Ce lien expire dans 60 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe restera inchangé.
    </div>

    <div class="footer">
      <p>LostCards · Abidjan, Côte d'Ivoire</p>
    </div>
  </div>
</body>
</html>
