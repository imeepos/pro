界面美化：
项目：@pro/web
默认选中 后端@pro/admin设置的默认页面
现在选中的 不是默认页面
且连续3次请求：curl 'http://43.240.223.138:3000/api/screens/default' \
  -H 'Accept: */*' \
  -H 'Accept-Language: zh-CN,zh;q=0.9' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0NjQzYjQ3OS1iZTlhLTQ2ZWYtOWRlNS00NzQ4ZjBmNzRhOWMiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBza2VyLmNvbSIsImlhdCI6MTc2MDM5NjIwNCwiZXhwIjoxNzYwMzk5ODA0fQ.a64-jHrbeUMXnkVOWvy9zkbwmHpXdFxCj5rSWDfnrds' \
  -H 'Cache-Control: no-cache' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://43.240.223.138:8081' \
  -H 'Pragma: no-cache' \
  -H 'Referer: http://43.240.223.138:8081/' \
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' \
  --insecure



界面优化：
项目：@pro/admin
页面：/events/create

时间选择组件你分析一下缺陷是什么，点击后需要下拉到最后，才能看到时间选择区域


操作优化：
项目：@pro/admin
页面：/events/create

标签设置问题

我输入 “老坛酸菜” 点击新建标签，弹出弹框 “创建新标签”，再次输入 “老坛酸菜” 选择颜色 点击创建， 弹框消失

这一顿操作下来，并没有成功创建标签，等于啥也没干