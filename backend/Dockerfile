FROM php:8.3-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
        git zip unzip curl libpng-dev libonig-dev libxml2-dev \
    && docker-php-ext-install pdo_mysql mbstring \
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

CMD ["sh", "-c", "php artisan config:cache && php artisan migrate --force && php artisan db:seed --class=DatabaseSeeder --force && php artisan queue:work --sleep=3 --tries=3 --timeout=120 > /tmp/queue.log 2>&1 & php artisan serve --host=0.0.0.0 --port=8000"]
