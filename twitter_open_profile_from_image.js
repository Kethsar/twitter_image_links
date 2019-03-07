// ==UserScript==
// @name Twitter Profile From Image Link
// @namespace Violentmonkey Scripts
// @description Middle-Click image to open the user's twitter profile in a new tab if the username is set as the link hash
// @author Kethsar
// @match https://pbs.twimg.com/media/*
// @grant GM_openInTab
// @grant GM.openInTab
// ==/UserScript==

(function() {
    'use strict';
    
    /*
     * This script is a companion to the twitter and tweetdeck scripts
     * that add allow you to copy image links with the user name
     * https://github.com/Kethsar/twitter_image_links
     */
    
    const MIDDLE_CLICK = 1;
    var openTab = null;
    
    function init()
    {
        if (GM_openInTab)
        {
            openTab = GM_openInTab;
        }
        else if (typeof(GM) != "undefined" && GM.openInTab)
        {
            openTab = GM.openInTab;
        }
        else
        {
            console.log("Tab opening function not found");
            return;
        }
        
        registerHandler();
    }
    
    function registerHandler()
    {
        if (window.location.hash != "")
        {
            let uname = window.location.hash.replace(/^#@/, "");
            if (uname)
            {
                let img = document.getElementsByTagName("img")[0];
                
                img.addEventListener("mouseup", function(e){
                    // For whatever reason, middle-clicking doesn't fire the event. Left click it is then
                    if (e.button == MIDDLE_CLICK)
                    {
                        openTab("https://twitter.com/" + uname);
                    }
                });
            }
        }
    }
    
    init();

})();
