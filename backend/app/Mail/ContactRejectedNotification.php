<?php

namespace App\Mail;

use App\Models\Post;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContactRejectedNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Post $post,
        public readonly User $requester,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '❌ Selfie non validé — LostCards',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.contact-rejected');
    }
}
