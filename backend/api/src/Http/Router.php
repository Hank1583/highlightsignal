<?php

declare(strict_types=1);

namespace HighlightSignal\Http;

final class Router
{
    private $routes = array();

    /** @param callable(Request): array<string, mixed> $handler */
    public function add(string $method, string $path, callable $handler)
    {
        $parameterNames = array();
        $quoted = preg_quote($path, '#');
        $pattern = preg_replace_callback(
            '#\\\{([A-Za-z_][A-Za-z0-9_]*)\\\}#',
            static function ($matches) use (&$parameterNames) {
                $parameterNames[] = $matches[1];
                return '([0-9]+)';
            },
            $quoted
        );

        $this->routes[] = array(
            'method' => strtoupper($method),
            'pattern' => '#^' . $pattern . '$#',
            'parameter_names' => $parameterNames,
            'handler' => $handler,
        );
    }

    /** @return array<string, mixed>|null */
    public function dispatch(Request $request)
    {
        foreach ($this->routes as $route) {
            if ($route['method'] !== $request->method) {
                continue;
            }

            $matches = array();
            if (!preg_match($route['pattern'], $request->routePath, $matches)) {
                continue;
            }

            array_shift($matches);
            $parameters = array();
            foreach ($route['parameter_names'] as $index => $name) {
                $parameters[$name] = isset($matches[$index]) ? $matches[$index] : null;
            }

            return call_user_func($route['handler'], $request, $parameters);
        }

        return null;
    }
}
