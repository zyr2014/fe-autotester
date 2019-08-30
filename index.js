/**
 * @file index.js
 * @author zhangyuran
 */

const CDP = require('chrome-remote-interface');
const launchChrome = require('./lib/launchChrome');
const {addPage, isSameHref, isSameOrigin} = require('./lib/util');

const script = `

    lastXpath_autotest = localStorage.getItem(location.href);
    started_autotest = !lastXpath_autotest;
    isOver_autotest = true;

    getXpath_autotest = function (elem) {
        let xpath = elem.tagName.toLowerCase();
        let index = 0;
        let children = elem.parentNode.childNodes;
        for (let i = 0; i < children.length; i++) {
            let node = children[i];
            if (node.tagName !== elem.tagName) {
                continue;
            }
            if (node === elem) {
                break;
            }
            index++;
        }

        if (index) {
            xpath += index;
        }

        if (elem !== document.body) {
            xpath = getXpath_autotest(elem.parentNode) + '-' + xpath;
        }

        return xpath;

    };

    walk_autotest = function (root) {
        if (!isOver_autotest) {
            return;
        }

        let xpath = getXpath_autotest(root);
        if (started_autotest) {
            localStorage.setItem(location.href, xpath);
            let eventListeners = getEventListeners(root);
            if (eventListeners.click || root.tagName === 'A') {
                root.click();
                isOver_autotest = false;
                return;
            }
        }
        else if (xpath === lastXpath_autotest) {
            started_autotest = true;
        }               

        let children = root.childNodes;
        if (children && children.length) {
            for (let node of children) {
                if (node.nodeType === 1 && ['script', 'style'].indexOf(node.tagName.toLowerCase()) === -1) {
                    walk_autotest(node);
                }
            }
        }

    };

    if (+lastXpath_autotest !== 1) {
        walk_autotest(document.querySelector('body'));
        if (isOver_autotest) {
            localStorage.setItem(location.href, 1);
        }
    }

`;

module.exports = async function (originUrl) {

    const chrome = await launchChrome(false);
    const protocol = await CDP({port: chrome.port});

    const {Page, Runtime, Network} = protocol;
    await Promise.all([Page.enable(), Runtime.enable(), Network.enable()]);

    let todoPages = [];
    let donePages = [];
    let currentPage = originUrl;
    let timer;

    Runtime.exceptionThrown((timestamp, exceptionDetails) => {
        console.log(timestamp, exceptionDetails);
    });

    Page.loadEventFired(async () => {
        if (timer) {
            clearInterval(timer);
        }

        let result = await Runtime.evaluate({expression: 'location.href'});
        if (!isSameHref(result.result.value, currentPage)) {
            return;
        }

        async function clickPage() {
            let result  = await Runtime.evaluate({expression: `localStorage.getItem(location.href)`});
            // console.log(result.result.value);
            if (+result.result.value === 1) {
                donePages.push(currentPage);
                currentPage = todoPages.shift();
                if (currentPage) {
                    console.log(currentPage);
                    Page.navigate({url: currentPage});
                }
                else {
                    protocol.close();
                    chrome.kill();
                }
                clearInterval(timer);
                return; 
            }

            await Runtime.evaluate({
                expression: script,
                includeCommandLineAPI: true
            });
        }

        timer = setInterval(async () => {
            let result = await Runtime.evaluate({expression: 'location.href'});
            if (!isSameHref(result.result.value, currentPage)) {
                clearInterval(timer);
                return;
            }
            await clickPage();

        }, 1000);

        await clickPage();
    });

    Network.responseReceived(({response}) => {
        let contentType = response.headers['Content-Type'] || response.headers['content-type'];
        if (contentType && contentType.indexOf('text/html') === 0) {
            if (!isSameHref(response.url, currentPage)) {
                if (isSameOrigin(response.url, originUrl)) {
                    // console.log('response', response.url);
                    addPage(todoPages, donePages.concat(currentPage), response.url);
                }
                Page.navigate({url: currentPage});
            }
        }
    });

    Page.navigate({url: currentPage});

};
