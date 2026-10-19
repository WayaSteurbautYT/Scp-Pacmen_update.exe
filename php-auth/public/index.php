<?php
declare(strict_types=1);

function respond(int $status, array $body): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}

$allowedOrigins = array_filter(array_map('trim', explode(',', getenv('PACMAN_ALLOWED_ORIGINS') ?: '')));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    if ($origin !== '' && !in_array($origin, $allowedOrigins, true)) respond(403, ['ok' => false, 'error' => 'Origin not allowed.']);
    http_response_code(204);
    exit;
}
if ($origin !== '' && !in_array($origin, $allowedOrigins, true)) respond(403, ['ok' => false, 'error' => 'Origin not allowed.']);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(405, ['ok' => false, 'error' => 'Use POST.']);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$action = basename(rtrim((string)$path, '/'));
if (!in_array($action, ['register', 'login'], true)) respond(404, ['ok' => false, 'error' => 'Not found.']);
$raw = file_get_contents('php://input', false, null, 0, 8193);
if ($raw === false || strlen($raw) > 8192) respond(413, ['ok' => false, 'error' => 'Request too large.']);
$data = json_decode($raw, true);
if (!is_array($data)) respond(400, ['ok' => false, 'error' => 'Invalid JSON request.']);

$secret = getenv('PACMAN_JWT_SECRET') ?: '';
$dsn = getenv('PACMAN_DB_DSN') ?: '';
if (strlen($secret) < 32 || $dsn === '') respond(503, ['ok' => false, 'error' => 'Account service is not configured.']);
$username = trim((string)($data['username'] ?? ''));
$email = strtolower(trim((string)($data['email'] ?? '')));
$password = (string)($data['password'] ?? '');
if ($action === 'register') {
    if (!preg_match('/^[A-Za-z0-9_]{3,18}$/', $username)) respond(422, ['ok' => false, 'error' => 'Username must be 3–18 letters, numbers, or underscores.']);
    if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) respond(422, ['ok' => false, 'error' => 'Enter a valid email address.']);
}
if (strlen($password) < 10 || strlen($password) > 128) respond(422, ['ok' => false, 'error' => 'Password must be 10–128 characters.']);

try {
    $pdo = new PDO($dsn, getenv('PACMAN_DB_USER') ?: '', getenv('PACMAN_DB_PASSWORD') ?: '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    if ($action === 'register') {
        $statement = $pdo->prepare('INSERT INTO accounts (username, email, password_hash) VALUES (:username, :email, :password_hash)');
        try {
            $statement->execute(['username' => $username, 'email' => $email, 'password_hash' => password_hash($password, PASSWORD_DEFAULT)]);
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') respond(409, ['ok' => false, 'error' => 'That username or email is already registered.']);
            throw $error;
        }
        $account = ['id' => (string)$pdo->lastInsertId(), 'username' => $username];
    } else {
        $identity = trim((string)($data['identity'] ?? ''));
        if ($identity === '' || strlen($identity) > 254) respond(422, ['ok' => false, 'error' => 'Enter your username or email.']);
        $statement = $pdo->prepare('SELECT id, username, password_hash FROM accounts WHERE username = :username OR email = :email LIMIT 1');
        $statement->execute(['username' => $identity, 'email' => strtolower($identity)]);
        $row = $statement->fetch();
        if (!$row || !password_verify($password, $row['password_hash'])) respond(401, ['ok' => false, 'error' => 'Incorrect username/email or password.']);
        $account = ['id' => (string)$row['id'], 'username' => $row['username']];
    }
    $header = rtrim(strtr(base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT'])), '+/', '-_'), '=');
    $payload = rtrim(strtr(base64_encode(json_encode(['sub' => $account['id'], 'username' => $account['username'], 'iat' => time(), 'exp' => time() + 86400])), '+/', '-_'), '=');
    $input = $header . '.' . $payload;
    $signature = rtrim(strtr(base64_encode(hash_hmac('sha256', $input, $secret, true)), '+/', '-_'), '=');
    respond(200, ['ok' => true, 'account' => $account, 'token' => $input . '.' . $signature]);
} catch (Throwable $error) {
    error_log('Account API failure: ' . $error->getMessage());
    respond(503, ['ok' => false, 'error' => 'Account service is temporarily unavailable.']);
}
