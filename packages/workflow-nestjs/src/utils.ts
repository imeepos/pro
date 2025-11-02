import { useQueue } from "@pro/rabbitmq";

export interface PostDetailCrawlQueue {
    mid: string;
    uid: string;
    postAt: Date;
}
export function createPostDetailCrawlQueue() {
    return useQueue<PostDetailCrawlQueue>(`post_detail_crawl`, { manualAck: true })
}

export interface WeiboKeywordSearchQueue {
    keyword: string;
    start: Date;
    end: Date;
}

export function createWeiboKeywordSearchQueue() {
    return useQueue<WeiboKeywordSearchQueue>(`weibo_keyword_search`, { manualAck: true })
}


export async function delay() {
    return new Promise((resolve) => setTimeout(resolve, 1000 * 5 * Math.random()))
}