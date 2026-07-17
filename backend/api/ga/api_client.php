<?php

function ga_refresh_access_token($refresh_token, $client_id, $client_secret)
{
    $data = [
        "client_id" => $client_id,
        "client_secret" => $client_secret,
        "refresh_token" => $refresh_token,
        "grant_type" => "refresh_token"
    ];

    $response = file_get_contents("https://oauth2.googleapis.com/token", false, stream_context_create([
        "http" => [
            "method" => "POST",
            "header" => "Content-Type: application/x-www-form-urlencoded",
            "content" => http_build_query($data)
        ]
    ]));

    return json_decode($response, true)["access_token"] ?? null;
}

function ga_post($url, $access_token, $post)
{
    $ch = curl_init();

    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($post),
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer $access_token",
            "Content-Type: application/json"
        ],
        CURLOPT_SSL_VERIFYPEER => false,
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    return json_decode($response, true);
}
