/**
 * 微博时间解析器
 * 专门处理微博特有的时间格式，将中文相对时间和绝对时间转换为标准 Date 对象
 * 每个解析模式都有其不可替代的职责，确保代码的简洁性和可维护性
 */
export class WeiboTimeParser {
  /**
   * 解析微博时间字符串
   * 支持相对时间（刚刚、分钟前、小时前、昨天）和绝对时间（月日、年月日）
   */
  static parse(timeString: string): Date {
    const normalizedTime = timeString.trim();

    // 优先处理相对时间
    const relativeTime = this.parseRelativeTime(normalizedTime);
    if (relativeTime) {
      return relativeTime;
    }

    // 处理绝对时间
    const absoluteTime = this.parseAbsoluteTime(normalizedTime);
    if (absoluteTime) {
      return absoluteTime;
    }

    // 无法解析时返回当前时间
    return new Date();
  }

  /**
   * 解析相对时间格式
   * 处理"刚刚"、"分钟前"、"小时前"、"昨天"等相对时间表达
   */
  private static parseRelativeTime(timeString: string): Date | null {
    const now = new Date();

    // 刚刚
    if (timeString === '刚刚') {
      return now;
    }

    // 分钟前
    const minutesMatch = timeString.match(/(\d+)分钟前/);
    if (minutesMatch) {
      const minutes = parseInt(minutesMatch[1]);
      return new Date(now.getTime() - minutes * 60 * 1000);
    }

    // 小时前
    const hoursMatch = timeString.match(/(\d+)小时前/);
    if (hoursMatch) {
      const hours = parseInt(hoursMatch[1]);
      return new Date(now.getTime() - hours * 60 * 60 * 1000);
    }

    // 昨天
    const yesterdayMatch = timeString.match(/昨天\s*(\d{1,2}):(\d{1,2})/);
    if (yesterdayMatch) {
      const hour = parseInt(yesterdayMatch[1]);
      const minute = parseInt(yesterdayMatch[2]);
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      yesterday.setHours(hour, minute, 0, 0);
      return yesterday;
    }

    return null;
  }

  /**
   * 解析绝对时间格式
   * 处理"月日 时分"、"年月日 时分"等绝对时间表达
   */
  private static parseAbsoluteTime(timeString: string): Date | null {
    const now = new Date();
    const currentYear = now.getFullYear();

    // 月日 时分格式："10月23日 18:14"
    const monthDayTimeMatch = timeString.match(/(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{1,2})/);
    if (monthDayTimeMatch) {
      const month = parseInt(monthDayTimeMatch[1]) - 1; // 月份从0开始
      const day = parseInt(monthDayTimeMatch[2]);
      const hour = parseInt(monthDayTimeMatch[3]);
      const minute = parseInt(monthDayTimeMatch[4]);

      // 如果月份大于当前月份，说明是去年
      const year = month > now.getMonth() ? currentYear - 1 : currentYear;

      return new Date(year, month, day, hour, minute);
    }

    // 年月日 时分格式："2024年10月23日 18:14"
    const yearMonthDayTimeMatch = timeString.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{1,2})/);
    if (yearMonthDayTimeMatch) {
      const year = parseInt(yearMonthDayTimeMatch[1]);
      const month = parseInt(yearMonthDayTimeMatch[2]) - 1;
      const day = parseInt(yearMonthDayTimeMatch[3]);
      const hour = parseInt(yearMonthDayTimeMatch[4]);
      const minute = parseInt(yearMonthDayTimeMatch[5]);

      return new Date(year, month, day, hour, minute);
    }

    // 月日格式："10月23日"
    const monthDayMatch = timeString.match(/(\d{1,2})月(\d{1,2})日/);
    if (monthDayMatch) {
      const month = parseInt(monthDayMatch[1]) - 1;
      const day = parseInt(monthDayMatch[2]);

      // 如果月份大于当前月份，说明是去年
      const year = month > now.getMonth() ? currentYear - 1 : currentYear;

      return new Date(year, month, day);
    }

    return null;
  }

  /**
   * 验证时间字符串是否可以被解析
   * 用于在解析前检查时间格式的有效性
   */
  static canParse(timeString: string): boolean {
    const normalizedTime = timeString.trim();

    return Boolean(
      normalizedTime === '刚刚' ||
      /\d+分钟前/.test(normalizedTime) ||
      /\d+小时前/.test(normalizedTime) ||
      /昨天\s*\d{1,2}:\d{1,2}/.test(normalizedTime) ||
      /\d{1,2}月\d{1,2}日\s*\d{1,2}:\d{1,2}/.test(normalizedTime) ||
      /\d{4}年\d{1,2}月\d{1,2}日\s*\d{1,2}:\d{1,2}/.test(normalizedTime) ||
      /\d{1,2}月\d{1,2}日/.test(normalizedTime)
    );
  }
}