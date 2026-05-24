<?php

namespace App\Mail;

use App\Models\Post;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WalletFoundNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Post $post,
        public readonly User $recipient,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '🔔 Un portefeuille avec votre nom a été retrouvé — LostCards',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.wallet-found');
    }
}
