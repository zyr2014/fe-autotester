/**
 * @file 运行chrome
 * @author zhangyuran
 */

const chromeLauncher = require('chrome-launcher');

/**
 * Launches a debugging instance of Chrome.
 * @param {boolean=} headless True (default) launches Chrome in headless mode.
 *     False launches a full version of Chrome.
 * @return {Promise<ChromeLauncher>}
 */
module.exports = function (headless = true) {
    return chromeLauncher.launch({
        chromeFlags: [
            '--window-size=412,732',
            '--disable-gpu',
            headless ? '--headless' : ''
        ]
    });
}