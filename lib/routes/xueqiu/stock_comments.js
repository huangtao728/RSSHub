const got = require('@/utils/got');
const cheerio = require('cheerio');
const template = require('art-template');
const { parseDate } = require('@/utils/parse-date');

const description_template = `
<a href='https://xueqiu.com/u/{{item.user.id}}'>
    <div style="font-weight: bold;">{{item.user.screen_name}}:</div>
</a>
<hr/>
{{item.text}}
<br/>
{{if item.retweeted_status}}
<hr style="border:1 dashed #987cb9" />
{{item.retweeted_status.text}}
{{else}}
<hr/>
{{/if}}
<div style="text-align:right">
    ----来源于:{{item.source}}
</div>`;

module.exports = async (ctx) => {
    const id = ctx.params.id;
    const titleLength = ctx.params.titleLength || 30;

    const res = await got({
        method: 'get',
        url: `https://xueqiu.com/query/v1/symbol/search/status?u=11111&count=100&comment=0&symbol=${id}&source=all&sort=time`,
    });

    // 获取stock_name
    const stock_name = await ctx.cache.tryGet(`stock_name_${id}`, async () => {
        const res = await got({
            method: 'get',
            url: `https://xueqiu.com/S/${id}`,
        });
        const $ = cheerio.load(res.data); // 使用 cheerio 加载返回的 HTML
        return $('.stock-name').text().split('(')[0];
    });

    const data = res.data.list;
    ctx.state.data = {
        title: `${id} ${stock_name} - 评论`,
        link: `https://xueqiu.com/S/${id}`,
        description: `${stock_name} - 评论`,
        item: data.map((item) => {
            let link = `https://xueqiu.com${item.target}`;
            if (item.quote_cards) {
                link = item.quote_cards[0].target_url;
            }
            const description = template.render(description_template, { item: item });
            return {
                title: item.title !== '' ? item.title : item.text.replace(/<[^>]+>/g, '').slice(0, titleLength),
                description: description,
                pubDate: parseDate(item.created_at),
                link,
            };
        }),
    };
};
