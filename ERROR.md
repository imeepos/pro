
bug修复：

前端项目：@pro/admin
页面：/api-keys
操作：
api-key 点击编辑，然后选择管理员，点击保存修改按钮

curl 'http://43.240.223.138:3000/api/api-keys/6' \
  -X 'PUT' \
  -H 'Accept: */*' \
  -H 'Accept-Language: zh-CN,zh;q=0.9' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0NjQzYjQ3OS1iZTlhLTQ2ZWYtOWRlNS00NzQ4ZjBmNzRhOWMiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBza2VyLmNvbSIsImlhdCI6MTc2MDM5NjMwOCwiZXhwIjoxNzYwMzk5OTA4fQ.tFqU5ju0Imr8ZKwcKXj3pGkvtV5XqdwQ0xsVAtuC5BE' \
  -H 'Cache-Control: no-cache' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://43.240.223.138:8082' \
  -H 'Pragma: no-cache' \
  -H 'Referer: http://43.240.223.138:8082/' \
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' \
  --data-raw '{"name":"sker","type":"admin","expiresAt":"2026-10-13T23:02","permissions":[]}' \
  --insecure


  选中管理员的时候 默认全选了 所有权限，保存成功后，再次打开，一个权限都没有选中！！！





bug修复：

前端项目：@pro/admin
页面：/events/create

问题：行业类型下拉无数据/事件类型下拉无数据
接口返回正常
curl 'http://43.240.223.138:3000/api/industry-types' \
  -H 'Accept: */*' \
  -H 'Accept-Language: zh-CN,zh;q=0.9' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0NjQzYjQ3OS1iZTlhLTQ2ZWYtOWRlNS00NzQ4ZjBmNzRhOWMiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBza2VyLmNvbSIsImlhdCI6MTc2MDM5NjMwOCwiZXhwIjoxNzYwMzk5OTA4fQ.tFqU5ju0Imr8ZKwcKXj3pGkvtV5XqdwQ0xsVAtuC5BE' \
  -H 'Cache-Control: no-cache' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://43.240.223.138:8082' \
  -H 'Pragma: no-cache' \
  -H 'Referer: http://43.240.223.138:8082/' \
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' \
  --insecure

  {
    "success": true,
    "data": [
        {
            "id": "1",
            "industryCode": "行政",
            "industryName": "xz",
            "description": "",
            "sortOrder": 0,
            "status": 1,
            "createdAt": "2025-10-13T12:37:27.504Z",
            "updatedAt": "2025-10-13T12:37:27.504Z"
        }
    ],
    "timestamp": "2025-10-13T23:04:21.759Z"
}


bug修复：

curl 'http://43.240.223.138:3000/api/tags' \
  -H 'Accept: */*' \
  -H 'Accept-Language: zh-CN,zh;q=0.9' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0NjQzYjQ3OS1iZTlhLTQ2ZWYtOWRlNS00NzQ4ZjBmNzRhOWMiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBza2VyLmNvbSIsImlhdCI6MTc2MDM5NjMwOCwiZXhwIjoxNzYwMzk5OTA4fQ.tFqU5ju0Imr8ZKwcKXj3pGkvtV5XqdwQ0xsVAtuC5BE' \
  -H 'Cache-Control: no-cache' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://43.240.223.138:8082' \
  -H 'Pragma: no-cache' \
  -H 'Referer: http://43.240.223.138:8082/' \
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' \
  --insecure


  {
    "success": false,
    "statusCode": 400,
    "timestamp": "2025-10-13T23:26:03.652Z",
    "path": "/api/tags",
    "message": [
        "Validation failed (numeric string is expected)"
    ]
}