# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e8]: 📊
      - heading "欢迎回来" [level=1] [ref=e9]
      - paragraph [ref=e10]: 登录访问数据大屏系统
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]: 用户名或邮箱
        - textbox "用户名或邮箱" [ref=e14]:
          - /placeholder: 请输入用户名或邮箱
      - generic [ref=e15]:
        - generic [ref=e16]: 密码
        - textbox "密码" [ref=e17]:
          - /placeholder: 请输入密码
      - button "登录" [disabled] [ref=e18]
      - paragraph [ref=e20]:
        - text: 还没有账号？
        - link "立即注册" [ref=e21] [cursor=pointer]:
          - /url: /register
  - generic:
    - region "通知消息"
```