$ErrorActionPreference = 'Stop'

$baseUrl = 'https://www.highlight.url.tw/highlightsignal/v2'
$expectedRedirect = "$baseUrl/ga/oauth_callback.php"
$privateEnv = Join-Path $PSScriptRoot '..\backend\private\.env'
$secretLine = Get-Content -LiteralPath $privateEnv |
    Where-Object { $_ -match '^\s*SERVICE_AUTH_SECRET\s*=' } |
    Select-Object -First 1

if (-not $secretLine) {
    throw 'Local SERVICE_AUTH_SECRET is unavailable.'
}

$serviceSecret = ($secretLine -replace '^\s*SERVICE_AUTH_SECRET\s*=\s*', '').Trim()
if (($serviceSecret.StartsWith('"') -and $serviceSecret.EndsWith('"')) -or
    ($serviceSecret.StartsWith("'") -and $serviceSecret.EndsWith("'"))) {
    $serviceSecret = $serviceSecret.Substring(1, $serviceSecret.Length - 2)
}

$utf8 = New-Object System.Text.UTF8Encoding($false)

function ConvertTo-Hex([byte[]] $Bytes) {
    return (($Bytes | ForEach-Object { $_.ToString('x2') }) -join '')
}

function New-TestNonce {
    return 'v08' + [Guid]::NewGuid().ToString('N')
}

function New-SignedHeaders(
    [string] $Method,
    [string] $Uri,
    [string] $Body,
    [int64] $MemberId,
    [int64] $WorkspaceId,
    [int64] $Timestamp,
    [string] $Nonce
) {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bodyHash = ConvertTo-Hex ($sha.ComputeHash($utf8.GetBytes($Body)))
    } finally {
        $sha.Dispose()
    }

    $canonical = @(
        $Method.ToUpperInvariant()
        ([Uri] $Uri).AbsolutePath
        $bodyHash
        [string] $Timestamp
        $Nonce
        [string] $MemberId
        [string] $WorkspaceId
    ) -join "`n"

    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = $utf8.GetBytes($serviceSecret)
    try {
        $signature = ConvertTo-Hex ($hmac.ComputeHash($utf8.GetBytes($canonical)))
    } finally {
        $hmac.Dispose()
    }

    return @{
        'X-HS-Timestamp' = [string] $Timestamp
        'X-HS-Nonce' = $Nonce
        'X-HS-Member-Id' = [string] $MemberId
        'X-HS-Workspace-Id' = [string] $WorkspaceId
        'X-HS-Signature' = $signature
    }
}

function Invoke-HsRequest(
    [string] $Method,
    [string] $Uri,
    [hashtable] $RequestHeaders = @{}
) {
    $request = [System.Net.HttpWebRequest] [System.Net.WebRequest]::Create($Uri)
    $request.Method = $Method
    $request.AllowAutoRedirect = $false
    $request.UserAgent = 'HighlightSignal-V08-Verify'
    $request.CachePolicy = New-Object System.Net.Cache.RequestCachePolicy(
        [System.Net.Cache.RequestCacheLevel]::NoCacheNoStore
    )

    foreach ($name in $RequestHeaders.Keys) {
        $request.Headers[$name] = [string] $RequestHeaders[$name]
    }

    $response = $null
    try {
        $response = [System.Net.HttpWebResponse] $request.GetResponse()
    } catch [System.Net.WebException] {
        $response = [System.Net.HttpWebResponse] $_.Exception.Response
        if (-not $response) {
            throw
        }
    }

    try {
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        try {
            $content = $reader.ReadToEnd()
        } finally {
            $reader.Dispose()
        }

        return [pscustomobject]@{
            Status = [int] $response.StatusCode
            Content = $content
            Headers = $response.Headers
        }
    } finally {
        $response.Close()
    }
}

function New-Result([string] $Test, [int] $Http, [bool] $Pass) {
    return [pscustomobject]@{ Test = $Test; HTTP = $Http; Pass = $Pass }
}

$now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$workspaceUri = "$baseUrl/api/v1/workspaces"
$workspaceHeaders = New-SignedHeaders 'GET' $workspaceUri '' 1 0 $now (New-TestNonce)
$workspaceResponse = Invoke-HsRequest 'GET' $workspaceUri $workspaceHeaders
if ($workspaceResponse.Status -ne 200) {
    throw 'Signed workspace lookup failed.'
}

$workspaceId = [int64] (($workspaceResponse.Content | ConvertFrom-Json).data |
    Select-Object -First 1).id
if ($workspaceId -le 0) {
    throw 'No test Workspace was returned.'
}

# Query parameters do not participate in the canonical signature. Using two
# cache keys with the same nonce proves the second request reaches PHP/DB.
$legacyPath = "$baseUrl/ga/get_connections.php"
$legacyUriA = $legacyPath + '?v08a=' + [Guid]::NewGuid().ToString('N')
$legacyUriB = $legacyPath + '?v08b=' + [Guid]::NewGuid().ToString('N')
$legacyHeaders = New-SignedHeaders 'GET' $legacyUriA '' 1 $workspaceId $now (New-TestNonce)
$legacyFirst = Invoke-HsRequest 'GET' $legacyUriA $legacyHeaders
$legacyDifferentKey = Invoke-HsRequest 'GET' $legacyUriB $legacyHeaders
$legacyExactReplay = Invoke-HsRequest 'GET' $legacyUriA $legacyHeaders

$invalidState = Invoke-HsRequest 'GET' "$baseUrl/ga/oauth_callback.php?code=v08-invalid&state=invalid"

$expiredJson = '{"member_id":1,"ts":' + [string] ($now - 700) + '}'
$expiredPayload = [Convert]::ToBase64String($utf8.GetBytes($expiredJson)).TrimEnd('=')
$expiredPayload = $expiredPayload.Replace('+', '-').Replace('/', '_')
$stateHmac = New-Object System.Security.Cryptography.HMACSHA256
$stateHmac.Key = $utf8.GetBytes($serviceSecret)
try {
    $expiredSignature = ConvertTo-Hex ($stateHmac.ComputeHash($utf8.GetBytes($expiredPayload)))
} finally {
    $stateHmac.Dispose()
}
$expiredState = [Uri]::EscapeDataString($expiredPayload + '.' + $expiredSignature)
$expiredResponse = Invoke-HsRequest 'GET' "$baseUrl/ga/oauth_callback.php?code=v08-expired&state=$expiredState"

$oauthStartUri = "$baseUrl/ga/account_fetch.php?member_id=1"
$oauthStartHeaders = New-SignedHeaders 'GET' $oauthStartUri '' 1 $workspaceId `
    ([DateTimeOffset]::UtcNow.ToUnixTimeSeconds()) (New-TestNonce)
$oauthStart = Invoke-HsRequest 'GET' $oauthStartUri $oauthStartHeaders
$redirectMatches = $false
if ($oauthStart.Status -eq 302 -and $oauthStart.Headers['Location']) {
    $query = [System.Web.HttpUtility]::ParseQueryString(([Uri] $oauthStart.Headers['Location']).Query)
    $redirectMatches = $query['redirect_uri'] -eq $expectedRedirect
}

$results = @(
    (New-Result 'legacy_first' $legacyFirst.Status ($legacyFirst.Status -eq 200))
    (New-Result 'legacy_cache_control' $legacyFirst.Status `
        ([string] $legacyFirst.Headers['Cache-Control'] -match 'no-store'))
    (New-Result 'same_nonce_different_query' $legacyDifferentKey.Status `
        ($legacyDifferentKey.Status -eq 401))
    (New-Result 'exact_replay_no_cache' $legacyExactReplay.Status `
        ($legacyExactReplay.Status -eq 401))
    (New-Result 'oauth_invalid_state' $invalidState.Status ($invalidState.Status -eq 400))
    (New-Result 'oauth_expired_state' $expiredResponse.Status ($expiredResponse.Status -eq 400))
    (New-Result 'oauth_start_redirect' $oauthStart.Status `
        ($oauthStart.Status -eq 302 -and $redirectMatches))
)

$results | Format-Table -AutoSize
$serviceSecret = $null

if ($results.Pass -contains $false) {
    exit 1
}
