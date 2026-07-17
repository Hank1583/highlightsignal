<?php
function getMemberId() {
  if (isset($_SERVER['HTTP_X_MEMBER_ID'])) {
    return (int) $_SERVER['HTTP_X_MEMBER_ID'];
  }

  http_response_code(401);
  echo json_encode([
    "ok" => false,
    "message" => "Unauthorized"
  ]);
  exit;
}
