<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageOptimizer
{
    /**
     * Compresse une image uploadée : resize ≤ maxWidth px, JPEG qualité 80, strip EXIF.
     * Retourne le chemin relatif Storage local du fichier optimisé.
     *
     * Photos téléphone typiques : 4MB → ~200-400KB après optimisation.
     */
    public function optimizeAndStore(UploadedFile $file, string $dir = 'post_photos', int $maxWidth = 1600, int $quality = 80): string
    {
        $sourcePath = $file->getRealPath();
        $mime       = $file->getMimeType();

        // Décode l'image selon son type
        $img = match (true) {
            str_contains($mime, 'jpeg'), str_contains($mime, 'jpg') => @imagecreatefromjpeg($sourcePath),
            str_contains($mime, 'png')                              => @imagecreatefrompng($sourcePath),
            str_contains($mime, 'webp')                             => @imagecreatefromwebp($sourcePath),
            str_contains($mime, 'gif')                              => @imagecreatefromgif($sourcePath),
            default                                                 => null,
        };

        // Fallback : si GD ne peut pas décoder, on stocke l'original tel quel
        if (!$img) {
            return $file->store($dir, 'local');
        }

        // Corrige l'orientation EXIF pour les photos JPEG (iPhone notamment)
        if (str_contains($mime, 'jpeg') && function_exists('exif_read_data')) {
            $exif = @exif_read_data($sourcePath);
            if ($exif && isset($exif['Orientation'])) {
                $img = $this->applyExifOrientation($img, (int) $exif['Orientation']);
            }
        }

        $srcW = imagesx($img);
        $srcH = imagesy($img);

        // Resize si trop large (conserve le ratio)
        if ($srcW > $maxWidth) {
            $ratio = $maxWidth / $srcW;
            $dstW  = $maxWidth;
            $dstH  = (int) round($srcH * $ratio);

            $resized = imagecreatetruecolor($dstW, $dstH);
            // Fond blanc pour les PNG transparents qu'on va convertir en JPEG
            $white = imagecolorallocate($resized, 255, 255, 255);
            imagefilledrectangle($resized, 0, 0, $dstW, $dstH, $white);
            imagecopyresampled($resized, $img, 0, 0, 0, 0, $dstW, $dstH, $srcW, $srcH);
            imagedestroy($img);
            $img = $resized;
        }

        // Encode en JPEG (compact, sans EXIF — imagejpeg ne le copie pas)
        $filename = $dir . '/' . Str::uuid()->toString() . '.jpg';
        $tmpPath  = tempnam(sys_get_temp_dir(), 'opt_');
        imagejpeg($img, $tmpPath, $quality);
        imagedestroy($img);

        // Stocke via Laravel Storage
        Storage::disk('local')->put($filename, file_get_contents($tmpPath));
        @unlink($tmpPath);

        return $filename;
    }

    /**
     * Applique l'orientation EXIF (rotate/flip) pour éviter les photos couchées.
     */
    private function applyExifOrientation($img, int $orientation)
    {
        return match ($orientation) {
            2 => imageflip($img, IMG_FLIP_HORIZONTAL) ? $img : $img,
            3 => imagerotate($img, 180, 0),
            4 => imageflip($img, IMG_FLIP_VERTICAL) ? $img : $img,
            5 => imagerotate(imageflip($img, IMG_FLIP_VERTICAL) ? $img : $img, -90, 0),
            6 => imagerotate($img, -90, 0),
            7 => imagerotate(imageflip($img, IMG_FLIP_VERTICAL) ? $img : $img, 90, 0),
            8 => imagerotate($img, 90, 0),
            default => $img,
        };
    }
}
