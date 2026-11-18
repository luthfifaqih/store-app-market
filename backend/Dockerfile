FROM php:8.4-apache-bookworm AS runtime
RUN docker-php-ext-install -j"$(nproc)" pdo_mysql bcmath opcache \
    && a2enmod rewrite headers

FROM runtime AS dependencies
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
RUN apt-get update && apt-get install -y --no-install-recommends unzip \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /build
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-scripts --prefer-dist --no-autoloader
COPY . .
RUN composer dump-autoload --no-dev --classmap-authoritative --no-scripts \
    && composer check-platform-reqs --no-dev

FROM runtime
WORKDIR /var/www/html
COPY --from=dependencies /build/ ./
COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/store.ini
COPY docker/start.sh /usr/local/bin/store-start
RUN sed -i 's/\r$//' /usr/local/bin/store-start \
    && mkdir -p bootstrap/cache storage/app/public storage/app/private storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs \
    && ln -s ../storage/app/public public/storage \
    && chown -R www-data:www-data bootstrap/cache storage
EXPOSE 80
CMD ["sh", "/usr/local/bin/store-start"]
