# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e5]:
    - heading "后台管理系统" [level=1] [ref=e6]
    - heading "登录" [level=2] [ref=e7]
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: 用户名或邮箱
        - textbox "用户名或邮箱" [ref=e11]:
          - /placeholder: 请输入用户名或邮箱
      - generic [ref=e12]:
        - generic [ref=e13]: 密码
        - textbox "密码" [ref=e14]:
          - /placeholder: 请输入密码
      - button "登录" [disabled] [ref=e15]
      - generic [ref=e16]:
        - text: 还没有账号？
        - link "立即注册" [ref=e17] [cursor=pointer]:
          - /url: /register
  - generic [ref=e20]:
    - generic [ref=e21]: "TS2531: Object is possibly 'null'."
    - generic [ref=e22]: src/app/features/screens/screens-list.component.ts:124:27
    - generic [ref=e23]: Click outside, press Esc key, or fix the code to dismiss.
```