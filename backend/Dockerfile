FROM php:8.3-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
        git zip unzip curl libpng-dev libonig-dev libxml2-dev \
    && docker-php-ext-install pdo_mysql mbstring \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts \
    && mkdir -p storage/logs storage/framework/{cache,sessions,views} bootstrap/cache \
    && chmod -R 777 storage bootstrap/cache

EXPOSE 8000

CMD ["sh", "-c", "php artisan key:generate --force && php artisan package:discover --ansi && php artisan config:cache && php artisan migrate --force && php artisan db:seed --class=DatabaseSeeder --force && php artisan serve --host=0.0.0.0 --port=8000"]
