export interface WeiboPost {
    content: string;
    author: string;
    time: string;
    parsedTime?: Date;
    reposts: number;
    comments: number;
    likes: number;
    detailUrl: string | null;
    uid: string | null;
    mid: string | null;
    device: string | null;
    location: string | null;
    source: string | null;
}

export interface WeiboDetailInfo {
    detailUrl: string | null;
    uid: string | null;
    mid: string | null;
}

export interface DeviceLocationInfo {
    device: string | null;
    location: string | null;
    source: string | null;
}

export interface WeiboParseResult {
    posts: WeiboPost[];
    currentPage: number;
    nextPageUrl: string | null;
    totalPosts: number;
    url?: string;
}