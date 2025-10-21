新建：@pro/weibo包

微博帖子详情封成nestjs服务，调用curl获取结果，分析结果，生成typescript类型

```
curl 'https://weibo.com/ajax/statuses/show?id=Qa7HUpgp8&locale=zh-CN&isGetLongText=true' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: zh-CN,zh;q=0.9' \
  -H 'client-version: v2.47.126' \
  -b 'SINAGLOBAL=9396892910086.902.1755085034992; SCF=ApqfCifXo1dk0hdzIn-VyWsRlAFYnzhho5f52UWxGuwXiFtd5IkY3bALlL2XY4H_86kl3SaBv232y4FmgYyFTZI.; ALF=1763336654; SUB=_2A25F9qSeDeThGeNM41QT9CrIzD2IHXVmjbhWrDV8PUJbkNANLU3HkW1NSecf_nvLB5M0dEmhpbgDlxa2m5t8ssZK; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9WFsQ1UB-nLWxMRUwHTCcIKn5JpX5KMhUgL.Fo-E1hqEShBXS022dJLoIE5LxKBLB.2L12eLxK-L1h5L12BLxKBLB.BL1Ke4S0nfeBtt; ULV=1760744688521:6:3:1:9461444705209.068.1760744688518:1759977025500; XSRF-TOKEN=88QJKhJI8REov5Ca1FUgQiet; WBPSESS=7B6hG5UvbQE9yJng-oxNCQFU2vnXVrng4jdEF0SkK9_YduBl7xwZHFYySnbWqtvq_143GvWP2lOfOCY9bm__ot2dA3W8oeefCfEKlFXgK3KIN1JWcvPWcwKuMEBlcXf438QWesnkmKJkIlRC_ZkK2g==' \
  -H 'priority: u=1, i' \
  -H 'referer: https://weibo.com/3420174470/Qa7HUpgp8?pagetype=homefeed' \
  -H 'sec-ch-ua: "Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "Windows"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'server-version: v2025.10.17.1' \
  -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' \
  -H 'x-requested-with: XMLHttpRequest' \
  -H 'x-xsrf-token: 88QJKhJI8REov5Ca1FUgQiet'
```