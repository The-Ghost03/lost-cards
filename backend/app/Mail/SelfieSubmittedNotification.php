<?php

namespace App\Mail;

use App\Models\ContactRequest;
use App\Models\Post;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SelfieSubmittedNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Post           $post,
        public readonly User           $finder,
        public readonly User           $requester,
        public readonly ContactRequest $contactRequest,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '📸 Nouveau selfie reçu — Vérifiez l\'identité sur LostCards',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.selfie-submitted');
    }
}
