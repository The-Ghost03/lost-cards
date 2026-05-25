<?php

namespace App\Mail;

use App\Models\Post;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContactApprovedNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Post $post,
        public readonly User $requester,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Votre identité a été vérifiée - Récupérez votre portefeuille',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.contact-approved');
    }
}
