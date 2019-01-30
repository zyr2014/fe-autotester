/**
 * @file utils
 * @author zhangyuran
 */
const URL = require('url');

function addPage(todo, done, url) {
    if (!url) {
        return;
    }
    const urlObj = URL.parse(url);
    const total = [].concat(todo, done);
    for (let page of total) {
        const {protocol, host, pathname, port} = URL.parse(page);
        if (urlObj.protocol === protocol
            && urlObj.host === host
            && urlObj.pathname === pathname) {
            return;
        }
    }
    todo.push(url);
}

function isSameOrigin(url1, url2) {
    if (!url1 || !url2) {
        return false;
    }

    let urlObj1 = URL.parse(url1);
    let urlObj2 = URL.parse(url2);
    return urlObj1.host === urlObj2.host;
}

function isSameHref(url1, url2) {
    if (!url1 || !url2) {
        return false;
    }

    let urlObj1 = URL.parse(url1);
    let urlObj2 = URL.parse(url2);
    return urlObj1.protocol === urlObj2.protocol
        && urlObj1.host === urlObj2.host
        && urlObj1.path === urlObj2.path;
}

module.exports = {
    addPage,
    isSameOrigin,
    isSameHref
};