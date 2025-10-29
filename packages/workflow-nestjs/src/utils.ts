import { useQueue } from "@pro/rabbitmq";

export interface PostDetailCrawlQueue {
    mid: string;
    uid: string;
    postAt: Date;
}
export function createPostDetailCrawlQueue() {
    return useQueue<PostDetailCrawlQueue>(`post_detail_crawl`)
}

export interface WeiboKeywordSearchQueue {
    keyword: string;
    start: Date;
    end: Date;
}

export function createWeiboKeywordSearchQueue() {
    return useQueue<WeiboKeywordSearchQueue>(`weibo_keyword_search`)
}