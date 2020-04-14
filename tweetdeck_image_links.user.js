// ==UserScript==
// @name        Tweetdeck-Image-Links
// @description Add links to the tweetdeck tweets and image modal to copy the image link
// @author      Kethsar
// @version     1.1.2
// @match       https://tweetdeck.twitter.com/
// @inject-into auto
// @grant       GM_setClipboard
// @grant       GM.setClipboard
// @updateURL   https://raw.githubusercontent.com/Kethsar/twitter_image_links/master/tweetdeck_image_links.user.js
// @downloadURL https://raw.githubusercontent.com/Kethsar/twitter_image_links/master/tweetdeck_image_links.user.js
// ==/UserScript==

(function() {
    'use strict';
    
    /***** CONFIG *****/
    // Clicking the Images button for multi-image tweets will copy all image links
    // false to disable
    const COPY_ALL = true;
    /***** END CONFIG *****/
    
    const LEFT_CLICK = 0;
    
    var interval = null,
        setClipboard = null,
        log = console.log;
    
    function init()
    {
        if (GM_setClipboard)
        {
            setClipboard = GM_setClipboard;
        }
        else if (typeof(GM) != "undefined" && GM.setClipboard)
        {
            setClipboard = GM.setClipboard;
        }
        else
        {
            log("Clipboard setter not found, link copying disabled");
            return;
        }
        
        interval = setInterval(checkDOMState, 500);
    }
    
    function checkDOMState()
    {
        if (document.readyState != "complete")
            return;
        
        let om = document.getElementById("open-modal"),
            containers = document.getElementsByClassName("js-chirp-container");
        
        if (!om || containers.length < 1) // dom ready state might be "complete" but not everything is loaded in sometimes
            return;
        
        clearInterval(interval);
        createStyles();
        createModalObserver(om);
        createContainerObservers(containers);
        document.addEventListener("click", hideOpenImglist);
        log("Image Grabber loaded");
    }
    
    function createStyles()
    {
        let css = document.createElement("style");
        css.type = "text/css";
        css.innerHTML = ".imgList { position: absolute; z-index: 99; background-color: white; visibility: hidden; width: 53px }\n" +
                        ".imgLnk { padding: 5px; color: black !important; display: block; }\n" +
                        ".imgLnk:hover { color:red !important; }";
        
        document.head.appendChild(css);
    }
    
    function createModalObserver(om)
    {
        let obsConfig = { attributeFilter: ["style"], attributes: true },
            omObserver = new MutationObserver(openModalObserveHandler);
        
        omObserver.observe(om, obsConfig);
    }
    
    function openModalObserveHandler(mlist, obs)
    {
        let om = mlist[0].target;
        
        if (om.style.display != "none")
        {            
            let jsme = om.getElementsByClassName("js-mediaembed")[0];
            let obsConfig = {childList: true};
            let jsmeObserver = new MutationObserver(function(mulst, obsrvr){
                for (let mut of mulst)
                {
                    for (let rn of mut.removedNodes)
                    {
                        if (rn.id == "cpylnk")
                        {
                            insertCopyLink(jsme, om);
                            break;
                        }
                    }
                }
            });
            
            insertCopyLink(jsme, om);
            jsmeObserver.observe(jsme, obsConfig);
        }
    }
    
    function createContainerObservers(containers)
    {
        let obsConfig = { childList: true },
            contObserver = new MutationObserver(containerObserveHandler);
        
        for (let cont of containers)
        {
            let tweets = cont.getElementsByClassName("js-stream-item");
            addCopyButtons(tweets);
            contObserver.observe(cont, obsConfig);
        }
    }
    
    function containerObserveHandler(mlist, obs)
    {
        for (let m of mlist)
        {
            for (let an of m.addedNodes)
            {
                addCopyButton(an);
            }
        }
    }
    
    function addCopyButtons(tweets)
    {
        for (let t of tweets)
        {
            addCopyButton(t);
        }
    }
    
    function addCopyButton(tweet)
    {
        let imgEles = tweet.getElementsByClassName("js-media-image-link");
        
        if (imgEles.length > 0)
        {
            let imgLinks = [],
                uname = tweet.getElementsByClassName("username")[0].innerText;
            
            for (let e of imgEles)
            {
                let link = e.style.backgroundImage.match(/http[^"]+/)[0];
                link = link.replace(/\?.*/, "");
                link += "?name=orig#" + uname;
                
                imgLinks.push(link);
            }
            
            let cBtn = createCopyButton(imgLinks),
                actList = tweet.getElementsByClassName("js-tweet-actions")[0];
            
            actList.appendChild(cBtn);
        }
    }
    
    function createCopyButton(imgLinks)
    {
        let btnLi = document.createElement("li");
        
        btnLi.classList.add("tweet-action-item", "position-rel", "pull-left", "margin-r--10");
        
        if (imgLinks.length > 1)
        {
            let imlDiv = document.createElement("div"),
                btn = document.createElement("a");
            
            btn.innerText = "Images";
            btn.href = "#";
            btn.classList.add("tweet-action");
            btn.addEventListener("click", function(e){
                e.preventDefault();
                
                let imgList = e.target.nextElementSibling;
                if (!imgList.style.visibility)
                    imgList.style.visibility = "visible";
                else
                    imgList.style.visibility = "";
                
                if (imgList.id != "imgList")
                {
                    let il = document.getElementById("imgList");
                    if (il)
                    {
                        il.id = "";
                        il.style.visibility = "";
                    }
                    
                    imgList.id = "imgList";
                }
                
                if (COPY_ALL) multiImageCopy(imgList);
            });
            
            imlDiv.classList.add("imgList");
            
            for (let i = 0; i < imgLinks.length; i++)
            {
                let link = imgLinks[i],
                    a = createBtnForLink(link, i+1);
                
                imlDiv.appendChild(a);
            }

            btnLi.appendChild(btn);
            btnLi.appendChild(imlDiv);
        }
        else
        {
            let link = imgLinks[0],
                btn = createBtnForLink(link, 0);
            
            btnLi.appendChild(btn);
        }
        
        return btnLi;
    }
    
    function createBtnForLink(link, num)
    {
        let btn = document.createElement("a"); // "button", right
        btn.classList.add("cimgLnk");
        btn.href = link;
        btn.addEventListener("click", imgLnkClick);
        
        if (num == 0)
        {
            btn.classList.add("tweet-action");
            btn.innerText = "Copy";
        }
        else
        {
            btn.innerText = "Copy " + (num);
            btn.classList.add("imgLnk");
        }
        
        return btn;
    }
    
    function insertCopyLink(jsme, om)
    {
        let origlink = jsme.getElementsByClassName("med-origlink")[0];
        let flaglink = jsme.getElementsByClassName("med-flaglink")[0];
        let nl = document.createElement("a");
        let image = jsme.getElementsByTagName("img")[0];
        let uname = om.getElementsByClassName("username")[0].innerText;
        let format = image.src.match(/format=([^&]+)/)[1];
        let imgsrc = image.src.replace(/\?.*$/, "." + format);

        jsme.insertBefore(nl, flaglink);
        nl.href = imgsrc + "?name=orig#" + uname;
        nl.innerText = "Copy Image Link";
        nl.id = "cpylnk";
        nl.style.position = "absolute";
        nl.style.bottom = "0";
        nl.style.left = (origlink.clientWidth + 20) + "px";

        nl.addEventListener("click", function(e){
            if (e.button == LEFT_CLICK && !e.ctrlKey)
            {
                e.preventDefault();
                setClipboard(nl.href);
            }
        });
    }
    
    function imgLnkClick(e)
    {
        if (e.button == LEFT_CLICK && !e.ctrlKey)
        {
            e.preventDefault();
            setClipboard(e.target.href);
        }
    }
    
    function hideOpenImglist(e)
    {
        if (!e.target.classList.contains("imgLnk"))
        {
            let next = e.target.nextElementSibling;
            if (!next || !next.classList.contains("imgList"))
            {
                let il = document.getElementById("imgList");
                if (il) il.style.visibility = "";
            }
        }
    }
    
    function multiImageCopy(imgList)
    {
        let copyTxt = "";
        
        for (let n of imgList.childNodes)
        {
            if (n.href)
                copyTxt += n.href + " ";
        }
        
        if (copyTxt.length > 0)
            setClipboard(copyTxt);
    }
    
    init();
})();
