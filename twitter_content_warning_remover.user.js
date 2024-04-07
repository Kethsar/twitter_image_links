// ==UserScript==
// @name        Twitter Content Warning Removal
// @description Remove the retarded content warning shit from media
// @author      Kethsar
// @version     1.3
// @match       https://twitter.com/*
// @match       https://x.com/*
// @inject-into auto
// @updateURL   https://raw.githubusercontent.com/Kethsar/twitter_image_links/master/twitter_content_warning_remover.user.js
// @downloadURL https://raw.githubusercontent.com/Kethsar/twitter_image_links/master/twitter_content_warning_remover.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Liable to break
    const contentWarnElement = '.r-yfv4eo + div',
          blurClass = '.r-yfv4eo';
    let interval = 0;

    function init()
    {
        try
        {
            interval = setInterval(createThings, 500);
        }
        catch(e)
        {
            console.log(e);
        }
    }

    function createThings()
    {
        if (document.readyState != "complete")
            return;

        clearInterval(interval);
        createStyle();
        console.log("Content Warning Remover loaded");
    }

    function createStyle()
    {
        const css = document.createElement("style");
        css.innerHTML = `${blurClass} { filter: none !important; } ${contentWarnElement} { display: none !important; }`;
        document.head.appendChild(css);
    }

    init();
})();
