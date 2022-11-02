// ==UserScript==
// @name        Twitter Content Warning Removal
// @description Remove the retarded content warning shit from media
// @author      Kethsar
// @version     1.0
// @match       https://twitter.com/*
// @inject-into auto
// @updateURL   https://raw.githubusercontent.com/Kethsar/twitter_image_links/master/twitter_content_warning_remover.user.js
// @downloadURL https://raw.githubusercontent.com/Kethsar/twitter_image_links/master/twitter_content_warning_remover.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Liable to break
    const contentWarnClass = '.r-drfeu3',
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
        createRootObserver();
        console.log("Content Warning Remover loaded");
    }

    function createStyle()
    {
        const css = document.createElement("style");
        css.innerHTML = `${blurClass} { filter: none !important; }`;
        document.head.appendChild(css);
    }

    function createRootObserver() {
        const root = document.getElementById("react-root"),
              obs = new MutationObserver((mlist, obs) => {
                  setTimeout(handleMutations, 500, mlist);
              });

        obs.observe(root, {childList: true, subtree: true});
    }

    function handleMutations(mlist) {
        mlist.forEach(mtn => {
            mtn.addedNodes.forEach(an => {
                const warning = an.querySelector(contentWarnClass);
                if (warning) {
                    warning.remove();
                }
            });
        });
    }

    init();
})();
