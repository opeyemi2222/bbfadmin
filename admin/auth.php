<?php
/**
 * BBF Admin — Direct PHP Login Handler
 * Receives POST from admin/login.html
 * Sets PHP session AND passes data to JS sessionStorage via redirect
 */

require_once __DIR__ . '/../api/config/helpers.php';
require_once __DIR__ . '/../api/config/db.php';

$email    = trim($_POST['email']    ?? '');
$password = trim($_POST['password'] ?? '');

if (empty($email) || empty($password)) {
    header('Location: login.html?error=1');
    exit;
}

try {
    $pdo  = bbf_db();
    $stmt = $pdo->prepare("SELECT * FROM admin_users WHERE email = ?");
    $stmt->execute([$email]);
    $admin = $stmt->fetch();

    if ($admin && password_verify($password, $admin['password_hash'])) {

        // ── Set PHP session (used by API middleware) ──────────────────────────
        session_name(SESSION_NAME_ADMIN);
        session_set_cookie_params([
            'lifetime' => SESSION_LIFETIME,
            'path'     => '/',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
        $_SESSION['admin_id']    = $admin['id'];
        $_SESSION['admin_email'] = $admin['email'];
        $_SESSION['admin_name']  = $admin['name'];
        $_SESSION['admin_role']  = $admin['role'];
        $_SESSION['admin_auth']  = true;

        $pdo->prepare("UPDATE admin_users SET last_login = NOW() WHERE id = ?")
            ->execute([$admin['id']]);

        // ── Pass admin data to JS via URL param ───────────────────────────────
        $adminData = urlencode(json_encode([
            'id'   => $admin['id'],
            'name' => $admin['name'],
            'role' => $admin['role'],
        ]));

        header("Location: index.html?login=" . $adminData);
        exit;
    }
} catch (Exception $e) {
    error_log('BBF Admin Login Error: ' . $e->getMessage());
}

header('Location: login.html?error=1');
exit;
