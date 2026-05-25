<?php

namespace App\Mail;

use App\Models\Post;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewMessageNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Post   $post,
        public readonly User   $sender,
        public readonly User   $receiver,
        public readonly string $preview,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Nouveau message de ' . $this->sender->name . ' — LostCards',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.new-message');
    }
}
