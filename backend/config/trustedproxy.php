<?php

return [
    'proxies' => array_values(array_filter(array_map(trim(...), explode(',', (string) env('TRUSTED_PROXIES', ''))),
        function (string $proxy): bool {
            [$address, $prefix] = array_pad(explode('/', $proxy, 2), 2, null);
            if (filter_var($address, FILTER_VALIDATE_IP) === false) {
                return false;
            }

            return $prefix === null || filter_var($prefix, FILTER_VALIDATE_INT, [
                'options' => ['min_range' => 1, 'max_range' => str_contains($address, ':') ? 128 : 32],
            ]) !== false;
        })),
];
