import { Handler, Visitor, WeiboSearchUrlBuilderAst } from "@pro/workflow-core";

const formatDate = (date: Date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    String(date.getHours()).padStart(2, '0'),
].join('-');

@Handler(WeiboSearchUrlBuilderAst)
export class WeiboSearchUrlBuilderAstVisitor {
    async visit(ast: WeiboSearchUrlBuilderAst, _ctx: Visitor) {
        const { keyword, start, end, page = 1 } = ast;
        if (!keyword || !start || !end) {
            ast.state = 'fail';
            throw new Error('缺少必要参数: keyword, start, end');
        }
        // https://s.weibo.com/weibo?q=%E5%9B%BD%E5%BA%86&typeall=1&suball=1&timescope=custom%3A2025-10-01-0%3A2025-10-23-15&Refer=g
        const base = 'https://s.weibo.com/weibo';
        const params = new URLSearchParams({ q: keyword, typeall: `1`, suball: `1`, page: String(page), Refer: `g` });
        params.set('timescope', `custom:${formatDate(start)}:${formatDate(end)}`);
        ast.url = `${base}?${params.toString()}`;
        ast.state = 'success';
        return ast;
    }
}