FROM php:8.3-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
        git zip unzip curl libpng-dev libonig-dev libxml2-dev \
        libjpeg-dev libfreetype6-dev \
    && docker-php-ext-configure gd --with-jpeg --with-freetype \
    && docker-php-ext-install pdo_mysql mbstring gd exif \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Upload limits — 5 photos × 8 Mo + marge
RUN echo "upload_max_filesize=50M\npost_max_size=50M\nmemory_limit=256M" > /usr/local/etc/php/conf.d/uploads.ini

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

COPY . .

RUN mkdir -p bootstrap/cache \
             storage/logs \
             storage/framework/cache \
             storage/framework/sessions \
             storage/framework/views \
    && chmod -R 777 storage bootstrap/cache \
    && composer install --no-dev --optimize-autoloader --no-interaction

EXPOSE 8000

# NOTE :
# - Le seed est une opération manuelle one-shot (jamais au boot — il réinitialisait
#   le mot de passe admin en prod) :
#     docker compose -f docker-compose.prod.yml exec backend php artisan db:seed --class=DatabaseSeeder --force
# - Le queue worker tourne dans un service dédié `queue` (docker-compose.prod.yml),
#   supervisé par Docker (restart: unless-stopped), logs sur stdout.
CMD ["sh", "-c", "php artisan config:cache && php artisan migrate --force && exec php artisan serve --host=0.0.0.0 --port=8000"]
