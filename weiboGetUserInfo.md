/**
 * 用户信息请求选项
 */
export interface UserInfoOptions {
  /** 用户ID */
  uid: string;
  /** Cookie字符串 */
  cookies?: string;
}
/**
 * 标签页信息
 */
export interface TabInfo {
  name: string;
  tabName: string;
}
/**
 * 用户信息响应数据
 */
export interface UserInfoResponse {
  ok: number;
  data: {
    user: DetailedUserInfo;
    tabList: TabInfo[];
    blockText: string;
  };
}
/**
 * 用户状态统计
 */
export interface UserStatusCounter {
  total_cnt_format: string;
  comment_cnt: string;
  repost_cnt: string;
  like_cnt: string;
  total_cnt: string;
}
/**
 * 用户图标信息
 */
export interface UserIcon {
  type: string;
  data: {
    mbrank?: number;
    mbtype?: number;
    svip?: number;
    vvip?: number;
  };
}
/**
 * 详细的用户信息
 */
export interface DetailedUserInfo {
  id: number;
  idstr: string;
  pc_new: number;
  screen_name: string;
  profile_image_url: string;
  profile_url: string;
  verified: boolean;
  verified_type: number;
  domain: string;
  weihao: string;
  verified_type_ext: number;
  status_total_counter: UserStatusCounter;
  avatar_large: string;
  avatar_hd: string;
  follow_me: boolean;
  following: boolean;
  mbrank: number;
  mbtype: number;
  v_plus: number;
  user_ability: number;
  planet_video: boolean;
  verified_reason: string;
  description: string;
  location: string;
  gender: string;
  followers_count: number;
  followers_count_str: string;
  friends_count: number;
  statuses_count: number;
  url: string;
  svip: number;
  vvip: number;
  cover_image_phone: string;
  icon_list: UserIcon[];
  top_user: number;
  user_type: number;
  is_star: string;
  is_muteuser: boolean;
  special_follow: boolean;
}
/**
 * 获取指定用户的详细信息
 * @param options 请求选项
 * @returns 用户信息响应数据
 */
export async function getUserInfo(options: UserInfoOptions): Promise<UserInfoResponse> {
  const { uid, cookies } = options;

  const url = `https://weibo.com/ajax/profile/info?uid=${uid}`;

  const headers: Record<string, string> = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    'client-version': 'v2.47.101',
    'priority': 'u=1, i',
    'referer': `https://weibo.com/u/${uid}`,
    'sec-ch-ua': '"Not;A=Brand";v="99", "Microsoft Edge";v="139", "Chromium";v="139"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'server-version': 'v2025.08.14.2',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0',
    'x-requested-with': 'XMLHttpRequest'
  };

  // 添加Cookie和XSRF-TOKEN
  if (cookies) {
    headers['cookie'] = cookies;

    // 从cookies中提取XSRF-TOKEN
    const xsrfMatch = cookies.match(/XSRF-TOKEN=([^;]+)/);
    if (xsrfMatch) {
      headers['x-xsrf-token'] = xsrfMatch[1]!;
    }
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as UserInfoResponse;

    if (data.ok !== 1) {
      throw new Error(`API返回错误: ${JSON.stringify(data)}`);
    }
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * 获取指定用户的详细信息（简化版本，只返回用户对象）
 * @param options 请求选项
 * @returns 用户信息对象
 */
export async function getUserInfoSimple(options: UserInfoOptions): Promise<DetailedUserInfo> {
  const response = await getUserInfo(options);
  return response.data.user;
}

/**
 * 批量获取多个用户的信息
 * @param uids 用户ID数组
 * @param cookies Cookie字符串
 * @param delay 请求间隔时间（毫秒），默认1000ms
 * @returns 用户信息数组
 */
export async function getBatchUserInfo(
  uids: string[],
  cookies?: string,
  delay: number = 1000
): Promise<DetailedUserInfo[]> {
  const users: DetailedUserInfo[] = [];
  for (let i = 0; i < uids.length; i++) {
    const uid = uids[i];
    try {
      const user = await getUserInfoSimple({ uid: uid!, cookies: cookies || `` });
      users.push(user);
      // 添加延迟避免请求过快
      if (i < uids.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      // 继续获取下一个用户
      continue;
    }
  }
  return users;
}

/**
 * 提取用户基本信息
 * @param user 用户详细信息
 * @returns 基本信息对象
 */
export function extractUserBasicInfo(user: DetailedUserInfo) {
  return {
    id: user.id,
    idstr: user.idstr,
    screen_name: user.screen_name,
    description: user.description,
    location: user.location,
    gender: user.gender,
    verified: user.verified,
    verified_reason: user.verified_reason,
    followers_count: user.followers_count,
    followers_count_str: user.followers_count_str,
    friends_count: user.friends_count,
    statuses_count: user.statuses_count,
    profile_image_url: user.profile_image_url,
    avatar_large: user.avatar_large,
    avatar_hd: user.avatar_hd,
    cover_image_phone: user.cover_image_phone,
    is_vip: user.svip === 1,
    is_vvip: user.vvip === 1,
    mbrank: user.mbrank,
    mbtype: user.mbtype,
    top_user: user.top_user === 1,
    is_star: user.is_star === "1"
  };
}

/**
 * 提取用户统计信息
 * @param user 用户详细信息
 * @returns 统计信息对象
 */
export function extractUserStats(user: DetailedUserInfo) {
  const counter = user.status_total_counter;
  return {
    total_interactions: counter.total_cnt,
    total_interactions_formatted: counter.total_cnt_format,
    comments: parseInt(counter.comment_cnt.replace(/,/g, '')),
    reposts: parseInt(counter.repost_cnt.replace(/,/g, '')),
    likes: parseInt(counter.like_cnt.replace(/,/g, '')),
    followers: user.followers_count,
    following: user.friends_count,
    posts: user.statuses_count,
    // 计算互动率（总互动数/粉丝数）
    engagement_rate: user.followers_count > 0
      ? (parseInt(counter.total_cnt.replace(/,/g, '')) / user.followers_count * 100).toFixed(2) + '%'
      : '0%'
  };
}

/**
 * 检查用户是否为认证用户
 * @param user 用户详细信息
 * @returns 认证信息对象
 */
export function checkUserVerification(user: DetailedUserInfo) {
  return {
    is_verified: user.verified,
    verified_type: user.verified_type,
    verified_type_ext: user.verified_type_ext,
    verified_reason: user.verified_reason,
    verification_level: user.verified_type === 7 ? '机构认证' :
      user.verified_type === 1 ? '个人认证' :
        user.verified ? '其他认证' : '未认证'
  };
}

/**
 * 获取用户VIP信息
 * @param user 用户详细信息
 * @returns VIP信息对象
 */
export function getUserVipInfo(user: DetailedUserInfo) {
  const vipIcon = user.icon_list.find(icon => icon.type === 'vip');

  return {
    is_vip: user.svip === 1,
    is_super_vip: user.vvip === 1,
    mbrank: user.mbrank,
    mbtype: user.mbtype,
    vip_level: vipIcon ? vipIcon.data.mbrank || 0 : 0,
    vip_type: vipIcon ? vipIcon.data.mbtype || 0 : 0
  };
}

/**
 * 格式化用户信息为可读文本
 * @param user 用户详细信息
 * @returns 格式化的用户信息字符串
 */
export function formatUserInfo(user: DetailedUserInfo): string {
  const basic = extractUserBasicInfo(user);
  const stats = extractUserStats(user);
  const verification = checkUserVerification(user);
  const vip = getUserVipInfo(user);

  return `
用户信息:
- 昵称: ${basic.screen_name}
- ID: ${basic.id}
- 简介: ${basic.description || '无'}
- 位置: ${basic.location || '未知'}
- 性别: ${basic.gender === 'm' ? '男' : basic.gender === 'f' ? '女' : '未知'}

认证信息:
- 认证状态: ${verification.verification_level}
- 认证原因: ${verification.verified_reason || '无'}

统计数据:
- 粉丝数: ${stats.followers.toLocaleString()} (${basic.followers_count_str})
- 关注数: ${stats.following.toLocaleString()}
- 微博数: ${stats.posts.toLocaleString()}
- 总互动数: ${stats.total_interactions_formatted}
- 互动率: ${stats.engagement_rate}

VIP信息:
- VIP状态: ${vip.is_vip ? '是' : '否'}
- 超级VIP: ${vip.is_super_vip ? '是' : '否'}
- 会员等级: ${vip.vip_level}

其他:
- 头部用户: ${basic.top_user ? '是' : '否'}
- 明星用户: ${basic.is_star ? '是' : '否'}
`.trim();
}
